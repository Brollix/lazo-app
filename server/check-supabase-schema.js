const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.resolve(__dirname, ".env.local") });
dotenv.config({ path: path.resolve(__dirname, ".env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
	console.log("🔍 Checking Supabase Schema...\n");

	try {
		// Check if tables exist
		console.log("📋 Checking Tables:");
		const tables = ["profiles", "subscriptions", "payment_history"];

		for (const table of tables) {
			const { data, error } = await supabase.from(table).select("*").limit(1);
			if (error) {
				console.log(`  ❌ ${table}: ${error.message}`);
			} else {
				console.log(`  ✅ ${table}: exists`);
			}
		}

		// Check profiles columns
		console.log("\n👤 Checking profiles table columns:");
		const { data: profile, error: profileError } = await supabase
			.from("profiles")
			.select("*")
			.limit(1)
			.single();

		if (profile) {
			const requiredColumns = [
				"id",
				"email",
				"plan_type",
				"credits_remaining",
				"premium_credits_remaining",
				"subscription_id",
				"subscription_status",
				"next_billing_date",
				"last_credit_renewal",
				"payment_email",
			];

			requiredColumns.forEach((col) => {
				if (col in profile) {
					console.log(`  ✅ ${col}`);
				} else {
					console.log(`  ❌ ${col}: MISSING`);
				}
			});
		}

		// Check if RPC functions exist
		console.log("\n⚙️  Checking RPC Functions:");

		// Test create_or_update_subscription
		try {
			await supabase.rpc("create_or_update_subscription", {
				p_user_id: "00000000-0000-0000-0000-000000000000",
				p_mp_subscription_id: "test",
				p_subscription_name: "test",
				p_plan_type: "pro",
				p_subscription_status: "pending",
				p_amount: 0,
				p_billing_day: 1,
				p_next_billing_date: null,
				p_should_update_plan: false,
			});
			console.log("  ✅ create_or_update_subscription: exists");
		} catch (err) {
			if (err.message.includes("Could not find the function")) {
				console.log("  ❌ create_or_update_subscription: MISSING");
			} else {
				console.log("  ✅ create_or_update_subscription: exists (tested)");
			}
		}

		// Test record_payment_and_renew_credits
		try {
			await supabase.rpc("record_payment_and_renew_credits", {
				p_user_id: "00000000-0000-0000-0000-000000000000",
				p_mp_payment_id: "test",
				p_mp_subscription_id: "test",
				p_amount: 0,
				p_status: "test",
				p_status_detail: null,
				p_credits_to_add: 0,
			});
			console.log("  ✅ record_payment_and_renew_credits: exists");
		} catch (err) {
			if (err.message.includes("Could not find the function")) {
				console.log("  ❌ record_payment_and_renew_credits: MISSING");
			} else {
				console.log("  ✅ record_payment_and_renew_credits: exists (tested)");
			}
		}

		// Check subscription plans table
		console.log("\n💰 Checking subscription_plans:");
		const { data: plans, error: plansError } = await supabase
			.from("subscription_plans")
			.select("*");

		if (plansError) {
			console.log(`  ❌ subscription_plans: ${plansError.message}`);
		} else {
			console.log(`  ✅ subscription_plans: exists (${plans?.length || 0} plans)`);
			if (plans && plans.length > 0) {
				plans.forEach((plan) => {
					console.log(
						`     - ${plan.plan_id}: ${plan.name} ($${plan.price_usd}/mo)`
					);
				});
			}
		}

		console.log("\n✨ Schema check complete!");
	} catch (error) {
		console.error("\n❌ Error checking schema:", error.message);
		process.exit(1);
	}
}

checkSchema();
