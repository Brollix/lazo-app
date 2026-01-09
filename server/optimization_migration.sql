-- Optimization migration for improved performance

-- 1. Index on patients.user_id for RLS performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);

-- 2. Index on profiles.email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 3. Optimization of timestamp defaults
ALTER TABLE public.profiles 
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.patients 
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
