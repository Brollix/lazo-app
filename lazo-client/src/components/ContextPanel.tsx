import React, { useState } from "react";
import {
	Box,
	Paper,
	Typography,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Stack,
	Accordion,
	AccordionSummary,
	AccordionDetails,
	Tooltip,
} from "@mui/material";
import { Psychology, ExpandMore, History, Add } from "@mui/icons-material";

import { AnalysisResult } from "./AudioUploader";

export const ContextPanel: React.FC<{
	onAddToNote: (text: string) => void;
	analysisData?: AnalysisResult;
}> = ({ onAddToNote, analysisData }) => {
	const [expanded, setExpanded] = useState<string | false>(false);

	const handleChange =
		(panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
			setExpanded(isExpanded ? panel : false);
		};

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
					theme.palette.mode === "light"
						? "0 2px 12px rgba(0,0,0,0.02)"
						: "0 2px 12px rgba(0,0,0,0.3)",
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
							fontWeight: 700,
							color: "text.secondary",
							textTransform: "uppercase",
							fontSize: "0.75rem",
							letterSpacing: "0.05em",
						}}
					>
						Contexto
					</Typography>
				</Stack>
			</Box>

			{/* Content */}
			<Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "background.paper" }}>
				{/* Previous Session Accordion */}
				<Accordion
					expanded={expanded === "panel1"}
					onChange={handleChange("panel1")}
					disableGutters
					elevation={0}
					sx={{
						"&:before": { display: "none" },
						borderBottom: "1px solid rgba(0,0,0,0.04)",
					}}
				>
					<AccordionSummary
						expandIcon={<ExpandMore />}
						sx={{ bgcolor: "background.default", minHeight: 48 }}
					>
						<Stack direction="row" alignItems="center" gap={1}>
							<History fontSize="small" color="action" />
							<Typography variant="body2" fontWeight={600}>
								Sesión Anterior (24/12)
							</Typography>
						</Stack>
					</AccordionSummary>
					<AccordionDetails sx={{ p: 0 }}>
						<List dense>
							<ListItem
								secondaryAction={
									<IconButton
										edge="end"
										size="small"
										onClick={() =>
											onAddToNote("El paciente reportó mejoría en el sueño.")
										}
									>
										<Add fontSize="small" />
									</IconButton>
								}
							>
								<ListItemText
									primary="Resumen"
									secondary="El paciente reportó mejoría en el sueño."
									primaryTypographyProps={{
										variant: "caption",
										fontWeight: 700,
									}}
									secondaryTypographyProps={{
										variant: "body2",
										color: "text.primary",
										noWrap: false,
									}}
								/>
							</ListItem>
						</List>
					</AccordionDetails>
				</Accordion>

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
					{analysisData?.entities.map((item, index) => (
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
					{!analysisData && (
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
