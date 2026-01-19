-- Migration: Encrypt processing_sessions.result column
-- Adds encrypted_result column and marks existing plaintext data as legacy

-- Step 1: Add new encrypted_result column
ALTER TABLE processing_sessions 
ADD COLUMN IF NOT EXISTS encrypted_result TEXT;

-- Step 2: Add legacy flag to identify unencrypted data
ALTER TABLE processing_sessions 
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- Step 3: Mark existing rows with plaintext data as legacy
UPDATE processing_sessions 
SET is_legacy = TRUE 
WHERE result IS NOT NULL AND encrypted_result IS NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN processing_sessions.encrypted_result IS 
'Base64-encoded encrypted result (IV + ciphertext + auth_tag) using AES-256-GCM. Contains transcript and analysis data encrypted client-side.';

COMMENT ON COLUMN processing_sessions.is_legacy IS 
'TRUE if this record contains unencrypted data from before encryption implementation. Should be deleted for HIPAA compliance.';

-- Step 5: Create index for encrypted_result lookups
CREATE INDEX IF NOT EXISTS idx_processing_sessions_encrypted_result 
ON processing_sessions(encrypted_result) 
WHERE encrypted_result IS NOT NULL;

-- Step 6: Delete legacy data for HIPAA compliance (RECOMMENDED)
-- Uncomment the following line to automatically delete all plaintext data:
-- DELETE FROM processing_sessions WHERE is_legacy = TRUE;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Processing sessions migration completed. Legacy records: %', 
    (SELECT COUNT(*) FROM processing_sessions WHERE is_legacy = TRUE);
  RAISE NOTICE 'Encrypted records: %', 
    (SELECT COUNT(*) FROM processing_sessions WHERE encrypted_result IS NOT NULL);
END $$;
