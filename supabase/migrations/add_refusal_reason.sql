-- add_refusal_reason.sql
-- Ajout d'une colonne pour stocker le motif de refus des prospects "Pas intéressés"

ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS refusal_reason text;

-- Commentaire pour documentation
COMMENT ON COLUMN public.contacts.refusal_reason IS 'Motif pour lequel le prospect a été classé comme Pas intéressé';
