import React, { useState, useRef, useEffect } from "react";
import {
	Box,
	Paper,
	Typography,
	Button,
	Chip,
	IconButton,
	Stack,
	Avatar,
	Dialog,
	DialogTitle,
	DialogContent,
	CircularProgress,
	useTheme,
} from "@mui/material";
import {
	SmartToy,
	ChevronLeft,
	Settings as SettingsIcon,
	Assignment,
	TaskAlt,
	Psychology,
	Category,
	CloudUpload,
	Description as DescriptionIcon,
	Visibility,
	VisibilityOff,
	AddCircleOutline,
} from "@mui/icons-material";
import { Settings } from "./Settings";
import {
	getBackgrounds,
	getExtendedShadows,
	components as themeComponents,
	opacity,
	typographyExtended,
} from "../styles.theme";

import { AudioUploader, ProcessSessionResponse } from "./AudioUploader";
import { ContextPanel } from "./ContextPanel";
import { SoapNoteEditor } from "./SoapNoteEditor";
import { Patient } from "./PatientsList";
import { AudioPlayer } from "./AudioPlayer";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
	id: string;
	sender: "user" | "bot";
	content: React.ReactNode;
	actions?: React.ReactNode;
	timestamp: Date;
}

const formatDuration = (seconds?: number) => {
	if (!seconds) return "";
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	if (mins === 0) return `(${secs} seg)`;
	return `(${mins} min ${secs.toString().padStart(2, "0")}s)`;
};

