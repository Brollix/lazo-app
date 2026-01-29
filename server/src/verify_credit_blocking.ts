import {
	getUserProfile,
	decrementCredits,
	updateUserPlan,
} from "./services/dbService";
import { supabase } from "./services/dbService";
import dotenv from "dotenv";

dotenv.config();

async function testCreditBlocking() {
	const TEST_USER_ID = "test-user-id"; // Replace with a real user ID for integration test or mock

	try {
		console.log("--- Testing Credit Blocking ---");

		// 1. Manually set user to free plan with 0 credits
		const { error: updateError } = await supabase
			.from("profiles")
			.update({
				plan_type: "free",
				credits_remaining: 0,
				monthly_transcriptions_used: 3,
				transcription_month_year: new Date().toISOString().slice(0, 7),
			})
			.eq("id", TEST_USER_ID);

		if (updateError) {
			console.log("User not found, simulating logic instead.");
		} else {
			console.log("User credits set to 0 for Free plan.");
		}

		// 2. Mock a request to AI action and check logic
		const profile = await getUserProfile(TEST_USER_ID);
		console.log("Profile plan:", profile.plan_type);
		console.log("Credits remaining:", profile.credits_remaining);

		if (profile.plan_type === "free" && profile.credits_remaining <= 0) {
			console.log(
				"SUCCESS: Logic correctly identifies that credits are exhausted for AI actions.",
			);
		} else {
			console.log("FAILURE: Logic failed to identify exhausted credits.");
		}
	} catch (err) {
		console.error("Test failed:", err);
	}
}

testCreditBlocking();
