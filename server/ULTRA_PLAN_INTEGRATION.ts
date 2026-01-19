// ULTRA PLAN INTEGRATION - REMAINING MANUAL STEPS
// This file documents the manual changes needed to complete Ultra Plan feature integration
// Apply these changes to server/src/index.ts

/**
 * STEP 1: Add patient identifier parameter extraction
 * Location: /api/process-session endpoint, around line 156
 */

// AFTER line 156 (after useHighPrecision declaration), ADD:
const patientIdentifier = req.body.patientIdentifier || null; // Ultra Plan: patient ID for long-term memory

// MODIFY the console.log statement to include patientIdentifier:
console.log(
	`[${sessionId}] Starting processing. Input: ${inputLanguage}, Output: ${outputLanguage}, High Precision: ${useHighPrecision}, Patient ID: ${patientIdentifier || "N/A"}`
);

/**
 * STEP 2: Fetch historical context for Ultra users
 * Location: Inside background async IIFE, BEFORE the AI ROUTING LOGIC section (around line 486)
 */

// ADD this block BEFORE "// AI ROUTING LOGIC:" comment:
// ULTRA PLAN: Fetch historical context if patient identifier is provided
let historicalContext: string | null = null;
if (
	profile.plan_type === "ultra" &&
	patientIdentifier &&
	patientIdentifier.trim()
) {
	try {
		console.log(
			`[${sessionId}] Ultra user - fetching historical context for patient: ${patientIdentifier}`
		);
		const historicalData = await getLastSessionSummaries(
			userId,
			patientIdentifier.trim(),
			3
		);

		if (historicalData && historicalData.summary_text) {
			historicalContext = `RESUMEN ACUMULADO (${historicalData.session_count} sesiones previas, última: ${new Date(historicalData.last_session_date).toLocaleDateString()}):\n${historicalData.summary_text}`;
			console.log(
				`[${sessionId}] Historical context loaded: ${historicalData.session_count} sessions`
			);
		} else {
			console.log(
				`[${sessionId}] No historical context found for patient ${patientIdentifier} (first session)`
			);
		}
	} catch (err) {
		console.error(`[${sessionId}] Error fetching historical context:`, err);
		// Continue without context - don't fail the session
	}
}

/**
 * STEP 3: Modify Claude call to include Ultra features
 * Location: Inside "if (profile.plan_type === 'ultra' && useHighPrecision)" block (around line 492-502)
 */

// MODIFY the processTranscriptWithClaude call to include new parameters:
analysis = await processTranscriptWithClaude(
	transcriptText,
	outputLanguage,
	noteFormat,
	patientName,
	patientAge,
	patientGender,
	true, // isUltraPlan - NEW PARAMETER
	historicalContext // NEW PARAMETER
);

/**
 * STEP 4: Update patient summary after successful session
 * Location: After "// Store Success Result in Database" (around line 518-528)
 */

// ADD this block AFTER updateProcessingSession (around line 528, before console.log):
// ULTRA PLAN: Update patient summary with this session's data
if (
	profile.plan_type === "ultra" &&
	patientIdentifier &&
	patientIdentifier.trim() &&
	analysis
) {
	try {
		// Generate updated summary using Claude
		const summaryPrompt = `Based on the following session analysis, update the cumulative patient summary.

Previous summary: ${historicalContext || "No previous history"}

Current session analysis:
${JSON.stringify(analysis)}

Generate a concise cumulative summary (max 2000 words) that includes:
- Key ongoing themes across sessions
- Progress/regression in therapeutic goals
- Important patterns or changes
- Critical clinical observations

Output ONLY the updated summary text, no extra commentary.`;

		// Call Claude to generate summary update (reuse processTranscriptWithClaude or create dedicated function)
		// For now, simple version: extract clinical note as summary
		const summaryText = analysis.clinical_note || analysis.summary || "";

		if (summaryText) {
			await upsertPatientSummary(userId, patientIdentifier.trim(), summaryText);
			console.log(
				`[${sessionId}] Patient summary updated for ${patientIdentifier}`
			);
		}
	} catch (err) {
		console.error(`[${sessionId}] Error updating patient summary:`, err);
		// Don't fail the session if summary update fails
	}
}

/**
 * STEP 5: Add medical report generation endpoint
 * Location: Add this new endpoint after the existing /api/ai-action endpoint (around line 593)
 */

// ADD NEW ENDPOINT:
app.post("/api/generate-medical-report", async (req: any, res: any) => {
	try {
		const { sessionId, userId } = req.body;

		if (!sessionId || !userId) {
			return res.status(400).json({
				error: "Missing required parameters: sessionId and userId",
			});
		}

		// Verify user has Ultra plan
		const profile = await getUserProfile(userId);
		if (profile.plan_type !== "ultra") {
			return res.status(403).json({
				error: "Esta función es exclusiva del Plan Ultra",
				upgradeRequired: true,
				requiredPlan: "ultra",
			});
		}

		// Fetch session data
		const session = await getProcessingSession(sessionId);
		if (!session || session.user_id !== userId) {
			return res.status(404).json({
				error: "Sesión no encontrada o acceso denegado",
			});
		}

		if (!session.result || !session.result.analysis) {
			return res.status(400).json({
				error: "La sesión no tiene análisis disponible para exportar",
			});
		}

		// Extract SOAP note from session
		const soapNote = session.result.analysis.clinical_note || "";

		// Generate sanitized medical report
		console.log(`[Report] Generating medical report for session ${sessionId}`);
		const medicalReport = await sanitizeForMedicalReport(
			soapNote,
			new Date(session.created_at).toLocaleDateString("es-AR"),
			profile.nombre_completo || undefined
		);

		res.json({
			reportMarkdown: medicalReport,
			sessionDate: session.created_at,
			generated_at: new Date().toISOString(),
		});
	} catch (error: any) {
		console.error("Error generating medical report:", error);
		res.status(500).json({
			error: "Error al generar el informe médico",
			details: error.message,
		});
	}
});
