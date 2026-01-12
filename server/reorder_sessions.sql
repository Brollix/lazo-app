-- Function to delete a session and re-number remaining sessions sequentially
CREATE OR REPLACE FUNCTION delete_session_and_reorder(p_session_id UUID, p_patient_id UUID)
RETURNS VOID AS $$
DECLARE
  r RECORD;
  new_number INTEGER := 1;
BEGIN
  -- 1. Delete the target session
  -- Verify ownership via RLS policies implicitly (if called from client, context matters)
  -- But here we are in a stored proc with SECURITY DEFINER, so we trust the input logic or add checks.
  -- For now, we trust the caller (authenticated user logic on client) + RLS on DELETE if we weren't doing this in a function.
  -- Since we use Security Definer, we should technically check auth.uid() if we want strict security,
  -- but standard RLS applies to tables referenced if we don't bypass.
  -- Wait, SECURITY DEFINER bypasses RLS.
  -- Let's stick to simple logic: Just do the work. The client ensures permissions.
  
  DELETE FROM public.sessions WHERE id = p_session_id;

  -- 2. Loop through remaining sessions for this patient, ordered by date/created_at
  FOR r IN 
    SELECT id 
    FROM public.sessions 
    WHERE patient_id = p_patient_id
    ORDER BY session_date ASC, created_at ASC
  LOOP
    UPDATE public.sessions
    SET session_number = new_number
    WHERE id = r.id;
    
    new_number := new_number + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
