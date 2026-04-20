-- ============================================================
-- Migration : Table chat_message_status
-- Gère le statut par utilisateur (lu/non-lu, corbeille)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_message_status (
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (message_id, user_id)
);

-- Index pour accélérer les requêtes par utilisateur
CREATE INDEX IF NOT EXISTS idx_cms_user_id ON chat_message_status(user_id);

-- Row Level Security
ALTER TABLE chat_message_status ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut voir/modifier que SES propres statuts
DROP POLICY IF EXISTS "Users manage own message status" ON chat_message_status;
CREATE POLICY "Users manage own message status"
ON chat_message_status
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
