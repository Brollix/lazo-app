import { Router, Request, Response } from "express";
import { supabase } from "../services/dbService";

const router = Router();

/**
 * POST /api/validate-promo-code
 * Validate a promotional code
 */
router.post("/validate-promo-code", async (req: Request, res: Response) => {
	try {
		const { code, userId, planType } = req.body;

		if (!code) {
			return res.status(400).json({
				error: "Missing code",
				message: "Código promocional requerido",
			});
		}

		// Call the database function to validate the code
		const { data, error } = await supabase.rpc("validate_promo_code", {
			p_code: code.toUpperCase(),
			p_user_id: userId || null,
			p_plan_type: planType || null,
		});

		if (error) throw error;

		res.json(data);
	} catch (error: any) {
		console.error("[Promo] Error validating promo code:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/apply-promo-code
 * Apply a promotional code to a subscription
 */
router.post("/apply-promo-code", async (req: Request, res: Response) => {
	try {
		const { code, userId, subscriptionId, planType, originalPrice } = req.body;

		if (!code || !userId || !planType || !originalPrice) {
			return res.status(400).json({
				error: "Missing required fields",
				message: "Faltan campos requeridos",
			});
		}

		// Call the database function to apply the code
		const { data, error } = await supabase.rpc("apply_promo_code", {
			p_user_id: userId,
			p_code: code.toUpperCase(),
			p_subscription_id: subscriptionId || null,
			p_plan_type: planType,
			p_original_price: originalPrice,
		});

		if (error) throw error;

		// Check if application was successful
		if (data.success) {
			res.json(data);
		} else {
			res.status(400).json(data);
		}
	} catch (error: any) {
		console.error("[Promo] Error applying promo code:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * GET /api/user-promo-codes/:userId
 * Get active promo codes for a user
 */
router.get("/user-promo-codes/:userId", async (req: Request, res: Response) => {
	try {
		const { userId } = req.params;

		const { data, error } = await supabase
			.from("user_promo_codes")
			.select(
				`
        *,
        promotional_codes:promo_code_id (
          code,
          discount_percentage,
          duration_months
        )
      `
			)
			.eq("user_id", userId)
			.gt("months_remaining", 0)
			.order("applied_at", { ascending: false });

		if (error) throw error;

		res.json({ promoCodes: data });
	} catch (error: any) {
		console.error("[Promo] Error fetching user promo codes:", error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * POST /api/decrement-promo-months
 * Decrement the remaining months for a user's promo code (called on monthly billing)
 */
router.post("/decrement-promo-months", async (req: Request, res: Response) => {
	try {
		const { userId, subscriptionId } = req.body;

		if (!userId || !subscriptionId) {
			return res.status(400).json({
				error: "Missing required fields",
				message: "Faltan campos requeridos",
			});
		}

		// Call the database function to decrement months
		const { data, error } = await supabase.rpc("decrement_promo_months", {
			p_user_id: userId,
			p_subscription_id: subscriptionId,
		});

		if (error) throw error;

		res.json(data);
	} catch (error: any) {
		console.error("[Promo] Error decrementing promo months:", error);
		res.status(500).json({ error: error.message });
	}
});
/**
 * POST /api/activate-promo-direct
 * Activate a plan directly for 100% discount codes
 */
router.post("/activate-promo-direct", async (req: Request, res: Response) => {
	try {
		const { code, userId, planType } = req.body;

		if (!code || !userId || !planType) {
			return res.status(400).json({
				error: "Missing required fields",
				message: "Faltan campos requeridos",
			});
		}

		// 1. Validate the code one more time and check for 100% discount
		const { data: promoData, error: validateError } = await supabase.rpc(
			"validate_promo_code",
			{
				p_code: code.toUpperCase(),
				p_user_id: userId,
				p_plan_type: planType,
			}
		);

		if (validateError) throw validateError;
		if (!promoData.valid) {
			return res.status(400).json(promoData);
		}

		if (promoData.promo_code.discount_percentage !== 100) {
			return res.status(400).json({
				error: "Not a 100% discount",
				message: "Este código no es del 100% de descuento",
			});
		}

		// 2. Apply the promo code locally (no MercadoPago subscription ID)
		const { data: applyData, error: applyError } = await supabase.rpc(
			"apply_promo_code",
			{
				p_user_id: userId,
				p_code: code.toUpperCase(),
				p_subscription_id: "promo_100_direct", // Marker for direct activation
				p_plan_type: planType,
				p_original_price: 0, // Not relevant for 100%
			}
		);

		if (applyError) throw applyError;

		// 3. Update user profile with the new plan
		const { error: profileError } = await supabase
			.from("profiles")
			.update({
				plan_type: planType,
				subscription_status: "active",
			})
			.eq("id", userId);

		if (profileError) throw profileError;

		res.json({ success: true, message: "Plan activado directamente" });
	} catch (error: any) {
		console.error("[Promo] Error in direct activation:", error);
		res.status(500).json({ error: error.message });
	}
});

export default router;
