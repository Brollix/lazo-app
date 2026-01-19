/**
 * REMAINING MANUAL CHANGES FOR index.ts
 *
 * The Python script failed to apply patches due to line ending issues.
 * Please manually add these 3 code blocks to index.ts:
 */

// ============================================================================
// CHANGE 1: Add Ultra Session Limit Check (around line 176)
// ============================================================================
// FIND THIS (around line 175-177):
/*
		}

		// CREDIT VERIFICATION BASED ON PLAN TYPE
*/

// REPLACE WITH THIS:
/*
		}

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

		// CREDIT VERIFICATION BASED ON PLAN TYPE
*/

// ============================================================================
// CHANGE 2: Add Ultra Standard Credit Check (around line 212)
// ============================================================================
// FIND THIS (around line 211-213):
/*
		}

		// Additional validation: High Precision only for Ultra users
*/

// REPLACE WITH THIS:
/*
		}

		// Ultra plan with standard mode: check standard credits
		if (profile.plan_type === "ultra" && !useHighPrecision) {
			if (profile.credits_remaining <= 0) {
				return res.status(403).json({
					message:
						"Créditos estándar agotados. Espera la renovación mensual.",
					upgradeRequired: false,
				});
			}
		}

		// Additional validation: High Precision only for Ultra users
*/

// ============================================================================
// CHANGE 3: Add Ultra Session Counter (around line 378)
// ============================================================================
// FIND THIS (around line 377-380):
/*
			// Track monthly transcription for free users
			await incrementMonthlyTranscriptions(userId);

			// --- CONSTRUCT TIMESTAMPED TRANSCRIPT ---
*/

// REPLACE WITH THIS:
/*
			// Track monthly transcription for free users
			await incrementMonthlyTranscriptions(userId);

			// Track Ultra monthly session count (counts toward 120 limit)
			await incrementUltraSessionCount(userId);

			// --- CONSTRUCT TIMESTAMPED TRANSCRIPT ---
*/

// ============================================================================
// VERIFICATION
// ============================================================================
/**
 * After making these changes:
 *
 * 1. Build the server:
 *    npm run build --workspace=server
 *
 * 2. Check for these function calls in index.ts:
 *    - checkUltraSessionLimit (should appear once around line 178)
 *    - incrementUltraSessionCount (should appear once around line 381)
 *
 * 3. Verify credit checks exist for:
 *    - Free plan (line ~179)
 *    - Pro plan (line ~191)
 *    - Ultra premium (line ~203)
 *    - Ultra standard (line ~214) <- THIS IS NEW
 *
 * 4. Test the implementation:
 *    - Upload audio as Ultra user with standard mode
 *    - Upload audio as Ultra user with premium mode
 *    - Check logs for session counting
 */
