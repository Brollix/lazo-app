import axios from "axios";
import { MercadoPagoConfig, Preference } from "mercadopago";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

// MercadoPago Configuration
const client = new MercadoPagoConfig({
	accessToken: process.env.MP_ACCESS_TOKEN || "",
});

const DOLAR_API_URL = "https://dolarapi.com/v1/dolares/tarjeta";

let currentDolarRate = 1950; // Fallback rate (User specified)

export const fetchDolarTarjeta = async () => {
	try {
		const response = await axios.get(DOLAR_API_URL);
		if (response.data && response.data.compra && response.data.venta) {
			// Calculate average between buy (compra) and sell (venta)
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
	const proUsd = 15;
	const ultraUsd = 30;

	return {
		rate: currentDolarRate,
		pro: Math.round(proUsd * currentDolarRate),
		ultra: Math.round(ultraUsd * currentDolarRate),
		updatedAt: new Date().toISOString(),
	};
};

export const createSubscriptionPreference = async (
	planId: "pro" | "ultra",
	userId: string,
	userEmail: string,
	redirectUrl?: string
) => {
	console.log("[createSubscriptionPreference] Params:", {
		planId,
		userId,
		userEmail,
	});
	console.log("[createSubscriptionPreference] Env:", {
		FRONTEND_URL: process.env.FRONTEND_URL,
		BACKEND_URL: process.env.BACKEND_URL,
		MP_TOKEN_EXISTS: !!process.env.MP_ACCESS_TOKEN,
	});

	// Fallback to env var if no redirectUrl provided (backward compatibility)
	const frontUrl = redirectUrl || process.env.FRONTEND_URL;

	if (!frontUrl || !process.env.BACKEND_URL) {
		console.warn("createSubscriptionPreference: Missing URL configuration", {
			frontUrl,
			backUrl: process.env.BACKEND_URL,
		});
		// We verify at least one is present, but won't throw immediately to avoid crashing if only logs are needed
	}

	const prices = getPrices();
	const amount = planId === "pro" ? prices.pro : prices.ultra;
	const description = `Lazo App - Plan ${
		planId.charAt(0).toUpperCase() + planId.slice(1)
	}`;

	const preference = new Preference(client);

	const response = await preference.create({
		body: {
			items: [
				{
					id: planId,
					title: description,
					quantity: 1,
					unit_price: amount,
					currency_id: "ARS",
				},
			],
			payer: {
				email: userEmail,
			},
			external_reference: userId,
			back_urls: {
				success: `${frontUrl}/payment-success`,
				failure: `${frontUrl}/payment-failure`,
				pending: `${frontUrl}/payment-pending`,
			},
			auto_return: "all",
			notification_url: `${process.env.BACKEND_URL}/api/mercadopago-webhook`,
		},
	});

	return response;
};
