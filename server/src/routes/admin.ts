import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "../services/dbService";

// Cache for admin roles to avoid excessive database queries
// Cache expires after 5 minutes
const adminCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user is an admin by querying the admin_roles table
 */
async function checkAdminRole(userId: string): Promise<string | null> {
	// Check cache first
	const cached = adminCache.get(userId);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.role;
	}

	try {
		const { data, error } = await supabase
			.from("admin_roles")
			.select("role")
			.eq("user_id", userId)
			.single();

		if (error || !data) {
			adminCache.delete(userId);
			return null;
		}

		// Update cache
		adminCache.set(userId, { role: data.role, timestamp: Date.now() });
		return data.role;
	} catch (err) {
		console.error("[Admin] Error checking admin role:", err);
		return null;
	}
}

/**
 * Middleware to verify admin access
 * Checks if the userId has an entry in the admin_roles table
 */
export const isAdmin = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const userId = req.body.userId || req.query.userId;

	if (!userId) {
		return res.status(401).json({
			error: "No userId provided",
			message: "Autenticación requerida",
		});
	}

	const role = await checkAdminRole(userId);

	if (!role) {
		console.warn(`[Admin] Unauthorized access attempt by user: ${userId}`);
		return res.status(403).json({
			error: "Forbidden",
			message: "No tienes permisos para acceder a esta sección",
		});
	}

	console.log(`[Admin] Authorized access by ${role}: ${userId}`);

	// Attach role to request for use in route handlers
	(req as any).adminRole = role;
	next();
};

/**
 * Middleware to verify super admin access
 * Only super_admins can access routes protected by this middleware
 */
export const isSuperAdmin = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const userId = req.body.userId || req.query.userId;

	if (!userId) {
		return res.status(401).json({
			error: "No userId provided",
			message: "Autenticación requerida",
		});
	}

	const role = await checkAdminRole(userId);

	if (role !== "super_admin") {
		console.warn(
			`[Admin] Unauthorized super admin access attempt by user: ${userId}`
		);
		return res.status(403).json({
			error: "Forbidden",
			message: "Solo super administradores pueden acceder a esta sección",
		});
	}

	console.log(`[Admin] Authorized super admin access: ${userId}`);
	(req as any).adminRole = role;
	next();
};

