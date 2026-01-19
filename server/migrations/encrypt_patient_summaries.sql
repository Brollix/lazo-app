-- Migration: Encrypt patient_summaries.summary_text column
-- Adds encrypted_summary column and marks existing plaintext data as legacy

-- Step 1: Add new encrypted_summary column
ALTER TABLE patient_summaries 
ADD COLUMN IF NOT EXISTS encrypted_summary TEXT;

-- Step 2: Add legacy flag to identify unencrypted data
ALTER TABLE patient_summaries 
ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- Step 3: Mark existing rows with plaintext data as legacy
UPDATE patient_summaries 
SET is_legacy = TRUE 
WHERE summary_text IS NOT NULL AND encrypted_summary IS NULL;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN patient_summaries.encrypted_summary IS 
'Base64-encoded encrypted patient summary using AES-256-GCM. Contains cumulative clinical profile encrypted client-side.';

COMMENT ON COLUMN patient_summaries.is_legacy IS 
'TRUE if this record contains unencrypted data from before encryption implementation. Should be deleted for HIPAA compliance.';

-- Step 5: Create index for encrypted_summary lookups
CREATE INDEX IF NOT EXISTS idx_patient_summaries_encrypted_summary 
ON patient_summaries(encrypted_summary) 
WHERE encrypted_summary IS NOT NULL;

-- Step 6: Delete legacy data for HIPAA compliance (RECOMMENDED)
-- Uncomment the following line to automatically delete all plaintext data:
-- DELETE FROM patient_summaries WHERE is_legacy = TRUE;

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'Patient summaries migration completed. Legacy records: %', 
    (SELECT COUNT(*) FROM patient_summaries WHERE is_legacy = TRUE);
  RAISE NOTICE 'Encrypted records: %', 
    (SELECT COUNT(*) FROM patient_summaries WHERE encrypted_summary IS NOT NULL);
END $$;
