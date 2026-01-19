/**
 * apply-ultra-patches.js
 *
 * Applies the 3 remaining Ultra Plan code changes to index.ts
 * Run with: node apply-ultra-patches.js
 */

const fs = require("fs");
const path = require("path");

const INDEX_PATH = path.join(__dirname, "src", "index.ts");

function applyPatches() {
	console.log("=".repeat(70));
	console.log("ULTRA PLAN - APPLYING REMAINING PATCHES");
	console.log("=".repeat(70));

	let content = fs.readFileSync(INDEX_PATH, "utf8");
	let patchesApplied = 0;

	// Patch 1: Add Ultra session limit check
	const patch1Find = "\t\t}\n\n\t\t// CREDIT VERIFICATION BASED ON PLAN TYPE";
	const patch1Replace = `\t\t}

\t\t// Check Ultra plan's 120 sessions/month hard limit
\t\tconst ultraCheck = await checkUltraSessionLimit(userId);
\t\tif (!ultraCheck.allowed) {
\t\t\treturn res.status(403).json({
\t\t\t\tmessage: "ultra_monthly_limit_exceeded",
\t\t\t\tused: ultraCheck.used,
\t\t\t\tlimit: ultraCheck.limit,
\t\t\t\tmonthYear: ultraCheck.monthYear,
\t\t\t});
\t\t}

\t\t// CREDIT VERIFICATION BASED ON PLAN TYPE`;

	if (content.includes("checkUltraSessionLimit")) {
		console.log("✓ Patch 1: Ultra session limit check - Already applied");
	} else if (content.includes(patch1Find)) {
		content = content.replace(patch1Find, patch1Replace);
		console.log("✓ Patch 1: Ultra session limit check - Applied");
		patchesApplied++;
	} else {
		console.log("✗ Patch 1: Pattern not found");
	}

	// Patch 2: Add Ultra standard credit check
	const patch2Find =
		"\t\t\t}\n\t\t}\n\n\t\t// Additional validation: High Precision only for Ultra users";
	const patch2Replace = `\t\t\t}
\t\t}

\t\t// Ultra plan with standard mode: check standard credits
\t\tif (profile.plan_type === "ultra" && !useHighPrecision) {
\t\t\tif (profile.credits_remaining <= 0) {
\t\t\t\treturn res.status(403).json({
\t\t\t\t\tmessage:
\t\t\t\t\t\t"Créditos estándar agotados. Espera la renovación mensual.",
\t\t\t\t\tupgradeRequired: false,
\t\t\t\t});
\t\t\t}
\t\t}

\t\t// Additional validation: High Precision only for Ultra users`;

	if (content.includes("Ultra plan with standard mode")) {
		console.log("✓ Patch 2: Ultra standard credit check - Already applied");
	} else if (content.includes(patch2Find)) {
		content = content.replace(patch2Find, patch2Replace);
		console.log("✓ Patch 2: Ultra standard credit check - Applied");
		patchesApplied++;
	} else {
		console.log("✗ Patch 2: Pattern not found");
	}

	// Patch 3: Add Ultra session counter
	const patch3Find =
		"\t\t\t\t// Track monthly transcription for free users\n\t\t\t\tawait incrementMonthlyTranscriptions(userId);";
	const patch3Replace = `\t\t\t\t// Track monthly transcription for free users
\t\t\t\tawait incrementMonthlyTranscriptions(userId);

\t\t\t\t// Track Ultra monthly session count (counts toward 120 limit)
\t\t\t\tawait incrementUltraSessionCount(userId);`;

	if (content.includes("incrementUltraSessionCount")) {
		console.log("✓ Patch 3: Ultra session counter - Already applied");
	} else if (content.includes(patch3Find)) {
		content = content.replace(patch3Find, patch3Replace);
		console.log("✓ Patch 3: Ultra session counter - Applied");
		patchesApplied++;
	} else {
		console.log("✗ Patch 3: Pattern not found");
	}

	// Write back if changes were made
	if (patchesApplied > 0) {
		fs.writeFileSync(INDEX_PATH, content, "utf8");
		console.log("\n" + "=".repeat(70));
		console.log(`SUCCESS: ${patchesApplied} patch(es) applied to index.ts`);
		console.log("=".repeat(70));
		console.log("\nNext steps:");
		console.log("1. Run: npm run build --workspace=server");
		console.log("2. Test the implementation");
		console.log("3. Run database migration");
	} else {
		console.log("\n" + "=".repeat(70));
		console.log("All patches already applied or patterns not found!");
		console.log("=".repeat(70));
	}
}

try {
	applyPatches();
} catch (error) {
	console.error("Error applying patches:", error.message);
	process.exit(1);
}
