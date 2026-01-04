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

			console.log(
				`[${sessionId}] Starting processing. Input: ${inputLanguage}, Output: ${outputLanguage}`
			);

			const userId = req.body.userId || "anonymous"; // Should come from Auth header
			const profile = await getUserProfile(userId);

			if (profile.plan_type === "free" && profile.credits_remaining <= 0) {
				return res.status(403).json({
					message: "Créditos agotados. Suscríbete para continuar.",
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

					// Decrement credits for free users
					if (profile.plan_type === "free") {
						await decrementCredits(userId);
					}

					// Construct timestamped transcript for higher quality analysis (Key Moments)
					let timestampedTranscript = "";
					const items = (transcriptionResult as any).results?.items || [];
					let currentSecond = -1;

					items.forEach((item: any) => {
						if (item.start_time) {
							const start = Math.floor(parseFloat(item.start_time));
							if (start !== currentSecond && start % 30 === 0) {
								// Add marker every 30 seconds
								const mins = Math.floor(start / 60);
								const secs = start % 60;
								timestampedTranscript += `\n[${mins}:${secs
									.toString()
									.padStart(2, "0")}] `;
								currentSecond = start;
							}
						}
						timestampedTranscript +=
							item.alternatives[0].content +
							(item.type === "punctuation" ? "" : " ");
					});

					// Biometry calculation
					const segments =
						(transcriptionResult as any).results?.speaker_labels?.segments ||
						[];
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
						noteFormat
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
		const { transcriptText, actionType, targetLanguage } = req.body;

		if (!transcriptText || !actionType) {
			return res.status(400).json({
				error: "Faltan parámetros requeridos (transcriptText, actionType)",
			});
		}

		console.log(`Ejecutando acción IA: ${actionType}`);
		const result = await performAiAction(
			transcriptText,
			actionType,
			targetLanguage || "Spanish"
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

app.post("/api/mercadopago-webhook", async (req, res) => {
	const { data, type } = req.body;
	if (type === "payment") {
		const paymentId = data.id;
		// Here you would normally fetch the payment from MP and get external_reference (userId)
		// For this implementation, we'll assume we get the userId and plan from the body or metadata
		// This part needs MP SDK call to verification
		console.log(`Webhook received payment: ${paymentId}`);
		// updateUserPlan(userId, planType);
	}
	res.sendStatus(200);
});

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
