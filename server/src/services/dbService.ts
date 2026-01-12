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

export const cancelUserSubscription = async (userId: string) => {
	console.log(`[DB] Cancelling subscription for user ${userId}`);

	const { data, error } = await supabase.rpc("cancel_user_subscription", {
		p_user_id: userId,
	});

	if (error) {
		console.error("Error cancelling subscription via RPC:", error);
		throw error;
	}

	console.log(`[DB] Subscription cancelled successfully:`, data);
	return data;
};

// New subscription management functions

export const createOrUpdateSubscription = async (
	userId: string,
	mpSubscriptionId: string,
	mpPlanId: string,
	planType: string,
	status: string,
	amount: number,
	billingDay?: number,
	nextBillingDate?: Date
) => {
	console.log(`[DB] Creating/updating subscription for user ${userId}`);

	const { data, error } = await supabase.rpc("upsert_subscription", {
		p_user_id: userId,
		p_mp_subscription_id: mpSubscriptionId,
		p_mp_plan_id: mpPlanId,
		p_plan_type: planType,
		p_status: status,
		p_amount: amount,
		p_billing_day: billingDay || null,
		p_next_billing_date: nextBillingDate?.toISOString() || null,
	});

	if (error) {
		console.error("Error creating/updating subscription:", error);
		throw error;
	}

	console.log(`[DB] Subscription created/updated:`, data);
	return data;
};

export const recordPaymentAndRenewCredits = async (
	userId: string,
	mpPaymentId: string,
	mpSubscriptionId: string,
	amount: number,
	status: string,
	statusDetail?: string,
	creditsToAdd: number = 50
) => {
	console.log(
		`[DB] Recording payment ${mpPaymentId} for user ${userId}, adding ${creditsToAdd} credits`
	);

	const { data, error } = await supabase.rpc(
		"record_payment_and_renew_credits",
		{
			p_user_id: userId,
			p_mp_payment_id: mpPaymentId,
			p_mp_subscription_id: mpSubscriptionId,
			p_amount: amount,
			p_status: status,
			p_status_detail: statusDetail || null,
			p_credits_to_add: creditsToAdd,
		}
	);

	if (error) {
		console.error("Error recording payment:", error);
		throw error;
	}

	console.log(`[DB] Payment recorded:`, data);
	return data;
};

export const getSubscriptionByUserId = async (userId: string) => {
	const { data, error } = await supabase
		.from("subscriptions")
		.select("*")
		.eq("user_id", userId)
		.in("status", ["pending", "authorized", "paused"])
		.order("created_at", { ascending: false })
		.limit(1)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// No rows returned
			return null;
		}
		console.error("Error fetching subscription:", error);
		throw error;
	}

	return data;
};

export const getPaymentHistory = async (userId: string, limit: number = 10) => {
	const { data, error } = await supabase
		.from("payment_history")
		.select("*")
		.eq("user_id", userId)
		.order("created_at", { ascending: false })
		.limit(limit);

	if (error) {
		console.error("Error fetching payment history:", error);
		throw error;
	}

	return data;
};
