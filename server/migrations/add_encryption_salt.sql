-- Migration: Add encryption salt for PBKDF2 key derivation
-- This enables secure client-side encryption with password-based key derivation

-- Add encryption_salt column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS encryption_salt TEXT;

-- Add index for performance (only for non-null values)
CREATE INDEX IF NOT EXISTS idx_profiles_encryption_salt 
ON public.profiles(encryption_salt) 
WHERE encryption_salt IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.encryption_salt IS 
'Base64-encoded random salt (16 bytes) used for PBKDF2 key derivation with 100,000 iterations. Generated on user signup and used to derive AES-256 encryption key from user password. This allows password changes while maintaining data security.';

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'encryption_salt'
  ) THEN
    RAISE NOTICE 'Column encryption_salt successfully added to profiles table';
  ELSE
    RAISE EXCEPTION 'Failed to add encryption_salt column';
  END IF;
END $$;
