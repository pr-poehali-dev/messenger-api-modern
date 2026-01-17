import json
import os
import random
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta

def handler(event: dict, context) -> dict:
    """API для отправки и проверки SMS кодов подтверждения"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
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
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action', 'send')
            phone = body.get('phone', '').strip()
            
            if not phone:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Phone number required'}),
                    'isBase64Encoded': False
                }
            
            if action == 'send':
                code = str(random.randint(100000, 999999))
                expires_at = datetime.now() + timedelta(minutes=5)
                
                cur.execute(
                    """UPDATE t_p33435224_messenger_api_modern.verification_codes 
                       SET is_used = TRUE 
                       WHERE phone = %s AND is_used = FALSE""",
                    (phone,)
                )
                
                cur.execute(
                    """INSERT INTO t_p33435224_messenger_api_modern.verification_codes 
                       (phone, code, expires_at) 
                       VALUES (%s, %s, %s)""",
                    (phone, code, expires_at)
                )
                conn.commit()
                
                print(f"SMS код для {phone}: {code}")
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message': 'Код отправлен',
                        'dev_code': code
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'verify':
                code = body.get('code', '').strip()
                
                if not code:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Code required'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    """SELECT * FROM t_p33435224_messenger_api_modern.verification_codes 
                       WHERE phone = %s AND code = %s AND is_used = FALSE 
                       AND expires_at > NOW() 
                       ORDER BY created_at DESC LIMIT 1""",
                    (phone, code)
                )
                verification = cur.fetchone()
                
                if not verification:
                    cur.execute(
                        """UPDATE t_p33435224_messenger_api_modern.verification_codes 
                           SET attempts = attempts + 1 
                           WHERE phone = %s AND is_used = FALSE""",
                        (phone,)
                    )
                    conn.commit()
                    
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный или истекший код'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    """UPDATE t_p33435224_messenger_api_modern.verification_codes 
                       SET is_used = TRUE 
                       WHERE id = %s""",
                    (verification['id'],)
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Код подтвержден', 'verified': True}),
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
