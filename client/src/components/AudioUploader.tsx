import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
	Box,
	Typography,
	CircularProgress,
	Chip,
	Paper,
	Button,
	TextField,
	Stack,
	Divider,
	alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import Psychology from "@mui/icons-material/Psychology";
import { GlassCard, StyledDropzone } from "./UploaderStyles";
import { getGradients, typographyExtended } from "../styles.theme";
import { UpgradeToProModal } from "./UpgradeToProModal";
import { supabase } from "../supabaseClient";
import { useEncryption } from "../hooks/useEncryption";

// Define the response structure
export interface Topic {
	label: string;
	frequency: number;
	sentiment?: string;
}

export interface RiskAssessment {
	has_risk: boolean;
	alerts: string[];
	summary: string;
}

export interface AnalysisResult {
	clinical_note: string;
	summary: string;
	topics: Topic[];
	sentiment: string;
	action_items: string[];
	risk_assessment: RiskAssessment;
	entities: { name: string; type: string }[];
	key_moments?: { timestamp: number; label: string }[];
	ultra_psychological_analysis?: {
		defense_mechanisms: {
			mechanism: string;
			evidence: string;
			interpretation: string;
		}[];
		transference_notes: {
			patient_to_therapist: string;
			countertransference_risks: string;
		};
		diagnostic_hypotheses: {
			diagnosis: string;
			supporting_evidence: string;
			follow_up: string;
		}[];
	};
}

export interface Biometry {
	talkListenRatio: { patient: number; therapist: number };
	silences: { start: number; duration: number }[];
}

export interface ProcessSessionResponse {
	message: string;
	transcript: string;
	analysis: AnalysisResult;
	biometry?: Biometry;
	localDuration?: number;
	noteFormat?: string;
	hasHistoricalContext?: boolean;
	patientIdentifier?: string | null;
}

interface AudioUploaderProps {
	onAnalysisComplete?: (data: ProcessSessionResponse) => void;
	onAudioSelected?: (file: File) => void;
	onClose?: () => void;
	patientName?: string;
	patientAge?: number;
	patientGender?: string;
	userId?: string;
	userPlan?: string | null;
	userSalt?: string | null; // Required for encryption
}

// Helper functions for sentiment display
const getSentimentLabel = (sentiment?: string): string => {
	if (!sentiment) return "N/A";
	const labels: Record<string, string> = {
		Positivo: "POSITIVO",
		Negativo: "NEGATIVO",
		Neutral: "NEUTRAL",
		Ansioso: "ANSIOSO",
		Triste: "TRISTE",
		Enojado: "ENOJADO",
		Confundido: "CONFUNDIDO",
		Esperanzado: "ESPERANZADO",
		Abrumado: "ABRUMADO",
		Frustrado: "FRUSTRADO",
	};
	return labels[sentiment] || sentiment.toUpperCase();
};

const getSentimentColor = (
	sentiment?: string,
): "success" | "error" | "warning" | "info" | "default" => {
	if (!sentiment) return "default";
	const colors: Record<
		string,
		"success" | "error" | "warning" | "info" | "default"
	> = {
		Positivo: "success",
		Negativo: "error",
		Neutral: "default",
		Ansioso: "warning",
		Triste: "info",
		Enojado: "error",
		Confundido: "warning",
		Esperanzado: "success",
		Abrumado: "warning",
		Frustrado: "error",
	};
	return colors[sentiment] || "default";
};

