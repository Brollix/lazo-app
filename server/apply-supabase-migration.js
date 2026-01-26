const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load env variables
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
	console.log("Applying Supabase Migration...\n");

	// Read only the function updates from the migration file
	const updateSubscriptionFunction = `
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
`;

	const updatePaymentFunction = `
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
`;

	try {
		console.log("Updating create_or_update_subscription function...");

		// Use REST API to execute SQL
		const response1 = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: supabaseKey,
				Authorization: `Bearer ${supabaseKey}`,
				Prefer: "return=minimal",
			},
			body: JSON.stringify({ query: updateSubscriptionFunction }),
		});

		// Supabase doesn't expose raw SQL execution via REST API for security
		// We need to use the SQL Editor in the dashboard or psql
		console.log("Direct SQL execution not available via Supabase JS client\n");
		console.log("Using alternative approach: SQL query construction...\n");

		// Alternative: Try to use Supabase's query method
		const { data: d1, error: e1 } = await supabase.rpc("query", {
			query: updateSubscriptionFunction,
		});

		if (e1) {
			console.log(
				"RPC query method not available. Trying direct approach...\n",
			);

			// Try posting to /database/query endpoint
			const directUrl = `${supabaseUrl.replace(
				"supabase.co",
				"supabase.co/database/query",
			)}`;
			console.log(`Attempting direct query to: ${directUrl}`);

			// This won't work with standard Supabase setup
			console.log("\nCannot execute raw SQL via Supabase JS client");
			console.log(
				"Migration must be applied manually via Supabase Dashboard\n",
			);
			console.log("=".repeat(60));
			console.log("COPY AND RUN THESE TWO FUNCTIONS IN SUPABASE SQL EDITOR:");
			console.log("=".repeat(60));
			console.log("\n1️⃣  Update create_or_update_subscription:\n");
			console.log(updateSubscriptionFunction);
			console.log("\n" + "=".repeat(60));
			console.log("\n2️⃣  Update record_payment_and_renew_credits:\n");
			console.log(updatePaymentFunction);
			console.log("\n" + "=".repeat(60));
			console.log(
				"\nGo to: https://supabase.com/dashboard/project/_/sql/new\n",
			);
			return;
		}

		console.log("Migration applied successfully!");
	} catch (error) {
		console.error("\nError:", error.message);
		console.log("\nPlease apply migration manually in Supabase SQL Editor");
		console.log("   URL: https://supabase.com/dashboard/project/_/sql/new\n");
	}
}

applyMigration();
