import React, { useEffect, useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	Box,
	TextField,
	InputAdornment,
	IconButton,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import CloseIcon from "@mui/icons-material/Close";

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
	open,
	onClose,
}) => {
	const [watchPath, setWatchPath] = useState<string>("");

	useEffect(() => {
		if (open) {
			// Fetch current path
			window.ipcRenderer?.getWatchPath().then((path) => {
				setWatchPath(path);
			});
		}
	}, [open]);

	const handleSelectFolder = async () => {
		const path = await window.ipcRenderer?.selectFolder();
		if (path) {
			setWatchPath(path);
		}
	};

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle sx={{ m: 0, p: 2 }}>
				Configuración
				<IconButton
					aria-label="close"
					onClick={onClose}
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: (theme) => theme.palette.grey[500],
					}}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent dividers>
				<Typography variant="h6" gutterBottom>
					Carpetas Vigiladas
				</Typography>
				<Typography variant="body2" color="text.secondary" paragraph>
					Selecciona la carpeta donde guardas tus grabaciones de Zoom/Meet. Lazo
					procesará automáticamente los nuevos archivos.
				</Typography>

				<Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
					<TextField
						fullWidth
						value={watchPath}
						InputProps={{
							readOnly: true,
							startAdornment: (
								<InputAdornment position="start">
									<FolderOpenIcon />
								</InputAdornment>
							),
							endAdornment: (
								<InputAdornment position="end">
									<Button
										onClick={handleSelectFolder}
										variant="outlined"
										size="small"
									>
										Cambiar
									</Button>
								</InputAdornment>
							),
						}}
						variant="outlined"
						size="small"
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="contained">
					Listo
				</Button>
			</DialogActions>
		</Dialog>
	);
};
