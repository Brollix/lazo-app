/**
 * Error Sanitization Utilities
 *
 * Ensures that error messages never contain sensitive patient data
 * or fragments of transcriptions that could violate HIPAA/Zero-Knowledge
 */

/**
 * Sanitize error message to remove any potential sensitive data
 * Returns only generic, safe error messages
 */
export const sanitizeErrorMessage = (error: any): string => {
	const message = error?.message || error?.toString() || "Unknown error";

	// List of safe, generic error patterns
	const safeErrorPatterns = [
		/transcription.*unavailable/i,
		/analysis.*error/i,
		/network.*timeout/i,
		/invalid.*audio.*format/i,
		/processing.*failed/i,
		/service.*unavailable/i,
		/rate.*limit/i,
		/authentication.*failed/i,
		/insufficient.*credits/i,
		/file.*too.*large/i,
		/unsupported.*format/i,
	];

	// Check if message matches any safe pattern
	for (const pattern of safeErrorPatterns) {
		if (pattern.test(message)) {
			// Return the original message if it's safe
			return message.substring(0, 200); // Limit length
		}
	}

	// If message doesn't match safe patterns, return generic error
	// This prevents leaking transcription fragments or patient data
	return "Processing error occurred. Please try again or contact support.";
};

/**
 * Sanitize error for logging purposes
 * Removes sensitive data but keeps technical details for debugging
 */
export const sanitizeErrorForLogging = (error: any): string => {
	const message = error?.message || error?.toString() || "Unknown error";

	// Remove anything that looks like quoted text (potential transcription)
	let sanitized = message.replace(/"[^"]{20,}"/g, '"[REDACTED]"');
	sanitized = sanitized.replace(/'[^']{20,}'/g, "'[REDACTED]'");

	// Remove long text blocks that might be transcriptions
	sanitized = sanitized.replace(
		/\b[A-Z][a-z\s,]{50,}/g,
		"[LONG_TEXT_REDACTED]",
	);

	return sanitized.substring(0, 500);
};

/**
 * Check if an error message might contain sensitive data
 */
export const containsSensitiveData = (message: string): boolean => {
	// Check for patterns that suggest patient data
	const sensitivePatterns = [
		/patient|paciente/i,
		/diagnosis|diagnóstico/i,
		/symptom|síntoma/i,
		/medication|medicamento/i,
		/treatment|tratamiento/i,
		// Long text blocks (likely transcription fragments)
		/\b\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+\s+\w+/,
	];

	return sensitivePatterns.some((pattern) => pattern.test(message));
};
