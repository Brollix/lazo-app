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

app.use(express.json());

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
	createSubscriptionPreference,
	getPaymentDetails,
} from "./services/subscriptionService";
import {
	getUserProfile,
	decrementCredits,
	updateUserPlan,
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
						timestampedTranscript || transcriptText,
						outputLanguage,
						noteFormat,
						patientName
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
			patientName || "el paciente"
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

app.post("/api/create-preference", async (req, res) => {
	const { planId, userId, userEmail, redirectUrl } = req.body;
	try {
		const preference = await createSubscriptionPreference(
			planId,
			userId,
			userEmail,
			redirectUrl
		);
		res.json({ id: preference.id });
	} catch (error: any) {
		console.error("Error creating preference:", error);
		res.status(500).json({
			error: "Error creating preference",
			details: error.message || String(error),
			stack: error.stack,
		});
	}
});

import { MercadoPagoConfig, Payment } from "mercadopago";
const mpClient = new MercadoPagoConfig({
	accessToken: process.env.MP_ACCESS_TOKEN || "",
});

app.post("/api/mercadopago-webhook", async (req, res) => {
	const { data, type } = req.body;
	console.log(`[Webhook] Received event type: ${type}`);

	if (type === "payment") {
		const paymentId = data.id;
		try {
			console.log(`[Webhook] Fetching payment details for ID: ${paymentId}`);
			const payment = await new Payment(mpClient).get({ id: paymentId });

			if (payment.status === "approved") {
				// Improved extraction logic handling multiple possibilities
				const userId =
					payment.metadata?.user_id ||
					payment.external_reference ||
					(payment as any).metadata?.userId; // Check for camelCase just in case

				const planId =
					payment.metadata?.plan_id ||
					payment.additional_info?.items?.[0]?.id ||
					(payment as any).metadata?.planId;

				console.log(`[Webhook] Payment APPROVED!`);
				console.log(`[Webhook] Extracted - User: ${userId}, Plan: ${planId}`);
				console.log(
					`[Webhook] Amount: ${payment.transaction_amount}, Currency: ${payment.currency_id}`
				);
				console.log(`[Webhook] Full Payment Metadata:`, payment.metadata);
				console.log(
					`[Webhook] Full External Reference:`,
					payment.external_reference
				);

				if (userId && planId) {
					// Using 50 credits by default as practiced in current implementation
					try {
						const result = await updateUserPlan(userId, planId, 50);
						if (result.rowsUpdated === 0) {
							console.error(
								`[Webhook] CRITICAL: Payment approved but NO user updated. UserId '${userId}' might not exist in DB.`
							);
						} else {
							console.log(
								`[Webhook] SUCCESS: User ${userId} plan updated to ${planId}. Rows affected: ${result.rowsUpdated}`
							);
						}
					} catch (dbError) {
						console.error(
							`[Webhook] DB Error updating plan for user ${userId}:`,
							dbError
						);
					}
				} else {
					console.warn(
						`[Webhook] Missing data in approved payment ${paymentId}. userId: ${userId}, planId: ${planId}`
					);
					console.log(
						`[Webhook] Raw Payment Data for Debugging:`,
						JSON.stringify(payment, null, 2)
					);
				}
			} else {
				console.log(
					`[Webhook] Payment ${paymentId} status: ${payment.status} (${payment.status_detail})`
				);
			}
		} catch (error: any) {
			console.error(`[Webhook] Error processing payment ${paymentId}:`, error);
			// Check if it's a 404 (common during testing with expired/invalid IDs)
			if (error.status !== 404) {
				return res.status(500).json({ error: "Internal processing error" });
			}
		}
	}
	res.sendStatus(200);
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
