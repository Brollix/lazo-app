-- Migration: Create processing_sessions table for persistent session storage
-- This replaces the in-memory sessionStore Map

CREATE TABLE IF NOT EXISTS processing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'error')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_sessions_user_id ON processing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_status ON processing_sessions(status);
CREATE INDEX IF NOT EXISTS idx_processing_sessions_created_at ON processing_sessions(created_at);

-- RLS Policies
ALTER TABLE processing_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own processing sessions
CREATE POLICY "Users can view own processing sessions"
  ON processing_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own processing sessions
CREATE POLICY "Users can create own processing sessions"
  ON processing_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own processing sessions
CREATE POLICY "Users can update own processing sessions"
  ON processing_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Optional: Cleanup function for old sessions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_processing_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM processing_sessions
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-processing-sessions', '0 2 * * *', 'SELECT cleanup_old_processing_sessions()');
