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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DescriptionIcon from "@mui/icons-material/Description";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { GlassCard, StyledDropzone } from "./UploaderStyles";
import { getGradients, typographyExtended } from "../styles.theme";

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
}

interface AudioUploaderProps {
	onAnalysisComplete?: (data: ProcessSessionResponse) => void;
	onAudioSelected?: (file: File) => void;
	onClose?: () => void;
	patientName?: string;
	patientAge?: number;
	patientGender?: string;
	userId?: string;
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
	sentiment?: string
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
	onAnalysisComplete,
	onAudioSelected,
	onClose,
}) => {
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

	const onDrop = useCallback(async (acceptedFiles: File[]) => {
		if (acceptedFiles.length > 0) {
			const selectedFile = acceptedFiles[0];
			setFile(selectedFile);
			setStatus("idle");
			setResult(null);
		}
	}, []);

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
				const errorText = await response.text();
				throw new Error(
					`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`
				);
			}

			const initResponse = await response.json();

			if (initResponse.sessionId) {
				const sessionId = initResponse.sessionId;
				console.log("Procesamiento iniciado, sessionId:", sessionId);

				const pollInterval = 3000;
				const maxPollAttempts = 120;
				let attempts = 0;

				const pollForResults = async (): Promise<void> => {
					while (attempts < maxPollAttempts) {
						await new Promise((resolve) => setTimeout(resolve, pollInterval));
						attempts++;

						try {
							const statusUrl = `${baseUrl}/api/session/${sessionId}`;
							const statusResponse = await fetch(statusUrl);

							if (!statusResponse.ok) {
								if (statusResponse.status === 404 && attempts < 5) {
									continue;
								}
								throw new Error(
									`Error al verificar estado: ${statusResponse.statusText}`
								);
							}

							const sessionData = await statusResponse.json();

							if (sessionData.status === "completed" && sessionData.data) {
								const data: ProcessSessionResponse = {
									message: "Procesamiento completado",
									transcript: sessionData.data.transcript || "",
									analysis: sessionData.data.analysis,
									biometry: sessionData.data.biometry,
									noteFormat: noteFormat,
								};

								setResult(data);
								setStatus("completed");
								onAnalysisComplete?.(data);
								if (file) {
									onAudioSelected?.(file);
								}
								return;
							} else if (sessionData.status === "error") {
								throw new Error(
									sessionData.error || "Error durante el procesamiento"
								);
							}
						} catch (pollError: any) {
							if (attempts < 10 && pollError.message?.includes("fetch")) {
								continue;
							}
							throw pollError;
						}
					}

					throw new Error(
						"Tiempo de espera agotado. El procesamiento está tomando más tiempo del esperado."
					);
				};

				await pollForResults();
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

			if (
				message.includes("Failed to fetch") ||
				message.includes("net::ERR_FAILED")
			) {
				message =
					"Error de conexión. Esto puede deberse a que el archivo es demasiado grande (límite del servidor excedido) o a un problema de red.";
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
				{!result ? (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95 }}
						key="upload-area"
					>
						<GlassCard
							sx={{ p: { xs: 3, sm: 4 }, boxShadow: "none", border: "none" }}
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

							<Typography
								variant="body2"
								color="text.secondary"
								align="center"
								sx={{ mb: 4, px: 2 }}
							>
								Sube el audio para obtener la transcripción y el análisis
								clínico automático.
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
							</Stack>

							<StyledDropzone
								{...getRootProps({ isDragActive })}
								sx={{
									py: 6,
									px: 2,
									borderStyle: "dashed",
									borderColor: isDragActive ? "primary.main" : "divider",
									bgcolor: isDragActive ? "primary.lighter" : "transparent",
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
								{isDragActive ? (
									<Typography
										variant="subtitle1"
										color="primary"
										fontWeight="600"
									>
										Sueltalo aquí...
									</Typography>
								) : (
									<Box>
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
								)}
							</StyledDropzone>

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
										bgcolor: "error.lighter",
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
											boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
										}}
									>
										Comenzar Análisis
									</Button>
								</Box>
							)}
						</GlassCard>
					</motion.div>
				) : (
					<motion.div
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
												bgcolor: "error.lighter",
												borderRadius: 2,
												border: "1px solid",
												borderColor: "error.light",
											}}
										>
											<Typography
												variant="subtitle2"
												color="error.main"
												fontWeight="bold"
												mb={0.5}
											>
												Atención: Factores de Riesgo
											</Typography>
											<Typography variant="caption" color="error.main">
												{result.analysis.risk_assessment.summary}
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
										boxShadow: "0 4px 14px 0 rgba(0,0,0,0.1)",
									}}
								>
									Listo, ver en el panel
								</Button>
							</Box>
						</GlassCard>
					</motion.div>
				)}
			</AnimatePresence>
		</Box>
	);
};
