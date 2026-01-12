import fs from "fs";
import path from "path";

// Node.js 18+ has native fetch and FormData
// but we might need to handle the File object if the server expects it specifically with a name/type logic that works with multer.
// Multer looks for 'audio' field.

async function runBenchmark() {
	console.log("Starting benchmark...");

	// 1. Locate file
	const audioPath = path.resolve(
		__dirname,
		"../client/src/assets/audio_sesion_benchmark.mp3"
	);

	if (!fs.existsSync(audioPath)) {
		console.error(`File not found at: ${audioPath}`);
		process.exit(1);
	}

	const stats = fs.statSync(audioPath);
	console.log(`Found file: ${audioPath}`);
	console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

	// 2. Prepare Upload
	const fileBuffer = fs.readFileSync(audioPath);
	const audioBlob = new Blob([fileBuffer], { type: "audio/mpeg" });

	const formData = new FormData();
	formData.append("audio", audioBlob, "audio_sesion_benchmark.mp3");
	formData.append("inputLanguage", "es-US");
	formData.append("outputLanguage", "Spanish");
	formData.append("noteFormat", "SOAP");
	formData.append("userId", "benchmark_user"); // Dummy user

	const startTime = Date.now();
	console.log("Uploading file...");

	try {
		// Use production URL as requested
		const uploadRes = await fetch(
			"https://api.soylazo.com/api/process-session",
			{
				method: "POST",
				body: formData as any, // Type casting for TS if needed, usually fine in Node 22
			}
		);

		if (!uploadRes.ok) {
			const text = await uploadRes.text();
			throw new Error(
				`Upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${text}`
			);
		}

		const initData = await uploadRes.json();
		console.log("Upload initiated:", initData);

		const sessionId = initData.sessionId;
		if (!sessionId) {
			throw new Error("No sessionId returned");
		}

		// 3. Poll for completion
		console.log(`Polling status for session ${sessionId}...`);

		let status = "processing";
		while (status === "processing") {
			await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

			const statusRes = await fetch(
				`https://api.soylazo.com/api/session/${sessionId}`
			);
			if (!statusRes.ok) {
				// 404 might happen briefly if race condition, but unlikely with in-memory store
				console.log("Status check failed/not found, retrying...");
				continue;
			}

			const sessionData = await statusRes.json();
			status = sessionData.status;

			process.stdout.write(".");

			if (status === "error") {
				throw new Error(`Processing error: ${sessionData.error}`);
			}
		}

		const endTime = Date.now();
		const durationMs = endTime - startTime;
		const durationSec = durationMs / 1000;
		const durationMin = durationSec / 60;

		console.log("\n\n--- Benchmark Results ---");
		console.log(
			`Total Time: ${durationSec.toFixed(2)} seconds (${durationMin.toFixed(
				2
			)} minutes)`
		);
		console.log(`Status: ${status}`);

		// Estimate approx ratio (assuming 45 min audio)
		// We know the file is "something like 45 min" from user prompt.
		// We can get exact duration if we had a library to read header, but let's just use the user's info for now or just output the raw time.
	} catch (error) {
		console.error("\nBenchmark Failed:", error);
	}
}

runBenchmark();
