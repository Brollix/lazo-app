import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(
	cors({
		origin: true, // This echoes back the request origin, which is more reliable than "*" for some cases
		methods: ["GET", "POST", "OPTIONS"],
		allowedHeaders: [
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"Accept",
			"Origin",
		],
		credentials: true,
	})
);

// Explicitly handle OPTIONS to ensure preflight works
app.options("*", cors());

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
import { processTranscriptWithClaude } from "./services/aiService";

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
				return res.status(400).json({ message: "No audio file provided" });
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

			// Initialize status
			sessionStore.set(sessionId, { status: "processing" });

			// Return immediately
			res.status(202).json({
				message: "Processing started",
				sessionId: sessionId,
			});

			// Run processing in background (FIRE AND FORGET from request perspective)
			(async () => {
				try {
					console.log(
						`[${sessionId}] Received file: ${req.file.originalname} (${req.file.size} bytes). Format: ${noteFormat}. Input Lang: ${inputLanguage}, Output Lang: ${outputLanguage}`
					);

					// 1. Upload to S3
					const fileName = `${sessionId}-${req.file.originalname}`;
					const mimeType = req.file.mimetype;
					const s3Uri = await uploadAudioToS3(
						req.file.buffer,
						fileName,
						mimeType
					);
					console.log(`[${sessionId}] Uploaded to S3: ${s3Uri}`);

					// 2. Start Transcription Job
					const useMedical = inputLanguage === "en-US";
					const jobName = useMedical
						? `medical-job-${sessionId}`
						: `standard-job-${sessionId}`;

					if (useMedical) {
						await startMedicalTranscriptionJob(jobName, s3Uri, inputLanguage);
					} else {
						await startTranscriptionJob(jobName, s3Uri, inputLanguage);
					}
					console.log(`[${sessionId}] Started transcription job: ${jobName}`);

					// 3. Poll for completion
					let status = "IN_PROGRESS";
					let transcriptUri = null;
					let attempts = 0;
					const maxAttempts = 120;

					while (
						(status === "IN_PROGRESS" || status === "QUEUED") &&
						attempts < maxAttempts
					) {
						await new Promise((resolve) => setTimeout(resolve, 5000));

						let job: any;
						if (useMedical) {
							const response = await getMedicalTranscriptionJobStatus(jobName);
							job = response.MedicalTranscriptionJob;
						} else {
							const response = await getTranscriptionJobStatus(jobName);
							job = response.TranscriptionJob;
						}

						if (job) {
							status = job.TranscriptionJobStatus || "UNKNOWN";
							attempts++;

							if (status === "COMPLETED") {
								transcriptUri = job.Transcript?.TranscriptFileUri;
							} else if (status === "FAILED") {
								throw new Error(`Transcription failed: ${job.FailureReason}`);
							}
						}
					}

					if (!transcriptUri) {
						throw new Error("Transcription timed out or failed");
					}

					// 4. Fetch Transcript
					// Wait a moment for S3 consistency if needed
					await new Promise((resolve) => setTimeout(resolve, 2000));
					const transcriptJson = await fetchTranscriptContent(transcriptUri);
					const transcriptText =
						transcriptJson.results.transcripts[0].transcript;

					// Biometry calculation
					const segments =
						transcriptJson.results.speaker_labels?.segments || [];
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
						noteFormat
					);

					// Store Success Result
					sessionStore.set(sessionId, {
						status: "completed",
						data: {
							transcript: transcriptText,
							analysis: analysis,
							biometry: biometry,
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
				message: "Internal Server Error",
				error: error.message,
			});
		}
	}
);

app.get("/api/session/:sessionId", (req: any, res: any) => {
	const sessionId = req.params.sessionId;
	const session = sessionStore.get(sessionId);

	if (!session) {
		return res.status(404).json({ message: "Session not found" });
	}

	res.json(session);
});

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