export const Dashboard: React.FC<{
	onLogout: () => void;
	patient: Patient | null;
	onBack?: () => void;
}> = ({ onLogout, patient, onBack }) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const extendedShadows = getExtendedShadows(theme.palette.mode);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [audioFile, setAudioFile] = useState<string | null>(null); // null = "listening/empty", string = "playback"
	const [soapContent, setSoapContent] = useState("");
	const [sessionData, setSessionData] = useState<ProcessSessionResponse | null>(
		null
	);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [openUploadModal, setOpenUploadModal] = useState(false); // State for the new Dialog
	const [isFocusMode, setIsFocusMode] = useState(false);
	const [showContext, setShowContext] = useState(true);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const sessionDataRef = useRef<ProcessSessionResponse | null>(null);

	// Sync ref with state
	useEffect(() => {
		sessionDataRef.current = sessionData;
	}, [sessionData]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const addMessage = (
		sender: "user" | "bot",
		content: React.ReactNode,
		actions?: React.ReactNode
	) => {
		setMessages((prev) => [
			...prev,
			{
				id: Date.now().toString() + Math.random(),
				sender,
				content,
				actions,
				timestamp: new Date(),
			} as ChatMessage,
		]);
	};

	const handleAnalysisComplete = (data: ProcessSessionResponse) => {
		setSessionData(data);

		// Show analyzed greeting with chips as requested
		addMessage(
			"bot",
			`He analizado el audio de **${
				patient?.name || "Paciente"
			} ${formatDuration(data.localDuration)}**. ¿Por dónde quieres empezar?`,
			<Stack
				direction="row"
				spacing={1}
				sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}
			>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("resumen")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Resumen Ejecutivo
				</Button>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("tareas")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Tareas y Objetivos
				</Button>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("psicologico")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Análisis Psicológico
				</Button>
			</Stack>
		);

		// Check for Risks
		if (data.analysis.risk_assessment?.has_risk) {
			addMessage(
				"bot",
				<Box
					sx={{
						p: 2,
						bgcolor: "error.light",
						color: "error.contrastText",
						borderRadius: 2,
						border: "2px solid",
						borderColor: "error.main",
					}}
				>
					<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
						🚨 ALERTA DE RIESGO DETECTADA
					</Typography>
					<Typography variant="body2">
						{data.analysis.risk_assessment.summary}
					</Typography>
					<Box sx={{ mt: 1 }}>
						{data.analysis.risk_assessment.alerts.map((alert, i) => (
							<Chip
								key={i}
								label={alert}
								size="small"
								sx={{ mr: 0.5, bgcolor: "error.main", color: "white" }}
							/>
						))}
					</Box>
				</Box>
			);
		}

		// We don't auto-generate SOAP here anymore as per new flow,
		// but we keep the data for when the user clicks the button.
	};

	const generateClinicalNote = (data: ProcessSessionResponse) => {
		const newContent = data.analysis.clinical_note || "";
		setSoapContent(newContent);
		return newContent;
	};

	const handleAudioSelected = (file: File) => {
		const url = URL.createObjectURL(file);
		setAudioFile(url);
	};

	const handleQuickAction = async (
		action:
			| "soap"
			| "resumen"
			| "tareas"
			| "psicologico"
			| "intervencion"
			| "animo"
	) => {
		const currentSessionData = sessionDataRef.current;
		if (!currentSessionData) return;

		if (action === "soap") {
			generateClinicalNote(currentSessionData);
			addMessage(
				"bot",
				`### Nota Clínica Generada\n\nHe redactado la nota basada en el formato solicitado (**${
					currentSessionData.analysis.clinical_note.includes("## S")
						? "SOAP"
						: "Clínico"
				}**). Ya puedes verla y editarla en el panel de la izquierda.`
			);
			return;
		}

		setIsActionLoading(true);

		const actionLabels: Record<string, string> = {
			resumen: "Generando Resumen Ejecutivo...",
			tareas: "Extrayendo Tareas y Objetivos...",
			psicologico: "Realizando Análisis Psicológico...",
			intervencion: "Sugiriendo Intervenciones...",
			animo: "Analizando Estado de Ánimo...",
		};

		const loadingMsgId = Date.now().toString() + "loading";
		setMessages((prev) => [
			...prev,
			{
				id: loadingMsgId,
				sender: "bot",
				content: (
					<Stack direction="row" spacing={1} alignItems="center">
						<CircularProgress size={16} />
						<Typography variant="body2">
							{actionLabels[action] || "Procesando..."}
						</Typography>
					</Stack>
				),
				timestamp: new Date(),
			} as ChatMessage,
		]);

		try {
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const response = await fetch(`${apiUrl}/api/ai-action`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					transcriptText: currentSessionData.transcript,
					actionType: action,
				}),
			});

			if (!response.ok) throw new Error("Error en la acción de IA");

			const data = await response.json();

			// Remove loading message and add result
			setMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));

			const actionTitles: Record<string, string> = {
				resumen: "Resumen Ejecutivo",
				tareas: "Tareas y Objetivos",
				psicologico: "Análisis Psicológico",
				intervencion: "Sugerencias de Intervención",
				animo: "Análisis de Ánimo",
			};

			addMessage(
				"bot",
				`### ${actionTitles[action]}\n\n${data.result}`,
				<Button
					size="small"
					startIcon={<AddCircleOutline />}
					onClick={() =>
						setSoapContent(
							(prev) =>
								prev +
								(prev ? "\n\n" : "") +
								`### ${actionTitles[action]}\n${data.result}`
						)
					}
					sx={{
						textTransform: "none",
						fontSize: typographyExtended.fontSizes.xs,
						mt: 1,
					}}
				>
					Meter en la nota
				</Button>
			);
		} catch (error) {
			console.error("AI Action error:", error);
			setMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));
			addMessage(
				"bot",
				"Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo."
			);
		} finally {
			setIsActionLoading(false);
		}
	};

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				bgcolor: "background.default",
			}}
		>
			{/* Header */}
			<Paper
				elevation={0}
				square
				sx={{
					height: themeComponents.dashboard.headerHeight,
					px: 3,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: backgrounds.glass.header,
					backdropFilter: "blur(12px)",
					position: "sticky",
					top: 0,
					zIndex: 10,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					{onBack && (
						<IconButton onClick={onBack} size="small" sx={{ mr: 1 }}>
							<ChevronLeft />
						</IconButton>
					)}
					<Typography
						variant="h5"
						sx={{
							fontWeight: typographyExtended.fontWeights.black,
							letterSpacing: typographyExtended.letterSpacing.tight,
							color: "primary.main",
						}}
					>
						lazo
					</Typography>
					<Typography
						variant="body2"
						sx={{ color: "text.secondary", fontWeight: 500, ml: 2 }}
					>
						{patient ? patient.name : "Nueva Sesión"}
					</Typography>
					<IconButton
						onClick={() => setSettingsOpen(true)}
						size="small"
						sx={{ ml: 1, borderRadius: 2 }}
					>
						<SettingsIcon fontSize="small" />
					</IconButton>
				</Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Button
						variant="outlined"
						onClick={onLogout}
						size="small"
						sx={{
							textTransform: "none",
							borderRadius: 2,
							borderColor: "divider",
							color: "text.secondary",
							"&:hover": {
								borderColor: "primary.main",
								color: "primary.main",
								bgcolor: "action.hover",
							},
						}}
					>
						Cerrar Sesión
					</Button>
					<IconButton
						onClick={() => setShowContext(!showContext)}
						size="small"
						title={showContext ? "Esconder Contexto" : "Mostrar Contexto"}
						sx={{
							borderRadius: 2,
							color: showContext ? "primary.main" : "text.secondary",
						}}
					>
						{showContext ? <Visibility /> : <VisibilityOff />}
					</IconButton>
				</Box>
			</Paper>

			<Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

			{/* Main Content - 3 Column Layout */}
			<Box
				sx={{ flexGrow: 1, display: "flex", p: 2, gap: 2, overflow: "hidden" }}
			>
				{/* Column 1: SOAP Editor (Left) */}
				<SoapNoteEditor
					content={soapContent}
					onChange={setSoapContent}
					onSave={() => {
						console.log("Saving note:", soapContent);
						// Show success toast here
					}}
					method={sessionData?.noteFormat || "SOAP"}
					isFocused={isFocusMode}
					onToggleFocus={() => setIsFocusMode(!isFocusMode)}
				/>

				{/* Column 2: Command Center (Center) */}
				<Paper
					elevation={0}
					sx={{
						flex: themeComponents.dashboard.panelFlex.center,
						display: isFocusMode ? "none" : "flex", // Hide center in focus mode
						flexDirection: "column",
						borderRadius: 3,
						overflow: "hidden",
						border: "1px solid",
						borderColor: "divider",
						boxShadow: extendedShadows.panel,
						bgcolor: backgrounds.glass.panel,
						backdropFilter: "blur(16px)",
					}}
				>
					{/* Top Section: Audio Player or New Session Button */}
					<Box
						sx={{
							p: 2,
							bgcolor: "background.paper",
							borderBottom: "1px solid",
							borderColor: "divider",
							flexShrink: 0,
						}}
					>
						{audioFile ? (
							<AudioPlayer
								url={audioFile}
								biometry={sessionData?.biometry}
								markers={sessionData?.analysis.key_moments}
							/>
						) : (
							<Button
								fullWidth
								variant="outlined"
								startIcon={<CloudUpload />}
								onClick={() => setOpenUploadModal(true)}
								sx={{
									py: 2,
									borderRadius: 3,
									borderStyle: "dashed",
									borderWidth: 2,
									"&:hover": {
										borderStyle: "dashed",
										borderWidth: 2,
										bgcolor:
											theme.palette.mode === "light"
												? "primary.light"
												: backgrounds.hover.primaryLight,
									},
								}}
							>
								Subir Audio de Sesión
							</Button>
						)}
					</Box>

					{/* Middle: AI Assistant Header & Quick Actions */}
					<Box
						sx={{
							p: 1.5,
							borderBottom: "1px solid",
							borderColor: "divider",
							bgcolor: "background.default",
							flexShrink: 0,
						}}
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								mb: sessionData ? 1.5 : 0,
							}}
						>
							<Stack direction="row" alignItems="center" gap={1}>
								<SmartToy color="primary" fontSize="small" />
								<Typography
									variant="subtitle2"
									sx={{
										fontWeight: typographyExtended.fontWeights.bold,
										color: "primary.main",
										textTransform: "uppercase",
										fontSize: typographyExtended.fontSizes.sm,
										letterSpacing: typographyExtended.letterSpacing.relaxed,
									}}
								>
									Asistente IA
								</Typography>
							</Stack>
						</Box>

						{/* Quick Actions Toolbar */}
						{sessionData && (
							<Stack
								direction="row"
								spacing={1}
								sx={{ overflowX: "auto", pb: 0.5 }}
							>
								<Chip
									icon={<Assignment fontSize="small" />}
									label="Nota Clínica"
									onClick={() => handleQuickAction("soap")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
								<Chip
									icon={<DescriptionIcon fontSize="small" />}
									label="Resumen"
									onClick={() => handleQuickAction("resumen")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
								<Chip
									icon={<TaskAlt fontSize="small" />}
									label="Tareas"
									onClick={() => handleQuickAction("tareas")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
								<Chip
									icon={<Psychology fontSize="small" />}
									label="Psicológico"
									onClick={() => handleQuickAction("psicologico")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
								<Chip
									icon={<SmartToy fontSize="small" />}
									label="Intervenciones"
									onClick={() => handleQuickAction("intervencion")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
								<Chip
									icon={<Category fontSize="small" />}
									label="Ánimo"
									onClick={() => handleQuickAction("animo")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
									disabled={isActionLoading}
								/>
							</Stack>
						)}
					</Box>

					{/* Chat Area */}
					<Box
						sx={{
							flex: 1, // Take all remaining space
							p: 3,
							bgcolor: "background.paper",
							overflowY: "auto",
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						{messages.length === 0 ? (
							<Box
								sx={{
									flex: 1,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									opacity: opacity.medium,
									textAlign: "center",
									px: 4,
								}}
							>
								<SmartToy
									sx={{
										fontSize: 48,
										color: "primary.main",
										mb: 2,
										opacity: opacity.low,
									}}
								/>
								<Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
									{patient
										? `Asistente de sesión con ${patient.name}`
										: "Asistente Lazo"}
								</Typography>
								<Typography variant="body2" color="text.secondary">
									Sube el audio de la sesión para comenzar el análisis
									automático y generar tu nota SOAP.
								</Typography>
							</Box>
						) : (
							messages.map((msg) => (
								<Box
									key={msg.id}
									sx={{
										alignSelf:
											msg.sender === "user" ? "flex-end" : "flex-start",
										maxWidth: themeComponents.chatMessage.maxWidth,
										display: "flex",
										gap: 1.5,
									}}
								>
									{msg.sender === "bot" && (
										<Avatar
											sx={{
												width: themeComponents.chatMessage.avatarSize,
												height: themeComponents.chatMessage.avatarSize,
												bgcolor: "primary.main",
											}}
										>
											<SmartToy sx={{ fontSize: 16 }} />
										</Avatar>
									)}
									<Paper
										elevation={0}
										sx={{
											p: 2,
											bgcolor:
												msg.sender === "user"
													? "primary.main"
													: "background.default",
											color: msg.sender === "user" ? "white" : "text.primary",
											borderRadius:
												msg.sender === "user"
													? themeComponents.chatMessage.borderRadius.user
													: themeComponents.chatMessage.borderRadius.bot,
										}}
									>
										{typeof msg.content === "string" ? (
											<Box
												sx={{
													"& p": {
														m: 0,
														fontSize: typographyExtended.fontSizes.md,
													},
													"& h3": {
														m: "0 0 8px 0",
														fontSize: typographyExtended.fontSizes.lg,
														fontWeight: typographyExtended.fontWeights.bold,
													},
													"& ul": { m: "8px 0", pl: 2 },
												}}
											>
												<ReactMarkdown>{msg.content}</ReactMarkdown>
											</Box>
										) : (
											msg.content
										)}
										{msg.actions && <Box sx={{ mt: 1 }}>{msg.actions}</Box>}
									</Paper>
								</Box>
							))
						)}
						<div ref={messagesEndRef} />
					</Box>

					<Box
						sx={{
							p: 2,
							borderTop: "1px solid",
							borderColor: "divider",
							bgcolor: "background.paper",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 1,
							flexShrink: 0,
						}}
					>
						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ fontStyle: "italic", textAlign: "center", width: "100%" }}
						>
							Selecciona una de las acciones predefinidas arriba para analizar
							la sesión.
						</Typography>
					</Box>
				</Paper>

				{/* Column 3: Context Panel (Right) */}
				{showContext && !isFocusMode && (
					<ContextPanel
						onAddToNote={(text) => {
							setSoapContent((prev) => prev + (prev ? "\n" : "") + text);
						}}
						analysisData={sessionData ? sessionData.analysis : undefined}
						biometry={sessionData ? sessionData.biometry : undefined}
					/>
				)}
			</Box>

			{/* Audio Upload Modal */}
			<Dialog
				open={openUploadModal}
				onClose={() => setOpenUploadModal(false)}
				maxWidth="sm"
				fullWidth
				PaperProps={{
					sx: {
						borderRadius: 4,
						bgcolor: "background.paper",
						backgroundImage: "none",
					},
				}}
			>
				<DialogContent sx={{ p: 0 }}>
					<AudioUploader
						onAnalysisComplete={handleAnalysisComplete}
						onAudioSelected={handleAudioSelected}
					/>
				</DialogContent>
			</Dialog>
		</Box>
	);
};
