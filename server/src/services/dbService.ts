import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SUPABASE_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getUserProfile = async (userId: string) => {
	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", userId)
		.single();

	if (error) {
		console.error("Error fetching user profile:", error);
		// Return a default free profile if not found for now (graceful fallback)
		return { plan_type: "free", credits_remaining: 3 };
	}

	return data;
};

export const decrementCredits = async (userId: string) => {
	const { error } = await supabase.rpc("decrement_credits", {
		user_id: userId,
	});

	if (error) {
		console.error("Error decrementing credits via RPC:", error);
		// Fallback for logic if RPC not set up yet or fails
		const profile = await getUserProfile(userId);
		if (profile.credits_remaining > 0) {
			await supabase
				.from("profiles")
				.update({
					credits_remaining: profile.credits_remaining - 1,
					updated_at: new Date().toISOString(),
				})
				.eq("id", userId);
		}
	}
};

export const updateUserPlan = async (
	userId: string,
	plan: string,
	creditsToAdd: number = 50
) => {
	console.log(
		`[DB] Updating plan for ${userId} to ${plan}. Adding ${creditsToAdd} credits.`
	);

	// Get current profile to sum credits
	const profile = await getUserProfile(userId);
	const currentCredits = profile?.credits_remaining || 0;
	const newCredits = currentCredits + creditsToAdd;

	const { data, error, count } = await supabase
		.from("profiles")
		.update({
			plan_type: plan,
			credits_remaining: newCredits,
			updated_at: new Date().toISOString(),
		})
		.eq("id", userId)
		.select(); // Select to get returned data

	if (error) {
		console.error("Error updating user plan:", error);
		throw error;
	}

	return {
		plan,
		credits_remaining: newCredits,
		rowsUpdated: data?.length || 0,
	};
};
