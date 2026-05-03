import React, { useState } from "react";
import {
	Box,
	Paper,
	Typography,
	IconButton,
	useTheme,
	Button,
} from "@mui/material";
import { ChevronLeft, Mic } from "@mui/icons-material";
import {
	getBackgrounds,
	typographyExtended,
	components as themeComponents,
} from "../styles.theme";
import { SoapNoteEditor } from "./SoapNoteEditor";
import { Patient } from "./PatientsList";
import { LiveTranscription } from "./LiveTranscription";
import { AudioUploader } from "./AudioUploader";

interface ManualNotesScreenProps {
	patient: Patient | null;
	onBack: () => void;
	onAutoSave?: (content: string) => Promise<void>;
	onDownload: () => void;
	content: string;
	onChange: (content: string) => void;
	userId?: string;
	userPlan?: string;
	onAnalysisComplete?: (data: any) => void;
}

export const ManualNotesScreen: React.FC<ManualNotesScreenProps> = ({
	patient,
	onBack,
	onAutoSave,
	onDownload,
	content,
	onChange,
	userId,
	userPlan,
	onAnalysisComplete,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const [isFocused, setIsFocused] = useState(false);
	const [mode, setMode] = useState<"manual" | "record">("manual");
	const [recordedFile, setRecordedFile] = useState<File | null>(null);

	const handleRecordingComplete = (audioFile: File) => {
		// Store the recorded file and let AudioUploader process it
		setRecordedFile(audioFile);
	};

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			{/* Header */}
			<Paper
				elevation={0}
				square
				sx={{
					height: { xs: "auto", sm: themeComponents.dashboard.headerHeight },
					px: { xs: 2, sm: 3 },
					py: { xs: 1.5, sm: 0 },
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
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<IconButton onClick={onBack} size="small">
						<ChevronLeft />
					</IconButton>
					<Typography
						variant="h4"
						sx={{
							fontWeight: typographyExtended.fontWeights.bold,
							letterSpacing: typographyExtended.letterSpacing.tight,
							color: "text.primary",
							fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
						}}
					>
						{patient ? `Notas - ${patient.name}` : "Tomado de Notas"}
					</Typography>
				</Box>
			</Paper>

			{/* Manual Editor Mode - Always visible */}
			{mode === "manual" && (
				<Box
					sx={{
						flexGrow: 1,
						p: { xs: 1, sm: 2 },
						overflow: "auto",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 2,
					}}
				>
					<Box sx={{ width: "100%", maxWidth: 1200 }}>
						{/* Dictation Button */}
						<Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
							<Button
								variant="contained"
								startIcon={<Mic />}
								onClick={() => setMode("record")}
								size="large"
								sx={{
									borderRadius: 2,
									px: 3,
									py: 1.5,
									textTransform: "none",
									fontWeight: "bold",
								}}
							>
								Dictar en Tiempo Real
							</Button>
						</Box>

					<SoapNoteEditor
						content={content}
						onChange={onChange}
						onAutoSave={onAutoSave}
						onDownload={onDownload}
						method="manual"
						isFocused={isFocused}
						onToggleFocus={() => setIsFocused(!isFocused)}
					/>
					</Box>
				</Box>
			)}

			{/* Live Recording Mode */}
			{mode === "record" && !recordedFile && (
				<Box
					sx={{
						flexGrow: 1,
						p: { xs: 2, sm: 3 },
						overflow: "auto",
					}}
				>
					<Box sx={{ maxWidth: 800, mx: "auto" }}>
						<Button
							variant="text"
							startIcon={<ChevronLeft />}
							onClick={() => setMode("manual")}
							sx={{ mb: 2 }}
						>
							Volver
						</Button>
						<LiveTranscription onComplete={handleRecordingComplete} />
					</Box>
				</Box>
			)}

			{/* Processing Recorded Audio */}
			{mode === "record" && recordedFile && (
				<Box
					sx={{
						flexGrow: 1,
						p: { xs: 2, sm: 3 },
						overflow: "auto",
					}}
				>
					<Box sx={{ maxWidth: 900, mx: "auto" }}>
						<Button
							variant="text"
							startIcon={<ChevronLeft />}
							onClick={() => {
								setRecordedFile(null);
								setMode("manual");
							}}
							sx={{ mb: 2 }}
						>
							Volver
						</Button>
						<AudioUploader
							patientName={patient?.name}
							patientAge={patient?.age}
							patientGender={patient?.gender}
							userId={userId}
							userPlan={userPlan}
							patientId={patient?.id}
							onAnalysisComplete={onAnalysisComplete}
							forceRecordingMethod="dictated_summary"
							initialFile={recordedFile}
						/>
					</Box>
				</Box>
			)}

		</Box>
	);
};
