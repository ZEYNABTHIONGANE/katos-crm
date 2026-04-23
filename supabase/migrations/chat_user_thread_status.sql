-- ============================================================
-- Migration : Table chat_user_thread_status
-- Statut corbeille/important par thread ET par utilisateur
-- (remplace l'approche fragile via chat_message_status)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_user_thread_status (
    group_id     UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
    is_deleted   BOOLEAN NOT NULL DEFAULT FALSE,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_cuts_user_id  ON chat_user_thread_status(user_id);
CREATE INDEX IF NOT EXISTS idx_cuts_group_id ON chat_user_thread_status(group_id);

ALTER TABLE chat_user_thread_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own thread status" ON chat_user_thread_status;
CREATE POLICY "Users manage own thread status"
ON chat_user_thread_status
FOR ALL
USING  (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
