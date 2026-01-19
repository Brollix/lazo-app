-- Migration: Add session tracking for Pro plan users
-- This enables monthly session limits (100 sessions/month) for Pro plan

-- The Pro plan was previously using unlimited credits (credits_remaining = -1)
-- This migration changes it to use the same session tracking as Free plan but with higher limits

BEGIN;

-- Pro plan will now use the existing monthly_transcriptions_used and transcription_month_year columns
-- We just need to update existing Pro users to initialize these columns

-- Initialize session tracking for existing Pro users
UPDATE public.profiles
SET 
    monthly_transcriptions_used = 0,
    transcription_month_year = to_char(now(), 'YYYY-MM'),
    credits_remaining = 100, -- Change from -1 (unlimited) to 100
    updated_at = timezone('utc'::text, now())
WHERE plan_type = 'pro' 
  AND (monthly_transcriptions_used IS NULL OR transcription_month_year IS NULL OR credits_remaining = -1);

-- Add comment to document Pro plan credit logic
COMMENT ON COLUMN public.profiles.credits_remaining IS 
'Session credits remaining. Free: 3/month, Pro: 100/month, Ultra: 100 standard/month. Premium credits for Ultra stored in premium_credits_remaining.';

-- Update the reset function to include Pro plan
CREATE OR REPLACE FUNCTION reset_monthly_transcriptions()
RETURNS void AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Reset counter for Free AND Pro users when a new month starts
  UPDATE public.profiles
  SET monthly_transcriptions_used = 0,
      transcription_month_year = current_month,
      updated_at = timezone('utc'::text, now())
  WHERE plan_type IN ('free', 'pro')
    AND transcription_month_year != current_month;
    
  RAISE NOTICE 'Reset monthly transcriptions for % users', (
    SELECT COUNT(*) FROM public.profiles 
    WHERE plan_type IN ('free', 'pro') AND transcription_month_year = current_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the migration
SELECT 
  plan_type,
  COUNT(*) as user_count,
  AVG(COALESCE(monthly_transcriptions_used, 0)) as avg_used,
  AVG(credits_remaining) as avg_credits_remaining,
  transcription_month_year
FROM public.profiles
WHERE plan_type IN ('free', 'pro', 'ultra')
GROUP BY plan_type, transcription_month_year
ORDER BY plan_type;

COMMIT;
