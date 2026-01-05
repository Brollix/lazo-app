import React, { useEffect } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Typography,
	IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface SettingsDialogProps {
	open: boolean;
	onClose: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
	open,
	onClose,
}) => {
	// watchPath state removed

	useEffect(() => {
		// Folder watching is not available in web version
	}, [open]);

	// handleSelectFolder removed

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
				<Typography variant="body1" color="text.secondary">
					La funcionalidad de vigilancia de carpetas solo está disponible en la
					versión de escritorio.
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} variant="contained">
					Listo
				</Button>
			</DialogActions>
		</Dialog>
	);
};
