import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
	Box,
	Typography,
	CircularProgress,
	List,
	ListItem,
	ListItemText,
	Chip,
	Paper,
	Button,
	TextField,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import DescriptionIcon from "@mui/icons-material/Description";
import { GlassCard, StyledDropzone } from "./UploaderStyles";
import { getGradients } from "../styles.theme";
import { useTheme } from "@mui/material/styles";

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
}

interface AudioUploaderProps {
	onAnalysisComplete?: (data: ProcessSessionResponse) => void;
	onAudioSelected?: (file: File) => void;
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
	onAnalysisComplete,
	onAudioSelected,
}) => {
	const theme = useTheme();
	const gradients = getGradients(theme.palette.mode as "light" | "dark");

	const [file, setFile] = useState<File | null>(null);
	const [localDuration, setLocalDuration] = useState<number | null>(null);
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

			// Extract local duration via Electron IPC if available
			try {
				// @ts-ignore
				if (
					window.ipcRenderer?.getAudioDuration &&
					(selectedFile as any).path
				) {
					// @ts-ignore
					const duration = await window.ipcRenderer.getAudioDuration(
						(selectedFile as any).path
					);
					setLocalDuration(duration);
				}
			} catch (err) {
				console.error("Failed to get local duration:", err);
			}
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

		setStatus("uploading");

		const formData = new FormData();
		formData.append("audio", file);
		formData.append("inputLanguage", inputLang);
		formData.append("outputLanguage", outputLang);
		formData.append("noteFormat", noteFormat);

		try {
			setStatus("processing");

			// Use Vite proxy in dev mode if VITE_API_URL is not set
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const baseUrl = apiUrl || ""; // Empty string uses relative path (Vite proxy)
			const processUrl = `${baseUrl}/api/process-session`;

			console.log("Subiendo audio a API:", processUrl);
			const response = await fetch(processUrl, {
				method: "POST",
				body: formData,
			});

			// Accept both 200 and 202 status codes
			if (response.status !== 200 && response.status !== 202) {
				const errorText = await response.text();
				throw new Error(
					`Error del servidor: ${response.status} ${response.statusText}. ${errorText}`
				);
			}

			const initResponse = await response.json();

			// If we got a sessionId, we need to poll for results
			if (initResponse.sessionId) {
				const sessionId = initResponse.sessionId;
				console.log("Procesamiento iniciado, sessionId:", sessionId);

				// Poll for results
				const pollInterval = 3000; // Poll every 3 seconds
				const maxPollAttempts = 120; // Max 6 minutes
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
									// Session might not be ready yet, continue polling
									continue;
								}
								throw new Error(
									`Error al verificar estado: ${statusResponse.statusText}`
								);
							}

							const sessionData = await statusResponse.json();

							if (sessionData.status === "completed" && sessionData.data) {
								// Build the response in the expected format
								const data: ProcessSessionResponse = {
									message: "Procesamiento completado",
									transcript: sessionData.data.transcript || "",
									analysis: sessionData.data.analysis,
									biometry: sessionData.data.biometry,
									localDuration: localDuration || undefined,
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
							// If still processing, continue polling
						} catch (pollError: any) {
							// If it's a network error and we haven't tried many times, continue
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
				// Direct response (legacy support)
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
			setErrorMessage(error.message || "Algo salió mal al procesar la sesión");
			setStatus("error");
		}
	};

	const getStatusMessage = () => {
		switch (status) {
			case "uploading":
				return "Subiendo audio a almacenamiento seguro...";
			case "processing":
				return "La IA está analizando tu sesión (Transcribiendo y Extrayendo)...";
			case "completed":
				return "¡Análisis completado!";
			case "error":
				return "Error al procesar la sesión";
			default:
				return "";
		}
	};

	return (
		<Box sx={{ maxWidth: 800, margin: "0 auto", p: 3 }}>
			<AnimatePresence mode="wait">
				{!result ? (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						key="upload-area"
					>
						<GlassCard sx={{ p: 4 }}>
							<Typography
								variant="h4"
								gutterBottom
								sx={{
									background: gradients.primary,
									backgroundClip: "text",
									WebkitBackgroundClip: "text",
									color: "transparent",
									fontWeight: "bold",
								}}
							>
								Análisis de Nueva Sesión
							</Typography>

							<Typography variant="body1" color="text.secondary" paragraph>
								Sube tu sesión de terapia o nota de voz para obtener insights
								instantáneos de IA.
							</Typography>

							<Box display="flex" gap={2} mb={3}>
								<TextField
									select
									label="Idioma del Audio"
									value={inputLang}
									onChange={(e) => setInputLang(e.target.value)}
									SelectProps={{
										native: true,
									}}
									fullWidth
									variant="outlined"
								>
									<option value="es-US">Español (Latinoamérica)</option>
									<option value="es-ES">Español (España)</option>
									<option value="en-US">Inglés (EE.UU.)</option>
								</TextField>

								<TextField
									select
									label="Idioma del Análisis"
									value={outputLang}
									onChange={(e) => setOutputLang(e.target.value)}
									SelectProps={{
										native: true,
									}}
									fullWidth
									variant="outlined"
								>
									<option value="Spanish">Español</option>
									<option value="English">Inglés</option>
								</TextField>

								<TextField
									select
									label="Formato de Nota"
									value={noteFormat}
									onChange={(e) =>
										setNoteFormat(e.target.value as "SOAP" | "DAP" | "BIRP")
									}
									SelectProps={{
										native: true,
									}}
									fullWidth
									variant="outlined"
								>
									<option value="SOAP">SOAP</option>
									<option value="DAP">DAP</option>
									<option value="BIRP">BIRP</option>
								</TextField>
							</Box>

							<StyledDropzone {...getRootProps({ isDragActive })} sx={{ p: 6 }}>
								<input {...getInputProps()} />
								<CloudUploadIcon
									sx={{ fontSize: 60, color: "primary.main", mb: 2 }}
								/>
								{isDragActive ? (
									<Typography variant="h6" color="primary">
										Suelta el audio aquí...
									</Typography>
								) : (
									<Box>
										<Typography variant="h6" sx={{ color: "text.primary" }}>
											{file
												? file.name
												: "Arrastra y suelta el audio aquí, o haz clic para seleccionar"}
										</Typography>
										<Typography variant="caption" color="text.secondary">
											Soporta MP3, WAV, OGG, M4A
										</Typography>
									</Box>
								)}
							</StyledDropzone>

							{status !== "idle" && status !== "error" && (
								<Box sx={{ mt: 4, textAlign: "center" }}>
									<CircularProgress
										size={24}
										sx={{ mr: 2, color: "primary.main" }}
									/>
									<Typography variant="body2" component="span">
										{getStatusMessage()}
									</Typography>
								</Box>
							)}

							{status === "error" && (
								<Box sx={{ mt: 4, textAlign: "center", color: "error.main" }}>
									<ErrorIcon sx={{ verticalAlign: "middle", mr: 1 }} />
									<Typography variant="body2" component="span">
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
										sx={{
											background: gradients.primary,
											borderRadius: "30px",
											padding: "10px 40px",
											textTransform: "none",
											fontSize: "1.1rem",
										}}
									>
										Analizar Sesión
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
						<GlassCard>
							<Box display="flex" alignItems="center" mb={3}>
								<CheckCircleIcon
									sx={{ color: "success.main", fontSize: 40, mr: 2 }}
								/>
								<Typography variant="h4" sx={{ fontWeight: "bold" }}>
									Insights de la Sesión
								</Typography>
							</Box>

							<Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
								{/* Summary Section */}
								<Paper
									elevation={0}
									sx={{
										p: 3,
										borderRadius: "15px",
										bgcolor: "background.default",
										border: "1px solid",
										borderColor: "divider",
									}}
								>
									<Box display="flex" alignItems="center" mb={2}>
										<DescriptionIcon color="primary" sx={{ mr: 1 }} />
										<Typography variant="h6">Resumen</Typography>
									</Box>
									<Typography variant="body1" color="text.secondary">
										{result.analysis?.summary || "No hay resumen disponible."}
									</Typography>
								</Paper>

								{/* Key Topics & Sentiment */}
								<Box>
									<Paper
										elevation={0}
										sx={{
											p: 3,
											borderRadius: "15px",
											bgcolor: "background.default",
											border: "1px solid",
											borderColor: "divider",
											mb: 3,
										}}
									>
										<Box display="flex" alignItems="center" mb={2}>
											<AnalyticsIcon color="secondary" sx={{ mr: 1 }} />
											<Typography variant="h6">Análisis</Typography>
										</Box>

										<Box mb={2}>
											<Typography variant="subtitle2" gutterBottom>
												Sentimiento
											</Typography>
											<Chip
												label={getSentimentLabel(result.analysis?.sentiment)}
												color={getSentimentColor(
													result.analysis?.sentiment || "default"
												)}
												sx={{ fontWeight: "bold" }}
											/>
										</Box>

										<Box>
											<Typography variant="subtitle2" gutterBottom>
												Temas Clave
											</Typography>
											<Box display="flex" flexWrap="wrap" gap={1}>
												{result.analysis?.topics?.map((topic, i) => (
													<Chip
														key={i}
														label={topic.label}
														size="small"
														variant="outlined"
													/>
												))}
												{(!result.analysis?.topics ||
													result.analysis.topics.length === 0) && (
													<Typography variant="caption" color="text.secondary">
														No se detectaron temas.
													</Typography>
												)}
											</Box>
										</Box>
									</Paper>
								</Box>
							</Box>

							{/* Analysis/Entities/Action Items could be expanded here */}
							{result.analysis?.action_items &&
								result.analysis.action_items.length > 0 && (
									<Box mt={3}>
										<Typography variant="h6" gutterBottom>
											Acciones a Tomar
										</Typography>
										<List dense>
											{result.analysis.action_items?.map((item, i) => (
												<ListItem key={i}>
													<ListItemText primary={`• ${item}`} />
												</ListItem>
											))}
										</List>
									</Box>
								)}

							<Box mt={4} textAlign="center">
								<Button
									variant="outlined"
									onClick={() => {
										setFile(null);
										setResult(null);
										setStatus("idle");
									}}
								>
									Analizar Otra Sesión
								</Button>
							</Box>
						</GlassCard>
					</motion.div>
				)}
			</AnimatePresence>
		</Box>
	);
};
