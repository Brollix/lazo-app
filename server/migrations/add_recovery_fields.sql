-- Add missing security columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS encrypted_master_key_password TEXT,
ADD COLUMN IF NOT EXISTS encrypted_master_key_recovery_phrase TEXT,
ADD COLUMN IF NOT EXISTS recovery_phrase_hash TEXT,
ADD COLUMN IF NOT EXISTS encryption_setup_completed BOOLEAN DEFAULT FALSE;
