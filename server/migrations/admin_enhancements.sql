-- Migration: Admin Enhancements
-- 1. Add mode column to processing_sessions
-- 2. Create announcements table

-- Add mode column to processing_sessions
ALTER TABLE public.processing_sessions 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'standard' CHECK (mode IN ('standard', 'high_precision'));

-- Add comment
COMMENT ON COLUMN public.processing_sessions.mode IS 'The AI processing mode used for this session (standard=Groq, high_precision=Deepgram/Claude)';

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can read active announcements
CREATE POLICY "Anyone can view active announcements" ON public.announcements
    FOR SELECT USING (active = true);

-- Only admin can manage announcements (using service role or we could check the admin UUID)
-- For simplicity and security via API, we often use service role, but for RLS:
CREATE POLICY "Admins can manage announcements" ON public.announcements
    ALL USING (auth.uid() = 'a9860376-392e-439a-9a70-8d9c513d1dce');

-- Update existing processing_sessions to guess mode from system_prompt or plan if needed
-- But defaulting to 'standard' is safer.