export const AudioUploader: React.FC<AudioUploaderProps> = ({
	patientName,
	patientAge,
	patientGender,
	userId,
	userPlan,
	userSalt,
	onAnalysisComplete,
	onAudioSelected,
	onClose,
}) => {
	const encryption = useEncryption();
	const theme = useTheme();
	const gradients = getGradients(theme.palette.mode as "light" | "dark");

	const [file, setFile] = useState<File | null>(null);

	const [status, setStatus] = useState<
		"idle" | "uploading" | "processing" | "completed" | "error"
	>("idle");
	const [result, setResult] = useState<ProcessSessionResponse | null>(null);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [inputLang, setInputLang] = useState<string>("es-US");
	const [outputLang, setOutputLang] = useState<string>("Spanish");
	const [noteFormat, setNoteFormat] = useState<"SOAP" | "DAP" | "BIRP">("SOAP");
	const [patientIdentifier, setPatientIdentifier] = useState<string>("");
	const [audioDuration, setAudioDuration] = useState<number | null>(null);
	const [showUpgradeModal, setShowUpgradeModal] = useState(false);
	const [processingSessionId, setProcessingSessionId] = useState<string | null>(
		null,
	);
	const [monthlyLimitData, setMonthlyLimitData] = useState<{
		used: number;
		monthYear: string;
	} | null>(null);

	const [isExporting, setIsExporting] = useState(false);

	// Supabase Realtime subscription for receiving processing results
	React.useEffect(() => {
		if (!processingSessionId || !userId || !userSalt) return;

		console.log(`[Realtime] Subscribing to session ${processingSessionId}`);

		// Timeout handler: if no response after 5 minutes, show error
		const timeoutId = setTimeout(
			() => {
				console.error(
					"[Realtime] Processing timeout - no response after 5 minutes",
				);
				setErrorMessage(
					"El procesamiento está tardando más de lo esperado. Por favor, intenta de nuevo o contacta soporte si el problema persiste.",
				);
				setStatus("error");
				setProcessingSessionId(null);
			},
			5 * 60 * 1000,
		); // 5 minutes

		const subscription = supabase
			.channel(`processing_session_${processingSessionId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "processing_sessions",
					filter: `id=eq.${processingSessionId}`,
				},
				async (payload) => {
					console.log("[Realtime] Received update:", payload);
					clearTimeout(timeoutId); // Clear timeout on successful response

					const session = payload.new as any;

					// Check if temp_result is available and not consumed
					if (session.temp_result && !session.temp_result_consumed) {
						console.log("[Realtime] Temp result received, encrypting...");

						try {
							// 1. Encrypt result with user's password + salt
							const encryptedResult = await encryption.encrypt(
								session.temp_result,
								userSalt,
							);

							console.log("[Realtime] Result encrypted, saving...");

							// 2. Save encrypted result to server
							const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
							const saveResponse = await fetch(
								`${apiUrl}/api/save-encrypted-result`,
								{
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										sessionId: processingSessionId,
										encryptedResult: encryptedResult,
										userId: userId,
									}),
								},
							);

							if (!saveResponse.ok) {
								throw new Error("Failed to save encrypted result");
							}

							console.log("[Realtime] Encrypted result saved");

							// 3. Clear temp_result from server for security
							await fetch(`${apiUrl}/api/clear-temp-result`, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									sessionId: processingSessionId,
									userId: userId,
								}),
							});

							console.log("[Realtime] Temp result cleared from server");

							// 4. Save patient summary if Ultra plan and patientIdentifier provided
							if (
								userPlan === "ultra" &&
								session.temp_result.patientIdentifier
							) {
								try {
									const summaryText =
										session.temp_result.analysis?.clinical_note ||
										session.temp_result.analysis?.summary ||
										"";

									if (summaryText) {
										const encryptedSummary = await encryption.encrypt(
											summaryText,
											userSalt,
										);

										await fetch(`${apiUrl}/api/save-patient-summary`, {
											method: "POST",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												userId: userId,
												patientIdentifier:
													session.temp_result.patientIdentifier,
												encryptedSummary: encryptedSummary,
											}),
										});

										console.log("[Patient Summary] Saved successfully");
									}
								} catch (summaryError) {
									console.error(
										"[Patient Summary] Error saving:",
										summaryError,
									);
									// Don't fail main flow if summary fails
								}
							}

							// 5. Display result to user
							const data: ProcessSessionResponse = {
								message: "Procesamiento completado",
								transcript: session.temp_result.transcript || "",
								analysis: session.temp_result.analysis,
								biometry: session.temp_result.biometry,
								noteFormat: noteFormat,
								hasHistoricalContext: session.temp_result.hasHistoricalContext,
								patientIdentifier: session.temp_result.patientIdentifier,
							};

							setResult(data);
							setStatus("completed");
							onAnalysisComplete?.(data);
							if (file) {
								onAudioSelected?.(file);
							}
						} catch (error) {
							console.error("[Realtime] Error processing result:", error);
							setErrorMessage(
								"Error al procesar el resultado cifrado. Por favor, intenta de nuevo.",
							);
							setStatus("error");
						}
					}

					// Handle error status
					if (session.status === "error") {
						console.error(
							"[Realtime] Processing error:",
							session.error_message,
						);
						clearTimeout(timeoutId); // Clear timeout on error
						setErrorMessage(
							session.error_message || "Error durante el procesamiento",
						);
						setStatus("error");
					}
				},
			)
			.subscribe((status) => {
				console.log("[Realtime] Subscription status:", status);
			});

		// Cleanup on unmount
		return () => {
			console.log("[Realtime] Unsubscribing");
			clearTimeout(timeoutId); // Clear timeout on cleanup
			subscription.unsubscribe();
		};
	}, [
		processingSessionId,
		userId,
		userSalt,
		encryption,
		noteFormat,
		file,
		onAnalysisComplete,
		onAudioSelected,
		userPlan,
	]);

	const handleExportMedicalReport = async () => {
		if (!result || !userId) return;

		setIsExporting(true);
		try {
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const response = await fetch(`${apiUrl}/api/generate-medical-report`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					sessionId:
						(result as any).sessionId || result.transcript.substring(0, 10), // Fallback if sessionId not directly in result
					userId: userId,
				}),
			});

			if (!response.ok) throw new Error("Error al generar el informe");

			const data = await response.json();

			// Download as file
			const element = document.createElement("a");
			const file = new Blob([data.report], { type: "text/markdown" });
			element.href = URL.createObjectURL(file);
			const dateStr = new Date(data.sessionDate).toISOString().split("T")[0];
			element.download = `Informe_Profesional_${patientName || "Paciente"}_${dateStr}.md`;
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element);
		} catch (error) {
			console.error("Export error:", error);
			alert(
				"Hubo un error al generar el informe profesional. Por favor reintenta.",
			);
		} finally {
			setIsExporting(false);
		}
	};

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		if (acceptedFiles.length > 0) {
			const selectedFile = acceptedFiles[0];
			setFile(selectedFile);
			setStatus("idle");
			setResult(null);
		}
	}, []);

	// Extract audio duration
	React.useEffect(() => {
		if (file) {
			const objectUrl = URL.createObjectURL(file);
			const audio = new Audio(objectUrl);
			audio.onloadedmetadata = () => {
				setAudioDuration(audio.duration);
				URL.revokeObjectURL(objectUrl);
			};
		} else {
			setAudioDuration(null);
		}
	}, [file]);

	const getEstimatedTime = () => {
		if (!audioDuration) return null;
		// Based on benchmark: processing takes ~1.5% of audio duration
		// e.g. 45 min (2700s) -> ~40s
		const estimatedSeconds = audioDuration * 0.015;

		if (estimatedSeconds < 30) return "Unos segundos";
		if (estimatedSeconds < 60)
			return `~${Math.ceil(estimatedSeconds)} segundos`;
		const mins = Math.ceil(estimatedSeconds / 60);
		return `~${mins} minuto${mins > 1 ? "s" : ""}`;
	};

	// Enforce Spanish output if input is Spanish
	React.useEffect(() => {
		if (inputLang.startsWith("es")) {
			setOutputLang("Spanish");
		}
	}, [inputLang]);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"audio/*": [".mp3", ".wav", ".ogg", ".m4a"],
		},
		maxFiles: 1,
	});

	const handleUpload = async () => {
		if (!file) return;

		// Client-side size validation (100MB)
		const MAX_FILE_SIZE = 100 * 1024 * 1024;
		if (file.size > MAX_FILE_SIZE) {
			setErrorMessage("El archivo es demasiado grande (máximo 100MB).");
			setStatus("error");
			return;
		}

		setStatus("uploading");

		const formData = new FormData();
		formData.append("audio", file);
		formData.append("inputLanguage", inputLang);
		formData.append("outputLanguage", outputLang);
		formData.append("noteFormat", noteFormat);
		if (patientName) {
			formData.append("patientName", patientName);
		}
		if (patientAge) {
			formData.append("patientAge", patientAge.toString());
		}
		if (patientGender) {
			formData.append("patientGender", patientGender);
		}
		if (userId) {
			formData.append("userId", userId);
		}
		if (patientIdentifier) {
			formData.append("patientIdentifier", patientIdentifier);
		}

		try {
			setStatus("processing");

			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const baseUrl = apiUrl || "";
			const processUrl = `${baseUrl}/api/process-session`;

			console.log("Subiendo audio a API:", processUrl);
			const response = await fetch(processUrl, {
				method: "POST",
				body: formData,
			});

			if (response.status !== 200 && response.status !== 202) {
				try {
					const errorData = await response.json();

					// Check for monthly limit error
					if (errorData.message === "monthly_limit_exceeded") {
						setMonthlyLimitData({
							used: errorData.used,
							monthYear: errorData.monthYear,
						});
						setShowUpgradeModal(true);
						setStatus("idle");
						return;
					}

					// Check for file size error (413 Payload Too Large)
					if (response.status === 413) {
						throw new Error(
							"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.",
						);
					}

					// Check for specific error messages
					const errorMessage = errorData.error || errorData.message;

					// File size error from server
					if (
						errorMessage?.includes("demasiado grande") ||
						errorMessage?.includes("100MB")
					) {
						throw new Error(errorMessage);
					}

					// Credits exhausted
					if (
						errorMessage?.includes("créditos") ||
						errorMessage?.includes("Créditos") ||
						errorMessage?.includes("monthly_limit_exceeded")
					) {
						if (errorData.message === "monthly_limit_exceeded") {
							setMonthlyLimitData({
								used: errorData.used || 3,
								monthYear:
									errorData.monthYear || new Date().toISOString().slice(0, 7),
							});
							setShowUpgradeModal(true);
							setStatus("idle");
							return;
						}
						throw new Error(errorMessage);
					}

					// Generic error with server message
					throw new Error(
						errorMessage ||
							`Error del servidor: ${response.status} ${response.statusText}`,
					);
				} catch (parseError) {
					// If JSON parsing fails, check status code
					if (response.status === 413) {
						throw new Error(
							"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.",
						);
					}

					// Try to get text response
					try {
						const errorText = await response.text();
						if (
							errorText?.includes("demasiado grande") ||
							errorText?.includes("100MB")
						) {
							throw new Error(
								"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.",
							);
						}
						throw new Error(
							`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`,
						);
					} catch {
						throw new Error(
							`Error del servidor: ${response.status} ${response.statusText}`,
						);
					}
				}
			}

			const initResponse = await response.json();

			if (initResponse.sessionId) {
				const sessionId = initResponse.sessionId;
				console.log("Procesamiento iniciado, sessionId:", sessionId);

				// Set processingSessionId to trigger Realtime subscription
				// The useEffect will handle receiving the result via Realtime
				setProcessingSessionId(sessionId);

				// Result will be received via Realtime subscription
				// No need to poll - Supabase will notify us when temp_result is ready
				console.log("[Upload] Waiting for Realtime notification...");
			} else {
				const data: ProcessSessionResponse = initResponse;
				setResult(data);
				setStatus("completed");
				onAnalysisComplete?.(data);
				if (file) {
					onAudioSelected?.(file);
				}
			}
		} catch (error: any) {
			console.error("Error en la subida", error);
			let message = error.message || "Algo salió mal al procesar la sesión";

			// Network errors
			if (
				message.includes("Failed to fetch") ||
				message.includes("net::ERR_FAILED") ||
				message.includes("NetworkError")
			) {
				message =
					"Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.";
			}

			// Timeout errors
			if (message.includes("timeout") || message.includes("timed out")) {
				message =
					"La solicitud tardó demasiado tiempo. Por favor, intenta nuevamente.";
			}

			// If message already mentions file size, keep it as is
			// Otherwise, check if it might be a file size issue
			if (!message.includes("demasiado grande") && !message.includes("100MB")) {
				if (message.includes("413") || message.includes("Payload Too Large")) {
					message =
						"El archivo es demasiado grande. El tamaño máximo permitido es 100MB.";
				}
			}

			setErrorMessage(message);
			setStatus("error");
		}
	};

	const getStatusMessage = () => {
		switch (status) {
			case "uploading":
				return "Subiendo audio a almacenamiento seguro...";
			case "processing":
				return "Analizando tu sesión...";
			case "completed":
				return "¡Análisis completado!";
			case "error":
				return "Error al procesar la sesión";
			default:
				return "";
		}
	};

	return (
		<Box sx={{ maxWidth: 800, margin: "0 auto", p: { xs: 2, sm: 3 } }}>
			<AnimatePresence mode="wait">
				{!result ?
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95 }}
						key="upload-area"
					>
						<GlassCard
							sx={{
								p: { xs: 3, sm: 4 },
								boxShadow: "none",
								border: "none",
								bgcolor: "transparent",
							}}
						>
							<Typography
								variant="h4"
								gutterBottom
								sx={{
									background: gradients.primary,
									backgroundClip: "text",
									WebkitBackgroundClip: "text",
									color: "transparent",
									fontWeight: typographyExtended.fontWeights.bold,
									textAlign: "center",
									mb: 1,
								}}
							>
								Nueva Sesión
							</Typography>

							<Stack spacing={2} sx={{ mb: 4 }}>
								<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
									<TextField
										select
										label="Idioma"
										value={inputLang}
										onChange={(e) => setInputLang(e.target.value)}
										SelectProps={{ native: true }}
										fullWidth
										variant="outlined"
										size="small"
									>
										<option value="es-US">Español (Latam)</option>
										<option value="es-ES">Español (España)</option>
										<option value="en-US">Inglés (EE.UU.)</option>
									</TextField>

									<TextField
										select
										label="Formato de Nota"
										value={noteFormat}
										onChange={(e) =>
											setNoteFormat(e.target.value as "SOAP" | "DAP" | "BIRP")
										}
										SelectProps={{ native: true }}
										fullWidth
										variant="outlined"
										size="small"
									>
										<option value="SOAP">Formato SOAP</option>
										<option value="DAP">Formato DAP</option>
										<option value="BIRP">Formato BIRP</option>
									</TextField>
								</Stack>

								{/* Ultra Plan Feature: Patient Identifier for Memory */}
								{userPlan === "ultra" && (
									<Box sx={{ mt: 1 }}>
										<TextField
											label="Identificador de Paciente (Opcional)"
											placeholder="P. ej: Juan P., Paciente B"
											value={patientIdentifier}
											onChange={(e) => setPatientIdentifier(e.target.value)}
											fullWidth
											variant="outlined"
											size="small"
											helperText="Usa un identificador único para habilitar la memoria a largo plazo de Claude para este paciente."
										/>
									</Box>
								)}
							</Stack>

							<StyledDropzone
								{...getRootProps({ isDragActive })}
								sx={{
									py: 6,
									px: 2,
									borderStyle: "dashed",
									borderColor: isDragActive ? "primary.main" : "divider",
									bgcolor:
										isDragActive ?
											alpha(theme.palette.primary.main, 0.1)
										:	"transparent",
								}}
							>
								<input {...getInputProps()} />
								<CloudUploadIcon
									sx={{
										fontSize: 48,
										color: "primary.main",
										mb: 2,
										opacity: 0.7,
									}}
								/>
								{isDragActive ?
									<Typography
										variant="subtitle1"
										color="primary"
										fontWeight="600"
									>
										Sueltalo aquí...
									</Typography>
								:	<Box>
										<Typography
											variant="subtitle1"
											sx={{ color: "text.primary", fontWeight: "600" }}
										>
											{file ? file.name : "Selecciona o arrastra el audio"}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											MP3, WAV, M4A (Máx 100MB)
										</Typography>
									</Box>
								}
							</StyledDropzone>

							{file && audioDuration && status === "idle" && (
								<Box sx={{ mt: 1, textAlign: "center" }}>
									<Typography
										variant="caption"
										sx={{
											color: "primary.main",
											bgcolor: (theme) =>
												alpha(theme.palette.primary.main, 0.1),
											px: 1.5,
											py: 0.5,
											borderRadius: 4,
											fontWeight: "bold",
										}}
									>
										⏱️ Tiempo estimado de análisis: {getEstimatedTime()}
									</Typography>
								</Box>
							)}

							{status !== "idle" && status !== "error" && (
								<Box
									sx={{
										mt: 3,
										textAlign: "center",
										animation: "pulse 2s infinite",
									}}
								>
									<CircularProgress
										size={20}
										sx={{ mb: 1.5, color: "primary.main" }}
									/>
									<Typography
										variant="body2"
										color="primary.main"
										fontWeight="600"
									>
										{getStatusMessage()}
									</Typography>
								</Box>
							)}

							{status === "error" && (
								<Box
									sx={{
										mt: 3,
										p: 2,
										bgcolor: (theme) => alpha(theme.palette.error.main, 0.1),
										borderRadius: 2,
										border: "1px solid",
										borderColor: "error.light",
										textAlign: "center",
										color: "error.main",
									}}
								>
									<ErrorIcon
										sx={{ verticalAlign: "middle", mr: 1, fontSize: 20 }}
									/>
									<Typography variant="body2" component="span" fontWeight="600">
										{errorMessage}
									</Typography>
								</Box>
							)}

							{file && status === "idle" && (
								<Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
									<Button
										variant="contained"
										size="large"
										onClick={handleUpload}
										fullWidth
										sx={{
											borderRadius: 2,
											py: 1.5,
											textTransform: "none",
											fontWeight: "bold",
											boxShadow: (theme) =>
												`0 4px 14px 0 ${alpha(
													theme.palette.primary.main,
													0.4,
												)}`,
										}}
									>
										Comenzar Análisis
									</Button>
								</Box>
							)}
						</GlassCard>
					</motion.div>
				:	<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						key="results-area"
					>
						<GlassCard sx={{ p: 0, border: "none" }}>
							<Box
								sx={{
									p: 3,
									textAlign: "center",
									borderBottom: "1px solid",
									borderColor: "divider",
								}}
							>
								<CheckCircleIcon
									sx={{ color: "success.main", fontSize: 48, mb: 1 }}
								/>
								<Typography variant="h5" sx={{ fontWeight: "bold" }}>
									Procesamiento Exitoso
								</Typography>
								<Typography variant="body2" color="text.secondary">
									La sesión ha sido analizada por completo.
								</Typography>
							</Box>

							<Box sx={{ p: 3 }}>
								<Stack spacing={3}>
									{/* Quick Stats */}
									<Stack direction="row" spacing={2} justifyContent="center">
										<Paper
											elevation={0}
											sx={{
												p: 1.5,
												flex: 1,
												textAlign: "center",
												bgcolor: "background.default",
												border: "1px solid",
												borderColor: "divider",
												borderRadius: 2,
											}}
										>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{
													display: "block",
													mb: 0.5,
													textTransform: "uppercase",
													fontSize: 10,
													fontWeight: "bold",
												}}
											>
												Sentimiento
											</Typography>
											<Chip
												label={getSentimentLabel(result.analysis?.sentiment)}
												color={getSentimentColor(result.analysis?.sentiment)}
												size="small"
												sx={{ fontWeight: "bold", height: 24 }}
											/>
										</Paper>
										<Paper
											elevation={0}
											sx={{
												p: 1.5,
												flex: 1,
												textAlign: "center",
												bgcolor: "background.default",
												border: "1px solid",
												borderColor: "divider",
												borderRadius: 2,
											}}
										>
											<Typography
												variant="caption"
												color="text.secondary"
												sx={{
													display: "block",
													mb: 0.5,
													textTransform: "uppercase",
													fontSize: 10,
													fontWeight: "bold",
												}}
											>
												Temas Clave
											</Typography>
											<Typography variant="subtitle2" fontWeight="bold">
												{result.analysis?.topics?.length || 0} detectados
											</Typography>
										</Paper>
										{result.hasHistoricalContext && (
											<Paper
												elevation={0}
												sx={{
													p: 1.5,
													flex: 1,
													textAlign: "center",
													bgcolor: (theme) =>
														alpha(theme.palette.primary.main, 0.05),
													border: "1px solid",
													borderColor: "primary.light",
													borderRadius: 2,
												}}
											>
												<Typography
													variant="caption"
													color="primary.main"
													sx={{
														display: "block",
														mb: 0.5,
														textTransform: "uppercase",
														fontSize: 10,
														fontWeight: "bold",
													}}
												>
													Historial
												</Typography>
												<Chip
													label="MEMORIA ACTIVA"
													color="primary"
													size="small"
													sx={{ fontWeight: "bold", height: 24, fontSize: 10 }}
												/>
											</Paper>
										)}
									</Stack>

									{/* Summary Preview */}
									<Box>
										<Stack
											direction="row"
											alignItems="center"
											spacing={1}
											mb={1}
										>
											<DescriptionIcon color="primary" sx={{ fontSize: 20 }} />
											<Typography variant="subtitle2" fontWeight="bold">
												Resumen Ejecutivo
											</Typography>
										</Stack>
										<Typography
											variant="body2"
											color="text.secondary"
											sx={{
												bgcolor: "background.default",
												p: 2,
												borderRadius: 2,
												border: "1px solid",
												borderColor: "divider",
												lineHeight: 1.6,
											}}
										>
											{result.analysis?.summary}
										</Typography>
									</Box>

									{/* Topics Pills */}
									<Box>
										<Typography
											variant="subtitle2"
											fontWeight="bold"
											mb={1}
											sx={{
												fontSize: 12,
												color: "text.secondary",
												textTransform: "uppercase",
											}}
										>
											Temas Abordados
										</Typography>
										<Box display="flex" flexWrap="wrap" gap={1}>
											{result.analysis?.topics?.map((topic, i) => (
												<Chip
													key={i}
													label={topic.label}
													size="small"
													variant="outlined"
													sx={{ borderRadius: 1.5 }}
												/>
											))}
										</Box>
									</Box>

									{/* Risk Alert if any */}
									{result.analysis?.risk_assessment?.has_risk && (
										<Box
											sx={{
												p: 2,
												bgcolor: "error.dark",
												borderRadius: 2,
												border: "2px solid",
												borderColor: "error.main",
											}}
										>
											<Typography variant="body2" color="#ffffff">
												{result.analysis.risk_assessment.summary}
											</Typography>
										</Box>
									)}

									{/* Ultra Plan Feature: Clinical Supervision Analysis */}
									{userPlan === "ultra" &&
										result.analysis.ultra_psychological_analysis && (
											<Box
												sx={{
													p: 2.5,
													borderRadius: 3,
													bgcolor: (theme) =>
														alpha(theme.palette.primary.main, 0.05),
													border: "1px solid",
													borderColor: "primary.light",
												}}
											>
												<Stack
													direction="row"
													alignItems="center"
													spacing={1}
													mb={2}
												>
													<Psychology color="primary" sx={{ fontSize: 24 }} />
													<Typography
														variant="subtitle1"
														fontWeight="bold"
														color="primary"
													>
														Supervisión Clínica (Plan Ultra)
													</Typography>
												</Stack>

												<Stack spacing={2}>
													{/* Defense Mechanisms */}
													<Box>
														<Typography
															variant="caption"
															fontWeight="bold"
															color="text.secondary"
															sx={{ textTransform: "uppercase" }}
														>
															Mecanismos de Defensa
														</Typography>
														<Stack spacing={1} mt={1}>
															{result.analysis.ultra_psychological_analysis.defense_mechanisms.map(
																(dm, i) => (
																	<Box
																		key={i}
																		sx={{
																			p: 1,
																			bgcolor: "background.paper",
																			borderRadius: 1.5,
																			borderLeft: "4px solid",
																			borderLeftColor: "primary.main",
																		}}
																	>
																		<Typography
																			variant="body2"
																			fontWeight="bold"
																		>
																			{dm.mechanism}
																		</Typography>
																		<Typography
																			variant="caption"
																			sx={{
																				fontStyle: "italic",
																				display: "block",
																			}}
																		>
																			"{dm.evidence}"
																		</Typography>
																		<Typography
																			variant="caption"
																			color="text.secondary"
																		>
																			{dm.interpretation}
																		</Typography>
																	</Box>
																),
															)}
														</Stack>
													</Box>

													{/* Transference */}
													<Box>
														<Typography
															variant="caption"
															fontWeight="bold"
															color="text.secondary"
															sx={{ textTransform: "uppercase" }}
														>
															Transferencia y Contratransferencia
														</Typography>
														<Typography
															variant="body2"
															mt={0.5}
															sx={{
																p: 1,
																bgcolor: "background.paper",
																borderRadius: 1.5,
															}}
														>
															<strong>Transferencia:</strong>{" "}
															{
																result.analysis.ultra_psychological_analysis
																	.transference_notes.patient_to_therapist
															}
														</Typography>
														<Typography
															variant="body2"
															mt={0.5}
															sx={{
																p: 1,
																bgcolor: "background.paper",
																borderRadius: 1.5,
															}}
														>
															<strong>Riesgos C-T:</strong>{" "}
															{
																result.analysis.ultra_psychological_analysis
																	.transference_notes.countertransference_risks
															}
														</Typography>
													</Box>

													{/* Diagnostic Hypotheses */}
													<Box>
														<Typography
															variant="caption"
															fontWeight="bold"
															color="text.secondary"
															sx={{ textTransform: "uppercase" }}
														>
															Hipótesis Diagnósticas
														</Typography>
														<Stack spacing={1} mt={1}>
															{result.analysis.ultra_psychological_analysis.diagnostic_hypotheses.map(
																(dh, i) => (
																	<Box
																		key={i}
																		sx={{
																			p: 1,
																			bgcolor: "background.paper",
																			borderRadius: 1.5,
																		}}
																	>
																		<Typography
																			variant="body2"
																			fontWeight="bold"
																		>
																			{dh.diagnosis}
																		</Typography>
																		<Typography
																			variant="caption"
																			color="text.secondary"
																		>
																			{dh.supporting_evidence}
																		</Typography>
																	</Box>
																),
															)}
														</Stack>
													</Box>
												</Stack>
											</Box>
										)}

									{/* Export Options for Ultra */}
									{userPlan === "ultra" && (
										<Box sx={{ mt: 2 }}>
											<Button
												variant="outlined"
												color="primary"
												fullWidth
												disabled={isExporting}
												startIcon={
													isExporting ?
														<CircularProgress size={20} />
													:	<AssignmentTurnedInIcon />
												}
												onClick={handleExportMedicalReport}
												sx={{
													borderRadius: 2,
													py: 1.5,
													borderDash: "1px dashed",
													fontWeight: "bold",
													background: (theme) =>
														alpha(theme.palette.primary.main, 0.05),
												}}
											>
												{isExporting ?
													"Generando..."
												:	"Exportar Informe Profesional para Prepaga/Seguro"}
											</Button>
											<Typography
												variant="caption"
												color="text.secondary"
												align="center"
												sx={{ display: "block", mt: 1 }}
											>
												Incluye sanitización automática de PII y lenguaje
												profesional.
											</Typography>
										</Box>
									)}
								</Stack>
							</Box>

							<Divider />

							<Box
								sx={{
									p: 2.5,
									bgcolor: "background.default",
									display: "flex",
									justifyContent: "center",
								}}
							>
								<Button
									variant="contained"
									size="large"
									fullWidth
									onClick={() => onClose?.()}
									startIcon={<AssignmentTurnedInIcon />}
									sx={{
										borderRadius: 2,
										py: 1.5,
										fontSize: "1rem",
										fontWeight: "bold",
										textTransform: "none",
										boxShadow: (theme) => theme.shadows[2],
									}}
								>
									Listo, ver en el panel
								</Button>
							</Box>
						</GlassCard>
					</motion.div>
				}
			</AnimatePresence>

			{monthlyLimitData && (
				<UpgradeToProModal
					open={showUpgradeModal}
					onClose={() => {
						setShowUpgradeModal(false);
						setMonthlyLimitData(null);
					}}
					userId={userId || ""}
					userEmail={""}
					usedTranscriptions={monthlyLimitData.used}
					monthYear={monthlyLimitData.monthYear}
				/>
			)}
		</Box>
	);
};
