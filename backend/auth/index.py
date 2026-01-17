import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для регистрации, авторизации по телефону/username и управления пользователями"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
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
        qsp = event.get('queryStringParameters', {}) or {}
        
        if method == 'POST':
            body = json.loads(event.get('body', '{}'))
            phone = body.get('phone', '').strip()
            username = body.get('username', '').strip()
            full_name = body.get('full_name', '')
            
            if not phone and not username:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Phone or username required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, username, full_name, phone, is_admin, avatar_url FROM t_p33435224_messenger_api_modern.users WHERE phone = %s OR username = %s",
                (phone, username)
            )
            existing_user = cur.fetchone()
            
            if existing_user:
                token = secrets.token_urlsafe(32)
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'user': dict(existing_user),
                        'token': token
                    }),
                    'isBase64Encoded': False
                }
            
            try:
                cur.execute(
                    """INSERT INTO t_p33435224_messenger_api_modern.users 
                       (username, phone, full_name, password_hash) 
                       VALUES (%s, %s, %s, %s) 
                       RETURNING id, username, phone, full_name, is_admin, avatar_url""",
                    (username or phone or f'user_{secrets.token_hex(4)}', phone or None, full_name, hashlib.sha256(b'').hexdigest())
                )
                user = cur.fetchone()
                conn.commit()
                
                token = secrets.token_urlsafe(32)
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'user': dict(user),
                        'token': token
                    }),
                    'isBase64Encoded': False
                }
            except psycopg2.IntegrityError as e:
                conn.rollback()
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username or phone already exists'}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET' and qsp.get('q'):
            query = qsp.get('q', '').strip()
            
            if not query:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Search query required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                """SELECT id, username, full_name, phone, avatar_url, is_online 
                   FROM t_p33435224_messenger_api_modern.users 
                   WHERE username ILIKE %s OR full_name ILIKE %s OR phone ILIKE %s 
                   LIMIT 20""",
                (f'%{query}%', f'%{query}%', f'%{query}%')
            )
            users = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'users': [dict(u) for u in users]}),
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