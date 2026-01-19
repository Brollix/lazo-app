-- Migration: Add master key encryption for recovery phrase system
-- This enables password recovery via BIP39 12-word mnemonic phrase
-- while maintaining zero-knowledge architecture

-- Add master key encryption columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS master_key_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS recovery_phrase_hash TEXT,
  ADD COLUMN IF NOT EXISTS recovery_phrase_created_at TIMESTAMPTZ;

-- Add index for recovery phrase hash lookups
CREATE INDEX IF NOT EXISTS idx_profiles_recovery_phrase_hash 
  ON public.profiles(recovery_phrase_hash) 
  WHERE recovery_phrase_hash IS NOT NULL;

-- Add comments explaining the columns
COMMENT ON COLUMN public.profiles.master_key_encrypted IS 
  'JSON object containing master key encrypted with both password and recovery phrase. Format: {"password": "base64_encrypted", "phrase": "base64_encrypted"}. Master key is used to encrypt all user data.';

COMMENT ON COLUMN public.profiles.recovery_phrase_hash IS 
  'SHA-256 hash of the recovery phrase for verification. The actual phrase is never stored, only shown once during generation.';

COMMENT ON COLUMN public.profiles.recovery_phrase_created_at IS 
  'Timestamp when the recovery phrase was created or last regenerated. Used for auditing and security tracking.';

-- Verify the columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'master_key_encrypted'
  ) THEN
    RAISE NOTICE 'Column master_key_encrypted successfully added to profiles table';
  ELSE
    RAISE EXCEPTION 'Failed to add master_key_encrypted column';
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'recovery_phrase_hash'
  ) THEN
    RAISE NOTICE 'Column recovery_phrase_hash successfully added to profiles table';
  ELSE
    RAISE EXCEPTION 'Failed to add recovery_phrase_hash column';
  END IF;
END $$;
