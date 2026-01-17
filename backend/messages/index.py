import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    """API для отправки и получения сообщений"""
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        
        qsp = event.get('queryStringParameters', {}) or {}
        
        if method == 'GET' and not qsp.get('chat_id'):
            cur.execute("""
                SELECT 
                    c.id as chat_id,
                    u.id as user_id,
                    u.username,
                    u.full_name,
                    u.avatar_url,
                    u.is_online,
                    m.message_text as last_message,
                    m.sent_at as last_message_time,
                    COUNT(CASE WHEN m.is_read = FALSE AND m.sender_id != %s THEN 1 END) as unread_count
                FROM chat_participants cp
                JOIN chats c ON cp.chat_id = c.id
                JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id != %s
                JOIN users u ON cp2.user_id = u.id
                LEFT JOIN LATERAL (
                    SELECT message_text, sent_at, sender_id, is_read
                    FROM messages 
                    WHERE chat_id = c.id 
                    ORDER BY sent_at DESC 
                    LIMIT 1
                ) m ON TRUE
                WHERE cp.user_id = %s
                GROUP BY c.id, u.id, u.username, u.full_name, u.avatar_url, u.is_online, m.message_text, m.sent_at
                ORDER BY m.sent_at DESC NULLS LAST
            """, (user_id, user_id, user_id))
            
            chats = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'chats': [dict(c) for c in chats]}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'GET' and qsp.get('chat_id'):
            chat_id = qsp.get('chat_id')
            
            if not chat_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'chat_id required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT m.id, m.message_text, m.sent_at, m.is_read,
                       u.id as sender_id, u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.chat_id = %s
                ORDER BY m.sent_at ASC
            """, (chat_id,))
            
            messages = cur.fetchall()
            
            cur.execute("UPDATE messages SET is_read = TRUE WHERE chat_id = %s AND sender_id != %s", (chat_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': [dict(m) for m in messages]}, default=str),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            recipient_id = body.get('recipient_id')
            message_text = body.get('message_text', '').strip()
            
            if not recipient_id or not message_text:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'recipient_id and message_text required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute("""
                SELECT c.id FROM chats c
                JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = %s
                JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = %s
                LIMIT 1
            """, (user_id, recipient_id))
            
            chat = cur.fetchone()
            
            if not chat:
                cur.execute("INSERT INTO chats DEFAULT VALUES RETURNING id")
                chat = cur.fetchone()
                chat_id = chat['id']
                
                cur.execute("INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                           (chat_id, user_id, chat_id, recipient_id))
            else:
                chat_id = chat['id']
            
            cur.execute(
                "INSERT INTO messages (chat_id, sender_id, message_text) VALUES (%s, %s, %s) RETURNING id, sent_at",
                (chat_id, user_id, message_text)
            )
            message = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': dict(message),
                    'chat_id': chat_id
                }, default=str),
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