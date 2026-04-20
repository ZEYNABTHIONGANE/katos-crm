-- ============================================================
-- Migration : Add is_important to chat_message_status
-- ============================================================

ALTER TABLE chat_message_status 
ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;
