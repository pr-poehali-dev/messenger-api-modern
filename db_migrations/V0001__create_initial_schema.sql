CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_participants (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id),
  user_id INTEGER REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id, user_id)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id),
  sender_id INTEGER REFERENCES users(id),
  message_text TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reported_user_id INTEGER REFERENCES users(id),
  reported_by_user_id INTEGER REFERENCES users(id),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by_admin_id INTEGER REFERENCES users(id)
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX idx_reports_status ON reports(status);

INSERT INTO users (username, password_hash, full_name, is_admin, is_online) VALUES
('admin', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'Администратор', TRUE, TRUE),
('support_bot', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'Бот поддержки', FALSE, TRUE),
('alexdev', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'Алексей', FALSE, TRUE),
('maria_design', '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', 'Мария', FALSE, FALSE);