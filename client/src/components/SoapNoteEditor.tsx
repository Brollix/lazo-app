import React from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Stack,
	Fab,
	Tooltip,
	IconButton,
	Chip,
	alpha,
} from "@mui/material";
import { EditNote, Save, ChevronLeft, Download } from "@mui/icons-material";
import {
	getExtendedShadows,
	typographyExtended,
	opacity,
} from "../styles.theme";

interface SoapNoteEditorProps {
	content: string;
	onChange: (value: string) => void;
	onSave?: () => void;
	onDownload?: () => void;
	method?: string;
	onToggleFocus?: () => void;
	isFocused?: boolean;
}

export const SoapNoteEditor: React.FC<SoapNoteEditorProps> = ({
	content,
	onChange,
	onSave,
	onDownload,
	method,
	onToggleFocus,
	isFocused = false,
}) => {
	return (
		<Paper
			elevation={0}
			sx={{
				flex: isFocused ? 1 : { xs: "1 1 auto", lg: 3 }, // Responsive flex
				display: "flex",
				flexDirection: "column",
				borderRadius: 4,
				overflow: "hidden",
				border: "1px solid",
				borderColor: "divider",
				boxShadow: (theme) =>
					getExtendedShadows(theme.palette.mode as "light" | "dark").editor,
				position: "relative",
				transition: "all 0.3s ease",
				minHeight: { xs: "300px", lg: "auto" }, // Minimum height on mobile
				...(isFocused && {
					position: "fixed",
					top: { xs: 60, sm: 80 },
					left: { xs: 10, sm: 20 },
					right: { xs: 10, sm: 20 },
					bottom: { xs: 10, sm: 20 },
					zIndex: 1000,
					m: 0,
				}),
			}}
		>
			<Box
				sx={{
					p: 1.5,
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: "background.default",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Stack direction="row" alignItems="center" gap={2}>
					<Stack direction="row" alignItems="center" gap={1}>
						<EditNote color="primary" fontSize="small" />
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
							Nota Clínica
						</Typography>
					</Stack>
					{method && (
						<Chip
							label={`MÉTODO: ${method}`}
							size="small"
							sx={{
								height: 20,
								fontSize: "0.65rem",
								fontWeight: typographyExtended.fontWeights.bold,
								bgcolor: "primary.main",
								color: "primary.contrastText",
								opacity: opacity.high,
							}}
						/>
					)}
					{onDownload && (
						<Tooltip title="Exportar como TXT">
							<IconButton
								size="small"
								onClick={onDownload}
								sx={{ color: "primary.main" }}
							>
								<Download fontSize="small" />
							</IconButton>
						</Tooltip>
					)}
				</Stack>

				{/* Focus Mode Toggle */}
				{onToggleFocus && (
					<IconButton
						sx={{ color: "primary.main" }}
						size="small"
						onClick={onToggleFocus}
						title={isFocused ? "Contraer" : "Maximizar"}
					>
						{isFocused ? (
							<ChevronLeft sx={{ transform: "rotate(90deg)" }} />
						) : (
							<ChevronLeft sx={{ transform: "rotate(-90deg)" }} />
						)}
					</IconButton>
				)}
			</Box>

			<Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
				<TextField
					multiline
					fullWidth
					value={content}
					onChange={(e) => onChange(e.target.value)}
					inputProps={{
						spellCheck: false,
						lang: "es",
					}}
					placeholder="Escribe el informe clínico aquí (Markdown soportado)..."
					sx={{
						height: "100%",
						bgcolor: "background.paper",
						"& .MuiInputBase-root": {
							height: "100%",
							display: "flex",
							flexDirection: "column",
							p: 0,
							fontSize: "0.95rem",
							lineHeight: 1.6,
							fontFamily: "inherit",
							"& textarea": {
								p: 2,
								height: "100% !important",
								overflowY: "auto !important",
							},
						},
						"& .MuiOutlinedInput-notchedOutline": { border: "none" },
					}}
				/>
			</Box>

			{/* FAB */}
			<Box sx={{ position: "absolute", bottom: 24, right: 24 }}>
				<Tooltip title="Finalizar Sesión y Guardar">
					<Fab
						color="primary"
						aria-label="save"
						onClick={onSave}
						sx={{
							boxShadow: (theme) =>
								`0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
						}}
					>
						<Save />
					</Fab>
				</Tooltip>
			</Box>
		</Paper>
	);
};
