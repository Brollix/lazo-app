-- Migration: Add Ultra plan monthly session tracking and update credit allocation
-- This enforces the 120 total sessions per month hard limit for Ultra users

-- Add monthly session tracking columns for all users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS monthly_sessions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_month_year TEXT DEFAULT to_char(now(), 'YYYY-MM');

-- Add comments for documentation
COMMENT ON COLUMN profiles.monthly_sessions_used IS 'Total sessions used this month (all modes combined). Ultra plan hard limit: 120/month.';
COMMENT ON COLUMN profiles.session_month_year IS 'Month-year for session tracking in YYYY-MM format. Auto-resets on new month.';

-- Update existing Ultra users to have correct credit allocation
-- Ultra Plan: 100 standard credits + 20 premium credits = 120 total sessions/month
UPDATE profiles 
SET 
    credits_remaining = 100,  -- Standard processing sessions
    premium_credits_remaining = 20,  -- High precision sessions
    monthly_sessions_used = 0,
    session_month_year = to_char(now(), 'YYYY-MM'),
    updated_at = timezone('utc'::text, now())
WHERE plan_type = 'ultra';

-- Initialize session tracking for existing users
UPDATE profiles 
SET 
    monthly_sessions_used = 0,
    session_month_year = to_char(now(), 'YYYY-MM'),
    updated_at = timezone('utc'::text, now())
WHERE monthly_sessions_used IS NULL;

-- Create index for efficient session limit queries
CREATE INDEX IF NOT EXISTS idx_profiles_session_month_year 
ON profiles(session_month_year) 
WHERE plan_type = 'ultra';

-- Create function to reset monthly session counters
CREATE OR REPLACE FUNCTION reset_ultra_monthly_sessions()
RETURNS void AS $$
DECLARE
  current_month TEXT;
  affected_count INTEGER;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Reset session counter for Ultra users when a new month starts
  UPDATE profiles
  SET 
      monthly_sessions_used = 0,
      session_month_year = current_month,
      credits_remaining = 100,  -- Renew standard credits
      premium_credits_remaining = 20,  -- Renew premium credits
      updated_at = timezone('utc'::text, now())
  WHERE plan_type = 'ultra' 
    AND session_month_year != current_month;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RAISE NOTICE 'Reset monthly sessions for % Ultra users', affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Display summary of changes
SELECT 
    plan_type,
    COUNT(*) as user_count,
    AVG(credits_remaining) as avg_standard_credits,
    AVG(premium_credits_remaining) as avg_premium_credits,
    AVG(monthly_sessions_used) as avg_sessions_used,
    MAX(session_month_year) as current_month
FROM profiles
GROUP BY plan_type
ORDER BY plan_type;
