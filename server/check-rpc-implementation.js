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

async function checkRPCImplementation() {
	console.log("🔍 Checking RPC Function Implementation...\n");

	try {
		// Test if the new credit renewal logic is in place
		console.log(
			"Testing record_payment_and_renew_credits with approved payment..."
		);

		// Get a real user to test with
		const { data: profiles } = await supabase
			.from("profiles")
			.select("id, plan_type")
			.limit(1)
			.single();

		if (!profiles) {
			console.log("❌ No profiles found to test with");
			return;
		}

		console.log(`Using test user: ${profiles.id} (${profiles.plan_type})`);

		// Create a test subscription if needed
		await supabase.rpc("create_or_update_subscription", {
			p_user_id: profiles.id,
			p_mp_subscription_id: "test-sub-123",
			p_subscription_name: "Test Pro",
			p_plan_type: "pro",
			p_subscription_status: "authorized",
			p_amount: 50,
			p_billing_day: 15,
			p_next_billing_date: null,
			p_should_update_plan: false,
		});

		console.log("✅ Test subscription created");

		// Test payment recording with approved status
		const result = await supabase.rpc("record_payment_and_renew_credits", {
			p_user_id: profiles.id,
			p_mp_payment_id: `test-payment-${Date.now()}`,
			p_mp_subscription_id: "test-sub-123",
			p_amount: 50,
			p_status: "approved",
			p_status_detail: "accredited",
			p_credits_to_add: 0, // Should be ignored by new implementation
		});

		console.log("\n📊 Function result:", JSON.stringify(result.data, null, 2));

		// Check if the result indicates credit renewal (not addition)
		if (result.data && result.data.credits_renewed) {
			console.log("\n✅ NEW IMPLEMENTATION DETECTED:");
			console.log(
				"   - Credits are being RENEWED (not added) according to plan"
			);
			console.log(`   - Plan type: ${result.data.plan_type}`);
			console.log(`   - Payment status: ${result.data.payment_status}`);
		} else if (result.data && result.data.credits_added !== undefined) {
			console.log("\n⚠️  OLD IMPLEMENTATION DETECTED:");
			console.log("   - Credits are being ADDED (not renewed)");
			console.log(`   - Credits added: ${result.data.credits_added}`);
			console.log("\n🔧 MIGRATION NEEDED: Run the SQL migration to update functions");
		} else {
			console.log("\n❓ Unable to determine implementation version");
		}

		// Check profile to see actual credits
		const { data: updatedProfile } = await supabase
			.from("profiles")
			.select("credits_remaining, premium_credits_remaining, last_credit_renewal")
			.eq("id", profiles.id)
			.single();

		console.log("\n👤 Profile state after payment:");
		console.log(
			`   - Regular credits: ${updatedProfile?.credits_remaining || 0}`
		);
		console.log(
			`   - Premium credits: ${updatedProfile?.premium_credits_remaining || 0}`
		);
		console.log(
			`   - Last renewal: ${updatedProfile?.last_credit_renewal || "never"}`
		);

		// Check if credits match expected values for plan
		if (profiles.plan_type === "pro" && updatedProfile?.credits_remaining === 100) {
			console.log("\n✅ Credits match Pro plan expectations (100)");
		} else if (
			profiles.plan_type === "ultra" &&
			updatedProfile?.credits_remaining === 100 &&
			updatedProfile?.premium_credits_remaining === 20
		) {
			console.log("\n✅ Credits match Ultra plan expectations (100 + 20)");
		} else {
			console.log("\n⚠️  Credits don't match expected values for plan");
		}
	} catch (error) {
		console.error("\n❌ Error:", error.message);
		if (error.details) {
			console.error("Details:", error.details);
		}
	}
}

checkRPCImplementation();
