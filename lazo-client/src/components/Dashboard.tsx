import React, { useState } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Button,
	IconButton,
	Stack,
} from "@mui/material";
import {
	SmartToy,
	Mic,
	ChevronLeft,
	Settings as SettingsIcon,
	CloudUpload,
} from "@mui/icons-material";
import { Settings } from "./Settings";
import { Patient } from "./PatientsList";
import { AudioPlayer } from "./AudioPlayer";
import { AudioUploader } from "./AudioUploader";
import { ContextPanel } from "./ContextPanel";
import { SoapNoteEditor } from "./SoapNoteEditor";

// Mock Audio URL - In prod this comes from the watcher/backend
const DEMO_AUDIO_URL =
	"https://actions.google.com/sounds/v1/science_fiction/digital_typing.ogg"; // Short sample

export const Dashboard: React.FC<{
	onLogout: () => void;
	patient: Patient | null;
	onBack?: () => void;
}> = ({ onLogout, patient, onBack }) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [audioFile, setAudioFile] = useState<string | null>(null); // null = "listening/empty", string = "playback"
	const [soapContent, setSoapContent] = useState("");

	const handleTimestampClick = (timestamp: number) => {
		// Find existing instance or raise event
		// For prototype, we'll try to find the audio player instance via a global event bus or context if we had one.
		// But since AudioPlayer is right here, we will handle communication via Ref or Context in a real app.
		// For now, if we click a timestamp, we essentially want the AudioPlayer to seek.
		// We'll simulate loading the file if not loaded.
		if (!audioFile) setAudioFile(DEMO_AUDIO_URL);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		// In a real app we'd process the file list here
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			// Mock loading local file (would need URL.createObjectURL for real preview)
			setAudioFile(DEMO_AUDIO_URL);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
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
					bgcolor: "rgba(255,255,255,0.8)",
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
						borderColor: "rgba(0,0,0,0.1)",
						color: "text.secondary",
						"&:hover": {
							borderColor: "primary.main",
							color: "primary.main",
							bgcolor: "rgba(33, 150, 243, 0.04)",
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
						border: "1px solid rgba(0,0,0,0.04)",
						boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
						bgcolor: "#fafafa",
					}}
				>
					{/* Top Section: Audio Player or Listen State */}
					<Box
						sx={{
							p: 2,
							bgcolor: "white",
							borderBottom: "1px solid rgba(0,0,0,0.05)",
						}}
					>
						{audioFile ? <AudioPlayer url={audioFile} /> : <AudioUploader />}
					</Box>

					{/* Middle: AI Assistant Header */}
					<Box
						sx={{
							p: 2,
							borderBottom: "1px solid rgba(0,0,0,0.04)",
							bgcolor: "#fafafa",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
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
									bgcolor: "rgba(76, 175, 80, 0.1)",
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

					{/* Chat Area */}
					<Box
						sx={{
							flexGrow: 1,
							p: 3,
							bgcolor: "white",
							overflowY: "auto",
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						{/* Mock Messages */}
						<Box
							sx={{ alignSelf: "flex-start", maxWidth: "80%" }}
							onClick={() => handleTimestampClick(15)}
						>
							<Paper
								elevation={0}
								sx={{
									p: 2,
									bgcolor: "#F5F7FA",
									borderRadius: "12px 12px 12px 2px",
									cursor: "pointer",
									"&:hover": { bgcolor: "#E3F2FD" },
								}}
							>
								<Typography variant="body2" sx={{ color: "text.primary" }}>
									El paciente mencionó ansiedad al inicio de la sesión.
									<Box
										component="span"
										sx={{
											fontSize: "0.75em",
											color: "primary.main",
											ml: 1,
											fontWeight: 600,
										}}
									>
										0:15
									</Box>
								</Typography>
							</Paper>
						</Box>
					</Box>

					{/* Input Area */}
					<Box
						sx={{
							p: 2,
							borderTop: "1px solid rgba(0,0,0,0.04)",
							bgcolor: "white",
						}}
					>
						<TextField
							fullWidth
							placeholder="Pregúntale a lazo..."
							size="small"
							variant="outlined"
							sx={{
								"& .MuiOutlinedInput-root": {
									borderRadius: 2,
									bgcolor: "#F8F9FA",
									"& fieldset": { borderColor: "rgba(0,0,0,0.08)" },
									"&:hover fieldset": { borderColor: "primary.main" },
								},
							}}
						/>
					</Box>
				</Paper>

				{/* Column 3: Context Panel (Right) */}
				<ContextPanel
					onAddToNote={(text) => {
						setSoapContent((prev) => prev + (prev ? "\n" : "") + text);
					}}
				/>
			</Box>
		</Box>
	);
};
