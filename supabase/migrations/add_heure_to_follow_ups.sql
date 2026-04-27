-- Migration: Add 'heure' column to 'follow_ups'
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS heure text DEFAULT '09:00';

-- Update existing rows if any
UPDATE follow_ups SET heure = '09:00' WHERE heure IS NULL;
