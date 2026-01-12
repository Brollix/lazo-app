-- Reset credits to 3 for all free plan users
UPDATE public.profiles
SET credits_remaining = 3
WHERE plan_type = 'free';

-- Verify the update
SELECT id, email, plan_type, credits_remaining 
FROM public.profiles 
WHERE plan_type = 'free';
