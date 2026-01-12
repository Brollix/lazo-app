import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration - more explicit for CloudFront compatibility
const corsOptions = {
	origin: function (origin: string | undefined, callback: Function) {
		// Allow requests with or without origin (e.g., mobile apps, Postman)
		if (!origin) return callback(null, true);
		// Allow all origins for now - you can restrict this in production
		callback(null, true);
	},
	methods: ["GET", "POST", "OPTIONS"],
	allowedHeaders: [
		"Content-Type",
		"Authorization",
		"X-Requested-With",
		"Accept",
		"Origin",
		"Access-Control-Request-Method",
		"Access-Control-Request-Headers",
	],
	exposedHeaders: [
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Credentials",
	],
	credentials: true,
	maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests
app.options("*", cors(corsOptions));

// Additional middleware to ensure CORS headers are always present
app.use((req, res, next) => {
	const origin = req.headers.origin;
	if (origin) {
		res.header("Access-Control-Allow-Origin", origin);
		res.header("Access-Control-Allow-Credentials", "true");
	}
	res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.header(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
	);
	next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

import multer from "multer";
import {
	uploadAudioToS3,
	startMedicalTranscriptionJob,
	getMedicalTranscriptionJobStatus,
	startTranscriptionJob,
	getTranscriptionJobStatus,
	fetchTranscriptContent,
} from "./services/awsService";
import {
	processTranscriptWithClaude,
	performAiAction,
	transcribeAudio,
} from "./services/aiService";
import {
	getPrices,
	createRecurringSubscription,
	getSubscriptionDetails,
	cancelSubscription as cancelMPSubscription,
	pauseSubscription,
	getPaymentDetails,
} from "./services/subscriptionService";
import {
	getUserProfile,
	decrementCredits,
	updateUserPlan,
	cancelUserSubscription,
	createOrUpdateSubscription,
	recordPaymentAndRenewCredits,
	getSubscriptionByUserId,
	getPaymentHistory,
} from "./services/dbService";

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// In-memory store for session results (active server session only)
const sessionStore = new Map<
	string,
	{ status: string; data?: any; error?: string }
>();

app.post(
	"/api/process-session",
	upload.single("audio"),
	async (req: any, res: any) => {
		try {
			if (!req.file) {
				return res
					.status(400)
					.json({ message: "No se proporcionó ningún archivo de audio" });
			}

			const sessionId = `session-${Date.now()}-${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			const inputLanguage = req.body.inputLanguage || "es-US";
			const outputLanguage = req.body.outputLanguage || "Spanish";
			const noteFormat = req.body.noteFormat || "SOAP";
			const patientName = req.body.patientName || "el paciente";
			const patientAge = req.body.patientAge
				? parseInt(req.body.patientAge)
				: undefined;
			const patientGender = req.body.patientGender;

			console.log(
				`[${sessionId}] Starting processing. Input: ${inputLanguage}, Output: ${outputLanguage}`
			);

			const userId = req.body.userId || "anonymous"; // Should come from Auth header
			const profile = await getUserProfile(userId);

			// Check credits for ALL users (free, pro, ultra)
			if (profile.credits_remaining <= 0) {
				return res.status(403).json({
					message: "Créditos agotados. Compra más créditos para continuar.",
				});
			}

			console.log(
				`[${sessionId}] User: ${userId}, Plan: ${profile.plan_type}, Credits: ${profile.credits_remaining}`
			);

			// Initialize status
			sessionStore.set(sessionId, { status: "processing" });

			// Return immediately
			res.status(202).json({
				message: "Procesamiento iniciado",
				sessionId: sessionId,
			});

			// Run processing in background
			(async () => {
				try {
					console.log(
						`[${sessionId}] Transcribing with ${profile.plan_type} settings...`
					);

					const transcriptionResult = await transcribeAudio(
						req.file.buffer,
						profile.plan_type as any,
						req.file.mimetype
					);

					// Helper: extract text and basic diarization logic
					let transcriptText = "";
					if (profile.plan_type === "ultra") {
						transcriptText = (transcriptionResult as any).results.channels[0]
							.alternatives[0].transcript;
					} else {
						transcriptText = (transcriptionResult as any).text;
					}

					// Decrement credits for ALL users after successful transcription
					await decrementCredits(userId);

					// Construct timestamped transcript with speaker labels for higher quality analysis
					let timestampedTranscript = "";
					const items = (transcriptionResult as any).results?.items || [];
					const segments =
						(transcriptionResult as any).results?.speaker_labels?.segments ||
						[];

					let currentSpeaker = "";
					let currentSecond = -1;

					items.forEach((item: any) => {
						if (!item.start_time) {
							// Punctuation
							timestampedTranscript += item.alternatives[0].content;
							return;
						}

						const start = parseFloat(item.start_time);

						// Identify speaker for this item
						const segment = segments.find(
							(s: any) =>
								start >= parseFloat(s.start_time) &&
								start < parseFloat(s.end_time)
						);

						if (segment && segment.speaker_label !== currentSpeaker) {
							currentSpeaker = segment.speaker_label;
							timestampedTranscript += `\n[${currentSpeaker}]: `;
						}

						// Add timestamp marker every 30 seconds
						const startInt = Math.floor(start);
						if (startInt !== currentSecond && startInt % 30 === 0) {
							const mins = Math.floor(startInt / 60);
							const secs = startInt % 60;
							timestampedTranscript += `\n[${mins}:${secs
								.toString()
								.padStart(2, "0")}] `;
							currentSecond = startInt;
						}

						timestampedTranscript +=
							(timestampedTranscript.endsWith(": ") ||
							timestampedTranscript.endsWith("] ")
								? ""
								: " ") + item.alternatives[0].content;
					});

					// Biometry calculation
					let patientSeconds = 0;
					let therapistSeconds = 0;
					const silences: { start: number; duration: number }[] = [];
					let lastEndTime = 0;

					segments.forEach((seg: any) => {
						const startTime = parseFloat(seg.start_time);
						const endTime = parseFloat(seg.end_time);
						const duration = endTime - startTime;

						if (startTime - lastEndTime > 5) {
							silences.push({
								start: lastEndTime,
								duration: startTime - lastEndTime,
							});
						}

						if (seg.speaker_label === "spk_1") {
							patientSeconds += duration;
						} else {
							therapistSeconds += duration;
						}
						lastEndTime = endTime;
					});

					const totalSpeech = patientSeconds + therapistSeconds || 1;
					const biometry = {
						talkListenRatio: {
							patient: Math.round((patientSeconds / totalSpeech) * 100),
							therapist: Math.round((therapistSeconds / totalSpeech) * 100),
						},
						silences: silences,
					};

					console.log(`[${sessionId}] Transcript ready. Sending to Claude...`);

					// 5. Process with Claude
					const analysis = await processTranscriptWithClaude(
						transcriptText,
						outputLanguage,
						noteFormat,
						patientName,
						patientAge,
						patientGender
					);

					// Store Success Result
					sessionStore.set(sessionId, {
						status: "completed",
						data: {
							transcript: transcriptText,
							analysis: analysis,
							biometry: biometry,
							noteFormat: noteFormat,
						},
					});
					console.log(`[${sessionId}] Processing completed successfully.`);
				} catch (err: any) {
					console.error(`[${sessionId}] Error in background processing:`, err);
					sessionStore.set(sessionId, {
						status: "error",
						error: err.message,
					});
				}
			})(); // End background async IIFE
		} catch (error: any) {
			console.error("Error initiating session:", error);
			res.status(500).json({
				message: "Error interno del servidor",
				error: error.message,
			});
		}
	}
);

app.get("/api/session/:sessionId", (req: any, res: any) => {
	const sessionId = req.params.sessionId;
	const session = sessionStore.get(sessionId);

	if (!session) {
		return res.status(404).json({ message: "Sesión no encontrada" });
	}

	res.json(session);
});

app.post("/api/ai-action", async (req: any, res: any) => {
	try {
		const { transcriptText, actionType, targetLanguage, patientName } =
			req.body;

		if (!transcriptText || !actionType) {
			return res.status(400).json({
				error: "Faltan parámetros requeridos (transcriptText, actionType)",
			});
		}

		console.log(`Ejecutando acción IA: ${actionType}`);
		const result = await performAiAction(
			transcriptText,
			actionType,
			targetLanguage || "Spanish",
			patientName || "el paciente",
			req.body.patientAge,
			req.body.patientGender
		);

		res.json(result);
	} catch (error: any) {
		console.error("Error en /api/ai-action:", error);
		res.status(500).json({ error: "Error al procesar la acción de IA" });
	}
});

// Subscription Endpoints
app.get("/api/prices", (req, res) => {
	res.json(getPrices());
});

app.get("/api/user-plan/:userId", async (req, res) => {
	const profile = await getUserProfile(req.params.userId);
	res.json(profile);
});

app.post("/api/create-subscription", async (req, res) => {
	const { planId, userId, userEmail, redirectUrl } = req.body;
	try {
		console.log(
			`[API] Creating subscription for user ${userId}, plan ${planId}`
		);

		const subscription = await createRecurringSubscription(
			planId,
			userId,
			userEmail,
			redirectUrl
		);

		res.json({
			id: subscription.id,
			init_point: subscription.init_point,
			status: subscription.status,
		});
	} catch (error: any) {
		console.error("Error creating subscription:", error);
		res.status(500).json({
			error: "Error creating subscription",
			details: error.message || String(error),
		});
	}
});

import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import crypto from "crypto";

const mpClient = new MercadoPagoConfig({
	accessToken: process.env.MP_ACCESS_TOKEN || "",
});

app.post("/api/mercadopago-webhook", async (req, res) => {
	const { data, type, action } = req.body;

	// Validate webhook signature for security
	const xSignature = req.headers["x-signature"] as string;
	const xRequestId = req.headers["x-request-id"] as string;

	if (process.env.MP_WEBHOOK_SECRET && xSignature && xRequestId) {
		try {
			// Extract ts and v1 from x-signature header
			// Format: "ts=1234567890,v1=hash"
			const parts = xSignature.split(",");
			const ts = parts.find((p) => p.startsWith("ts="))?.split("=")[1];
			const hash = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

			if (ts && hash) {
				// Create the manifest string: id + request-id + ts
				const manifest = `id:${data.id};request-id:${xRequestId};ts:${ts};`;

				// Calculate HMAC SHA256
				const hmac = crypto
					.createHmac("sha256", process.env.MP_WEBHOOK_SECRET)
					.update(manifest)
					.digest("hex");

				// Validate signature
				if (hmac !== hash) {
					console.error(
						"[Webhook] Invalid signature - potential security threat"
					);
					return res.status(401).json({ error: "Invalid signature" });
				}

				console.log("[Webhook] Signature validated successfully");
			}
		} catch (error) {
			console.error("[Webhook] Error validating signature:", error);
			// Continue processing even if validation fails (for backwards compatibility)
		}
	}

	console.log(`[Webhook] Received event - Type: ${type}, Action: ${action}`);
	console.log(`[Webhook] Full body:`, JSON.stringify(req.body, null, 2));

	// Handle subscription payment (recurring charge)
	if (type === "payment" || action === "payment.created") {
		const paymentId = data.id;
		try {
			console.log(`[Webhook] Fetching payment details for ID: ${paymentId}`);
			const payment = await new Payment(mpClient).get({ id: paymentId });

			console.log(`[Webhook] Payment status: ${payment.status}`);
			// Type assertion needed as preapproval_id exists in API but not in SDK types
			const paymentData = payment as any;
			console.log(`[Webhook] Preapproval ID: ${paymentData.preapproval_id}`);

			if (payment.status === "approved" && paymentData.preapproval_id) {
				// This is a recurring subscription payment
				const userId = payment.external_reference;
				const mpSubscriptionId = paymentData.preapproval_id;

				console.log(`[Webhook] Recurring payment APPROVED!`);
				console.log(
					`[Webhook] User: ${userId}, Subscription: ${mpSubscriptionId}`
				);

				if (userId && mpSubscriptionId) {
					try {
						// Record payment and renew credits
						const result = await recordPaymentAndRenewCredits(
							userId,
							payment.id?.toString() ?? "",
							mpSubscriptionId,
							payment.transaction_amount || 0,
							payment.status ?? "unknown",
							payment.status_detail,
							50 // Credits to add
						);

						console.log(
							`[Webhook] SUCCESS: Payment recorded, ${result.credits_added} credits added`
						);
					} catch (dbError) {
						console.error(`[Webhook] DB Error recording payment:`, dbError);
					}
				} else {
					console.warn(
						`[Webhook] Missing data in payment. userId: ${userId}, subscriptionId: ${mpSubscriptionId}`
					);
				}
			}
		} catch (error: any) {
			console.error(`[Webhook] Error processing payment:`, error);
		}
	}

	// Handle subscription events
	if (
		type === "subscription_preapproval" ||
		action === "created" ||
		action === "updated"
	) {
		const subscriptionId = data.id;
		try {
			console.log(
				`[Webhook] Fetching subscription details for ID: ${subscriptionId}`
			);
			const subscription = await new PreApproval(mpClient).get({
				id: subscriptionId,
			});

			const userId = subscription.external_reference;
			const status = subscription.status;

			console.log(
				`[Webhook] Subscription ${subscriptionId} - Status: ${status}, User: ${userId}`
			);

			if (userId && subscription.auto_recurring) {
				// Determine plan type from amount
				const amount = subscription.auto_recurring.transaction_amount || 0;
				const prices = getPrices();
				const planType = amount >= prices.ultra ? "ultra" : "pro";

				// Type assertion for auto_recurring properties not in SDK types
				const autoRecurring = subscription.auto_recurring as any;

				try {
					// Create or update subscription in database
					await createOrUpdateSubscription(
						userId,
						subscriptionId,
						subscription.reason || planType,
						planType,
						status || "pending",
						amount,
						autoRecurring.billing_day,
						subscription.next_payment_date
							? new Date(subscription.next_payment_date)
							: undefined
					);

					console.log(
						`[Webhook] SUCCESS: Subscription ${subscriptionId} ${action} in database`
					);
				} catch (dbError) {
					console.error(`[Webhook] DB Error updating subscription:`, dbError);
				}
			}
		} catch (error: any) {
			console.error(`[Webhook] Error processing subscription:`, error);
		}
	}

	res.sendStatus(200);
});

app.post("/api/cancel-subscription", async (req, res) => {
	const { userId } = req.body;

	if (!userId) {
		return res.status(400).json({ error: "UserId requerido" });
	}

	try {
		console.log(`[Cancel] Processing cancellation for user ${userId}`);

		// Get user profile
		const profile = await getUserProfile(userId);

		if (!profile || !profile.email) {
			return res.status(404).json({ error: "Usuario no encontrado" });
		}

		if (profile.plan_type === "free" || !profile.subscription_id) {
			return res.status(400).json({
				error: "El usuario no tiene una suscripción activa",
			});
		}

		// Cancel subscription in Mercado Pago
		await cancelMPSubscription(profile.subscription_id);

		// Cancel subscription in database
		const result = await cancelUserSubscription(userId);

		console.log(`[Cancel] Subscription cancelled successfully:`, result);

		res.json({
			success: true,
			message: "Suscripción cancelada exitosamente",
			data: result,
		});
	} catch (error: any) {
		console.error("[Cancel] Error cancelling subscription:", error);
		res.status(500).json({
			error: "Error al cancelar la suscripción",
			details: error.message,
		});
	}
});

app.get("/api/subscription-status/:userId", async (req, res) => {
	const { userId } = req.params;

	try {
		const profile = await getUserProfile(userId);
		const subscription = await getSubscriptionByUserId(userId);

		res.json({
			plan_type: profile.plan_type,
			subscription_status: profile.subscription_status,
			credits_remaining: profile.credits_remaining,
			next_billing_date: profile.next_billing_date,
			subscription: subscription,
		});
	} catch (error: any) {
		console.error("Error fetching subscription status:", error);
		res.status(500).json({ error: "Error al obtener estado de suscripción" });
	}
});

app.get("/api/payment-history/:userId", async (req, res) => {
	const { userId } = req.params;

	try {
		const history = await getPaymentHistory(userId, 20);
		res.json(history);
	} catch (error: any) {
		console.error("Error fetching payment history:", error);
		res.status(500).json({ error: "Error al obtener historial de pagos" });
	}
});

app.post("/api/select-free-plan", async (req, res) => {
	const { userId } = req.body;
	if (!userId) {
		return res.status(400).json({ error: "UserId requerido" });
	}

	try {
		const profile = await getUserProfile(userId);
		// If they already have a plan (and it's not null/empty), we shouldn't reset credits lightly.
		// But for now, we assume this is called only when checking if plan is missing.
		// Let's allow switching to free if they have NO plan.
		if (profile.plan_type) {
			return res
				.status(400)
				.json({ error: "El usuario ya tiene un plan asignado." });
		}

		// Update to Free plan with 3 credits
		await updateUserPlan(userId, "free", 3);
		res.json({ success: true, message: "Plan gratuito asignado" });
	} catch (error: any) {
		console.error("Error selecting free plan:", error);
		res.status(500).json({ error: "Error al asignar plan gratuito" });
	}
});

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
