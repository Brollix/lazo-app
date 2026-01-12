import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Avatar,
	CircularProgress,
	Alert,
	IconButton,
	Snackbar,
	AlertTitle,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { ThemeContext } from "../App";
import { colors, shadows } from "../styles.theme";
import { SubscriptionModal } from "./SubscriptionModal";
import { supabase } from "../supabaseClient";

interface SettingsProps {
	open: boolean;
	onClose: () => void;
	onLogout?: () => void;
}

interface UserProfile {
	id: string;
	email: string;
	full_name: string | null;
	plan_type: string;
	credits_remaining: number;
}

export const Settings: React.FC<SettingsProps> = ({
	open,
	onClose,
	onLogout,
}) => {
	const { mode, toggleTheme } = React.useContext(ThemeContext);
	const [showSubModal, setShowSubModal] = React.useState(false);
	const [userProfile, setUserProfile] = React.useState<UserProfile | null>(
		null
	);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [showCancelDialog, setShowCancelDialog] = React.useState(false);
	const [cancelling, setCancelling] = React.useState(false);
	const [successMessage, setSuccessMessage] = React.useState<string | null>(
		null
	);

	// Fetch user profile from Supabase
	React.useEffect(() => {
		const fetchUserProfile = async () => {
			if (!open) return;

			setLoading(true);
			setError(null);

			try {
				// Get authenticated user
				const {
					data: { user },
					error: authError,
				} = await supabase.auth.getUser();

				if (authError) throw authError;
				if (!user) throw new Error("No hay usuario autenticado");

				// Fetch profile data
				const { data: profile, error: profileError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", user.id)
					.single();

				if (profileError) throw profileError;

				setUserProfile({
					id: user.id,
					email: user.email || "",
					full_name: profile.full_name,
					plan_type: profile.plan_type,
					credits_remaining: profile.credits_remaining,
				});
			} catch (err: any) {
				console.error("Error fetching user profile:", err);
				setError(err.message || "Error al cargar el perfil");
			} finally {
				setLoading(false);
			}
		};

		fetchUserProfile();
	}, [open]);

	// Get user initials for avatar
	const getInitials = (name: string | null, email: string) => {
		if (name) {
			const parts = name.trim().split(" ");
			if (parts.length >= 2) {
				return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
			}
			return name.substring(0, 2).toUpperCase();
		}
		return email.substring(0, 2).toUpperCase();
	};

	const handleCancelSubscription = async () => {
		if (!userProfile) return;

		setCancelling(true);
		setError(null);

		try {
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const response = await fetch(`${apiUrl}/api/cancel-subscription`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: userProfile.id }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Error al cancelar suscripción");
			}

			const result = await response.json();
			console.log("Subscription cancelled:", result);

			// Update local state
			setUserProfile({
				...userProfile,
				plan_type: "free",
				credits_remaining: 3,
			});

			setSuccessMessage(
				"Suscripción cancelada exitosamente. Has vuelto al plan gratuito."
			);
			setShowCancelDialog(false);
		} catch (err: any) {
			console.error("Error cancelling subscription:", err);
			setError(err.message || "Error al cancelar la suscripción");
		} finally {
			setCancelling(false);
		}
	};

	const displayName = userProfile?.full_name || userProfile?.email || "Usuario";
	const planDisplay =
		userProfile?.plan_type === "free"
			? "Plan Gratuito"
			: `Plan ${userProfile?.plan_type
					?.charAt(0)
					.toUpperCase()}${userProfile?.plan_type?.slice(1)}`;

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="xs"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					p: { xs: 1, sm: 1.5 },
					boxShadow: shadows.card,
					border: 1,
					borderColor: "divider",
					m: { xs: 1, sm: 2 },
					maxWidth: { xs: "calc(100% - 16px)", sm: 480 },
				},
			}}
		>
			<DialogTitle
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					pb: 1,
					px: 2,
					pt: 2,
				}}
			>
				<Typography
					variant="h6"
					fontWeight="bold"
					component="div"
					sx={{ fontSize: "1.1rem" }}
				>
					Configuración
				</Typography>
				<IconButton onClick={toggleTheme} size="small" sx={{ borderRadius: 2 }}>
					{mode === "dark" ? <Brightness7 /> : <Brightness4 />}
				</IconButton>
			</DialogTitle>

			<DialogContent sx={{ px: 2, pb: 1 }}>
				{loading ? (
					<Box
						sx={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							py: 4,
						}}
					>
						<CircularProgress />
					</Box>
				) : error ? (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				) : userProfile ? (
					<>
						{/* Section 1: User Profile */}
						<Box sx={{ mb: 3, mt: 0.5 }}>
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
									gap: 1.5,
									p: 1.5,
									bgcolor: "background.default",
									borderRadius: 2,
								}}
							>
								<Avatar
									sx={{
										width: 48,
										height: 48,
										bgcolor: "primary.light",
									}}
								>
									{getInitials(userProfile.full_name, userProfile.email)}
								</Avatar>
								<Box sx={{ flex: 1, minWidth: 0 }}>
									<Typography
										variant="subtitle1"
										fontWeight="bold"
										sx={{ fontSize: "0.95rem" }}
									>
										{displayName}
									</Typography>
									<Typography
										variant="body2"
										color="text.secondary"
										sx={{
											fontSize: "0.8rem",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{userProfile.email}
									</Typography>
								</Box>
								<Box
									sx={{
										display: "flex",
										flexDirection: { xs: "row", sm: "column" },
										gap: 1,
										alignItems: { xs: "center", sm: "flex-end" },
									}}
								>
									<Box
										sx={{
											px: 1.5,
											py: 0.5,
											bgcolor: `${colors.terracotta}1A`,
											borderRadius: 4,
										}}
									>
										<Typography
											variant="caption"
											sx={{
												color: "primary.main",
												fontWeight: 700,
												fontSize: { xs: "0.7rem", sm: "0.75rem" },
											}}
										>
											{planDisplay}
										</Typography>
									</Box>
									<Typography
										variant="caption"
										color="text.secondary"
										sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
									>
										Créditos: {userProfile.credits_remaining}
									</Typography>
								</Box>
							</Box>
							<Button
								variant="outlined"
								fullWidth
								size="small"
								sx={{ mt: 1.5, borderRadius: 2 }}
								onClick={() => setShowSubModal(true)}
							>
								Gestionar Suscripción
							</Button>
							{userProfile.plan_type !== "free" && (
								<Button
									variant="outlined"
									color="error"
									fullWidth
									size="small"
									sx={{ mt: 1, borderRadius: 2 }}
									onClick={() => setShowCancelDialog(true)}
								>
									Cancelar Suscripción
								</Button>
							)}
						</Box>

						<SubscriptionModal
							open={showSubModal}
							onClose={() => setShowSubModal(false)}
							userId={userProfile.id}
							userEmail={userProfile.email}
						/>
					</>
				) : null}
			</DialogContent>

			<DialogActions
				sx={{
					p: { xs: 1.5, sm: 2 },
					pt: 0,
					flexDirection: { xs: "column", sm: "row" },
					gap: { xs: 1, sm: 0 },
				}}
			>
				{onLogout && (
					<Button
						onClick={() => {
							onClose();
							onLogout();
						}}
						variant="outlined"
						color="error"
						size="small"
						sx={{ borderRadius: 2 }}
					>
						Cerrar Sesión
					</Button>
				)}
				<Box sx={{ flexGrow: 1 }} />
				<Button
					onClick={onClose}
					variant="contained"
					disableElevation
					size="small"
					sx={{ borderRadius: 2 }}
				>
					Cerrar
				</Button>
			</DialogActions>
		</Dialog>

		{/* Cancellation Confirmation Dialog */}
		<Dialog
			open={showCancelDialog}
			onClose={() => !cancelling && setShowCancelDialog(false)}
			maxWidth="sm"
			fullWidth
		>
			<DialogTitle>¿Cancelar Suscripción?</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					<AlertTitle>Importante</AlertTitle>
					Al cancelar tu suscripción:
				</Alert>
				<Box component="ul" sx={{ pl: 2, mt: 2 }}>
					<Typography component="li" variant="body2" sx={{ mb: 1 }}>
						Volverás al <strong>Plan Gratuito</strong> con 3 créditos
					</Typography>
					<Typography component="li" variant="body2" sx={{ mb: 1 }}>
						Tus pacientes y notas clínicas se mantendrán intactos
					</Typography>
					<Typography component="li" variant="body2" sx={{ mb: 1 }}>
						Podrás reactivar tu suscripción en cualquier momento
					</Typography>
					<Typography component="li" variant="body2">
						Si tienes una suscripción recurrente en MercadoPago, deberás
						cancelarla manualmente
					</Typography>
				</Box>
			</DialogContent>
			<DialogActions sx={{ p: 2, pt: 0 }}>
				<Button
					onClick={() => setShowCancelDialog(false)}
					disabled={cancelling}
					size="small"
				>
					Mantener Suscripción
				</Button>
				<Button
					onClick={handleCancelSubscription}
					variant="contained"
					color="error"
					disabled={cancelling}
					size="small"
				>
					{cancelling ? "Cancelando..." : "Confirmar Cancelación"}
				</Button>
			</DialogActions>
		</Dialog>

		{/* Success Snackbar */}
		<Snackbar
			open={!!successMessage}
			autoHideDuration={6000}
			onClose={() => setSuccessMessage(null)}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
		>
			<Alert
				onClose={() => setSuccessMessage(null)}
				severity="success"
				sx={{ width: "100%" }}
			>
				{successMessage}
			</Alert>
		</Snackbar>
	</>
	);
};
