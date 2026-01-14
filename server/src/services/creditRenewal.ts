import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SUPABASE_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Renews monthly credits for a user if a month has passed since last renewal
 * Free plan: 3 credits/month
 * Pro plan: unlimited (no renewal needed)
 * Ultra plan: 20 premium credits/month
 */
export const renewMonthlyCredits = async (userId: string) => {
	const profile = await getUserProfile(userId);

	if (!profile.last_credit_renewal) {
		console.log("[DB] No last_credit_renewal found, setting to now");
		await supabase
			.from("profiles")
			.update({ last_credit_renewal: new Date().toISOString() })
			.eq("id", userId);
		return;
	}

	const now = new Date();
	const lastRenewal = new Date(profile.last_credit_renewal);

	// Calculate months passed
	const monthsPassed =
		(now.getFullYear() - lastRenewal.getFullYear()) * 12 +
		(now.getMonth() - lastRenewal.getMonth());

	if (monthsPassed >= 1) {
		console.log(
			`[DB] ${monthsPassed} month(s) passed, renewing credits for ${profile.plan_type} plan`
		);

		let updates: any = { last_credit_renewal: now.toISOString() };

		if (profile.plan_type === "free") {
			updates.credits_remaining = 3;
		} else if (profile.plan_type === "ultra") {
			updates.premium_credits_remaining = 20;
		}
		// Pro plan: no renewal needed (unlimited)

		const { error } = await supabase
			.from("profiles")
			.update(updates)
			.eq("id", userId);

		if (error) {
			console.error("[DB] Error renewing credits:", error);
		} else {
			console.log("[DB] Credits renewed successfully:", updates);
		}
	}
};

// Import getUserProfile to avoid circular dependency issues
export const getUserProfile = async (userId: string) => {
	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", userId)
		.single();

	if (error) {
		console.error("Error fetching user profile:", error);
		// Return a default free profile if not found for now (graceful fallback)
		return {
			plan_type: "free",
			credits_remaining: 3,
			premium_credits_remaining: 0,
			last_credit_renewal: new Date().toISOString(),
		};
	}

	return data;
};
