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
			const noteFormat = req.body.noteFormat || "SOAP";

			console.log(
				`Received file: ${req.file.originalname} (${req.file.size} bytes). Format: ${noteFormat}. Input Lang: ${inputLanguage}, Output Lang: ${outputLanguage}`
			);

			// 1. Upload to S3
			const fileName = `session-${Date.now()}-${req.file.originalname}`;
			const mimeType = req.file.mimetype;
			const s3Uri = await uploadAudioToS3(req.file.buffer, fileName, mimeType);
			console.log(`Uploaded to S3: ${s3Uri}`);

			// 2. Start Transcription Job (Medical)
			const jobName = `medical-job-${Date.now()}`;
			await startMedicalTranscriptionJob(jobName, s3Uri, inputLanguage);
			console.log(`Started medical transcription job: ${jobName}`);

			// 3. Poll for completion
			let status = "IN_PROGRESS";
			let transcriptUri = null;
			let attempts = 0;
			const maxAttempts = 120; // Medical can take slightly longer

			while (
				(status === "IN_PROGRESS" || status === "QUEUED") &&
				attempts < maxAttempts
			) {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				const response = await getMedicalTranscriptionJobStatus(jobName);
				const job = response.MedicalTranscriptionJob;

				if (job) {
					status = job.TranscriptionJobStatus || "UNKNOWN";
					attempts++;

					if (status === "COMPLETED") {
						transcriptUri = job.Transcript?.TranscriptFileUri;
					} else if (status === "FAILED") {
						throw new Error(
							`Medical Transcription failed: ${job.FailureReason}`
						);
					}
				}
			}

			if (!transcriptUri) {
				return res
					.status(504)
					.json({ message: "Medical Transcription timed out or failed" });
			}

			// 4. Fetch Transcription
			// For medical jobs with OutputBucketName, sometimes we need to wait a few seconds for the file to be ready in S3
			await new Promise((resolve) => setTimeout(resolve, 3000));
			const transcriptJson = await fetchTranscriptContent(transcriptUri);
			const transcriptText = transcriptJson.results.transcripts[0].transcript;

			// REAL Biometry calculation
			const segments = transcriptJson.results.speaker_labels?.segments || [];
			let patientSeconds = 0;
			let therapistSeconds = 0;
			const silences: { start: number; duration: number }[] = [];

			let lastEndTime = 0;

			segments.forEach((seg: any) => {
				const startTime = parseFloat(seg.start_time);
				const endTime = parseFloat(seg.end_time);
				const duration = endTime - startTime;

				// Check for silence before this segment
				if (startTime - lastEndTime > 5) {
					silences.push({
						start: lastEndTime,
						duration: startTime - lastEndTime,
					});
				}

				// Assign speaker (spk_0 usually therapist, spk_1 patient - but this is heuristic)
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

			console.log("Transcript extracted available. Sending to Claude...");

			// 5. Process with Claude
			const analysis = await processTranscriptWithClaude(
				transcriptText,
				outputLanguage,
				noteFormat
			);

			// 6. Return Result
			res.json({
				message: "Processing successful",
				transcript: transcriptText,
				analysis: analysis,
				biometry: biometry,
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
