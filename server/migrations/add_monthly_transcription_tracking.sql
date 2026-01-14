-- Add monthly transcription tracking for free plan users
-- This migration adds columns to track transcription usage per calendar month

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS monthly_transcriptions_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS transcription_month_year TEXT DEFAULT to_char(now(), 'YYYY-MM');

-- Create function to reset monthly transcription counters
CREATE OR REPLACE FUNCTION reset_monthly_transcriptions()
RETURNS void AS $$
DECLARE
  current_month TEXT;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Reset counter for free users when a new month starts
  UPDATE public.profiles
  SET monthly_transcriptions_used = 0,
      transcription_month_year = current_month,
      updated_at = timezone('utc'::text, now())
  WHERE plan_type = 'free' 
    AND transcription_month_year != current_month;
    
  RAISE NOTICE 'Reset monthly transcriptions for % users', (
    SELECT COUNT(*) FROM public.profiles 
    WHERE plan_type = 'free' AND transcription_month_year = current_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize existing free users with current month
UPDATE public.profiles
SET transcription_month_year = to_char(now(), 'YYYY-MM'),
    monthly_transcriptions_used = 0
WHERE plan_type = 'free' 
  AND transcription_month_year IS NULL;

-- Verify the migration
SELECT 
  plan_type,
  COUNT(*) as user_count,
  AVG(monthly_transcriptions_used) as avg_used,
  transcription_month_year
FROM public.profiles
GROUP BY plan_type, transcription_month_year
ORDER BY plan_type;
