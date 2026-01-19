-- Migration: Create patient_summaries table for long-term memory feature (Ultra Plan)
-- Stores evolving clinical profiles for each patient (max 2000 tokens)
-- Storage is indefinite - summaries persist while the account is active

CREATE TABLE IF NOT EXISTS public.patient_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_identifier TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  session_count INTEGER DEFAULT 1,
  last_session_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one summary per patient per therapist
  CONSTRAINT unique_patient_per_user UNIQUE (user_id, patient_identifier)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_patient_summaries_user_id 
  ON public.patient_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_patient_summaries_patient_identifier 
  ON public.patient_summaries(patient_identifier);

-- Composite index for fast lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_patient_summaries_user_patient 
  ON public.patient_summaries(user_id, patient_identifier);

-- Index for sorting by last session
CREATE INDEX IF NOT EXISTS idx_patient_summaries_last_session 
  ON public.patient_summaries(last_session_date DESC);

-- Row Level Security
ALTER TABLE public.patient_summaries ENABLE ROW LEVEL SECURITY;

-- Users can only view their own patient summaries
CREATE POLICY "Users can view own patient summaries"
  ON public.patient_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own patient summaries
CREATE POLICY "Users can create own patient summaries"
  ON public.patient_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own patient summaries
CREATE POLICY "Users can update own patient summaries"
  ON public.patient_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own patient summaries
CREATE POLICY "Users can delete own patient summaries"
  ON public.patient_summaries
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admin full access (for support purposes)
CREATE POLICY "Admins have full access to patient summaries"
  ON public.patient_summaries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE user_id = auth.uid()
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_patient_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_summaries_updated_at
  BEFORE UPDATE ON public.patient_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_summaries_updated_at();

-- Comment for documentation
COMMENT ON TABLE public.patient_summaries IS 
  'Long-term memory feature for Ultra Plan. Stores cumulative patient clinical profiles (max 2000 tokens) for historical context in AI analysis.';
