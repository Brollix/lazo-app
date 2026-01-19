-- Migration: Add temporary result column for Supabase Realtime delivery
-- This column stores unencrypted results TEMPORARILY until client encrypts them

-- Add temporary result column (will be cleared after client encrypts)
ALTER TABLE processing_sessions 
ADD COLUMN IF NOT EXISTS temp_result JSONB;

-- Add flag to track if temp result has been consumed
ALTER TABLE processing_sessions 
ADD COLUMN IF NOT EXISTS temp_result_consumed BOOLEAN DEFAULT FALSE;

-- Add timestamp for cleanup
ALTER TABLE processing_sessions 
ADD COLUMN IF NOT EXISTS temp_result_expires_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN processing_sessions.temp_result IS 
'TEMPORARY unencrypted result for Realtime delivery to client. MUST be cleared after client encrypts and saves. Auto-expires after 5 minutes.';

COMMENT ON COLUMN processing_sessions.temp_result_consumed IS 
'TRUE if client has received and encrypted the temp_result. Used to prevent re-delivery.';

COMMENT ON COLUMN processing_sessions.temp_result_expires_at IS 
'Expiration timestamp for temp_result. Results older than this should be deleted for security.';

-- Create function to auto-cleanup expired temp results
CREATE OR REPLACE FUNCTION cleanup_expired_temp_results()
RETURNS void AS $$
BEGIN
  UPDATE processing_sessions
  SET 
    temp_result = NULL,
    temp_result_consumed = TRUE
  WHERE 
    temp_result IS NOT NULL 
    AND temp_result_expires_at < NOW();
    
  RAISE NOTICE 'Cleaned up % expired temp results', 
    (SELECT COUNT(*) FROM processing_sessions WHERE temp_result_consumed = TRUE AND temp_result IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Schedule cleanup every 5 minutes (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-temp-results', '*/5 * * * *', 'SELECT cleanup_expired_temp_results()');

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Temporary result columns added successfully';
  RAISE NOTICE 'Remember: temp_result should ONLY exist for max 5 minutes!';
END $$;
