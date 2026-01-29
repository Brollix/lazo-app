-- ============================================================================
-- MIGRATION: Fix Processing Sessions Table
-- ============================================================================
-- This migration ensures the processing_sessions table exists with proper
-- structure and RLS policies for async audio processing.
--
-- INSTRUCTIONS:
-- 1. Connect to your Supabase project dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ============================================================================

-- Drop existing table if it has issues (CAREFUL: this will delete existing sessions)
-- Comment out the next line if you want to preserve existing data
DROP TABLE IF EXISTS processing_sessions CASCADE;

-- Create processing_sessions table
CREATE TABLE IF NOT EXISTS processing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'error')),
  mode TEXT CHECK (mode IN ('standard', 'high_precision')),
  temp_result JSONB,
  temp_result_consumed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id 
  ON processing_sessions(user_id);
  
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status 
  ON processing_sessions(status);
  
CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_at 
  ON processing_sessions(created_at);

-- Enable Row Level Security
ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own processing sessions" ON processing_sessions;
DROP POLICY IF EXISTS "Users can create own processing sessions" ON processing_sessions;
DROP POLICY IF EXISTS "Users can update own processing sessions" ON processing_sessions;

-- RLS Policy: Users can only see their own processing sessions
CREATE POLICY "Users can view own processing sessions"
  ON processing_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own processing sessions
CREATE POLICY "Users can create own processing sessions"
  ON processing_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own processing sessions
CREATE POLICY "Users can update own processing sessions"
  ON processing_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_processing_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS processing_sessions_updated_at ON processing_sessions;
CREATE TRIGGER processing_sessions_updated_at
  BEFORE UPDATE ON processing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_processing_sessions_updated_at();

-- Cleanup function for old sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_processing_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_sessions
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON processing_sessions TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after the migration to verify)
-- ============================================================================

-- Check if table exists and has correct structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'processing_sessions'
-- ORDER BY ordinal_position;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'processing_sessions';

-- Check for any stuck processing sessions
-- SELECT id, user_id, status, created_at, updated_at
-- FROM processing_sessions
-- WHERE status = 'processing'
-- AND created_at < NOW() - INTERVAL '1 hour';
