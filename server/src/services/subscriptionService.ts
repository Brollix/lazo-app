import axios from "axios";
import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import cron from "node-cron";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
// Priority: .env.local (development/test) > .env (production)
const envLocalPath = path.resolve(__dirname, "../../.env.local");
const envPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(envLocalPath)) {
	console.log("[Config] 🧪 Cargando .env.local (modo desarrollo/test)");
	dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
	console.log("[Config] 🚀 Cargando .env (modo producción)");
	dotenv.config({ path: envPath });
} else {
	console.warn("[Config] ⚠️  No se encontró .env ni .env.local");
	dotenv.config(); // Fallback to default behavior
}

// Determine MercadoPago mode (test or production)
const mpMode = (process.env.MP_MODE || "production").toLowerCase();
const isTestMode = mpMode === "test";

// Get the appropriate access token based on mode
const getAccessToken = () => {
	if (isTestMode) {
		const testToken = process.env.MP_ACCESS_TOKEN_TEST;
		if (!testToken) {
			console.warn(
				"[MercadoPago] ⚠️  MODO TEST activado pero MP_ACCESS_TOKEN_TEST no está configurado"
			);
		}
		return testToken || "";
	} else {
		const prodToken = process.env.MP_ACCESS_TOKEN;
		if (!prodToken) {
			console.warn(
				"[MercadoPago] ⚠️  MODO PRODUCCIÓN activado pero MP_ACCESS_TOKEN no está configurado"
			);
		}
		return prodToken || "";
	}
};

// MercadoPago Configuration
const accessToken = getAccessToken();
export const client = new MercadoPagoConfig({
	accessToken: accessToken,
});

// Log current mode on startup
console.log(
	`[MercadoPago] 🔧 Modo configurado: ${isTestMode ? "TEST 🧪" : "PRODUCCIÓN 🚀"}`
);
if (!accessToken) {
	console.error(
		`[MercadoPago] ❌ ERROR: Access Token no configurado para modo ${mpMode}`
	);
}

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares/tarjeta";

let currentDolarRate = 1950; // Fallback rate

export const fetchDolarTarjeta = async () => {
	try {
		const response = await axios.get(DOLAR_API_URL);
		if (response.data && response.data.compra && response.data.venta) {
			const compra = response.data.compra;
			const venta = response.data.venta;
			currentDolarRate = Math.round((compra + venta) / 2);
			console.log(
				`[Subscription] Dolar Tarjeta updated: ${currentDolarRate} (Compra: ${compra}, Venta: ${venta})`
			);
			return currentDolarRate;
		}
	} catch (error) {
		console.error("[Subscription] Error fetching Dolar rate:", error);
	}
	return currentDolarRate;
};

// Sync daily at 00:00
cron.schedule("0 0 * * *", () => {
	console.log("[Subscription] Running daily Dolar rate sync...");
	fetchDolarTarjeta();
});

// Initial fetch
fetchDolarTarjeta();

export const getPrices = () => {
	const proUsd = 10;
	const ultraUsd = 30;

	return {
		rate: currentDolarRate,
		pro: 50, // PRECIO DE PRUEBA - Cambiar a: Math.round(proUsd * currentDolarRate) para producción
		ultra: Math.round(ultraUsd * currentDolarRate),
		updatedAt: new Date().toISOString(),
	};
};

/**
 * Create a recurring subscription using Mercado Pago PreApproval API
 */
export const createRecurringSubscription = async (
	planId: "pro" | "ultra",
	userId: string,
	userEmail: string,
	redirectUrl?: string
) => {
	console.log("[createRecurringSubscription] Params:", {
		planId,
		userId,
		userEmail,
	});

	const frontUrl = redirectUrl || process.env.FRONTEND_URL;

	if (!frontUrl) {
		throw new Error("Missing redirectUrl/FRONTEND_URL");
	}

	if (!process.env.BACKEND_URL) {
		console.warn(
			"[createRecurringSubscription] BACKEND_URL missing. Webhooks will not be received."
		);
	}

	const prices = getPrices();
	const amount = planId === "pro" ? prices.pro : prices.ultra;
	const planTitle = `Lazo ${planId.charAt(0).toUpperCase() + planId.slice(1)}`;

	const preApproval = new PreApproval(client);

	try {
		// Use payment_email if available (from previous payments), otherwise use main email
		// This allows users to have different emails for Lazo (professional) and MercadoPago (personal)
		const payerEmail = userEmail; // First time: use Lazo email, will be updated by webhook

		const preApprovalBody: any = {
			reason: planTitle,
			auto_recurring: {
				frequency: 1,
				frequency_type: "months",
				transaction_amount: amount,
				currency_id: "ARS",
			},
			back_url: `${frontUrl}/payment-success`,
			payer_email: payerEmail,
			external_reference: userId,
			status: "pending",
		};

		// Add notification URL if BACKEND_URL is defined
		if (process.env.BACKEND_URL) {
			preApprovalBody.notification_url = `${process.env.BACKEND_URL}/api/mercadopago-webhook`;
		}

		console.log(
			"[createRecurringSubscription] Creating preapproval:",
			JSON.stringify(preApprovalBody, null, 2)
		);

		const response = await preApproval.create({ body: preApprovalBody });

		console.log("[createRecurringSubscription] Success:", {
			id: response.id,
			init_point: response.init_point,
			status: response.status,
		});

		return response;
	} catch (err: any) {
		console.error("[createRecurringSubscription] FAILED:", err.message || err);
		throw new Error(
			`MercadoPago Subscription Error: ${err.message || String(err)}`
		);
	}
};

/**
 * Get subscription details from Mercado Pago
 */
export const getSubscriptionDetails = async (subscriptionId: string) => {
	const preApproval = new PreApproval(client);
	try {
		const result = await preApproval.get({ id: subscriptionId });
		return result;
	} catch (error) {
		console.error("[Subscription] Error getting subscription details:", error);
		throw error;
	}
};

/**
 * Cancel a subscription in Mercado Pago
 */
export const cancelSubscription = async (subscriptionId: string) => {
	const preApproval = new PreApproval(client);
	try {
		console.log(
			`[cancelSubscription] Cancelling subscription ${subscriptionId}`
		);

		const result = await preApproval.update({
			id: subscriptionId,
			body: { status: "cancelled" },
		});

		console.log(`[cancelSubscription] Success:`, result);
		return result;
	} catch (error: any) {
		console.error("[cancelSubscription] Error:", error);
		throw error;
	}
};

/**
 * Pause a subscription in Mercado Pago
 */
export const pauseSubscription = async (subscriptionId: string) => {
	const preApproval = new PreApproval(client);
	try {
		console.log(`[pauseSubscription] Pausing subscription ${subscriptionId}`);

		const result = await preApproval.update({
			id: subscriptionId,
			body: { status: "paused" },
		});

		console.log(`[pauseSubscription] Success:`, result);
		return result;
	} catch (error: any) {
		console.error("[pauseSubscription] Error:", error);
		throw error;
	}
};

/**
 * Get payment details
 */
export const getPaymentDetails = async (paymentId: string) => {
	const payment = new Payment(client);
	try {
		const result = await payment.get({ id: paymentId });
		return result;
	} catch (error) {
		console.error("[Subscription] Error getting payment details:", error);
		throw error;
	}
};
