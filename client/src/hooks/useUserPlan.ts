import { useState, useEffect } from "react";

export interface UserPlanData {
	plan_type: string | null;
	credits_remaining: number;
	premium_credits_remaining?: number;
	subscription_status?: string;
	next_billing_date?: string;
	email?: string;
}

export const useUserPlan = (userId: string | undefined) => {
	const [planData, setPlanData] = useState<UserPlanData | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPlan = async () => {
		if (!userId) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const response = await fetch(
				`${apiUrl}/api/subscription-status/${userId}`,
			);

			if (!response.ok) {
				throw new Error("Error fetching plan status");
			}

			const data = await response.json();
			setPlanData(data);
			setError(null);
		} catch (err: any) {
			console.error("Error in useUserPlan:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPlan();
	}, [userId]);

	const refreshPlan = () => {
		fetchPlan();
	};

	return {
		planData,
		loading,
		error,
		refreshPlan,
		isFree: planData?.plan_type === "free",
		isPro: planData?.plan_type === "pro",
		isUltra: planData?.plan_type === "ultra",
		creditsExhausted: (planData?.credits_remaining ?? 0) <= 0,
	};
};
