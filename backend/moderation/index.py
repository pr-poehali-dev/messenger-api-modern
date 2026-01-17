import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для модерации и обработки жалоб"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-User-Id'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    dsn = os.environ.get('DATABASE_URL')
    if not dsn:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(dsn)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        user_id = event.get('headers', {}).get('x-user-id')
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Authentication required'}),
                'isBase64Encoded': False
            }
        
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        
        body_data = json.loads(event.get('body', '{}')) if event.get('body') else {}
        
        if method == 'POST' and body_data.get('reported_user_id'):
            reported_user_id = body_data.get('reported_user_id')
            reason = body_data.get('reason', '').strip()
            
            if not reported_user_id or not reason:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'reported_user_id and reason required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "INSERT INTO reports (reported_user_id, reported_by_user_id, reason) VALUES (%s, %s, %s) RETURNING id",
                (reported_user_id, user_id, reason)
            )
            report = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'report_id': report['id'], 'message': 'Report submitted'}),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
            if not user or not user['is_admin']:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Admin access required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT 
                    r.id, r.reason, r.status, r.created_at,
                    u1.username as reported_username,
                    u2.username as reported_by_username
                FROM reports r
                JOIN users u1 ON r.reported_user_id = u1.id
                JOIN users u2 ON r.reported_by_user_id = u2.id
                ORDER BY r.created_at DESC
                LIMIT 50
            """)
            
            reports = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'reports': [dict(r) for r in reports]}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            if not user or not user['is_admin']:
                return {
                    'statusCode': 403,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Admin access required'}),
                    'isBase64Encoded': False
                }
            
            body = json.loads(event.get('body', '{}'))
            report_id = body.get('report_id')
            status = body.get('status', 'resolved')
            
            if not report_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'report_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "UPDATE reports SET status = %s, reviewed_at = CURRENT_TIMESTAMP, reviewed_by_admin_id = %s WHERE id = %s",
                (status, user_id, report_id)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Report updated'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Endpoint not found'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()