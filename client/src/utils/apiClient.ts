/**
 * API Client utility for making HTTP requests with automatic error handling
 */

interface FetchOptions extends RequestInit {
	timeout?: number;
	retries?: number;
}

interface ApiError {
	message: string;
	status?: number;
	details?: any;
}

/**
 * Enhanced fetch with timeout support
 */
async function fetchWithTimeout(
	url: string,
	options: FetchOptions = {}
): Promise<Response> {
	const { timeout = 30000, ...fetchOptions } = options;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal,
		});
		clearTimeout(timeoutId);
		return response;
	} catch (error: any) {
		clearTimeout(timeoutId);
		if (error.name === "AbortError") {
			throw new Error(
				"La solicitud tardó demasiado tiempo. Por favor, intenta nuevamente."
			);
		}
		throw error;
	}
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
	let errorMessage = "Ha ocurrido un error";
	let details: any = undefined;

	try {
		const data = await response.json();
		errorMessage = data.error || data.message || errorMessage;
		details = data.details;
	} catch {
		// If JSON parsing fails, try to get text
		try {
			const text = await response.text();
			if (text) errorMessage = text;
		} catch {
			// Use default error message
		}
	}

	// Handle specific status codes
	switch (response.status) {
		case 400:
			if (!errorMessage.includes("archivo")) {
				errorMessage = `Solicitud inválida: ${errorMessage}`;
			}
			break;
		case 401:
			errorMessage = "No autorizado. Por favor, inicia sesión nuevamente.";
			break;
		case 403:
			if (
				!errorMessage.includes("créditos") &&
				!errorMessage.includes("límite")
			) {
				errorMessage = "No tienes permisos para realizar esta acción.";
			}
			break;
		case 404:
			errorMessage = "Recurso no encontrado.";
			break;
		case 413:
			errorMessage =
				"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.";
			break;
		case 429:
			errorMessage =
				"Demasiadas solicitudes. Por favor, espera un momento e intenta nuevamente.";
			break;
		case 500:
			errorMessage = "Error del servidor. Por favor, intenta nuevamente.";
			break;
		case 503:
			errorMessage = "Servicio no disponible. Por favor, intenta más tarde.";
			break;
	}

	return {
		message: errorMessage,
		status: response.status,
		details,
	};
}

/**
 * Make an API request with automatic error handling
 */
export async function apiRequest<T = any>(
	url: string,
	options: FetchOptions = {}
): Promise<T> {
	const { retries = 0, ...fetchOptions } = options;

	let lastError: Error | null = null;

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const response = await fetchWithTimeout(url, fetchOptions);

			// Check if response is ok
			if (!response.ok) {
				const error = await parseErrorResponse(response);
				throw new Error(error.message);
			}

			// Parse successful response
			const data = await response.json();
			return data as T;
		} catch (error: any) {
			lastError = error;

			// Don't retry on client errors (4xx) except 429
			if (
				error.message?.includes("No autorizado") ||
				error.message?.includes("No tienes permisos") ||
				error.message?.includes("archivo es demasiado grande")
			) {
				throw error;
			}

			// Retry on network errors or 5xx errors
			if (attempt < retries) {
				// Wait before retrying (exponential backoff)
				await new Promise((resolve) =>
					setTimeout(resolve, Math.pow(2, attempt) * 1000)
				);
				continue;
			}

			// All retries exhausted
			break;
		}
	}

	// Handle network errors
	if (
		lastError?.message?.includes("Failed to fetch") ||
		lastError?.message?.includes("NetworkError")
	) {
		throw new Error(
			"Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente."
		);
	}

	throw lastError || new Error("Error desconocido");
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
	get: <T = any>(url: string, options?: FetchOptions) =>
		apiRequest<T>(url, { ...options, method: "GET" }),

	post: <T = any>(url: string, body?: any, options?: FetchOptions) =>
		apiRequest<T>(url, {
			...options,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
			body: body ? JSON.stringify(body) : undefined,
		}),

	patch: <T = any>(url: string, body?: any, options?: FetchOptions) =>
		apiRequest<T>(url, {
			...options,
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
			body: body ? JSON.stringify(body) : undefined,
		}),

	delete: <T = any>(url: string, options?: FetchOptions) =>
		apiRequest<T>(url, { ...options, method: "DELETE" }),
};
