import React, { useState } from "react";
import { Box, Paper, Typography, IconButton, useTheme } from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import {
	getBackgrounds,
	getExtendedShadows,
	typographyExtended,
	components as themeComponents,
} from "../styles.theme";
import { SoapNoteEditor } from "./SoapNoteEditor";
import { Patient } from "./PatientsList";

interface ManualNotesScreenProps {
	patient: Patient | null;
	onBack: () => void;
	onSave: () => Promise<void>;
	onDownload: () => void;
	content: string;
	onChange: (content: string) => void;
	userId?: string;
	userPlan?: string;
}

export const ManualNotesScreen: React.FC<ManualNotesScreenProps> = ({
	patient,
	onBack,
	onSave,
	onDownload,
	content,
	onChange,
	userId,
	userPlan,
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

			{/* Main Content - Full Width Editor */}
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
					<SoapNoteEditor
						content={content}
						onChange={onChange}
						onSave={onSave}
						onDownload={onDownload}
						method="manual"
						isFocused={false}
						onToggleFocus={() => {}}
					/>
				</Box>
			</Box>
		</Box>
	);
};
