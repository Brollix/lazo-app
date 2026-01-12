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
	Stack,
	TextField,
	InputAdornment,
} from "@mui/material";
import {
	Brightness4,
	Brightness7,
	Logout,
	Close,
	CardMembership,
	AccountBalanceWallet,
	Person,
	Lock,
	Save,
} from "@mui/icons-material";
import { ThemeContext } from "../App";
import { colors } from "../styles.theme";
import { SubscriptionModal } from "./SubscriptionModal";
import { SecurityModal } from "./SecurityModal";
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
	const [newName, setNewName] = React.useState("");
	const [showSecurityModal, setShowSecurityModal] = React.useState(false);
	const [updating, setUpdating] = React.useState<string | null>(null);

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

				if (authError) {
					console.error("Auth error:", authError);
					throw new Error(`Error de autenticación: ${authError.message}`);
				}
				if (!user) {
					console.error("No user found in session");
					throw new Error("No hay usuario autenticado");
				}

				console.log("User authenticated, fetching profile for:", user.id);

				// Fetch profile data
				const { data: profile, error: profileError } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", user.id)
					.single();

				if (profileError) {
					console.error("Profile fetch error:", {
						message: profileError.message,
						details: profileError.details,
						hint: profileError.hint,
						code: profileError.code,
					});
					throw new Error(`Error al cargar perfil: ${profileError.message}`);
				}

				if (!profile) {
					console.error("No profile found for user:", user.id);
					throw new Error("No se encontró el perfil del usuario");
				}

				console.log("Profile loaded successfully:", profile);

				setUserProfile({
					id: user.id,
					email: user.email || "",
					full_name: profile.full_name,
					plan_type: profile.plan_type || "free",
					credits_remaining: profile.credits_remaining ?? 3,
				});
				setNewName(profile.full_name || "");
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
		if (name && name.trim()) {
			const parts = name.trim().split(" ");
			if (parts.length >= 2) {
				return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
			}
			return name.trim().substring(0, 2).toUpperCase();
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
	const handleUpdateName = async () => {
		if (!userProfile || !newName.trim()) return;
		setUpdating("name");
		setError(null);
		try {
			const { error: profileError } = await supabase
				.from("profiles")
				.update({ full_name: newName.trim() })
				.eq("id", userProfile.id);
			if (profileError) throw profileError;
			const { error: authError } = await supabase.auth.updateUser({
				data: { full_name: newName.trim() },
			});
			if (authError) throw authError;
			setUserProfile({ ...userProfile, full_name: newName.trim() });
			setSuccessMessage("Nombre actualizado correctamente");
		} catch (err: any) {
			console.error("Error updating name:", err);
			setError(err.message || "Error al actualizar el nombre");
		} finally {
			setUpdating(null);
		}
	};

	const displayName = userProfile?.full_name || "Usuario";
	const planDisplay =
		!userProfile?.plan_type || userProfile.plan_type === "free"
			? "Plan Gratuito"
			: `Plan ${userProfile.plan_type
					.charAt(0)
					.toUpperCase()}${userProfile.plan_type.slice(1)}`;

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				maxWidth="xs"
				fullWidth
				PaperProps={{
					sx: {
						borderRadius: 4,
						p: 0,
						boxShadow:
							mode === "dark"
								? "0 24px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
								: "0 24px 48px rgba(61, 64, 91, 0.15)",
						border: "none",
						m: { xs: 1, sm: 2 },
						maxWidth: { xs: "calc(100% - 16px)", sm: 480 },
						overflow: "hidden",
						bgcolor: mode === "dark" ? "#15171E" : "background.paper",
					},
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						pb: 2,
						px: 3,
						pt: 3,
						borderBottom:
							mode === "dark"
								? "1px solid rgba(255,255,255,0.05)"
								: "1px solid rgba(0,0,0,0.05)",
					}}
				>
					<Typography
						variant="h6"
						fontWeight="800"
						component="div"
						sx={{
							fontSize: "1.25rem",
							letterSpacing: "-0.02em",
							display: "flex",
							alignItems: "center",
							gap: 1,
						}}
					>
						Configuración
					</Typography>
					<IconButton
						onClick={toggleTheme}
						size="medium"
						sx={{
							borderRadius: 2,
							bgcolor:
								mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
							"&:hover": {
								bgcolor:
									mode === "dark"
										? "rgba(255,255,255,0.08)"
										: "rgba(0,0,0,0.08)",
							},
						}}
					>
						{mode === "dark" ? (
							<Brightness7 fontSize="small" />
						) : (
							<Brightness4 fontSize="small" />
						)}
					</IconButton>
				</DialogTitle>

				<DialogContent sx={{ px: 3, py: 3, minHeight: 200 }}>
					{loading ? (
						<Box
							sx={{
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
								alignItems: "center",
								py: 6,
								gap: 2,
							}}
						>
							<CircularProgress
								size={32}
								thickness={5}
								sx={{ color: colors.terracotta }}
							/>
							<Typography variant="caption" color="text.secondary">
								Cargando perfil...
							</Typography>
						</Box>
					) : error ? (
						<Alert
							severity="error"
							variant="filled"
							sx={{ borderRadius: 2, mb: 2 }}
						>
							{error}
						</Alert>
					) : userProfile ? (
						<>
							<Stack spacing={4}>
								{/* Section 1: User Profile Summary */}
								<Box>
									<Typography
										variant="overline"
										color="text.secondary"
										sx={{
											fontSize: "0.7rem",
											fontWeight: 800,
											letterSpacing: "0.1em",
											mb: 2,
											display: "block",
											opacity: 0.7,
										}}
									>
										PERFIL DE USUARIO
									</Typography>

									<Box
										sx={{
											p: 2.5,
											borderRadius: 4,
											background:
												mode === "dark"
													? `linear-gradient(135deg, ${colors.darkSlate} 0%, #1A1C2E 100%)`
													: `linear-gradient(135deg, ${colors.cream} 0%, #FFFFFF 100%)`,
											border:
												mode === "dark"
													? "1px solid rgba(255,255,255,0.05)"
													: "1px solid rgba(0,0,0,0.05)",
											display: "flex",
											alignItems: "center",
											gap: 2,
											flexWrap: { xs: "wrap", sm: "nowrap" },
										}}
									>
										<Avatar
											sx={{
												width: 56,
												height: 56,
												bgcolor: colors.terracotta,
												fontWeight: "bold",
												boxShadow: "0 8px 16px rgba(214, 104, 78, 0.2)",
												border: "2px solid white",
											}}
										>
											{getInitials(userProfile.full_name, userProfile.email)}
										</Avatar>
										<Box sx={{ flex: 1, minWidth: 0 }}>
											<Typography
												variant="subtitle1"
												fontWeight="800"
												sx={{
													fontSize: "1rem",
													lineHeight: 1.2,
													mb: 0.25,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
												}}
											>
												{displayName}
											</Typography>
											<Typography
												variant="body2"
												color="text.secondary"
												sx={{
													fontSize: "0.85rem",
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap",
													opacity: 0.8,
												}}
											>
												{userProfile.email}
											</Typography>
										</Box>
									</Box>
								</Box>

								{/* Section 2: Account Management */}
								<Box>
									<Typography
										variant="overline"
										color="text.secondary"
										sx={{
											fontSize: "0.7rem",
											fontWeight: 800,
											letterSpacing: "0.1em",
											mb: 2,
											display: "block",
											opacity: 0.7,
										}}
									>
										GESTIÓN DE CUENTA
									</Typography>

									<Stack spacing={2}>
										<TextField
											fullWidth
											label="Nombre Completo"
											size="small"
											value={newName}
											onChange={(e) => setNewName(e.target.value)}
											InputProps={{
												startAdornment: (
													<InputAdornment position="start">
														<Person fontSize="small" sx={{ opacity: 0.6 }} />
													</InputAdornment>
												),
												endAdornment: (
													<InputAdornment position="end">
														<IconButton
															size="small"
															color="primary"
															onClick={handleUpdateName}
															disabled={
																updating === "name" ||
																newName === userProfile.full_name
															}
														>
															{updating === "name" ? (
																<CircularProgress size={16} />
															) : (
																<Save fontSize="small" />
															)}
														</IconButton>
													</InputAdornment>
												),
											}}
											sx={{
												"& .MuiOutlinedInput-root": {
													borderRadius: 2,
													bgcolor:
														mode === "dark"
															? "rgba(255,255,255,0.02)"
															: "rgba(0,0,0,0.02)",
												},
											}}
										/>

										<Button
											variant="outlined"
											fullWidth
											onClick={() => setShowSecurityModal(true)}
											startIcon={<Lock fontSize="small" />}
											sx={{
												borderRadius: 2,
												py: 1,
												textTransform: "none",
												fontWeight: "bold",
												borderColor:
													mode === "dark"
														? "rgba(255,255,255,0.1)"
														: "rgba(0,0,0,0.1)",
												color: "text.primary",
												"&:hover": {
													borderColor: colors.terracotta,
													bgcolor: "rgba(214, 104, 78, 0.05)",
												},
											}}
										>
											Cambiar Correo o Contraseña
										</Button>
									</Stack>
								</Box>

								{/* Section 3: Subscription Status */}
								<Box>
									<Typography
										variant="overline"
										color="text.secondary"
										sx={{
											fontSize: "0.7rem",
											fontWeight: 800,
											letterSpacing: "0.1em",
											mb: 2,
											display: "block",
											opacity: 0.7,
										}}
									>
										ESTADO DE SUSCRIPCIÓN
									</Typography>

									<Box
										sx={{
											p: 2.5,
											borderRadius: 4,
											bgcolor:
												mode === "dark"
													? "rgba(255,255,255,0.02)"
													: "rgba(0,0,0,0.02)",
											border:
												mode === "dark"
													? "1px solid rgba(255,255,255,0.05)"
													: "1px solid rgba(0,0,0,0.05)",
										}}
									>
										<Stack direction="row" spacing={2} sx={{ mb: 2.5 }}>
											<Box sx={{ flex: 1 }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 0.5,
														opacity: 0.6,
														mb: 0.5,
													}}
												>
													<CardMembership sx={{ fontSize: "0.85rem" }} />
													<Typography variant="caption" fontWeight="bold">
														PLAN
													</Typography>
												</Box>
												<Typography
													variant="body2"
													sx={{
														color: colors.terracotta,
														fontWeight: 800,
													}}
												>
													{planDisplay}
												</Typography>
											</Box>

											<Box sx={{ flex: 1 }}>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 0.5,
														opacity: 0.6,
														mb: 0.5,
													}}
												>
													<AccountBalanceWallet sx={{ fontSize: "0.85rem" }} />
													<Typography variant="caption" fontWeight="bold">
														CRÉDITOS
													</Typography>
												</Box>
												<Typography variant="body2" sx={{ fontWeight: 800 }}>
													{userProfile.credits_remaining}
												</Typography>
											</Box>
										</Stack>

										<Stack spacing={1}>
											<Button
												variant="contained"
												fullWidth
												disableElevation
												size="small"
												sx={{
													borderRadius: 2,
													py: 1,
													fontWeight: "bold",
													background: `linear-gradient(135deg, ${colors.terracotta} 0%, ${colors.deepOrange} 100%)`,
												}}
												onClick={() => setShowSubModal(true)}
											>
												Gestionar Suscripción
											</Button>

											{userProfile.plan_type !== "free" && (
												<Button
													variant="text"
													color="error"
													fullWidth
													size="small"
													sx={{
														py: 0.5,
														fontWeight: "bold",
														borderRadius: 2,
														fontSize: "0.75rem",
													}}
													onClick={() => setShowCancelDialog(true)}
												>
													Cancelar Suscripción
												</Button>
											)}
										</Stack>
									</Box>
								</Box>
							</Stack>

							<SubscriptionModal
								open={showSubModal}
								onClose={() => setShowSubModal(false)}
								userId={userProfile.id}
								userEmail={userProfile.email}
							/>

							<SecurityModal
								open={showSecurityModal}
								onClose={() => setShowSecurityModal(false)}
								userEmail={userProfile.email}
								mode={mode}
							/>
						</>
					) : null}
				</DialogContent>

				<DialogActions
					sx={{
						p: 3,
						bgcolor:
							mode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
						borderTop:
							mode === "dark"
								? "1px solid rgba(255,255,255,0.05)"
								: "1px solid rgba(0,0,0,0.05)",
						gap: 1.5,
					}}
				>
					{onLogout && (
						<Button
							onClick={() => {
								onClose();
								onLogout();
							}}
							variant="text"
							color="inherit"
							startIcon={<Logout />}
							sx={{
								borderRadius: 2,
								px: 2,
								fontWeight: "bold",
								opacity: 0.7,
								"&:hover": {
									opacity: 1,
									bgcolor: "rgba(255,0,0,0.05)",
									color: "error.main",
								},
							}}
						>
							Cerrar Sesión
						</Button>
					)}
					<Box sx={{ flexGrow: 1 }} />
					<Button
						onClick={onClose}
						variant="contained"
						disableElevation
						startIcon={<Close />}
						sx={{
							borderRadius: 2,
							px: 3,
							fontWeight: "bold",
							bgcolor:
								mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
							color: "text.primary",
							"&:hover": {
								bgcolor:
									mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
							},
						}}
					>
						Cerrar
					</Button>
				</DialogActions>
			</Dialog>

			{/* Cancellation Confirmation Dialog */}
			<Dialog
				open={showCancelDialog}
				onClose={() => !cancelling && setShowCancelDialog(false)}
				maxWidth="xs"
				fullWidth
				PaperProps={{
					sx: {
						borderRadius: 4,
						p: 0,
						overflow: "hidden",
						bgcolor: mode === "dark" ? "#1A1C2E" : "background.paper",
						boxShadow:
							mode === "dark"
								? "0 24px 48px rgba(0,0,0,0.8)"
								: "0 24px 48px rgba(61, 64, 91, 0.15)",
					},
				}}
			>
				<DialogTitle sx={{ px: 3, pt: 3, pb: 1, fontWeight: "bold" }}>
					¿Cancelar Suscripción?
				</DialogTitle>
				<DialogContent sx={{ px: 3, pb: 2 }}>
					<Alert
						severity="warning"
						variant="outlined"
						sx={{
							mb: 2,
							borderRadius: 2,
							border: "1px solid rgba(242, 204, 143, 0.5)",
							bgcolor:
								mode === "dark"
									? "rgba(242, 204, 143, 0.05)"
									: "rgba(242, 204, 143, 0.1)",
						}}
					>
						<AlertTitle sx={{ fontWeight: "bold" }}>Importante</AlertTitle>
						Al cancelar tu suscripción:
					</Alert>
					<Stack spacing={1.5}>
						{[
							{
								text: "Volverás al ",
								bold: "Plan Gratuito",
								extra: " con 3 créditos",
							},
							{
								text: "Tus pacientes y notas se mantendrán ",
								bold: "intactos",
							},
							{ text: "Podrás reactivar tu suscripción en cualquier momento" },
						].map((item, i) => (
							<Box
								key={i}
								sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
							>
								<Box
									sx={{
										mt: 0.8,
										width: 6,
										height: 6,
										borderRadius: "50%",
										bgcolor: colors.terracotta,
										flexShrink: 0,
									}}
								/>
								<Typography variant="body2" sx={{ opacity: 0.9 }}>
									{item.text}
									{item.bold && <strong>{item.bold}</strong>}
									{item.extra}
								</Typography>
							</Box>
						))}
						<Typography
							variant="caption"
							sx={{ color: "text.secondary", mt: 1, fontStyle: "italic" }}
						>
							* Si tienes una suscripción recurrente en MercadoPago, deberás
							cancelarla manualmente.
						</Typography>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 3, gap: 1 }}>
					<Button
						onClick={() => setShowCancelDialog(false)}
						disabled={cancelling}
						fullWidth
						variant="text"
						sx={{ borderRadius: 2, fontWeight: "bold" }}
					>
						Mantener
					</Button>
					<Button
						onClick={handleCancelSubscription}
						variant="contained"
						color="error"
						disabled={cancelling}
						fullWidth
						disableElevation
						sx={{
							borderRadius: 2,
							fontWeight: "bold",
							bgcolor: "error.main",
							"&:hover": { bgcolor: "error.dark" },
						}}
					>
						{cancelling ? "Cancelando..." : "Confirmar"}
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
