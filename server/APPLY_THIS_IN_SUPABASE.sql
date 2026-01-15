-- ============================================================
-- MIGRACIÓN DE FUNCIONES SUPABASE
-- ============================================================
-- Copia y pega este archivo completo en el SQL Editor de Supabase
-- URL: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================

-- 1. Actualizar create_or_update_subscription
--    Ahora inicializa créditos cuando se crea una suscripción
CREATE OR REPLACE FUNCTION create_or_update_subscription(
  p_user_id UUID,
  p_mp_subscription_id TEXT,
  p_subscription_name TEXT,
  p_plan_type TEXT,
  p_status TEXT,
  p_amount DECIMAL,
  p_billing_day INTEGER DEFAULT NULL,
  p_next_billing_date TIMESTAMP DEFAULT NULL,
  p_should_update_plan BOOLEAN DEFAULT FALSE,
  p_mp_plan_id TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_subscription_id UUID;
  result json;
BEGIN
  INSERT INTO public.subscriptions (
    user_id, mp_subscription_id, subscription_name, plan_type,
    status, amount, billing_day, next_billing_date, mp_plan_id
  )
  VALUES (
    p_user_id, p_mp_subscription_id, p_subscription_name, p_plan_type,
    p_status, p_amount, p_billing_day, p_next_billing_date, p_mp_plan_id
  )
  ON CONFLICT (mp_subscription_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    next_billing_date = EXCLUDED.next_billing_date,
    updated_at = timezone('utc'::text, now()),
    paused_at = CASE WHEN EXCLUDED.status = 'paused' THEN timezone('utc'::text, now()) ELSE subscriptions.paused_at END,
    cancelled_at = CASE WHEN EXCLUDED.status = 'cancelled' THEN timezone('utc'::text, now()) ELSE subscriptions.cancelled_at END
  RETURNING id INTO v_subscription_id;

  IF p_should_update_plan THEN
    UPDATE public.profiles
    SET 
      subscription_id = p_mp_subscription_id,
      subscription_status = p_status,
      subscription_plan_id = p_mp_plan_id,
      plan_type = p_plan_type,
      next_billing_date = p_next_billing_date,
      subscription_started_at = CASE WHEN subscription_started_at IS NULL THEN timezone('utc'::text, now()) ELSE subscription_started_at END,
      credits_remaining = CASE 
        WHEN p_plan_type = 'pro' THEN 100
        WHEN p_plan_type = 'ultra' THEN 100
        ELSE credits_remaining
      END,
      premium_credits_remaining = CASE 
        WHEN p_plan_type = 'ultra' THEN 20
        WHEN p_plan_type = 'pro' THEN 0
        ELSE premium_credits_remaining
      END,
      last_credit_renewal = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  ELSE
    UPDATE public.profiles
    SET 
      subscription_id = p_mp_subscription_id,
      subscription_status = p_status,
      subscription_plan_id = p_mp_plan_id,
      next_billing_date = p_next_billing_date,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;
  END IF;

  result := json_build_object(
    'subscription_id', v_subscription_id,
    'mp_subscription_id', p_mp_subscription_id,
    'status', p_status,
    'plan_updated', p_should_update_plan
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Actualizar record_payment_and_renew_credits
--    Ahora RENUEVA créditos en lugar de sumarlos
CREATE OR REPLACE FUNCTION record_payment_and_renew_credits(
  p_user_id UUID,
  p_mp_payment_id TEXT,
  p_mp_subscription_id TEXT,
  p_amount DECIMAL,
  p_status TEXT,
  p_status_detail TEXT DEFAULT NULL,
  p_credits_to_add INTEGER DEFAULT 0
)
RETURNS json AS $$
DECLARE
  v_subscription_id UUID;
  v_plan_type TEXT;
  result json;
BEGIN
  SELECT id, plan_type INTO v_subscription_id, v_plan_type
  FROM public.subscriptions
  WHERE mp_subscription_id = p_mp_subscription_id;

  INSERT INTO public.payment_history (
    user_id, subscription_id, mp_payment_id, mp_subscription_id,
    amount, status, status_detail, credits_added, payment_date
  )
  VALUES (
    p_user_id, v_subscription_id, p_mp_payment_id, p_mp_subscription_id,
    p_amount, p_status, p_status_detail, 0, timezone('utc'::text, now())
  )
  ON CONFLICT (mp_payment_id) DO NOTHING;

  IF p_status = 'approved' THEN
    IF v_plan_type = 'pro' THEN
      UPDATE public.profiles
      SET 
        credits_remaining = 100,
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    ELSIF v_plan_type = 'ultra' THEN
      UPDATE public.profiles
      SET 
        credits_remaining = 100,
        premium_credits_remaining = 20,
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    END IF;
  END IF;

  result := json_build_object(
    'payment_recorded', true,
    'credits_renewed', CASE WHEN p_status = 'approved' THEN true ELSE false END,
    'plan_type', v_plan_type,
    'payment_status', p_status
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
-- Después de ejecutar, verifica que funcionó con:
-- cd server && node check-rpc-implementation.js
-- ============================================================
