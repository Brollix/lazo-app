-- Add full_name field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update the handle_new_user function to support full_name
-- Note: The full_name will be updated separately after signup via client
-- This ensures the trigger still works for basic profile creation
