-- Migration: Add user settings/preferences to profiles table
-- Allows psychologists to customize their interface (e.g., enable/disable payment module)

-- Add settings column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "features": {
    "paymentsModule": true,
    "advancedAnalytics": true
  },
  "preferences": {
    "defaultDocFormat": "SOAP",
    "autoSaveInterval": 30
  }
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.settings IS 
  'User preferences and feature toggles. Stores non-sensitive UI customization settings in JSON format.';

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_settings 
  ON public.profiles USING gin(settings);

-- Verification query
DO $$
BEGIN
  RAISE NOTICE 'User settings migration completed. Profiles with settings: %', 
    (SELECT COUNT(*) FROM public.profiles WHERE settings IS NOT NULL);
END $$;
