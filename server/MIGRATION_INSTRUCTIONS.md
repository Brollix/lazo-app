# 🔧 Supabase Migration Required

## Status

Your Supabase database schema is complete, but the **RPC functions need to be updated** to use the new credit renewal system.

## Current Situation

✅ Tables exist: `profiles`, `subscriptions`, `payment_history`, `subscription_plans`
✅ RPC functions exist: `create_or_update_subscription`, `record_payment_and_renew_credits`
❌ Functions use OLD implementation (additive credits instead of renewal)

## What Needs to Be Done

The RPC functions need to be updated to implement the **monthly credit renewal system**:

### Old Behavior (Current):
- When a payment is approved, credits are **added** to existing balance
- Users can accumulate unlimited credits

### New Behavior (Required):
- When a payment is approved, credits are **renewed** to fixed monthly amounts
- Pro plan: Reset to 100 regular credits
- Ultra plan: Reset to 100 regular + 20 premium credits
- Prevents credit accumulation, ensures fair monthly allocation

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project SQL Editor:
   ```
   https://supabase.com/dashboard/project/[your-project-id]/sql/new
   ```

2. Copy the entire contents of `server/supabase_subscriptions_migration.sql`

3. Paste it into the SQL Editor

4. Click "Run" to execute the migration

5. Verify with: `npm run check:rpc` (if you add this script)

### Option 2: Using psql (if you have direct database access)

```bash
cd server
psql "your-supabase-connection-string" -f supabase_subscriptions_migration.sql
```

### Option 3: Manual Update (Copy-Paste each function)

If the full migration file doesn't work, you can update each function individually:

#### 1. Update `create_or_update_subscription`

```sql
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
      -- ⭐ NEW: Initialize credits when plan is created
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
```

#### 2. Update `record_payment_and_renew_credits`

```sql
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
  -- Get subscription ID and plan_type
  SELECT id, plan_type INTO v_subscription_id, v_plan_type
  FROM public.subscriptions
  WHERE mp_subscription_id = p_mp_subscription_id;

  -- Record payment in history (always)
  INSERT INTO public.payment_history (
    user_id, subscription_id, mp_payment_id, mp_subscription_id,
    amount, status, status_detail, credits_added, payment_date
  )
  VALUES (
    p_user_id, v_subscription_id, p_mp_payment_id, p_mp_subscription_id,
    p_amount, p_status, p_status_detail, 0, timezone('utc'::text, now())
  )
  ON CONFLICT (mp_payment_id) DO NOTHING;

  -- ⭐ NEW: If payment approved, RENEW credits according to plan
  IF p_status = 'approved' THEN
    IF v_plan_type = 'pro' THEN
      -- Pro: RENEW regular credits to 100
      UPDATE public.profiles
      SET 
        credits_remaining = 100,
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    ELSIF v_plan_type = 'ultra' THEN
      -- Ultra: RENEW regular credits to 100 AND premium credits to 20
      UPDATE public.profiles
      SET 
        credits_remaining = 100,
        premium_credits_remaining = 20,
        last_credit_renewal = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- ⭐ NEW: Return credits_renewed instead of credits_added
  result := json_build_object(
    'payment_recorded', true,
    'credits_renewed', CASE WHEN p_status = 'approved' THEN true ELSE false END,
    'plan_type', v_plan_type,
    'payment_status', p_status
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification

After applying the migration, verify it worked:

```bash
cd server
node check-rpc-implementation.js
```

You should see:
```
✅ NEW IMPLEMENTATION DETECTED:
   - Credits are being RENEWED (not added) according to plan
```

## Important Notes

- ⚠️  This migration is **backward compatible** - existing data won't be affected
- ✅ Only affects how future payments are processed
- 🔒 Functions use `SECURITY DEFINER` so they run with elevated permissions
- 📊 The migration tracks `last_credit_renewal` for better credit management

## Need Help?

If you encounter any issues:
1. Check Supabase logs in the dashboard
2. Verify you're using the Service Role key (not anon key)
3. Ensure your database user has `CREATE FUNCTION` permissions
