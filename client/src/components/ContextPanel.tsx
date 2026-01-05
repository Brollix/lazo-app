import React from "react";
import {
	Box,
	Paper,
	Typography,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Stack,
	Tooltip,
} from "@mui/material";
import { Psychology, Add } from "@mui/icons-material";
import { getExtendedShadows, typographyExtended } from "../styles.theme";

import { AnalysisResult, Biometry } from "./AudioUploader";
import { ThemeCloud } from "./ThemeCloud";

export const ContextPanel: React.FC<{
	onAddToNote: (text: string) => void;
	analysisData?: AnalysisResult;
	biometry?: Biometry;
}> = ({ onAddToNote, analysisData, biometry }) => {
	return (
		<Paper
			elevation={0}
			sx={{
				flex: 3, // 30%
				display: "flex",
				flexDirection: "column",
				borderRadius: 3,
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: (theme) =>
					getExtendedShadows(theme.palette.mode as "light" | "dark").editor,
				height: "100%", // Fit column height
			}}
		>
			{/* Header */}
			<Box
				sx={{
					p: 2,
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: "background.default",
				}}
			>
				<Stack direction="row" alignItems="center" gap={1}>
					<Psychology color="primary" fontSize="small" />
					<Typography
						variant="subtitle2"
						sx={{
							fontWeight: typographyExtended.fontWeights.bold,
							color: "text.secondary",
							textTransform: "uppercase",
							fontSize: typographyExtended.fontSizes.sm,
							letterSpacing: typographyExtended.letterSpacing.relaxed,
						}}
					>
						Contexto
					</Typography>
				</Stack>
			</Box>

			{/* Content */}
			<Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "background.paper" }}>
				{/* Pattern Detector: Theme Cloud */}
				{analysisData && analysisData.topics && (
					<Box
						sx={{
							p: 2,
							borderBottom: "1px solid",
							borderColor: "divider",
						}}
					>
						<ThemeCloud topics={analysisData.topics} />
					</Box>
				)}

				{/* Biometry Section */}
				{biometry && (
					<Box
						sx={{
							p: 2,
							borderBottom: "1px solid",
							borderColor: "divider",
						}}
					>
						<Typography
							variant="caption"
							sx={{
								fontWeight: 700,
								color: "text.secondary",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								mb: 1.5,
								display: "block",
							}}
						>
							Biometría de la Sesión
						</Typography>
						<Stack spacing={2}>
							<Box>
								<Typography variant="caption" sx={{ fontWeight: 600 }}>
									Silencios Detectados: {biometry.silences.length}
								</Typography>
								<ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
									{biometry.silences.slice(0, 3).map((s, i) => (
										<li key={i}>
											<Typography variant="caption" color="text.secondary">
												Min {Math.floor(s.start / 60)}:
												{Math.floor(s.start % 60)
													.toString()
													.padStart(2, "0")}{" "}
												({Math.round(s.duration)}s)
											</Typography>
										</li>
									))}
								</ul>
							</Box>
						</Stack>
					</Box>
				)}

				{/* Analyzed Entities List */}
				<Box sx={{ p: 2, pb: 1 }}>
					<Typography
						variant="caption"
						sx={{
							fontWeight: 700,
							color: "text.secondary",
							textTransform: "uppercase",
							letterSpacing: "0.05em",
							mb: 1,
							display: "block",
						}}
					>
						Entidades Detectadas
					</Typography>
				</Box>
				<List sx={{ p: 0 }}>
					{analysisData?.entities?.map((item, index) => (
						<ListItem
							key={index}
							sx={{
								borderBottom: "1px solid",
								borderColor: "divider",
								py: 1.5,
								"&:hover .action-btn": { opacity: 1 },
							}}
							secondaryAction={
								<Tooltip title="Agregar a nota">
									<IconButton
										className="action-btn"
										edge="end"
										size="small"
										sx={{ opacity: 0, transition: "opacity 0.2s" }}
										onClick={() => onAddToNote(`${item.name}: ${item.type}`)}
									>
										<Add fontSize="small" />
									</IconButton>
								</Tooltip>
							}
						>
							<ListItemText
								primary={
									<Typography variant="body2" fontWeight={600}>
										{item.name}
									</Typography>
								}
								secondary={
									<Typography variant="caption" color="text.secondary">
										{item.type}
									</Typography>
								}
							/>
						</ListItem>
					))}
					{(!analysisData ||
						!analysisData.entities ||
						analysisData.entities.length === 0) && (
						<Typography
							variant="body2"
							sx={{ p: 2, color: "text.secondary", fontStyle: "italic" }}
						>
							Sin datos de análisis aún.
						</Typography>
					)}
				</List>
			</Box>
		</Paper>
	);
};
