/**
 * Manual Changes Required for Ultra Plan Processing Pipeline
 *
 * This file documents the exact changes that need to be made manually
 * to complete the Ultra Plan implementation.
 */

// ============================================================================
// FILE: server/src/services/dbService.ts
// ============================================================================

// CHANGE 1: Update updateUserPlan function (around line 100)
// FIND:
/*
	case "ultra":
		updates.credits_remaining =  0; // Ultra uses premium credits
		updates.premium_credits_remaining = 20;
		break;
*/

// REPLACE WITH:
/*
	case "ultra":
		updates.credits_remaining = 100; // Ultra: 100 standard credits
		updates.premium_credits_remaining = 20; // Ultra: 20 premium credits
		updates.monthly_sessions_used = 0; // Reset session counter
		updates.session_month_year = new Date().toISOString().slice(0, 7);
		break;
*/

// CHANGE 2: Update renewMonthlyCredits function (around line 160)
// FIND:
/*
	if (profile.plan_type === "free") {
		updates.credits_remaining = 3;
	} else if (profile.plan_type === "ultra") {
		updates.premium_credits_remaining = 20;
	}
	// Pro plan: no renewal needed (unlimited)
*/

// REPLACE WITH:
/*
	if (profile.plan_type === "free") {
		updates.credits_remaining = 3;
	} else if (profile.plan_type === "ultra") {
		updates.credits_remaining = 100; // Renew standard credits
		updates.premium_credits_remaining = 20; // Renew premium credits
		updates.monthly_sessions_used = 0; // Reset session counter
		updates.session_month_year = new Date().toISOString().slice(0, 7);
	}
	// Pro plan: no renewal needed (unlimited)
*/

// ============================================================================
// FILE: server/src/index.ts
// ============================================================================

// CHANGE 3: Add Ultra session limit check (after line 175, after free plan monthly check)
// INSERT AFTER:
/*
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
*/

// ADD THIS:
/*
		// Check Ultra plan's 120 sessions/month hard limit
		const ultraCheck = await checkUltraSessionLimit(userId);
		if (!ultraCheck.allowed) {
			return res.status(403).json({
				message: "ultra_monthly_limit_exceeded",
				used: ultraCheck.used,
				limit: ultraCheck.limit,
				monthYear: ultraCheck.monthYear,
			});
		}
*/

// CHANGE 4: Add Ultra standard credit check (after line 202, after premium credit check)
// INSERT AFTER:
/*
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
*/

// ADD THIS:
/*
		// Ultra plan with standard mode: check standard credits
		if (profile.plan_type === "ultra" && !useHighPrecision) {
			if (profile.credits_remaining <= 0) {
				return res.status(403).json({
					message:
						"Créditos estándar agotados. Espera la renovación mensual o contacta al soporte.",
					upgradeRequired: false,
				});
			}
		}
*/

// CHANGE 5: Move credit decrement and add session tracking
// FIND (around line 362):
/*
			// Decrement credits based on plan and precision mode
			await decrementCredits(userId, useHighPrecision);

			// Track monthly transcription for free users
			await incrementMonthlyTranscriptions(userId);
*/

// REPLACE WITH:
/*
			// DO NOT decrement credits here - will be done after successful processing
			
			// Track monthly transcription for free users
			await incrementMonthlyTranscriptions(userId);
			
			// Track Ultra monthly session count (counts toward 120 limit)
			await incrementUltraSessionCount(userId);
*/

// CHANGE 6: Add error handling with fallback for transcription
// FIND (around line 239):
/*
			const transcriptionResult = await transcribeAudio(
				req.file.buffer,
				profile.plan_type as any,
				useHighPrecision,
				req.file.mimetype
			);
*/

// REPLACE WITH:
/*
			let transcriptionResult;
			let transcriptionFallback = false;
			let actualProvider = useHighPrecision ? "deepgram" : "groq";

			try {
				transcriptionResult = await transcribeAudio(
					req.file.buffer,
					profile.plan_type as any,
					useHighPrecision,
					req.file.mimetype
				);
			} catch (error: any) {
				console.error(`[${sessionId}] Transcription error:`, error);
				
				// If premium transcription failed, fallback to standard
				if (useHighPrecision) {
					console.log(`[${sessionId}] Deepgram failed, falling back to Groq`);
					transcriptionFallback = true;
					actualProvider = "groq";
					
					transcriptionResult = await transcribeAudio(
						req.file.buffer,
						profile.plan_type as any,
						false, // Use standard mode
						req.file.mimetype
					);
				} else {
					throw error; // Re-throw if standard mode fails
				}
			}
*/

// CHANGE 7: Add error handling with fallback for AI analysis
// FIND (around line 475):
/*
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
*/

// REPLACE WITH:
/*
			// AI ROUTING LOGIC:
			// Free/Pro/Ultra (standard) → Groq Llama 3.1 70B
			// Ultra (premium) → AWS Claude 3.5 Sonnet (with fallback)
			let analysis;
			let analysisFallback = false;
			let actualAnalysisProvider = useHighPrecision && !transcriptionFallback ? "bedrock" : "groq";

			if (profile.plan_type === "ultra" && useHighPrecision && !transcriptionFallback) {
				// PREMIUM PATH: Claude 3.5 for maximum quality (with fallback)
				try {
					console.log(`[${sessionId}] Using Claude 3.5 (Ultra Premium)`);
					analysis = await processTranscriptWithClaude(
						transcriptText,
						outputLanguage,
						noteFormat,
						patientName,
						patientAge,
						patientGender
					);
				} catch (error: any) {
					console.error(`[${sessionId}] Bedrock failed, falling back to Llama 3.3:`, error);
					analysisFallback = true;
					actualAnalysisProvider = "groq";
					
					// Fallback to standard processing
					analysis = await processWithLlama3(
						transcriptText,
						outputLanguage,
						noteFormat,
						patientName,
						patientAge,
						patientGender
					);
				}
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

			// Decrement credits ONLY after successful processing
			// If fallback occurred, use standard credits instead of premium
			const usePremiumCredit = useHighPrecision && !transcriptionFallback && !analysisFallback;
			await decrementCredits(userId, usePremiumCredit);

			console.log(`[${sessionId}] Credits decremented. Premium: ${usePremiumCredit}`);
*/

// CHANGE 8: Add fallback notification to response
// FIND (around line 504):
/*
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
*/

// REPLACE WITH:
/*
			// Store Success Result in Database
			await updateProcessingSession(dbSessionId, {
				status: "completed",
				result: {
					transcript: transcriptText,
					analysis: analysis,
					biometry: biometry,
					noteFormat: noteFormat,
					processing_info: {
						mode_requested: useHighPrecision ? "premium" : "standard",
						transcription_provider: actualProvider,
						analysis_provider: actualAnalysisProvider,
						fallback_used: transcriptionFallback || analysisFallback,
						fallback_reason: transcriptionFallback ? 
							"Transcription service unavailable" :
							analysisFallback ? "Analysis service unavailable" : null,
					},
				},
			});
*/
