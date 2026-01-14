import React, { useState } from "react";
import {
	Box,
	Typography,
	TextField,
	Button,
	Paper,
	Link,
	Alert,
	CircularProgress,
} from "@mui/material";
import { supabase } from "../supabaseClient";
import { EncryptionService } from "../services/encryptionService";

export const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [fullName, setFullName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log("handleAuth called, isSignUp:", isSignUp);
		setLoading(true);
		setError(null);

		try {
			if (isSignUp) {
				// Security checks removed for testing purposes
				// TODO: Re-enable validations for production

				console.log("Creating account for:", email);
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							full_name: fullName.trim(),
						},
					},
				});

				if (error) throw error;

				console.log("Account created, updating profile with full name...");

				// Save full name to profiles table
				if (data.user) {
					const { error: profileError } = await supabase
						.from("profiles")
						.update({ full_name: fullName.trim() })
						.eq("id", data.user.id);

					if (profileError) {
						console.error("Error saving full name:", profileError);
					} else {
						console.log("Full name saved successfully");
					}
				}

				// Sign out the user to force them to login manually
				await supabase.auth.signOut();

				setSuccess(
					"Registro exitoso! Por favor verifica tu correo e inicia sesión con tu contraseña."
				);

				// Clear form and switch to login view
				setPassword("");
				setConfirmPassword("");
				setFullName("");
				setIsSignUp(false);
			} else {
				// Attempt login first
				console.log("Attempting login for:", email);

				const { data: authData, error } =
					await supabase.auth.signInWithPassword({
						email,
						password,
					});

				if (error) throw error;

				console.log("Login successful, checking profile...");

				// After successful login, check if profile exists
				if (authData.user) {
					const { data: profile, error: profileError } = await supabase
						.from("profiles")
						.select("id, email, plan_type, credits_remaining")
						.eq("id", authData.user.id)
						.maybeSingle();

					console.log("Profile check result:", { profile, profileError });

					// If profile doesn't exist, create it (this handles the case where the trigger didn't run)
					if (!profile && !profileError) {
						console.log("Profile not found, creating one...");
						const { error: insertError } = await supabase
							.from("profiles")
							.insert({
								id: authData.user.id,
								email: authData.user.email,
								plan_type: "free",
								credits_remaining: 3,
							});

						if (insertError) {
							console.error("Error creating profile:", insertError);
							// Don't block login, just log the error
						}
					}
				}

				// Success feedback
				console.log("Login successful, redirecting...");
				setSuccess("¡Bienvenido! Iniciando sesión...");

				// Store encryption key
				EncryptionService.setKey(password);

				// Wait a bit to show success message before redirecting
				setTimeout(() => {
					onLogin();
				}, 500);

				// Don't set loading to false in finally block for successful login
				return;
			}
		} catch (err: any) {
			console.error("Auth error:", err);
			if (
				err.message === "Invalid login credentials" ||
				err.code === "invalid_credentials"
			) {
				// Check if the user exists to give better feedback
				try {
					const { data: exists, error: rpcError } = await supabase.rpc(
						"check_user_exists",
						{
							email_to_check: email,
						}
					);

					if (rpcError) throw rpcError;

					if (exists) {
						setError("Contraseña incorrecta. Por favor intentalo de nuevo.");
					} else {
						setError("La cuenta no existe. Por favor, crea una para comenzar.");
					}
				} catch (rpcErr) {
					console.error("Error checking user existence:", rpcErr);
					setError("La cuenta no existe o el correo es inválido.");
				}
			} else {
				setError(err.message || "Ha ocurrido un error");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				height: "100vh",
				width: "100vw",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: (theme) =>
					`linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
				px: { xs: 2, sm: 0 }, // Add horizontal padding on mobile
			}}
		>
			<Paper
				elevation={3}
				sx={{
					p: { xs: 3, sm: 4, md: 6 }, // Responsive padding
					width: "100%",
					maxWidth: { xs: "100%", sm: 400 }, // Responsive width
					borderRadius: 4,
					textAlign: "center",
				}}
			>
				{/* Brand Section */}
				<Box sx={{ mb: { xs: 3, md: 4 } }}>
					<Typography
						variant="h2"
						color="primary"
						sx={{
							mb: 1,
							fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" }, // Responsive font size
						}}
					>
						lazo
					</Typography>
					<Typography
						variant="body1"
						color="text.secondary"
						sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
					>
						Tu soporte clínico inteligente.
					</Typography>
				</Box>

				{error && (
					<Alert
						severity="error"
						variant="filled"
						sx={{
							mb: 2,
							textAlign: "center",
							borderRadius: 1,
							fontSize: { xs: "0.875rem", sm: "0.95rem" },
							py: { xs: 1.5, sm: 2 },
							"& .MuiAlert-icon": {
								display: "none",
							},
							"& .MuiAlert-message": {
								width: "100%",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: 1.5,
								padding: 0,
							},
						}}
					>
						<Box>{error}</Box>
						{error.includes("crea una") && (
							<Button
								variant="contained"
								size="small"
								onClick={() => {
									setIsSignUp(true);
									setError(null);
									setPassword("");
									setConfirmPassword("");
									setFullName("");
								}}
								sx={{
									bgcolor: "background.paper",
									color: "error.main",
									fontWeight: (theme) => theme.typography.button.fontWeight,
									px: 2.5,
									py: 0.75,
									fontSize: { xs: "0.8rem", sm: "0.875rem" },
									"&:hover": {
										bgcolor: "action.hover",
									},
								}}
							>
								CREAR CUENTA
							</Button>
						)}
					</Alert>
				)}

				{success && (
					<Alert
						severity="success"
						variant="filled"
						sx={{ mb: 2, textAlign: "left" }}
					>
						{success}
					</Alert>
				)}

				<form onSubmit={handleAuth}>
					{isSignUp && (
						<TextField
							fullWidth
							label="Nombre Completo"
							variant="outlined"
							margin="normal"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							disabled={loading}
							autoComplete="name"
						/>
					)}
					<TextField
						fullWidth
						label="Correo"
						type="text"
						variant="outlined"
						margin="normal"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={loading}
						inputProps={{
							autoComplete: "email",
						}}
					/>
					<TextField
						fullWidth
						label="Contraseña"
						type="password"
						variant="outlined"
						margin="normal"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						disabled={loading}
					/>

					{isSignUp && (
						<TextField
							fullWidth
							label="Confirmar Contraseña"
							type="password"
							variant="outlined"
							margin="normal"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							disabled={loading}
							error={password !== confirmPassword && confirmPassword !== ""}
							helperText={
								password !== confirmPassword && confirmPassword !== ""
									? "Las contraseñas no coinciden"
									: ""
							}
						/>
					)}

					<Button
						fullWidth
						variant="contained"
						size="large"
						type="submit"
						disabled={loading}
						sx={{
							mt: { xs: 3, md: 4 },
							py: { xs: 1.2, md: 1.5 },
							fontSize: { xs: "1rem", md: "1.1rem" },
						}}
					>
						{loading ? (
							<CircularProgress size={24} color="inherit" />
						) : isSignUp ? (
							"Crear Cuenta"
						) : (
							"Ingresar"
						)}
					</Button>
				</form>

				<Box sx={{ mt: 3 }}>
					<Link
						component="button"
						variant="body2"
						onClick={() => {
							setIsSignUp(!isSignUp);
							setError(null);
							setPassword("");
							setConfirmPassword("");
							setFullName("");
						}}
						disabled={loading}
					>
						{isSignUp
							? "¿Ya tienes una cuenta? Inicia sesión"
							: "¿No tienes cuenta? Regístrate"}
					</Link>
				</Box>
			</Paper>
		</Box>
	);
};
