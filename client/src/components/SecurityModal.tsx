import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	TextField,
	InputAdornment,
	IconButton,
	CircularProgress,
	Alert,
	Stack,
	Divider,
} from "@mui/material";
import {
	Close,
	Email,
	Lock,
	Visibility,
	VisibilityOff,
} from "@mui/icons-material";
import { supabase } from "../supabaseClient";
import { colors } from "../styles.theme";

interface SecurityModalProps {
	open: boolean;
	onClose: () => void;
	userEmail: string;
	mode: "light" | "dark";
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
	open,
	onClose,
	userEmail,
	mode,
}) => {
	const [newEmail, setNewEmail] = React.useState("");
	const [oldPassword, setOldPassword] = React.useState("");
	const [newPassword, setNewPassword] = React.useState("");
	const [confirmPassword, setConfirmPassword] = React.useState("");
	const [showOldPassword, setShowOldPassword] = React.useState(false);
	const [showNewPassword] = React.useState(false);
	const [loading, setLoading] = React.useState<string | null>(null);
	const [error, setError] = React.useState<{
		type: "email" | "password";
		message: string;
	} | null>(null);
	const [success, setSuccess] = React.useState<string | null>(null);

	const handleUpdateEmail = async () => {
		if (!newEmail.trim()) return;
		setLoading("email");
		setError(null);
		setSuccess(null);

		try {
			const { error: authError } = await supabase.auth.updateUser({
				email: newEmail.trim(),
			});

			if (authError) throw authError;

			setSuccess(
				"Correo actualizado. Se ha enviado una confirmación a tu nueva dirección."
			);
			setNewEmail("");
		} catch (err: any) {
			setError({
				type: "email",
				message: err.message || "Error al actualizar el correo",
			});
		} finally {
			setLoading(null);
		}
	};

	const handleUpdatePassword = async () => {
		if (!oldPassword || !newPassword || !confirmPassword) {
			setError({
				type: "password",
				message: "Todos los campos son obligatorios",
			});
			return;
		}

		if (newPassword !== confirmPassword) {
			setError({
				type: "password",
				message: "Las contraseñas nuevas no coinciden",
			});
			return;
		}

		if (newPassword.length < 6) {
			setError({
				type: "password",
				message: "La contraseña debe tener al menos 6 caracteres",
			});
			return;
		}

		setLoading("password");
		setError(null);
		setSuccess(null);

		try {
			// 1. Verify old password by re-authenticating
			const { error: reauthError } = await supabase.auth.signInWithPassword({
				email: userEmail,
				password: oldPassword,
			});

			if (reauthError) {
				throw new Error("La contraseña actual es incorrecta");
			}

			// 2. Update to new password
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (updateError) throw updateError;

			setSuccess("Contraseña actualizada correctamente");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			setError({
				type: "password",
				message: err.message || "Error al actualizar la contraseña",
			});
		} finally {
			setLoading(null);
		}
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
					bgcolor: mode === "dark" ? "#1A1C2E" : "background.paper",
					boxShadow:
						mode === "dark"
							? "0 24px 48px rgba(0,0,0,0.8)"
							: "0 24px 48px rgba(0,0,0,0.1)",
				},
			}}
		>
			<DialogTitle
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					pt: 3,
				}}
			>
				<Typography variant="h6" fontWeight="800">
					Seguridad de la Cuenta
				</Typography>
				<IconButton onClick={onClose} size="small">
					<Close />
				</IconButton>
			</DialogTitle>

			<DialogContent>
				<Stack spacing={4} sx={{ mt: 1 }}>
					{/* Email Update Section */}
					<Box>
						<Typography
							variant="subtitle2"
							fontWeight="700"
							color="primary"
							sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
						>
							<Email fontSize="small" /> Cambiar Correo Electrónico
						</Typography>

						<Typography
							variant="caption"
							color="text.secondary"
							sx={{ mb: 2, display: "block" }}
						>
							Correo actual: <strong>{userEmail}</strong>
						</Typography>

						<Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
							<TextField
								fullWidth
								size="small"
								label="Nuevo Correo"
								value={newEmail}
								onChange={(e) => setNewEmail(e.target.value)}
								sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
							/>
							<Button
								variant="contained"
								disableElevation
								onClick={handleUpdateEmail}
								disabled={loading !== null || !newEmail}
								sx={{ borderRadius: 2, px: 3, py: { xs: 1.2, sm: "inherit" } }}
							>
								{loading === "email" ? (
									<CircularProgress size={20} />
								) : (
									"Actualizar"
								)}
							</Button>
						</Stack>
						{error?.type === "email" && (
							<Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
								{error.message}
							</Alert>
						)}
					</Box>

					<Divider />

					{/* Password Update Section */}
					<Box>
						<Typography
							variant="subtitle2"
							fontWeight="700"
							color="primary"
							sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
						>
							<Lock fontSize="small" /> Cambiar Contraseña
						</Typography>

						<Stack spacing={2}>
							<TextField
								fullWidth
								size="small"
								label="Contraseña Actual"
								type={showOldPassword ? "text" : "password"}
								value={oldPassword}
								onChange={(e) => setOldPassword(e.target.value)}
								InputProps={{
									endAdornment: (
										<InputAdornment position="end">
											<IconButton
												size="small"
												onClick={() => setShowOldPassword(!showOldPassword)}
											>
												{showOldPassword ? (
													<VisibilityOff fontSize="small" />
												) : (
													<Visibility fontSize="small" />
												)}
											</IconButton>
										</InputAdornment>
									),
								}}
								sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
							/>

							<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
								<TextField
									fullWidth
									size="small"
									label="Nueva Contraseña"
									type={showNewPassword ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
								/>
								<TextField
									fullWidth
									size="small"
									label="Confirmar Nueva"
									type={showNewPassword ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
								/>
							</Stack>

							<Button
								fullWidth
								variant="contained"
								disableElevation
								onClick={handleUpdatePassword}
								disabled={loading !== null || !oldPassword || !newPassword}
								sx={{
									borderRadius: 2,
									py: 1,
									fontWeight: "bold",
									background: `linear-gradient(135deg, ${colors.terracotta} 0%, ${colors.deepOrange} 100%)`,
								}}
							>
								{loading === "password" ? (
									<CircularProgress size={20} />
								) : (
									"Cambiar Contraseña"
								)}
							</Button>
						</Stack>
						{error?.type === "password" && (
							<Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
								{error.message}
							</Alert>
						)}
					</Box>

					{success && (
						<Alert severity="success" sx={{ borderRadius: 2 }}>
							{success}
						</Alert>
					)}
				</Stack>
			</DialogContent>

			<DialogActions sx={{ p: 3 }}>
				<Button
					onClick={onClose}
					variant="text"
					sx={{ borderRadius: 2, fontWeight: "bold" }}
				>
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>
	);
};
