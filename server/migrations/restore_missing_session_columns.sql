-- Migration: Add missing columns to processing_sessions
-- These columns were lost or missing in previous migrations

-- Add encrypted_result for client-side encrypted results
ALTER TABLE public.processing_sessions 
ADD COLUMN IF NOT EXISTS encrypted_result TEXT;

-- Add result for legacy/compatibility
ALTER TABLE public.processing_sessions 
ADD COLUMN IF NOT EXISTS result JSONB;

-- Add is_legacy flag
ALTER TABLE public.processing_sessions 
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- Add duration column for unencrypted statistics (in seconds)
ALTER TABLE public.processing_sessions 
ADD COLUMN IF NOT EXISTS duration NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN public.processing_sessions.encrypted_result IS 'Base64-encoded encrypted result (IV + ciphertext + auth_tag) using AES-256-GCM. Encrypted client-side.';
COMMENT ON COLUMN public.processing_sessions.result IS 'Legacy plaintext result (for compatibility or non-sensitive data).';
COMMENT ON COLUMN public.processing_sessions.duration IS 'Session duration in seconds, stored unencrypted for admin statistics.';

-- Create index for duration as it might be used for sorting/filtering in admin
CREATE INDEX IF NOT EXISTS idx_processing_sessions_duration ON public.processing_sessions(duration);
