import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "../services/dbService";

const router = Router();

// Admin UUID - Only this user can access admin endpoints
const ADMIN_UUID = "91501b61-418d-4767-9c8f-e85b3ab58432";

/**
 * Middleware to verify admin access
 * Checks if the userId in request body matches the admin UUID
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
	const userId = req.body.userId || req.query.userId;

	if (!userId) {
		return res.status(401).json({
			error: "No userId provided",
			message: "Autenticación requerida",
		});
	}

	if (userId !== ADMIN_UUID) {
		console.warn(`[Admin] Unauthorized access attempt by user: ${userId}`);
		return res.status(403).json({
			error: "Forbidden",
			message: "No tienes permisos para acceder a esta sección",
		});
	}

	console.log(`[Admin] Authorized access by admin: ${userId}`);
	next();
};

/**
 * GET /admin/stats
 * Returns enhanced KPIs for the admin dashboard
 */
router.get("/stats", isAdmin, async (req: Request, res: Response) => {
	try {
		console.log("[Admin] Fetching enhanced stats...");

		// 1. Total Users
		const { count: totalUsers, error: usersError } = await supabase
			.from("profiles")
			.select("*", { count: "exact", head: true });

		if (usersError) throw usersError;

		// 2. Active Users (last 7 days - Proxy: users who had a session)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const { data: activeUsersData, error: activeError } = await supabase
			.from("processing_sessions")
			.select("user_id")
			.gte("created_at", sevenDaysAgo.toISOString());

		if (activeError) throw activeError;
		const activeUsersCount = new Set(activeUsersData.map((s) => s.user_id))
			.size;

		// 3. Conversion Rate
		const { count: premiumUsersCount, error: premiumError } = await supabase
			.from("profiles")
			.select("*", { count: "exact", head: true })
			.in("plan_type", ["pro", "ultra"]);

		if (premiumError) throw premiumError;
		const conversionRate = totalUsers
			? ((premiumUsersCount || 0) / (totalUsers || 1)) * 100
			: 0;

		// 4. MRR
		const { data: subsData, error: subsError } = await supabase
			.from("profiles")
			.select("plan_type")
			.eq("subscription_status", "authorized");

		if (subsError) throw subsError;

		const PRO_PRICE = 19900;
		const ULTRA_PRICE = 48500;
		const proCount = subsData.filter((u) => u.plan_type === "pro").length;
		const ultraCount = subsData.filter((u) => u.plan_type === "ultra").length;
		const mrr = proCount * PRO_PRICE + ultraCount * ULTRA_PRICE;

		// 5. AI Burn Rate (Current Month)
		const firstDayOfMonth = new Date();
		firstDayOfMonth.setDate(1);
		firstDayOfMonth.setHours(0, 0, 0, 0);

		const { data: sessionsMonth, error: burnError } = await supabase
			.from("processing_sessions")
			.select("mode")
			.gte("created_at", firstDayOfMonth.toISOString())
			.eq("status", "completed");

		if (burnError) throw burnError;

		// Estimation: Ultra (high_precision) = 0.50 USD, Standard = 0.01 USD
		const burnRate = sessionsMonth.reduce((acc, s) => {
			return acc + (s.mode === "high_precision" ? 0.5 : 0.01);
		}, 0);

		// 6. Sessions Today
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		const { count: sessionsToday } = await supabase
			.from("processing_sessions")
			.select("*", { count: "exact", head: true })
			.gte("created_at", todayStart.toISOString());

		res.json({
			totalUsers: totalUsers || 0,
			activeUsers7d: activeUsersCount,
			conversionRate: parseFloat(conversionRate.toFixed(2)),
			mrr,
			aiBurnRate: parseFloat(burnRate.toFixed(2)),
			sessionsToday: sessionsToday || 0,
			breakdown: {
				proUsers: proCount,
				ultraUsers: ultraCount,
			},
		});
	} catch (error: any) {
		console.error("[Admin] Error fetching stats:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /admin/users
 * Returns list of users with usage stats
 */
router.get("/users", isAdmin, async (req: Request, res: Response) => {
	try {
		console.log("[Admin] Fetching users with usage stats...");

		// Get all profiles
		const { data: profiles, error: pError } = await supabase
			.from("profiles")
			.select("*")
			.order("created_at", { ascending: false });

		if (pError) throw pError;

		// Get session stats for each user (Last 30 days and Last Activity)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const { data: sessions, error: sError } = await supabase
			.from("processing_sessions")
			.select("user_id, created_at")
			.gte("created_at", thirtyDaysAgo.toISOString());

		if (sError) {
			console.error("[Admin] Sessions error:", sError);
			throw sError;
		}

		// Map stats to users
		const usersWithStats = profiles.map((profile) => {
			const userSessions = sessions.filter((s) => s.user_id === profile.id);
			const usageLastMonth = userSessions.length;

			// For last activity, we might need a separate query if no sessions in last 30 days
			// but for now we'll use what we have or just null.
			// Let's assume we want the ABSOLUTE last activity.
			return {
				...profile,
				usage_last_month: usageLastMonth,
				// Placeholder for absolute last activity - will be refined in frontend if needed
				// or we could do a more complex SQL join
				last_activity:
					userSessions.length > 0 ? userSessions[0].created_at : null,
			};
		});

		res.json({ users: usersWithStats });
	} catch (error: any) {
		console.error("[Admin] Error fetching users:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /admin/activity-feed
 * Returns last 10 processing sessions
 */
router.get("/activity-feed", isAdmin, async (req: Request, res: Response) => {
	try {
		const { data, error } = await supabase
			.from("processing_sessions")
			.select("id, created_at, status, mode, error_message, result")
			.order("created_at", { ascending: false })
			.limit(10);

		if (error) throw error;

		const feed = data.map((s) => ({
			id: s.id,
			created_at: s.created_at,
			status: s.status,
			mode: s.mode,
			error: s.error_message,
			duration: s.result?.duration || "N/A",
		}));

		res.json({ feed });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /admin/health
 * Checks connectivity to external AI services
 */
router.get("/health", isAdmin, async (req: Request, res: Response) => {
	const results: any = {
		supabase: { status: "unknown" },
		groq: { status: "unknown" },
		deepgram: { status: "unknown" },
		bedrock: { status: "unknown" },
	};

	try {
		// 1. Supabase Check
		const { error: sError } = await supabase
			.from("profiles")
			.select("id")
			.limit(1);
		results.supabase = {
			status: sError ? "error" : "healthy",
			error: sError?.message,
		};

		// 2. Groq Check (Minimal list call)
		if (process.env.GROQ_API_KEY) {
			try {
				const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
					headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
				});
				results.groq = {
					status: groqRes.ok ? "healthy" : "error",
					code: groqRes.status,
				};
			} catch (e: any) {
				results.groq = { status: "error", error: e.message };
			}
		} else {
			results.groq = { status: "missing_key" };
		}

		// 3. Deepgram Check
		if (process.env.DEEPGRAM_API_KEY) {
			try {
				const dgRes = await fetch("https://api.deepgram.com/v1/projects", {
					headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` },
				});
				results.deepgram = {
					status: dgRes.ok ? "healthy" : "error",
					code: dgRes.status,
				};
			} catch (e: any) {
				results.deepgram = { status: "error", error: e.message };
			}
		} else {
			results.deepgram = { status: "missing_key" };
		}

		// 4. Bedrock Check (Requires SDK or signed fetch - we'll just report if keys exist for now)
		results.bedrock = {
			status: process.env.AWS_ACCESS_KEY_ID ? "configured" : "missing_keys",
			region: process.env.AWS_REGION || "us-east-1",
		};

		res.json(results);
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /admin/user-sessions/:userId
 * Returns session history for a specific user
 */
router.get(
	"/user-sessions/:userId",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const { data, error } = await supabase
				.from("processing_sessions")
				.select("*")
				.eq("user_id", userId)
				.order("created_at", { ascending: false })
				.limit(50);

			if (error) throw error;
			res.json({ sessions: data });
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * GET /admin/announcements
 * Returns all announcements history
 */
router.get("/announcements", isAdmin, async (req: Request, res: Response) => {
	try {
		const { data, error } = await supabase
			.from("announcements")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) throw error;
		res.json({ announcements: data });
	} catch (error: any) {
		res.status(500).json({ error: error.message });
	}
});

/**
 * PATCH /admin/announcements/:id
 * Toggle announcement active status
 */
router.patch(
	"/announcements/:id",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { active } = req.body;

			const { data, error } = await supabase
				.from("announcements")
				.update({ active })
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			res.json({ success: true, announcement: data });
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * DELETE /admin/announcements/:id
 */
router.delete(
	"/announcements/:id",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { error } = await supabase
				.from("announcements")
				.delete()
				.eq("id", id);
			if (error) throw error;
			res.json({ success: true });
		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	}
);

export default router;
