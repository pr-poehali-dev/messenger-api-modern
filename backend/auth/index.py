import json
import os
import hashlib
import secrets
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для регистрации, авторизации и управления пользователями"""
    
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
            username = body.get('username', '').strip()
            password = body.get('password', '')
            full_name = body.get('full_name', '')
            
            if not username or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username and password required'}),
                    'isBase64Encoded': False
                }
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            try:
                cur.execute(
                    "INSERT INTO users (username, password_hash, full_name) VALUES (%s, %s, %s) RETURNING id, username, full_name",
                    (username, password_hash, full_name)
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
            except psycopg2.IntegrityError:
                conn.rollback()
                return {
                    'statusCode': 409,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username already exists'}),
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
                "SELECT id, username, full_name, avatar_url, is_online FROM users WHERE username ILIKE %s OR full_name ILIKE %s LIMIT 20",
                (f'%{query}%', f'%{query}%')
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
