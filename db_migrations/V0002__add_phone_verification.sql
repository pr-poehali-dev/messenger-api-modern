-- Добавляем поле phone в таблицу users
ALTER TABLE t_p33435224_messenger_api_modern.users 
ADD COLUMN phone VARCHAR(20) UNIQUE;

-- Создаем таблицу для хранения SMS кодов
CREATE TABLE t_p33435224_messenger_api_modern.verification_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0
);

-- Создаем индексы для быстрого поиска
CREATE INDEX idx_verification_codes_phone ON t_p33435224_messenger_api_modern.verification_codes(phone);
CREATE INDEX idx_verification_codes_expires ON t_p33435224_messenger_api_modern.verification_codes(expires_at);