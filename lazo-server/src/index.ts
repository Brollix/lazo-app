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
	startTranscriptionJob,
	getTranscriptionJobStatus,
	fetchTranscriptContent,
} from "./services/awsService";
import { processTranscriptWithClaude } from "./services/aiService";

// Configure Multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

app.post(
	"/api/process-session",
	upload.single("audio"),
	async (req: any, res: any) => {
		try {
			if (!req.file) {
				return res.status(400).json({ message: "No audio file provided" });
			}

			// 0. Extract language preferences (default to Spanish/Spanish)
			const inputLanguage = req.body.inputLanguage || "es-US";
			const outputLanguage = req.body.outputLanguage || "Spanish";

			console.log(
				`Received file: ${req.file.originalname} (${req.file.size} bytes). Input Lang: ${inputLanguage}, Output Lang: ${outputLanguage}`
			);

			// 1. Upload to S3
			const fileName = `session-${Date.now()}-${req.file.originalname}`;
			const mimeType = req.file.mimetype;
			const s3Uri = await uploadAudioToS3(req.file.buffer, fileName, mimeType);
			console.log(`Uploaded to S3: ${s3Uri}`);

			// 2. Start Transcription Job
			const jobName = `job-${Date.now()}`;
			await startTranscriptionJob(jobName, s3Uri, inputLanguage);
			console.log(`Started transcription job: ${jobName}`);

			// 3. Poll for completion (Simple polling for MVP)
			// In production, consider using Webhooks or EventBridge
			let status = "IN_PROGRESS";
			let transcriptUri = null;
			let attempts = 0;
			const maxAttempts = 60; // Wait up to 5 minutes (5s * 60)

			while (
				(status === "IN_PROGRESS" || status === "QUEUED") &&
				attempts < maxAttempts
			) {
				await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
				const response = await getTranscriptionJobStatus(jobName);
				const job = response.TranscriptionJob;

				if (job) {
					status = job.TranscriptionJobStatus || "UNKNOWN";
					attempts++;
					// console.log(`Job Status (${attempts}): ${status}`);

					if (status === "COMPLETED") {
						transcriptUri = job.Transcript?.TranscriptFileUri;
					} else if (status === "FAILED") {
						throw new Error(`Transcription failed: ${job.FailureReason}`);
					}
				}
			}

			if (!transcriptUri) {
				return res
					.status(504)
					.json({ message: "Transcription timed out or failed" });
			}

			// 4. Fetch Transcription
			const transcriptJson = await fetchTranscriptContent(transcriptUri);
			const transcriptText = transcriptJson.results.transcripts[0].transcript;

			console.log("Transcript extracted available. Sending to Claude...");

			// 5. Process with Claude
			const analysis = await processTranscriptWithClaude(
				transcriptText,
				outputLanguage
			);

			// 6. Return Result
			res.json({
				message: "Processing successful",
				transcript: transcriptText,
				analysis: analysis,
			});
		} catch (error: any) {
			console.error("Error processing session:", error);
			res.status(500).json({
				message: "Internal Server Error",
				error: error.message,
			});
		}
	}
);

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
