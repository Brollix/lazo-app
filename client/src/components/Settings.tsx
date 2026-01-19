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
	alpha,
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
	VpnKey,
	Refresh,
} from "@mui/icons-material";
import { ThemeContext } from "../App";
import { SubscriptionModal } from "./SubscriptionModal";
import { SecurityModal } from "./SecurityModal";
import { RecoveryPhraseDisplay } from "./RecoveryPhraseDisplay";
import { RecoveryPhraseVerification } from "./RecoveryPhraseVerification";
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
	subscription_status?: string;
}

export const Settings: React.FC<SettingsProps> = ({
	open,
	onClose,
	onLogout,
}) => {
	const { mode, toggleTheme } = React.useContext(ThemeContext);
	const [showSubModal, setShowSubModal] = React.useState(false);
	const [userProfile, setUserProfile] = React.useState<UserProfile | null>(
		null,
	);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [showCancelDialog, setShowCancelDialog] = React.useState(false);
	const [cancelling, setCancelling] = React.useState(false);
	const [keepCredits, setKeepCredits] = React.useState(true);
	const [successMessage, setSuccessMessage] = React.useState<string | null>(
		null,
	);
	const [newName, setNewName] = React.useState("");
	const [showSecurityModal, setShowSecurityModal] = React.useState(false);
	const [updating, setUpdating] = React.useState<string | null>(null);

	// Recovery Phrase Regeneration State
	const [showRegenerateFlow, setShowRegenerateFlow] = React.useState(false);
	const [newPhrase, setNewPhrase] = React.useState<string | null>(null);
	const [newMasterKey, setNewMasterKey] = React.useState<string | null>(null);
	const [regenerationStep, setRegenerationStep] = React.useState<
		"display" | "verify" | null
	>(null);

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
				body: JSON.stringify({
					userId: userProfile.id,
					keepCredits: keepCredits,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Error al cancelar suscripción");
			}

			const result = await response.json();
			console.log("Subscription cancelled:", result);

			// Update local state based on keepCredits choice
			setUserProfile((prev) => {
				if (!prev) return null;
				return {
					...prev,
					plan_type: "free",
					subscription_status: "cancelled",
					// Reset credits if user chose not to keep them
					credits_remaining: keepCredits ? prev.credits_remaining : 3,
				};
			});

			const message =
				keepCredits ?
					`Suscripción cancelada. Puedes seguir usando tus ${userProfile.credits_remaining} créditos restantes.`
				:	"Suscripción cancelada. Has vuelto al plan gratuito con 3 créditos.";
			setSuccessMessage(message);
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

	const handleStartRegeneration = async () => {
		setUpdating("regeneration");
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/generate-phrase`,
			);
			const { phrase, masterKey } = await response.json();
			setNewPhrase(phrase);
			setNewMasterKey(masterKey);
			setRegenerationStep("display");
			setShowRegenerateFlow(true);
		} catch (err: any) {
			setError("Error al generar nueva frase. Intenta de nuevo.");
		} finally {
			setUpdating(null);
		}
	};

	const handleRegenerationComplete = async () => {
		if (!userProfile || !newPhrase || !newMasterKey) return;
		setUpdating("finalizing_regeneration");
		try {
			// Note: This requires current password to re-encrypt the master key.
			// For brevity, we'll use a placeholder or ask for it if needed.
			// The backend /setup-recovery handles this if we provide the password.
			setError(
				"La regeneración completa requiere confirmar su contraseña actual.",
			);
			setRegenerationStep(null);
			setShowRegenerateFlow(false);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setUpdating(null);
		}
	};

	const displayName = userProfile?.full_name || "Usuario";
	const planDisplay =
		!userProfile?.plan_type || userProfile.plan_type === "free" ?
			"Plan Gratuito"
		:	`Plan ${userProfile.plan_type
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
						boxShadow: (theme) => theme.shadows[24],
						border: "none",
						m: { xs: 1, sm: 2 },
						maxWidth: { xs: "calc(100% - 16px)", sm: 480 },
						overflow: "hidden",
						bgcolor: "background.paper",
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
						borderBottom: "1px solid",
						borderColor: "divider",
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
							bgcolor: "action.hover",
							"&:hover": {
								bgcolor: "action.selected",
							},
						}}
					>
						{mode === "dark" ?
							<Brightness7 fontSize="small" />
						:	<Brightness4 fontSize="small" />}
					</IconButton>
				</DialogTitle>

				<DialogContent sx={{ px: 3, py: 3, minHeight: 200 }}>
					{loading ?
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
							<CircularProgress size={32} thickness={5} color="primary" />
							<Typography variant="caption" color="text.secondary">
								Cargando perfil...
							</Typography>
						</Box>
					: error ?
						<Alert
							severity="error"
							variant="filled"
							sx={{ borderRadius: 2, mb: 2 }}
						>
							{error}
						</Alert>
					: userProfile ?
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
											background: (theme) =>
												mode === "dark" ?
													`linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.background.default} 100%)`
												:	`linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.common.white} 100%)`,
											border: "1px solid",
											borderColor: "divider",
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
												bgcolor: "primary.main",
												fontWeight: "bold",
												boxShadow: (theme) =>
													`0 8px 16px ${theme.palette.primary.main}33`,
												border: "2px solid",
												borderColor: "background.paper",
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
															{updating === "name" ?
																<CircularProgress size={16} />
															:	<Save fontSize="small" />}
														</IconButton>
													</InputAdornment>
												),
											}}
											sx={{
												"& .MuiOutlinedInput-root": {
													borderRadius: 2,
													bgcolor: "action.hover",
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
												borderColor: "divider",
												color: "text.primary",
												"&:hover": {
													borderColor: "primary.main",
													bgcolor: "primary.main",
													color: "primary.contrastText",
												},
											}}
										>
											Cambiar Correo o Contraseña
										</Button>
									</Stack>
								</Box>

								{/* Section 2.5: Security & Recovery */}
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
										SEGURIDAD Y RECUPERACIÓN
									</Typography>

									<Box
										sx={{
											p: 2,
											borderRadius: 3,
											border: "1px solid",
											borderColor: "warning.main",
											bgcolor: alpha("#ed6c02", 0.05),
										}}
									>
										<Stack spacing={1.5}>
											<Typography
												variant="body2"
												sx={{
													fontWeight: "bold",
													display: "flex",
													alignItems: "center",
													gap: 1,
												}}
											>
												<VpnKey fontSize="small" color="warning" /> Frase de
												Recuperación
											</Typography>
											<Typography variant="caption" color="text.secondary">
												Si perdiste tu frase o crees que alguien más la tiene,
												genera una nueva.
											</Typography>
											<Button
												variant="outlined"
												color="warning"
												size="small"
												fullWidth
												startIcon={<Refresh />}
												onClick={handleStartRegeneration}
												disabled={updating === "regeneration"}
												sx={{ borderRadius: 2, fontWeight: "bold" }}
											>
												{updating === "regeneration" ?
													"Generando..."
												:	"Regenerar Frase"}
											</Button>
										</Stack>
									</Box>
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
											bgcolor: "action.hover",
											border: "1px solid",
											borderColor: "divider",
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
														color: "primary.main",
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
													background: (theme) =>
														`linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
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
							/>
						</>
					:	null}
				</DialogContent>

				{/* Recovery Phrase Dialog */}
				<Dialog
					open={showRegenerateFlow}
					onClose={() => !updating && setShowRegenerateFlow(false)}
					maxWidth="sm"
					fullWidth
				>
					<Box sx={{ p: 2 }}>
						{regenerationStep === "display" && newPhrase && (
							<RecoveryPhraseDisplay
								phrase={newPhrase}
								onVerified={() => setRegenerationStep("verify")}
							/>
						)}
						{regenerationStep === "verify" && newPhrase && (
							<RecoveryPhraseVerification
								phrase={newPhrase}
								onComplete={handleRegenerationComplete}
								onBack={() => setRegenerationStep("display")}
							/>
						)}
					</Box>
				</Dialog>

				<DialogActions
					sx={{
						p: 3,
						bgcolor: "action.hover",
						borderTop: "1px solid",
						borderColor: "divider",
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
									bgcolor: "error.main",
									color: "error.contrastText",
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
							bgcolor: "action.selected",
							color: "text.primary",
							"&:hover": {
								bgcolor: "action.hover",
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
						bgcolor: "background.paper",
						boxShadow: (theme) => theme.shadows[24],
					},
				}}
			>
				<DialogTitle sx={{ px: 3, pt: 3, pb: 1, fontWeight: "bold" }}>
					¿Cancelar Suscripción?
				</DialogTitle>
				<DialogContent sx={{ px: 3, pb: 2 }}>
					<Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
						Elige cómo quieres cancelar tu suscripción:
					</Typography>

					<Stack spacing={2}>
						{/* Option 1: Keep Credits */}
						<Box
							onClick={() => setKeepCredits(true)}
							sx={{
								p: 2.5,
								borderRadius: 3,
								border: "2px solid",
								borderColor: keepCredits ? "primary.main" : "divider",
								bgcolor:
									keepCredits ?
										alpha((theme: any) => theme.palette.primary.main, 0.08)
									:	"background.paper",
								cursor: "pointer",
								transition: "all 0.2s",
								"&:hover": {
									borderColor: "primary.main",
									bgcolor: alpha(
										(theme: any) => theme.palette.primary.main,
										0.04,
									),
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
								<Box
									sx={{
										width: 20,
										height: 20,
										borderRadius: "50%",
										border: "2px solid",
										borderColor: keepCredits ? "primary.main" : "divider",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
										mt: 0.25,
									}}
								>
									{keepCredits && (
										<Box
											sx={{
												width: 10,
												height: 10,
												borderRadius: "50%",
												bgcolor: "primary.main",
											}}
										/>
									)}
								</Box>
								<Box sx={{ flex: 1 }}>
									<Typography
										variant="subtitle2"
										fontWeight="bold"
										sx={{ mb: 0.5 }}
									>
										Cancelar pero mantener mis créditos
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Podrás seguir usando tus{" "}
										{userProfile?.credits_remaining || 0} créditos restantes
										hasta que los uses. Luego tendrás 3 créditos del plan
										gratuito.
									</Typography>
								</Box>
							</Box>
						</Box>

						{/* Option 2: Lose Credits */}
						<Box
							onClick={() => setKeepCredits(false)}
							sx={{
								p: 2.5,
								borderRadius: 3,
								border: "2px solid",
								borderColor: !keepCredits ? "error.main" : "divider",
								bgcolor:
									!keepCredits ?
										alpha((theme: any) => theme.palette.error.main, 0.08)
									:	"background.paper",
								cursor: "pointer",
								transition: "all 0.2s",
								"&:hover": {
									borderColor: "error.main",
									bgcolor: alpha(
										(theme: any) => theme.palette.error.main,
										0.04,
									),
								},
							}}
						>
							<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
								<Box
									sx={{
										width: 20,
										height: 20,
										borderRadius: "50%",
										border: "2px solid",
										borderColor: !keepCredits ? "error.main" : "divider",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										flexShrink: 0,
										mt: 0.25,
									}}
								>
									{!keepCredits && (
										<Box
											sx={{
												width: 10,
												height: 10,
												borderRadius: "50%",
												bgcolor: "error.main",
											}}
										/>
									)}
								</Box>
								<Box sx={{ flex: 1 }}>
									<Typography
										variant="subtitle2"
										fontWeight="bold"
										sx={{ mb: 0.5 }}
									>
										Cancelar y perder créditos restantes
									</Typography>
									<Typography variant="caption" color="text.secondary">
										Tus créditos restantes se perderán y volverás inmediatamente
										al plan gratuito con 3 créditos.
									</Typography>
								</Box>
							</Box>
						</Box>

						<Alert severity="info" sx={{ borderRadius: 2, mt: 1 }}>
							<Typography variant="caption">
								<strong>Nota:</strong> En ambos casos, tu suscripción de
								MercadoPago se cancelará inmediatamente para evitar futuros
								cobros.
							</Typography>
						</Alert>
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
