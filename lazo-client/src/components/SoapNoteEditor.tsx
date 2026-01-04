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
} from "@mui/material";
import {
	EditNote,
	Save,
	FormatBold,
	FormatListBulleted,
	Title,
} from "@mui/icons-material";
import { getColors } from "../styles.theme";

interface SoapNoteEditorProps {
	content: string;
	onChange: (value: string) => void;
	onSave: () => void;
}

export const SoapNoteEditor: React.FC<SoapNoteEditorProps> = ({
	content,
	onChange,
	onSave,
}) => {
	const insertText = (before: string, after: string = "") => {
		// Simple insertion at end for this iteration.
		// In a real editor we'd use ref to track cursor position.
		onChange(content + before + " " + after);
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
				position: "relative",
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
				<Stack direction="row" alignItems="center" gap={1}>
					<EditNote color="primary" fontSize="small" />
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
						Nota Clínica
					</Typography>
				</Stack>

				{/* Mini Toolbar */}
				<Stack direction="row" spacing={0.5}>
					<IconButton
						sx={{ color: "text.secondary" }}
						size="small"
						onClick={() => insertText("**bold**")}
					>
						<FormatBold fontSize="small" />
					</IconButton>
					<IconButton
						sx={{ color: "text.secondary" }}
						size="small"
						onClick={() => insertText("\n- ")}
					>
						<FormatListBulleted fontSize="small" />
					</IconButton>
					<IconButton
						sx={{ color: "text.secondary" }}
						size="small"
						onClick={() => insertText("\n## ")}
					>
						<Title fontSize="small" />
					</IconButton>
				</Stack>
			</Box>

			<Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
				<TextField
					multiline
					fullWidth
					value={content}
					onChange={(e) => onChange(e.target.value)}
					placeholder="Escribe el informe clínico aquí..."
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
							fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
							"& textarea": {
								p: 3,
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
								`0 4px 12px ${
									getColors(theme.palette.mode as "light" | "dark").terracotta
								}4D`,
						}} // 30% opacity terracotta
					>
						<Save />
					</Fab>
				</Tooltip>
			</Box>
		</Paper>
	);
};
