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

	// Free, Pro, or Ultra (standard): decrement regular credits
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
			updates.credits_remaining = 100; // Pro: 100 sessions/month
			updates.premium_credits_remaining = 0;
			updates.monthly_transcriptions_used = 0;
			updates.transcription_month_year = new Date().toISOString().slice(0, 7);
			break;
		case "ultra":
			updates.credits_remaining = 100; // Ultra: 100 standard sessions/month
			updates.premium_credits_remaining = 20; // Ultra: 20 premium sessions/month
			updates.monthly_transcriptions_used = 0;
			updates.transcription_month_year = new Date().toISOString().slice(0, 7);
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
 * Pro plan: 100 credits/month
 * Ultra plan: 100 standard credits/month + 20 premium credits/month
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
		} else if (profile.plan_type === "pro") {
			updates.credits_remaining = 100; // Pro: 100 sessions/month
			updates.monthly_transcriptions_used = 0; // Reset usage counter
		} else if (profile.plan_type === "ultra") {
			updates.credits_remaining = 100; // Ultra: 100 standard sessions
			updates.premium_credits_remaining = 20; // Ultra: 20 premium sessions
			updates.monthly_transcriptions_used = 0; // Reset usage counter
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

// Ultra Plan Session Limit Management

/**
 * Check Ultra plan's 120 sessions per month hard limit
 * This limit applies to both standard and premium sessions combined
 */
export const checkUltraSessionLimit = async (
	userId: string
): Promise<{
	allowed: boolean;
	used: number;
	limit: number;
	monthYear: string;
}> => {
	const profile = await getUserProfile(userId);

	// Only enforce for Ultra plan
	if (profile.plan_type !== "ultra") {
		return { allowed: true, used: 0, limit: -1, monthYear: "" };
	}

	const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
	const ULTRA_PLAN_MONTHLY_LIMIT = 120;

	// Reset counter if new month
	if (profile.session_month_year !== currentMonth) {
		await supabase
			.from("profiles")
			.update({
				monthly_sessions_used: 0,
				session_month_year: currentMonth,
				credits_remaining: 100, // Renew standard credits
				premium_credits_remaining: 20, // Renew premium credits
				last_credit_renewal: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);

		console.log(
			`[DB] New month detected for Ultra user ${userId}, credits renewed`
		);

		return {
			allowed: true,
			used: 0,
			limit: ULTRA_PLAN_MONTHLY_LIMIT,
			monthYear: currentMonth,
		};
	}

	const used = profile.monthly_sessions_used || 0;
	return {
		allowed: used < ULTRA_PLAN_MONTHLY_LIMIT,
		used,
		limit: ULTRA_PLAN_MONTHLY_LIMIT,
		monthYear: currentMonth,
	};
};

/**
 * Increment Ultra plan's monthly session counter
 * This tracks all sessions (standard + premium) against the 120/month hard limit
 */
export const incrementUltraSessionCount = async (userId: string) => {
	const profile = await getUserProfile(userId);

	// Only track for Ultra plan
	if (profile.plan_type !== "ultra") {
		return;
	}

	const currentMonth = new Date().toISOString().slice(0, 7);

	await supabase
		.from("profiles")
		.update({
			monthly_sessions_used: (profile.monthly_sessions_used || 0) + 1,
			session_month_year: currentMonth,
			updated_at: new Date().toISOString(),
		})
		.eq("id", userId);

	console.log(
		`[DB] Ultra session count incremented for ${userId}: ${
			(profile.monthly_sessions_used || 0) + 1
		}/120`
	);
};

// Patient Summaries Management (Ultra Plan - Long-term Memory Feature)

/**
 * Get patient summary by userId and patientIdentifier
 * Returns existing cumulative clinical profile for historical context
 */
export const getPatientSummary = async (
	userId: string,
	patientIdentifier: string
) => {
	const { data, error } = await supabase
		.from("patient_summaries")
		.select("*")
		.eq("user_id", userId)
		.eq("patient_identifier", patientIdentifier)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// No rows returned - patient doesn't have a summary yet
			return null;
		}
		console.error("Error fetching patient summary:", error);
		throw error;
	}

	return data;
};

/**
 * Get the last N session summaries for a patient (for historical context injection)
 * Used to inject context into Claude for enhanced analysis
 */
export const getLastSessionSummaries = async (
	userId: string,
	patientIdentifier: string,
	limit: number = 3
) => {
	// Get the patient's summary which contains cumulative context
	const summary = await getPatientSummary(userId, patientIdentifier);

	if (!summary) {
		return null;
	}

	// Return the summary text (which already contains cumulative context from past sessions)
	// For now, we return the full summary. In the future, we could track individual session summaries
	return {
		summary_text: summary.summary_text,
		session_count: summary.session_count,
		last_session_date: summary.last_session_date,
	};
};

/**
 * Create or update a patient summary (upsert operation)
 * Updates cumulative clinical profile with new session information
 * Enforces max 2000 tokens (approximately 8000 characters)
 */
export const upsertPatientSummary = async (
	userId: string,
	patientIdentifier: string,
	summaryText: string,
	sessionCount?: number
) => {
	// Enforce token limit (rough approximation: 4 chars = 1 token)
	const MAX_CHARS = 8000; // ~2000 tokens
	const truncatedSummary =
		summaryText.length > MAX_CHARS ?
			summaryText.substring(0, MAX_CHARS) + "..."
		:	summaryText;

	// Check if summary exists
	const existing = await getPatientSummary(userId, patientIdentifier);

	if (existing) {
		// Update existing summary
		const { data, error } = await supabase
			.from("patient_summaries")
			.update({
				summary_text: truncatedSummary,
				session_count: sessionCount || existing.session_count + 1,
				last_session_date: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("user_id", userId)
			.eq("patient_identifier", patientIdentifier)
			.select()
			.single();

		if (error) {
			console.error("Error updating patient summary:", error);
			throw error;
		}

		console.log(
			`[DB] Updated patient summary for ${patientIdentifier} (session ${data.session_count})`
		);
		return data;
	} else {
		// Create new summary
		const { data, error } = await supabase
			.from("patient_summaries")
			.insert({
				user_id: userId,
				patient_identifier: patientIdentifier,
				summary_text: truncatedSummary,
				session_count: sessionCount || 1,
				last_session_date: new Date().toISOString(),
			})
			.select()
			.single();

		if (error) {
			console.error("Error creating patient summary:", error);
			throw error;
		}

		console.log(
			`[DB] Created patient summary for ${patientIdentifier} (session 1)`
		);
		return data;
	}
};

/**
 * Delete a patient summary (for GDPR compliance / user request)
 */
export const deletePatientSummary = async (
	userId: string,
	patientIdentifier: string
) => {
	const { error } = await supabase
		.from("patient_summaries")
		.delete()
		.eq("user_id", userId)
		.eq("patient_identifier", patientIdentifier);

	if (error) {
		console.error("Error deleting patient summary:", error);
		throw error;
	}

	console.log(`[DB] Deleted patient summary for ${patientIdentifier}`);
};

/**
 * List all patient summaries for a user (for UI display)
 */
export const listPatientSummaries = async (
	userId: string,
	limit: number = 50
) => {
	const { data, error } = await supabase
		.from("patient_summaries")
		.select("*")
		.eq("user_id", userId)
		.order("last_session_date", { ascending: false })
		.limit(limit);

	if (error) {
		console.error("Error listing patient summaries:", error);
		throw error;
	}

	return data;
};
