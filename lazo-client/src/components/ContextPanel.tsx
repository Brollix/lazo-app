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
	Chip,
	Tooltip,
} from "@mui/material";
import {
	Psychology,
	ExpandMore,
	History,
	Add,
	ContentCopy,
} from "@mui/icons-material";

export const ContextPanel: React.FC<{
	onAddToNote: (text: string) => void;
}> = ({ onAddToNote }) => {
	const [expanded, setExpanded] = useState<string | false>(false);

	const handleChange =
		(panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
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
				border: "1px solid rgba(0,0,0,0.04)",
				boxShadow: "0 2px 12px rgba(0,0,0,0.02)",
				height: "100%", // Fit column height
			}}
		>
			{/* Header */}
			<Box
				sx={{
					p: 2,
					borderBottom: "1px solid rgba(0,0,0,0.04)",
					bgcolor: "#fafafa",
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
			<Box sx={{ flexGrow: 1, overflowY: "auto", bgcolor: "white" }}>
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
						sx={{ bgcolor: "#F5F7FA", minHeight: 48 }}
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

				{/* Active Memory List */}
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
						Memoria Activa
					</Typography>
				</Box>
				<List sx={{ p: 0 }}>
					{[
						{
							primary: "12 de Marzo",
							secondary: "Fecha clave: Aniversario",
						},
						{
							primary: "Madre",
							secondary: "Mención: Conflicto reciente",
						},
						{
							primary: "Medicación",
							secondary: "Sertralina 50mg (Olvido recurrente)",
						},
					].map((item, index) => (
						<ListItem
							key={index}
							sx={{
								borderBottom: "1px solid rgba(0,0,0,0.03)",
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
										onClick={() =>
											onAddToNote(`${item.primary}: ${item.secondary}`)
										}
									>
										<Add fontSize="small" />
									</IconButton>
								</Tooltip>
							}
						>
							<ListItemText
								primary={
									<Typography variant="body2" fontWeight={600}>
										{item.primary}
									</Typography>
								}
								secondary={
									<Typography variant="caption" color="text.secondary">
										{item.secondary}
									</Typography>
								}
							/>
						</ListItem>
					))}
				</List>
			</Box>
		</Paper>
	);
};
