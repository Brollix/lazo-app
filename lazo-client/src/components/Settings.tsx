import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Box,
	Typography,
	Avatar,
} from "@mui/material";
import { colors, shadows } from "../styles.theme";
import { SubscriptionModal } from "./SubscriptionModal";

interface SettingsProps {
	open: boolean;
	onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ open, onClose }) => {
	const [showSubModal, setShowSubModal] = React.useState(false);
	const [userProfile, setUserProfile] = React.useState<any>(null);

	// Fetch user plan and credits
	React.useEffect(() => {
		if (open) {
			// In a real app, userId would come from context
			const apiUrl = import.meta.env.VITE_API_URL;
			fetch(`${apiUrl}/api/user-plan/demo-user`)
				.then((res) => res.json())
				.then((data) => setUserProfile(data));
		}
	}, [open]);

	const user = {
		name: "Paciente de prueba",
		email: "demo@lazo.app",
		plan:
			userProfile?.plan_type === "free"
				? "Plan Gratuito"
				: `Plan ${userProfile?.plan_type}`,
		credits: userProfile?.credits_remaining || 0,
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					p: 1,
					boxShadow: shadows.card,
					border: 1,
					borderColor: "divider",
				},
			}}
		>
			<DialogTitle
				sx={{ display: "flex", alignItems: "center", gap: 2, pb: 1 }}
			>
				<Typography variant="h6" fontWeight="bold" component="div">
					Configuración
				</Typography>
			</DialogTitle>

			<DialogContent>
				{/* Section 1: User Profile */}
				<Box sx={{ mb: 4, mt: 1 }}>
					<Typography
						variant="subtitle2"
						color="text.secondary"
						sx={{
							textTransform: "uppercase",
							fontSize: "0.75rem",
							fontWeight: 700,
							mb: 2,
						}}
					>
						Perfil de Usuario
					</Typography>
					<Box
						sx={{
							display: "flex",
							alignItems: "center",
							gap: 2,
							p: 2,
							bgcolor: "background.default",
							borderRadius: 3,
						}}
					>
						<Avatar sx={{ width: 56, height: 56, bgcolor: "primary.light" }}>
							PD
						</Avatar>
						<Box>
							<Typography variant="subtitle1" fontWeight="bold">
								{user.name}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{user.email}
							</Typography>
						</Box>
						<Box sx={{ flexGrow: 1 }} />
						<Box
							sx={{
								px: 1.5,
								py: 0.5,
								bgcolor: `${colors.terracotta}1A`, // 10% opacity theme color
								borderRadius: 4,
							}}
						>
							<Typography
								variant="caption"
								sx={{ color: "primary.main", fontWeight: 700 }}
							>
								{user.plan}
							</Typography>
						</Box>
						{userProfile?.plan_type === "free" && (
							<Box sx={{ ml: 2 }}>
								<Typography variant="caption" color="text.secondary">
									{user.credits} créditos restantes
								</Typography>
							</Box>
						)}
					</Box>
					<Button
						variant="outlined"
						fullWidth
						sx={{ mt: 2, borderRadius: 2 }}
						onClick={() => setShowSubModal(true)}
					>
						Gestionar Suscripción
					</Button>
				</Box>

				<SubscriptionModal
					open={showSubModal}
					onClose={() => setShowSubModal(false)}
					userId="demo-user"
					userEmail={user.email}
				/>

				{/* Section 2: Folder Watcher */}
				<Box sx={{ mb: 2 }}>
					<Typography
						variant="subtitle2"
						color="text.secondary"
						sx={{
							mb: 2,
						}}
					>
						Carpetas Vigiladas
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Selecciona la carpeta donde guardas tus grabaciones de Zoom/Meet.
						Lazo procesará automáticamente los nuevos archivos.
					</Typography>
					<TextField
						fullWidth
						value="C:/Users/Agus/Documents/Zoom"
						label="Ruta de la carpeta"
						variant="outlined"
						InputProps={{
							readOnly: true,
							endAdornment: (
								<Button
									size="small"
									variant="text"
									sx={{ whiteSpace: "nowrap", ml: 1 }}
								>
									Cambiar
								</Button>
							),
						}}
					/>
				</Box>
			</DialogContent>

			<DialogActions sx={{ p: 2, pt: 0 }}>
				<Button
					onClick={onClose}
					variant="text"
					sx={{ borderRadius: 2, px: 3 }}
				>
					Cerrar
				</Button>
				<Button
					onClick={onClose}
					variant="contained"
					disableElevation
					sx={{ borderRadius: 2, px: 3 }}
				>
					Guardar Cambios
				</Button>
			</DialogActions>
		</Dialog>
	);
};
