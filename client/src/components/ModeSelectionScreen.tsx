import React from "react";
import { Box, Paper, Stack, Typography, useTheme } from "@mui/material";
import { GraphicEq, Edit } from "@mui/icons-material";
import {
	getBackgrounds,
	getExtendedShadows,
	typographyExtended,
} from "../styles.theme";
import { Patient } from "./PatientsList";

interface ModeSelectionScreenProps {
	patient: Patient | null;
	onSelectAudioMode: () => void;
	onSelectNotesMode: () => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
	patient,
	onSelectAudioMode,
	onSelectNotesMode,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const extendedShadows = getExtendedShadows(theme.palette.mode);

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				p: 4,
				gap: 4,
			}}
		>
			<Box sx={{ textAlign: "center", mb: 2 }}>
				<Typography
					variant="h3"
					sx={{
						fontWeight: typographyExtended.fontWeights.bold,
						mb: 1,
						color: "text.primary",
					}}
				>
					{patient ? `Sesión con ${patient.name}` : "Nueva Sesión"}
				</Typography>
				<Typography variant="body1" color="text.secondary">
					¿Cómo quieres documentar esta sesión?
				</Typography>
			</Box>

			<Stack
				direction={{ xs: "column", md: "row" }}
				spacing={3}
				sx={{ width: "100%", maxWidth: 900 }}
			>
				{/* Audio Upload Option */}
				<Paper
					elevation={0}
					onClick={onSelectAudioMode}
					sx={{
						flex: 1,
						p: 4,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 2,
						borderRadius: 4,
						border: "2px solid",
						borderColor: "divider",
						cursor: "pointer",
						transition: "all 0.3s ease",
						bgcolor: backgrounds.glass.panel,
						backdropFilter: "blur(16px)",
						"&:hover": {
							borderColor: "primary.main",
							boxShadow: extendedShadows.panel,
							transform: "translateY(-4px)",
						},
					}}
				>
					<Box
						sx={{
							width: 80,
							height: 80,
							borderRadius: "50%",
							bgcolor: "primary.main",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<GraphicEq sx={{ fontSize: 48, color: "primary.contrastText" }} />
					</Box>
					<Typography
						variant="h5"
						sx={{ fontWeight: typographyExtended.fontWeights.bold }}
					>
						Subir Audio
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ textAlign: "center" }}
					>
						Sube una grabación de la sesión para análisis automático con IA
					</Typography>
				</Paper>

				{/* Manual Notes Option */}
				<Paper
					elevation={0}
					onClick={onSelectNotesMode}
					sx={{
						flex: 1,
						p: 4,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 2,
						borderRadius: 4,
						border: "2px solid",
						borderColor: "divider",
						cursor: "pointer",
						transition: "all 0.3s ease",
						bgcolor: backgrounds.glass.panel,
						backdropFilter: "blur(16px)",
						"&:hover": {
							borderColor: "primary.main",
							boxShadow: extendedShadows.panel,
							transform: "translateY(-4px)",
						},
					}}
				>
					<Box
						sx={{
							width: 80,
							height: 80,
							borderRadius: "50%",
							bgcolor: "secondary.main",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Edit sx={{ fontSize: 48, color: "secondary.contrastText" }} />
					</Box>
					<Typography
						variant="h5"
						sx={{ fontWeight: typographyExtended.fontWeights.bold }}
					>
						Tomado de Notas
					</Typography>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ textAlign: "center" }}
					>
						Escribe tus notas manualmente durante o después de la sesión
					</Typography>
				</Paper>
			</Stack>
		</Box>
	);
};
