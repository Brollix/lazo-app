import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	IconButton,
	useTheme,
} from "@mui/material";
import {
	Close,
	CheckCircle,
	Error as ErrorIcon,
	Warning,
	Info,
} from "@mui/icons-material";
import { getExtendedShadows } from "../styles.theme";

export type AlertSeverity = "success" | "error" | "warning" | "info";

interface AlertModalProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	message: string;
	severity?: AlertSeverity;
	confirmText?: string;
	showCancel?: boolean;
	cancelText?: string;
	onConfirm?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
	open,
	onClose,
	title,
	message,
	severity = "info",
	confirmText = "Aceptar",
	showCancel = false,
	cancelText = "Cancelar",
	onConfirm,
}) => {
	const theme = useTheme();
	const extendedShadows = getExtendedShadows(theme.palette.mode);

	const getSeverityConfig = () => {
		switch (severity) {
			case "success":
				return {
					icon: <CheckCircle sx={{ color: "success.main", fontSize: 40 }} />,
					color: "success.main",
					bgColor: "success.light",
				};
			case "error":
				return {
					icon: <ErrorIcon sx={{ color: "error.main", fontSize: 40 }} />,
					color: "error.main",
					bgColor: "error.light",
				};
			case "warning":
				return {
					icon: <Warning sx={{ color: "warning.main", fontSize: 40 }} />,
					color: "warning.main",
					bgColor: "warning.light",
				};
			default:
				return {
					icon: <Info sx={{ color: "info.main", fontSize: 40 }} />,
					color: "info.main",
					bgColor: "info.light",
				};
		}
	};

	const config = getSeverityConfig();

	const handleConfirm = () => {
		if (onConfirm) {
			onConfirm();
		}
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 4,
					bgcolor: "background.paper",
					boxShadow: extendedShadows.panel,
				},
			}}
		>
			<DialogTitle
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					pt: 3,
					pb: 2,
				}}
			>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
					{config.icon}
					<Typography variant="h6" fontWeight="800">
						{title ||
							(severity === "error"
								? "Error"
								: severity === "success"
								? "Éxito"
								: severity === "warning"
								? "Advertencia"
								: "Información")}
					</Typography>
				</Box>
				<IconButton onClick={onClose} size="small">
					<Close />
				</IconButton>
			</DialogTitle>

			<DialogContent sx={{ px: 3, pb: 2 }}>
				<Typography variant="body1" color="text.primary">
					{message}
				</Typography>
			</DialogContent>

			<DialogActions sx={{ p: 3, pt: 2 }}>
				{showCancel && (
					<Button
						onClick={onClose}
						variant="text"
						sx={{ borderRadius: 2, fontWeight: "bold" }}
					>
						{cancelText}
					</Button>
				)}
				<Button
					onClick={handleConfirm}
					variant="contained"
					disableElevation
					sx={{
						borderRadius: 2,
						px: 3,
						py: 1,
						fontWeight: "bold",
						bgcolor: config.color,
						"&:hover": {
							bgcolor: config.color,
							opacity: 0.9,
						},
					}}
				>
					{confirmText}
				</Button>
			</DialogActions>
		</Dialog>
	);
};
