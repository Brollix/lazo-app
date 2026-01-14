-- Migration: Fix missing columns in profiles table
-- Consolidates all columns required by the new admin panel and credit system

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS premium_credits_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_credit_renewal TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS transcription_month_year TEXT,
ADD COLUMN IF NOT EXISTS monthly_transcriptions_used INTEGER DEFAULT 0;

-- Ensure constraints and defaults
ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 3;
ALTER TABLE public.profiles ALTER COLUMN plan_type SET DEFAULT 'free';

-- Add comment
COMMENT ON TABLE public.profiles IS 'User profiles with plan and usage tracking';
