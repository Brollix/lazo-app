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
	processWithLlama3,
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
	createProcessingSession,
	updateProcessingSession,
	getProcessingSession,
	renewMonthlyCredits,
	checkMonthlyTranscriptionLimit,
	incrementMonthlyTranscriptions,
	supabase,
} from "./services/dbService";

// Configure Multer to store files in memory with size limit
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 100 * 1024 * 1024, // 100MB limit
	},
});

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
			const useHighPrecision =
				req.body.useHighPrecision === "true" ||
				req.body.useHighPrecision === true;

			console.log(
				`[${sessionId}] Starting processing. Input: ${inputLanguage}, Output: ${outputLanguage}, High Precision: ${useHighPrecision}`
			);

			const userId = req.body.userId || "anonymous"; // Should come from Auth header

			// Check and renew monthly credits if needed
			await renewMonthlyCredits(userId);

			// Get fresh profile after potential renewal
			const profile = await getUserProfile(userId);

			// Check monthly transcription limit for free users
			const monthlyCheck = await checkMonthlyTranscriptionLimit(userId);
			if (!monthlyCheck.allowed) {
				return res.status(403).json({
					message: "monthly_limit_exceeded",
					used: monthlyCheck.used,
					limit: monthlyCheck.limit,
					monthYear: monthlyCheck.monthYear,
				});
			}

			// CREDIT VERIFICATION BASED ON PLAN TYPE
			// Free plan: check regular credits
			if (profile.plan_type === "free") {
				if (profile.credits_remaining <= 0) {
					return res.status(403).json({
						message:
							"Créditos agotados. Actualiza a Pro para transcripciones ilimitadas.",
						upgradeRequired: true,
						suggestedPlan: "pro",
					});
				}
			}

			// Pro plan: unlimited, no credit check needed
			// (credits_remaining = -1 for Pro)

			// Ultra plan with high precision: check premium credits
			if (profile.plan_type === "ultra" && useHighPrecision) {
				if (profile.premium_credits_remaining <= 0) {
					return res.status(403).json({
						message:
							"Créditos premium agotados. Usa modo estándar o espera la renovación mensual.",
						upgradeRequired: false,
					});
				}
			}

			// Additional validation: High Precision only for Ultra users
			if (useHighPrecision && profile.plan_type !== "ultra") {
				return res.status(403).json({
					message:
						"La opción de Alta Precisión solo está disponible para usuarios del plan Ultra.",
				});
			}

			console.log(
				`[${sessionId}] User: ${userId}, Plan: ${profile.plan_type}, Credits: ${
					profile.credits_remaining
				}, Premium: ${profile.premium_credits_remaining || 0}`
			);

			// Create processing session in database
			const dbSession = await createProcessingSession(
				userId,
				"processing",
				useHighPrecision ? "high_precision" : "standard"
			);
			const dbSessionId = dbSession.id;

			console.log(`[${sessionId}] Created DB session: ${dbSessionId}`);

			// Return immediately with database session ID
			res.status(202).json({
				message: "Procesamiento iniciado",
				sessionId: dbSessionId,
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
						useHighPrecision,
						req.file.mimetype
					);

					// Helper: extract text and basic diarization logic
					let transcriptText = "";

					// Normalized structure for processing
					interface TranscriptWord {
						start: number;
						end: number;
						word: string;
						speaker?: string;
					}
					let normalizedWords: TranscriptWord[] = [];
					let normalizedSegments: {
						start: number;
						end: number;
						speaker: string;
					}[] = [];

					// --- PARSE TRANSCRIPTION RESULT BASED ON PROVIDER ---

					// 1. DEEPGRAM (Ultra Plan)
					if (
						(transcriptionResult as any).results?.channels?.[0]
							?.alternatives?.[0]
					) {
						const alt = (transcriptionResult as any).results.channels[0]
							.alternatives[0];
						transcriptText = alt.transcript;

						// Deepgram provides words with speaker labels if diarize=true
						if (alt.words) {
							normalizedWords = alt.words.map((w: any) => ({
								start: w.start,
								end: w.end,
								word: w.word,
								speaker:
									w.speaker !== undefined ? `spk_${w.speaker}` : undefined,
							}));

							// Create segments from words
							let currentSegment = { start: -1, end: -1, speaker: "" };

							normalizedWords.forEach((w) => {
								const speaker = w.speaker || "unknown";
								if (currentSegment.speaker !== speaker) {
									if (currentSegment.start !== -1) {
										normalizedSegments.push({ ...currentSegment });
									}
									currentSegment = { start: w.start, end: w.end, speaker };
								} else {
									currentSegment.end = w.end;
								}
							});
							if (currentSegment.start !== -1)
								normalizedSegments.push(currentSegment);
						}
					}
					// 2. GROQ / WHISPER (Free/Pro Plan)
					else if ((transcriptionResult as any).segments) {
						transcriptText = (transcriptionResult as any).text;
						// Groq (Whisper) standard response doesn't have speaker diarization usually
						const segments = (transcriptionResult as any).segments;

						normalizedWords = segments.flatMap((s: any) => {
							// Estimate words from segment if possible, or just treat segment as text chunk
							// For simplicity in visualization, we might just track the segment
							// But for timestamp processing we can use the segment start
							return [
								{
									start: s.start,
									end: s.end,
									word: s.text,
									speaker: "unknown", // No diarization in standard Whisper
								},
							];
						});
					}
					// 3. AWS TRANSCRIBE (Fallback/Legacy)
					else if ((transcriptionResult as any).results?.items) {
						transcriptText = (transcriptionResult as any).results.transcripts[0]
							.transcript;
						const items = (transcriptionResult as any).results.items || [];
						const awsSegments =
							(transcriptionResult as any).results?.speaker_labels?.segments ||
							[];

						normalizedWords = items
							.filter((i: any) => i.start_time)
							.map((i: any) => {
								const start = parseFloat(i.start_time);
								const end = parseFloat(i.end_time);
								// Find speaker
								const seg = awsSegments.find(
									(s: any) =>
										start >= parseFloat(s.start_time) &&
										start < parseFloat(s.end_time)
								);
								return {
									start,
									end,
									word: i.alternatives[0].content,
									speaker: seg ? seg.speaker_label : "unknown",
								};
							});

						normalizedSegments = awsSegments.map((s: any) => ({
							start: parseFloat(s.start_time),
							end: parseFloat(s.end_time),
							speaker: s.speaker_label,
						}));
					}
					// 4. Unknown/Text only
					else {
						transcriptText = (transcriptionResult as any).text || "";
					}

					// Decrement credits based on plan and precision mode
					await decrementCredits(userId, useHighPrecision);

					// Track monthly transcription for free users
					await incrementMonthlyTranscriptions(userId);

					// --- CONSTRUCT TIMESTAMPED TRANSCRIPT ---
					let timestampedTranscript = "";
					let currentSpeaker = "";
					let currentSecond = -1;

					// If we have normalized words, build transcript from them for better accuracy
					if (normalizedWords.length > 0) {
						normalizedWords.forEach((w) => {
							// Speaker change
							if (
								w.speaker &&
								w.speaker !== "unknown" &&
								w.speaker !== currentSpeaker
							) {
								currentSpeaker = w.speaker;
								timestampedTranscript += `\n[${currentSpeaker}]: `;
							} else if (
								(!w.speaker || w.speaker === "unknown") &&
								currentSpeaker !== ""
							) {
								// If we lost speaker tracking, maybe reset? Or keep previous.
								// For now, keep previous.
							}

							// Time marker every 30s
							const startInt = Math.floor(w.start);
							if (startInt !== currentSecond && startInt % 30 === 0) {
								const mins = Math.floor(startInt / 60);
								const secs = startInt % 60;
								timestampedTranscript += `\n[${mins}:${secs
									.toString()
									.padStart(2, "0")}] `;
								currentSecond = startInt;
							}

							timestampedTranscript += ` ${w.word}`;
						});
					} else {
						// Fallback if no word-level timestamps
						timestampedTranscript = transcriptText;
					}

					// --- BIOMETRY CALCULATION ---
					let patientSeconds = 0;
					let therapistSeconds = 0;
					const silences: { start: number; duration: number }[] = [];
					let lastEndTime = 0;

					if (normalizedSegments.length > 0) {
						// Use segments if available (Deepgram/AWS)
						normalizedSegments.forEach((seg) => {
							const duration = seg.end - seg.start;
							if (seg.start - lastEndTime > 2) {
								// Silence threshold > 2s
								silences.push({
									start: lastEndTime,
									duration: seg.start - lastEndTime,
								});
							}

							// Improve Speaker Logic:
							// Usually spk_0 is therapist (asks first), spk_1 is patient.
							// But Deepgram uses 0, 1.
							// Mapped as spk_0, spk_1 above.
							// We can refine this later or let Claude identify who is who,
							// but for biometry stats we need a guess.
							// Assumption: spk_1 is patient (often the one talking more later or second).
							// Better: Just assign 0 to Therapist, 1 to Patient for now.
							if (seg.speaker === "spk_1" || seg.speaker === "1") {
								patientSeconds += duration;
							} else {
								therapistSeconds += duration;
							}
							lastEndTime = seg.end;
						});
					} else if (normalizedWords.length > 0) {
						// Estimate from words if no segments (e.g. Groq with no diarization)
						// If speaker is unknown, we can't do biometry.
						normalizedWords.forEach((w) => {
							if (w.start - lastEndTime > 2) {
								silences.push({
									start: lastEndTime,
									duration: w.start - lastEndTime,
								});
							}
							lastEndTime = w.end;
						});
					}

					const totalSpeech = patientSeconds + therapistSeconds || 1;
					// Only return biometry if we have actual speaker data (avoid 0% | 0% display)
					const biometry =
						patientSeconds > 0 || therapistSeconds > 0
							? {
									talkListenRatio: {
										patient: Math.round((patientSeconds / totalSpeech) * 100),
										therapist: Math.round(
											(therapistSeconds / totalSpeech) * 100
										),
									},
									silences: silences,
							  }
							: undefined;

					console.log(`[${sessionId}] Transcript ready. Processing with AI...`);

					// AI ROUTING LOGIC:
					// Free/Pro/Ultra (standard) → Groq Llama 3.1 70B
					// Ultra (premium) → AWS Claude 3.5 Sonnet
					let analysis;
					if (profile.plan_type === "ultra" && useHighPrecision) {
						// PREMIUM PATH: Claude 3.5 for maximum quality
						console.log(`[${sessionId}] Using Claude 3.5 (Ultra Premium)`);
						analysis = await processTranscriptWithClaude(
							transcriptText,
							outputLanguage,
							noteFormat,
							patientName,
							patientAge,
							patientGender
						);
					} else {
						// STANDARD PATH: Llama 3.1 for cost-effective quality
						console.log(
							`[${sessionId}] Using Llama 3.1 (${profile.plan_type} plan)`
						);
						analysis = await processWithLlama3(
							transcriptText,
							outputLanguage,
							noteFormat,
							patientName,
							patientAge,
							patientGender
						);
					}

					// Store Success Result in Database
					await updateProcessingSession(dbSessionId, {
						status: "completed",
						result: {
							transcript: transcriptText,
							analysis: analysis,
							biometry: biometry,
							noteFormat: noteFormat,
						},
					});
					console.log(`[${sessionId}] Processing completed successfully.`);
				} catch (err: any) {
					console.error(`[${sessionId}] Error in background processing:`, err);
					await updateProcessingSession(dbSessionId, {
						status: "error",
						error_message: err.message,
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

app.get("/api/session/:sessionId", async (req: any, res: any) => {
	const sessionId = req.params.sessionId;

	try {
		const session = await getProcessingSession(sessionId);

		// Transform database format to expected client format
		const response = {
			status: session.status,
			data: session.result,
			error: session.error_message,
		};

		res.json(response);
	} catch (error: any) {
		console.error("Error fetching session:", error);
		return res.status(404).json({ message: "Sesión no encontrada" });
	}
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

		// Update to Free plan (credits handled by renewMonthlyCredits or default)
		await updateUserPlan(userId, "free");
		res.json({ success: true, message: "Plan gratuito asignado" });
	} catch (error: any) {
		console.error("Error selecting free plan:", error);
		res.status(500).json({ error: "Error al asignar plan gratuito" });
	}
});

// Public Announcements
app.get("/api/announcements", async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("announcements")
			.select("message, created_at")
			.eq("active", true)
			.order("created_at", { ascending: false })
			.limit(1);

		res.json(data || []);
	} catch (error) {
		res.status(500).json({ error: "Error al obtener anuncios" });
	}
});

// Admin routes - Protected by isAdmin middleware
import adminRoutes from "./routes/admin";
app.use("/api/admin", adminRoutes);

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
