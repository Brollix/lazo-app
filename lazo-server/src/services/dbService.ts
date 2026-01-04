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
	const { data, error } = await supabase.rpc("decrement_credits", {
		user_id: userId,
	});

	if (error) {
		console.error("Error decrementing credits:", error);
		// Fallback for logic if RPC not set up yet
		const profile = await getUserProfile(userId);
		if (profile.plan_type === "free") {
			await supabase
				.from("profiles")
				.update({ credits_remaining: profile.credits_remaining - 1 })
				.eq("id", userId);
		}
	}
};

export const updateUserPlan = async (userId: string, plan: string) => {
	const { error } = await supabase
		.from("profiles")
		.update({ plan_type: plan, credits_remaining: 999999 }) // Unlimited for paid
		.eq("id", userId);

	if (error) console.error("Error updating user plan:", error);
};
