-- Function to check if a user exists by email
-- This is used to provide more granular feedback during login (user not found vs wrong password)
CREATE OR REPLACE FUNCTION check_user_exists(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE email = email_to_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
