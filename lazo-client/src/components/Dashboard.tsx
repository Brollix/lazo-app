import React, { useState, useRef, useEffect } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	Chip,
	IconButton,
	Stack,
	Avatar,
	Dialog,
	DialogTitle,
	DialogContent,
} from "@mui/material";
import {
	SmartToy,
	Mic,
	ChevronLeft,
	Settings as SettingsIcon,
	Assignment,
	TaskAlt,
	Psychology,
	Category,
	Send,
	CloudUpload,
} from "@mui/icons-material";
import { Settings } from "./Settings";

import { AudioUploader, ProcessSessionResponse } from "./AudioUploader";
import { ContextPanel } from "./ContextPanel";
import { SoapNoteEditor } from "./SoapNoteEditor";
import { Patient } from "./PatientsList";
import { AudioPlayer } from "./AudioPlayer";
import { getColors } from "../styles.theme";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
	id: string;
	sender: "user" | "bot";
	content: React.ReactNode;
	actions?: React.ReactNode;
	timestamp: Date;
}

export const Dashboard: React.FC<{
	onLogout: () => void;
	patient: Patient | null;
	onBack?: () => void;
}> = ({ onLogout, patient, onBack }) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [audioFile, setAudioFile] = useState<string | null>(null); // null = "listening/empty", string = "playback"
	const [soapContent, setSoapContent] = useState("");
	const [sessionData, setSessionData] = useState<ProcessSessionResponse | null>(
		null
	);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [openUploadModal, setOpenUploadModal] = useState(false); // State for the new Dialog
	const messagesEndRef = useRef<HTMLDivElement>(null);

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
				patient?.name || "Paciente Demo"
			} (45 min)**. ¿Por dónde quieres empezar?`,
			<Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("soap")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Generar Nota
				</Button>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("tasks")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Extraer Tareas
				</Button>
				<Button
					variant="outlined"
					size="small"
					onClick={() => handleQuickAction("sentiment")}
					sx={{ borderRadius: 2, textTransform: "none" }}
				>
					Análisis de Sentimiento
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

	const handleSendMessage = () => {
		if (!inputValue.trim()) return;
		addMessage("user", inputValue);
		setInputValue("");

		// Mock response for now
		setTimeout(() => {
			addMessage(
				"bot",
				"Entendido. ¿Necesitas ayuda con algo más sobre esta sesión?"
			);
		}, 1000);
	};

	const handleQuickAction = (
		action: "soap" | "tasks" | "entities" | "sentiment"
	) => {
		if (!sessionData) return;

		switch (action) {
			case "soap":
				generateClinicalNote(sessionData);
				addMessage(
					"bot",
					`### Nota Clínica Generada\n\nHe redactado la nota basada en el formato solicitado. Ya puedes verla y editarla en el panel de la izquierda.`
				);
				break;
			case "tasks":
				const tasks = (sessionData.analysis.action_items || [])
					.map((t) => `- ${t}`)
					.join("\n");
				setSoapContent(
					(prev) =>
						prev +
						`\n\n### Tareas Detectadas:\n${tasks || "No se detectaron tareas."}`
				);
				addMessage(
					"bot",
					`### Tareas Extraídas\n\nHe detectado las siguientes tareas y las he agregado a la nota:\n\n${tasks}`
				);
				break;
			case "entities":
				const entities = sessionData.analysis.entities || [];
				const entitiesMd = entities
					.map((e) => `- **${e.name}** (${e.type})`)
					.join("\n");
				addMessage(
					"bot",
					`### Entidades Detectadas\n\n${
						entitiesMd || "No se detectaron entidades específicas."
					}`
				);
				break;
			case "sentiment":
				addMessage(
					"bot",
					`### Análisis de Sentimiento\n\nEl tono general de la conversación fue predominantemente **${
						sessionData.analysis.sentiment || "No detectado"
					}**.`
				);
				break;
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
					height: 64,
					px: 3,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: (theme) =>
						theme.palette.mode === "light"
							? "rgba(255, 255, 255, 0.8)"
							: "rgba(15, 17, 22, 0.8)", // 80% opacity
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
							fontWeight: 900,
							letterSpacing: "-0.05em",
							color: "primary.main",
						}}
					>
						lazo
					</Typography>
					<Typography
						variant="body2"
						sx={{ color: "text.secondary", fontWeight: 500, ml: 2 }}
					>
						{patient ? patient.name : "Paciente Demo"}
					</Typography>
					<IconButton
						onClick={() => setSettingsOpen(true)}
						size="small"
						sx={{ ml: 1, borderRadius: 2 }}
					>
						<SettingsIcon fontSize="small" />
					</IconButton>
				</Box>
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
				/>

				{/* Column 2: Command Center (Center) */}
				<Paper
					elevation={0}
					sx={{
						flex: 4, // 40%
						display: "flex",
						flexDirection: "column",
						borderRadius: 3,
						overflow: "hidden",
						border: "1px solid",
						borderColor: "divider",
						boxShadow: (theme) =>
							theme.palette.mode === "light"
								? "0 4px 20px rgba(0,0,0,0.04)"
								: "0 4px 20px rgba(0,0,0,0.4)",
						bgcolor: "background.paper",
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
							<AudioPlayer url={audioFile} biometry={sessionData?.biometry} />
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
										bgcolor: (theme) =>
											theme.palette.mode === "light"
												? "primary.light"
												: "rgba(102, 60, 48, 0.1)",
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
										fontWeight: 700,
										color: "primary.main",
										textTransform: "uppercase",
										fontSize: "0.75rem",
										letterSpacing: "0.05em",
									}}
								>
									Asistente IA
								</Typography>
							</Stack>
							{!audioFile && (
								<Box
									sx={{
										px: 1.5,
										py: 0.5,
										bgcolor: (theme) =>
											theme.palette.mode === "light"
												? `${getColors("light").softGreen}1A`
												: "rgba(129, 178, 154, 0.15)",
										borderRadius: 4,
										display: "flex",
										alignItems: "center",
										gap: 0.5,
									}}
								>
									<Mic sx={{ fontSize: 14, color: "success.main" }} />
									<Typography
										variant="caption"
										sx={{ color: "success.main", fontWeight: 600 }}
									>
										Escuchando
									</Typography>
								</Box>
							)}
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
									label="Nota SOAP"
									onClick={() => handleQuickAction("soap")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
								/>
								<Chip
									icon={<TaskAlt fontSize="small" />}
									label="Tareas"
									onClick={() => handleQuickAction("tasks")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
								/>
								<Chip
									icon={<Category fontSize="small" />}
									label="Entidades"
									onClick={() => handleQuickAction("entities")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
								/>
								<Chip
									icon={<Psychology fontSize="small" />}
									label="Sentimiento"
									onClick={() => handleQuickAction("sentiment")}
									size="small"
									clickable
									color="primary"
									variant="outlined"
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
							<Typography
								variant="body2"
								color="text.secondary"
								align="center"
								sx={{ mt: 4 }}
							>
								Sube el audio de la sesión para que pueda ayudarte a redactar la
								nota clínica.
							</Typography>
						) : (
							messages.map((msg) => (
								<Box
									key={msg.id}
									sx={{
										alignSelf:
											msg.sender === "user" ? "flex-end" : "flex-start",
										maxWidth: "85%",
										display: "flex",
										gap: 1.5,
									}}
								>
									{msg.sender === "bot" && (
										<Avatar
											sx={{ width: 28, height: 28, bgcolor: "primary.main" }}
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
													? "12px 12px 2px 12px"
													: "2px 12px 12px 12px",
										}}
									>
										{typeof msg.content === "string" ? (
											<Box
												sx={{
													"& p": { m: 0, fontSize: "0.875rem" },
													"& h3": {
														m: "0 0 8px 0",
														fontSize: "1rem",
														fontWeight: 700,
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

					{/* Input Area */}
					<Box
						sx={{
							p: 2,
							borderTop: "1px solid",
							borderColor: "divider",
							bgcolor: "background.paper",
							display: "flex",
							gap: 1,
							flexShrink: 0,
						}}
					>
						<TextField
							fullWidth
							placeholder="Pregúntale a lazo..."
							size="small"
							variant="outlined"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyPress={(e) => {
								if (e.key === "Enter") handleSendMessage();
							}}
							sx={{
								"& .MuiOutlinedInput-root": {
									borderRadius: 2,
									bgcolor: "background.default",
									"& fieldset": { borderColor: "divider" },
									"&:hover fieldset": { borderColor: "primary.main" },
								},
							}}
						/>
						<IconButton
							color="primary"
							onClick={handleSendMessage}
							disabled={!inputValue.trim()}
							sx={{
								bgcolor: inputValue.trim() ? "primary.main" : "transparent",
								color: inputValue.trim() ? "white" : "action.disabled",
								"&:hover": { bgcolor: "primary.dark" },
							}}
						>
							<Send />
						</IconButton>
					</Box>
				</Paper>

				{/* Column 3: Context Panel (Right) */}
				<ContextPanel
					onAddToNote={(text) => {
						setSoapContent((prev) => prev + (prev ? "\n" : "") + text);
					}}
					analysisData={sessionData ? sessionData.analysis : undefined}
					biometry={sessionData ? sessionData.biometry : undefined}
				/>
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
