import React, { useEffect, useState, useRef } from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	Stack,
	Tooltip,
	IconButton,
	Chip,
	alpha,
	CircularProgress,
} from "@mui/material";
import { EditNote, ChevronLeft, Download, CheckCircle, CloudDone } from "@mui/icons-material";
import {
	getExtendedShadows,
	typographyExtended,
	opacity,
} from "../styles.theme";

interface SoapNoteEditorProps {
	content: string;
	onChange: (value: string) => void;
	onAutoSave?: (content: string) => Promise<void>;
	onDownload?: () => void;
	method?: string;
	onToggleFocus?: () => void;
	isFocused?: boolean;
}

export const SoapNoteEditor: React.FC<SoapNoteEditorProps> = ({
	content,
	onChange,
	onAutoSave,
	onDownload,
	method,
	onToggleFocus,
	isFocused = false,
}) => {
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
	const [wordCount, setWordCount] = useState(0);
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastSavedContentRef = useRef(content);

	// Calcular contador de palabras
	useEffect(() => {
		const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
		setWordCount(words);
	}, [content]);

	// Autoguardado instantáneo con cada cambio
	useEffect(() => {
		// Si no hay función de autoguardado, no hacer nada
		if (!onAutoSave) return;

		// Si el contenido no ha cambiado desde el último guardado, no hacer nada
		if (content === lastSavedContentRef.current) return;

		// Limpiar timeout anterior si existe
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		// Guardar inmediatamente
		const saveImmediately = async () => {
			setSaveStatus("saving");
			try {
				await onAutoSave(content);
				lastSavedContentRef.current = content;
				setSaveStatus("saved");
				
				// Volver a idle después de 1.5 segundos
				saveTimeoutRef.current = setTimeout(() => {
					setSaveStatus("idle");
				}, 1500);
			} catch (error) {
				console.error("Error en autoguardado:", error);
				setSaveStatus("idle");
			}
		};

		saveImmediately();

		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [content, onAutoSave]);

	// Actualizar referencia inicial cuando cambia externamente
	useEffect(() => {
		lastSavedContentRef.current = content;
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Ctrl+S o Cmd+S para guardar manualmente
		if ((e.ctrlKey || e.metaKey) && e.key === 's') {
			e.preventDefault();
			if (onAutoSave && content !== lastSavedContentRef.current) {
				setSaveStatus("saving");
				onAutoSave(content).then(() => {
					lastSavedContentRef.current = content;
					setSaveStatus("saved");
					setTimeout(() => setSaveStatus("idle"), 2000);
				}).catch(() => {
					setSaveStatus("idle");
				});
			}
		}
	};
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
				<Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
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
					
					{/* Contador de palabras */}
					<Typography
						variant="caption"
						sx={{
							color: "text.secondary",
							fontSize: "0.7rem",
						}}
					>
						{wordCount} {wordCount === 1 ? "palabra" : "palabras"}
					</Typography>

					{/* Indicador de guardado */}
					{onAutoSave && (
						<Stack direction="row" alignItems="center" gap={0.5}>
							{saveStatus === "saving" && (
								<>
									<CircularProgress size={12} thickness={4} />
									<Typography
										variant="caption"
										sx={{
											color: "text.secondary",
											fontSize: "0.7rem",
										}}
									>
										Guardando...
									</Typography>
								</>
							)}
							{saveStatus === "saved" && (
								<>
									<CheckCircle sx={{ fontSize: 14, color: "success.main" }} />
									<Typography
										variant="caption"
										sx={{
											color: "success.main",
											fontSize: "0.7rem",
										}}
									>
										Guardado
									</Typography>
								</>
							)}
						</Stack>
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
						{isFocused ?
							<ChevronLeft sx={{ transform: "rotate(90deg)" }} />
						:	<ChevronLeft sx={{ transform: "rotate(-90deg)" }} />}
					</IconButton>
				)}
			</Box>

			<Box sx={{ flexGrow: 1, position: "relative", overflow: "hidden" }}>
				<TextField
					multiline
					fullWidth
					value={content}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={handleKeyDown}
					inputProps={{
						spellCheck: false,
						lang: "es",
					}}
					placeholder="Escribe el informe clínico aquí (Markdown soportado)... Ctrl+S para guardar manualmente"
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
		</Paper>
	);
};
