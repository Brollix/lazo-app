-- Migration: Add premium credits and renewal tracking to profiles table
-- This supports the new three-tier sales funnel (Free, Pro, Ultra)

-- Add column for premium credits (used by Ultra plan)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS premium_credits_remaining INTEGER DEFAULT 0;

-- Add column for tracking monthly credit renewal
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_credit_renewal TIMESTAMP DEFAULT NOW();

-- Update existing users to set last_credit_renewal if null
UPDATE profiles 
SET last_credit_renewal = NOW() 
WHERE last_credit_renewal IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.premium_credits_remaining IS 'Premium credits for Ultra plan users (20/month). Regular credits_remaining used for Free plan (3/month). Pro plan has unlimited (-1).';
COMMENT ON COLUMN profiles.last_credit_renewal IS 'Timestamp of last monthly credit renewal. Used to automatically renew credits each month.';

-- Verify plan_type values are correct
-- Expected values: 'free', 'pro', 'ultra'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_plan_type_check'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_plan_type_check 
        CHECK (plan_type IN ('free', 'pro', 'ultra'));
    END IF;
END $$;

-- Set default values for existing users based on their current plan
UPDATE profiles 
SET 
    premium_credits_remaining = CASE 
        WHEN plan_type = 'ultra' THEN 20
        ELSE 0
    END,
    credits_remaining = CASE 
        WHEN plan_type = 'free' THEN 3
        WHEN plan_type = 'pro' THEN -1  -- -1 indicates unlimited
        WHEN plan_type = 'ultra' THEN 0  -- Ultra uses premium_credits_remaining
        ELSE credits_remaining
    END
WHERE last_credit_renewal IS NOT NULL;

-- Create index for efficient monthly renewal queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_credit_renewal 
ON profiles(last_credit_renewal) 
WHERE plan_type IN ('free', 'ultra');

-- Display summary
SELECT 
    plan_type,
    COUNT(*) as user_count,
    AVG(credits_remaining) as avg_credits,
    AVG(premium_credits_remaining) as avg_premium_credits
FROM profiles
GROUP BY plan_type
ORDER BY plan_type;