const router = Router();

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
		const conversionRate =
			totalUsers ? ((premiumUsersCount || 0) / (totalUsers || 1)) * 100 : 0;

		// 4. MRR
		const { data: subsData, error: subsError } = await supabase
			.from("profiles")
			.select("plan_type")
			.eq("subscription_status", "authorized");

		if (subsError) throw subsError;

		// Get plan prices from database
		const { data: planData, error: planError } = await supabase
			.from("subscription_plans")
			.select("plan_type, price_ars");

		if (planError) throw planError;

		const proPlan = planData.find((p) => p.plan_type === "pro");
		const ultraPlan = planData.find((p) => p.plan_type === "ultra");

		// Use fixed peso prices from database
		const PRO_PRICE = proPlan?.price_ars || 0;
		const ULTRA_PRICE = ultraPlan?.price_ars || 0;

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

		// 7. Daily Stats (last 7 days sessions)
		const sevenDaysAgoStart = new Date();
		sevenDaysAgoStart.setDate(sevenDaysAgoStart.getDate() - 7);
		sevenDaysAgoStart.setHours(0, 0, 0, 0);

		const { data: dailySessions, error: dailyError } = await supabase
			.from("processing_sessions")
			.select("created_at")
			.gte("created_at", sevenDaysAgoStart.toISOString());

		if (dailyError) throw dailyError;

		const dailyStats = [];
		for (let i = 6; i >= 0; i--) {
			const d = new Date();
			d.setDate(d.getDate() - i);
			const dateStr = d.toISOString().split("T")[0];
			const count = dailySessions.filter((s) =>
				s.created_at.startsWith(dateStr)
			).length;
			dailyStats.push({ date: dateStr, count });
		}

		// 8. Sessions Today
		const sessionsToday = dailyStats[dailyStats.length - 1]?.count || 0;

		res.json({
			totalUsers: totalUsers || 0,
			activeUsers7d: activeUsersCount,
			conversionRate: parseFloat(conversionRate.toFixed(2)),
			mrr,
			aiBurnRate: parseFloat(burnRate.toFixed(2)),
			sessionsToday: sessionsToday || 0,
			dailyStats,
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

/**
 * GET /admin/plans
 * Returns all subscription plans (including inactive)
 */
router.get("/plans", isAdmin, async (req: Request, res: Response) => {
	try {
		const { data: plans, error } = await supabase
			.from("subscription_plans")
			.select("*")
			.order("display_order", { ascending: true });

		if (error) throw error;
		res.json({ plans });
	} catch (error: any) {
		console.error("[Admin] Error fetching plans:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * PATCH /admin/plans/:id
 * Update a subscription plan
 */
router.patch("/plans/:id", isAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const {
			name,
			description,
			price_usd,
			price_ars,
			features,
			credits_initial,
			credits_monthly,
			is_active,
			display_order,
		} = req.body;

		const { data, error } = await supabase
			.from("subscription_plans")
			.update({
				name,
				description,
				price_usd,
				price_ars,
				features,
				credits_initial,
				credits_monthly,
				is_active,
				display_order,
			})
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		res.json({ success: true, plan: data });
	} catch (error: any) {
		console.error("[Admin] Error updating plan:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /admin/plans
 * Create a new subscription plan
 */
router.post("/plans", isAdmin, async (req: Request, res: Response) => {
	try {
		const {
			plan_type,
			name,
			description,
			price_usd,
			price_ars,
			features,
			credits_initial,
			credits_monthly,
			is_active,
			display_order,
		} = req.body;

		const { data, error } = await supabase
			.from("subscription_plans")
			.insert({
				plan_type,
				name,
				description,
				price_usd,
				price_ars,
				features,
				credits_initial,
				credits_monthly,
				is_active,
				display_order,
			})
			.select()
			.single();

		if (error) throw error;
		res.json({ success: true, plan: data });
	} catch (error: any) {
		console.error("[Admin] Error creating plan:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * DELETE /admin/plans/:id
 * Delete a subscription plan
 */
router.delete("/plans/:id", isAdmin, async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		// Instead of deleting, we'll deactivate the plan
		const { data, error } = await supabase
			.from("subscription_plans")
			.update({ is_active: false })
			.eq("id", id)
			.select()
			.single();

		if (error) throw error;
		res.json({ success: true, plan: data });
	} catch (error: any) {
		console.error("[Admin] Error deleting plan:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /admin/admins
 * List all admin users with their roles
 * Only accessible by super_admins
 */
router.get("/admins", isSuperAdmin, async (req: Request, res: Response) => {
	try {
		const { data: admins, error } = await supabase
			.from("admin_roles")
			.select(
				`
				id,
				user_id,
				role,
				created_at,
				created_by,
				profiles:user_id (
					email,
					full_name
				)
			`
			)
			.order("created_at", { ascending: false });

		if (error) throw error;

		res.json({ admins });
	} catch (error: any) {
		console.error("[Admin] Error fetching admins:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /admin/admins
 * Add a new admin user
 * Only accessible by super_admins
 */
router.post("/admins", isSuperAdmin, async (req: Request, res: Response) => {
	try {
		const { email, role } = req.body;
		const currentAdminId = req.body.userId;

		if (!email || !role) {
			return res.status(400).json({
				error: "Missing required fields",
				message: "Email y rol son requeridos",
			});
		}

		if (!["super_admin", "admin", "moderator"].includes(role)) {
			return res.status(400).json({
				error: "Invalid role",
				message: "Rol inválido. Debe ser: super_admin, admin, o moderator",
			});
		}

		// Find user by email
		const { data: userData, error: userError } = await supabase
			.from("profiles")
			.select("id")
			.eq("email", email)
			.single();

		if (userError || !userData) {
			return res.status(404).json({
				error: "User not found",
				message: "No se encontró un usuario con ese email",
			});
		}

		// Insert admin role
		const { data, error } = await supabase
			.from("admin_roles")
			.insert({
				user_id: userData.id,
				role,
				created_by: currentAdminId,
			})
			.select()
			.single();

		if (error) {
			if (error.code === "23505") {
				// Unique constraint violation
				return res.status(409).json({
					error: "User already admin",
					message: "Este usuario ya es administrador",
				});
			}
			throw error;
		}

		// Clear cache for this user
		adminCache.delete(userData.id);

		res.json({ success: true, admin: data });
	} catch (error: any) {
		console.error("[Admin] Error adding admin:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * PATCH /admin/admins/:userId
 * Update an admin user's role
 * Only accessible by super_admins
 */
router.patch(
	"/admins/:userId",
	isSuperAdmin,
	async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const { role } = req.body;

			if (!role) {
				return res.status(400).json({
					error: "Missing role",
					message: "Rol es requerido",
				});
			}

			if (!["super_admin", "admin", "moderator"].includes(role)) {
				return res.status(400).json({
					error: "Invalid role",
					message: "Rol inválido. Debe ser: super_admin, admin, o moderator",
				});
			}

			const { data, error } = await supabase
				.from("admin_roles")
				.update({ role })
				.eq("user_id", userId)
				.select()
				.single();

			if (error) throw error;

			// Clear cache for this user
			if (typeof userId === "string") {
				adminCache.delete(userId);
			}

			res.json({ success: true, admin: data });
		} catch (error: any) {
			console.error("[Admin] Error updating admin:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * DELETE /admin/admins/:userId
 * Remove admin access from a user
 * Only accessible by super_admins
 */
router.delete(
	"/admins/:userId",
	isSuperAdmin,
	async (req: Request, res: Response) => {
		try {
			const { userId } = req.params;
			const currentAdminId = req.body.userId;

			// Prevent self-deletion
			if (userId === currentAdminId) {
				return res.status(400).json({
					error: "Cannot remove self",
					message: "No puedes remover tu propio acceso de administrador",
				});
			}

			const { error } = await supabase
				.from("admin_roles")
				.delete()
				.eq("user_id", userId);

			if (error) throw error;

			// Clear cache for this user
			if (typeof userId === "string") {
				adminCache.delete(userId);
			}

			res.json({ success: true });
		} catch (error: any) {
			console.error("[Admin] Error removing admin:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * GET /admin/promo-codes
 * List all promotional codes
 */
router.get("/promo-codes", isAdmin, async (req: Request, res: Response) => {
	try {
		const { data, error } = await supabase
			.from("promotional_codes")
			.select("*")
			.order("created_at", { ascending: false });

		if (error) throw error;
		res.json({ promoCodes: data });
	} catch (error: any) {
		console.error("[Admin] Error fetching promo codes:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /admin/promo-codes
 * Create a new promotional code
 */
router.post("/promo-codes", isAdmin, async (req: Request, res: Response) => {
	try {
		const { code, discount_percentage, duration_months, max_uses, expires_at } =
			req.body;
		const currentAdminId = req.body.userId;

		// Validate code format (4 uppercase characters)
		if (!code || !/^[A-Z]{4}$/.test(code)) {
			return res.status(400).json({
				error: "Invalid code format",
				message: "El código debe tener exactamente 4 letras mayúsculas",
			});
		}

		// Validate discount percentage
		if (
			!discount_percentage ||
			discount_percentage < 1 ||
			discount_percentage > 100
		) {
			return res.status(400).json({
				error: "Invalid discount percentage",
				message: "El descuento debe estar entre 1% y 100%",
			});
		}

		// Validate duration
		if (!duration_months || duration_months < 1) {
			return res.status(400).json({
				error: "Invalid duration",
				message: "La duración debe ser al menos 1 mes",
			});
		}

		const { data, error } = await supabase
			.from("promotional_codes")
			.insert({
				code,
				discount_percentage,
				duration_months,
				max_uses: max_uses || null,
				expires_at: expires_at || null,
				created_by: currentAdminId,
			})
			.select()
			.single();

		if (error) {
			if (error.code === "23505") {
				// Unique constraint violation
				return res.status(409).json({
					error: "Code already exists",
					message: "Este código promocional ya existe",
				});
			}
			throw error;
		}

		res.json({ success: true, promoCode: data });
	} catch (error: any) {
		console.error("[Admin] Error creating promo code:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * PATCH /admin/promo-codes/:id
 * Update a promotional code
 */
router.patch(
	"/promo-codes/:id",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const {
				discount_percentage,
				duration_months,
				max_uses,
				expires_at,
				is_active,
			} = req.body;

			const updateData: any = {};
			if (discount_percentage !== undefined)
				updateData.discount_percentage = discount_percentage;
			if (duration_months !== undefined)
				updateData.duration_months = duration_months;
			if (max_uses !== undefined) updateData.max_uses = max_uses;
			if (expires_at !== undefined) updateData.expires_at = expires_at;
			if (is_active !== undefined) updateData.is_active = is_active;

			const { data, error } = await supabase
				.from("promotional_codes")
				.update(updateData)
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			res.json({ success: true, promoCode: data });
		} catch (error: any) {
			console.error("[Admin] Error updating promo code:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * DELETE /admin/promo-codes/:id
 * Deactivate a promotional code
 */
router.delete(
	"/promo-codes/:id",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			// Instead of deleting, we deactivate the code
			const { data, error } = await supabase
				.from("promotional_codes")
				.update({ is_active: false })
				.eq("id", id)
				.select()
				.single();

			if (error) throw error;
			res.json({ success: true, promoCode: data });
		} catch (error: any) {
			console.error("[Admin] Error deleting promo code:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

/**
 * GET /admin/promo-codes/:id/usage
 * Get usage statistics for a promotional code
 */
router.get(
	"/promo-codes/:id/usage",
	isAdmin,
	async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const { data, error } = await supabase
				.from("user_promo_codes")
				.select(
					`
        *,
        profiles:user_id (
          email,
          full_name
        )
      `
				)
				.eq("promo_code_id", id)
				.order("applied_at", { ascending: false });

			if (error) throw error;
			res.json({ usage: data });
		} catch (error: any) {
			console.error("[Admin] Error fetching promo code usage:", error);
			res.status(500).json({ error: error.message });
		}
	}
);

export default router;
