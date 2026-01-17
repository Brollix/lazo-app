import { Request, Response, NextFunction } from "express";
import multer from "multer";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
	constructor(
		public statusCode: number,
		public message: string,
		public isOperational = true
	) {
		super(message);
		Object.setPrototypeOf(this, AppError.prototype);
	}
}

/**
 * Format Multer errors into user-friendly Spanish messages
 */
export function formatMulterError(error: any): {
	statusCode: number;
	message: string;
} {
	if (error instanceof multer.MulterError) {
		switch (error.code) {
			case "LIMIT_FILE_SIZE":
				return {
					statusCode: 413,
					message:
						"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.",
				};
			case "LIMIT_FILE_COUNT":
				return {
					statusCode: 400,
					message: "Demasiados archivos. Solo se permite un archivo a la vez.",
				};
			case "LIMIT_UNEXPECTED_FILE":
				return {
					statusCode: 400,
					message: "Campo de archivo inesperado.",
				};
			default:
				return {
					statusCode: 400,
					message: `Error al subir el archivo: ${error.message}`,
				};
		}
	}

	// Not a Multer error
	return {
		statusCode: 500,
		message: error.message || "Error al procesar el archivo",
	};
}

/**
 * Multer error handling middleware
 * Must be placed after routes that use multer
 */
export function multerErrorHandler(
	error: any,
	req: Request,
	res: Response,
	next: NextFunction
) {
	if (error instanceof multer.MulterError || error.name === "MulterError") {
		const { statusCode, message } = formatMulterError(error);
		console.error(`[Multer Error] ${error.code}: ${message}`);
		return res.status(statusCode).json({
			error: message,
			code: error.code,
		});
	}

	// Pass to next error handler if not a Multer error
	next(error);
}

/**
 * Global error handling middleware
 * Should be the last middleware in the chain
 */
export function globalErrorHandler(
	error: any,
	req: Request,
	res: Response,
	next: NextFunction
) {
	console.error("[Global Error Handler]", {
		message: error.message,
		stack: error.stack,
		url: req.url,
		method: req.method,
	});

	// Handle AppError instances
	if (error instanceof AppError) {
		return res.status(error.statusCode).json({
			error: error.message,
			isOperational: error.isOperational,
		});
	}

	// Handle validation errors
	if (error.name === "ValidationError") {
		return res.status(400).json({
			error: "Error de validación",
			details: error.message,
		});
	}

	// Handle database errors
	if (error.code === "PGRST116" || error.code?.startsWith("PG")) {
		return res.status(500).json({
			error: "Error de base de datos. Por favor, intenta nuevamente.",
		});
	}

	// Default error response
	const statusCode = error.statusCode || 500;
	const message =
		statusCode === 500 ?
			"Error interno del servidor. Por favor, intenta nuevamente."
		:	error.message || "Ha ocurrido un error";

	res.status(statusCode).json({
		error: message,
	});
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
	return (req: Request, res: Response, next: NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
	statusCode: number,
	message: string,
	details?: any
) {
	return {
		error: message,
		...(details && { details }),
	};
}
