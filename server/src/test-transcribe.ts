import {
	uploadAudioToS3,
	startTranscriptionJob,
	getTranscriptionJobStatus,
	fetchTranscriptContent,
} from "./services/awsService";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const run = async () => {
	try {
		// Path to the test audio file
		const audioFilePath = path.resolve(
			__dirname,
			"../../lazo-client/src/assets/WhatsApp Audio 2026-01-03 at 7.20.41 PM.ogg"
		);

		console.log(`Reading audio file from: ${audioFilePath}`);
		if (!fs.existsSync(audioFilePath)) {
			console.error("Audio file not found!");
			return;
		}

		const fileBuffer = fs.readFileSync(audioFilePath);
		const fileName = `test-audio-${Date.now()}.ogg`;
		const mimeType = "audio/ogg";

		// 1. Upload to S3
		console.log("Uploading to S3...");
		const s3Uri = await uploadAudioToS3(fileBuffer, fileName, mimeType);
		console.log(`Uploaded to S3: ${s3Uri}`);

		// 2. Start Transcription Job
		const jobName = `test-transcription-${Date.now()}`;
		console.log(`Starting transcription job: ${jobName}`);
		await startTranscriptionJob(jobName, s3Uri);

		// 3. Poll for completion
		console.log("Waiting for transcription to complete...");
		let status = "IN_PROGRESS";
		let transcriptUri = null;

		while (status === "IN_PROGRESS" || status === "QUEUED") {
			await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
			const response = await getTranscriptionJobStatus(jobName);
			const job = response.TranscriptionJob;

			if (job) {
				status = job.TranscriptionJobStatus || "UNKNOWN";
				console.log(`Job Status: ${status}`);

				if (status === "COMPLETED") {
					transcriptUri = job.Transcript?.TranscriptFileUri;
				} else if (status === "FAILED") {
					console.error("Transcription failed:", job.FailureReason);
					return;
				}
			}
		}

		// 4. Fetch and print result
		if (transcriptUri) {
			console.log("Fetching transcript...");
			// Use the fetchTranscriptContent helper which presumably fetches the JSON from the URL
			// Note: If using OutputBucketName in startTranscriptionJob, the URI is an S3 URI.
			// If NOT using OutputBucketName, it is a pre-signed HTTPS URL.
			// Our awsService currently assumes fetch() works, which implies HTTPS URL (default behavior).
			const transcriptJson = await fetchTranscriptContent(transcriptUri);

			console.log("\n--- TRANSCRIPTION RESULT ---\n");
			console.log(
				JSON.stringify(
					transcriptJson.results.transcripts[0].transcript,
					null,
					2
				)
			);
			console.log("\n----------------------------\n");
		}
	} catch (error) {
		console.error("Error running test:", error);
	}
};

run();
