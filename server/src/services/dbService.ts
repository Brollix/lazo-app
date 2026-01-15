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

export const decrementCredits = async (
	userId: string,
	isPremium: boolean = false
) => {
	const profile = await getUserProfile(userId);

	// Pro plan: unlimited credits, no decrement
	if (profile.plan_type === "pro") {
		console.log("[DB] Pro plan: unlimited credits, skipping decrement");
		return;
	}

	// Ultra plan with premium: decrement premium_credits
	if (profile.plan_type === "ultra" && isPremium) {
		if (profile.premium_credits_remaining > 0) {
			const { error } = await supabase
				.from("profiles")
				.update({
					premium_credits_remaining: profile.premium_credits_remaining - 1,
					updated_at: new Date().toISOString(),
				})
				.eq("id", userId);

			if (error) {
				console.error("Error decrementing premium credits:", error);
			}
		}
		return;
	}

	// Free or Ultra (standard): decrement regular credits
	if (profile.credits_remaining > 0) {
		const { error } = await supabase.rpc("decrement_credits", {
			user_id: userId,
		});

		if (error) {
			console.error("Error decrementing credits via RPC:", error);
			// Fallback for logic if RPC not set up yet or fails
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
	plan: "free" | "pro" | "ultra"
) => {
	console.log(`[DB] Updating plan for ${userId} to ${plan}`);

	let updates: any = {
		plan_type: plan,
		updated_at: new Date().toISOString(),
		last_credit_renewal: new Date().toISOString(),
	};

	// Set credits based on plan type
	switch (plan) {
		case "free":
			updates.credits_remaining = 3;
			updates.premium_credits_remaining = 0;
			break;
		case "pro":
			updates.credits_remaining = -1; // -1 indicates unlimited
			updates.premium_credits_remaining = 0;
			break;
		case "ultra":
			updates.credits_remaining = 0; // Ultra uses premium credits
			updates.premium_credits_remaining = 20;
			break;
	}

	const { data, error } = await supabase
		.from("profiles")
		.update(updates)
		.eq("id", userId)
		.select();

	if (error) {
		console.error("Error updating user plan:", error);
		throw error;
	}

	return {
		plan,
		credits_remaining: updates.credits_remaining,
		premium_credits_remaining: updates.premium_credits_remaining,
		rowsUpdated: data?.length || 0,
	};
};

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
	nextBillingDate?: Date,
	shouldUpdatePlan: boolean = true
) => {
	console.log(
		`[DB] Creating/updating subscription for user ${userId}, shouldUpdatePlan: ${shouldUpdatePlan}`
	);

	const { data, error } = await supabase.rpc("upsert_subscription", {
		p_user_id: userId,
		p_mp_subscription_id: mpSubscriptionId,
		p_mp_plan_id: mpPlanId,
		p_plan_type: planType,
		p_status: status,
		p_amount: amount,
		p_billing_day: billingDay || null,
		p_next_billing_date: nextBillingDate?.toISOString() || null,
		p_should_update_plan: shouldUpdatePlan,
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
	creditsToAdd: number = 0
) => {
	console.log(
		`[DB] Recording payment ${mpPaymentId} for user ${userId}, status: ${status}. Function will renew credits according to plan if approved.`
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

// Processing Sessions Management (replaces in-memory sessionStore)

export const createProcessingSession = async (
	userId: string,
	status: "processing" | "completed" | "error" = "processing",
	mode: "standard" | "high_precision" = "standard"
) => {
	const { data, error } = await supabase
		.from("processing_sessions")
		.insert({ user_id: userId, status, mode })
		.select()
		.single();

	if (error) {
		console.error("Error creating processing session:", error);
		throw error;
	}

	return data;
};

export const updateProcessingSession = async (
	sessionId: string,
	updates: {
		status?: "processing" | "completed" | "error";
		result?: any;
		error_message?: string;
	}
) => {
	const { data, error } = await supabase
		.from("processing_sessions")
		.update({ ...updates, updated_at: new Date().toISOString() })
		.eq("id", sessionId)
		.select()
		.single();

	if (error) {
		console.error("Error updating processing session:", error);
		throw error;
	}

	return data;
};

export const getProcessingSession = async (sessionId: string) => {
	const { data, error } = await supabase
		.from("processing_sessions")
		.select("*")
		.eq("id", sessionId)
		.single();

	if (error) {
		console.error("Error fetching processing session:", error);
		throw error;
	}

	return data;
};

// Monthly Transcription Limit Management (Free Plan)

export const checkMonthlyTranscriptionLimit = async (
	userId: string
): Promise<{
	allowed: boolean;
	used: number;
	limit: number;
	monthYear: string;
}> => {
	const profile = await getUserProfile(userId);

	// Only enforce for free plan
	if (profile.plan_type !== "free") {
		return { allowed: true, used: 0, limit: -1, monthYear: "" };
	}

	const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
	const FREE_PLAN_MONTHLY_LIMIT = 3;

	// Reset counter if new month
	if (profile.transcription_month_year !== currentMonth) {
		await supabase
			.from("profiles")
			.update({
				monthly_transcriptions_used: 0,
				transcription_month_year: currentMonth,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		return {
			allowed: true,
			used: 0,
			limit: FREE_PLAN_MONTHLY_LIMIT,
			monthYear: currentMonth,
		};
	}

	const used = profile.monthly_transcriptions_used || 0;
	return {
		allowed: used < FREE_PLAN_MONTHLY_LIMIT,
		used,
		limit: FREE_PLAN_MONTHLY_LIMIT,
		monthYear: currentMonth,
	};
};

export const incrementMonthlyTranscriptions = async (userId: string) => {
	const profile = await getUserProfile(userId);

	// Only track for free plan
	if (profile.plan_type !== "free") {
		return;
	}

	const currentMonth = new Date().toISOString().slice(0, 7);

	await supabase
		.from("profiles")
		.update({
			monthly_transcriptions_used:
				(profile.monthly_transcriptions_used || 0) + 1,
			transcription_month_year: currentMonth,
			updated_at: new Date().toISOString(),
		})
		.eq("id", userId);
};
