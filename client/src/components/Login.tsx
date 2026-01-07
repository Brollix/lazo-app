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
		setLoading(true);
		setError(null);

		try {
			if (isSignUp) {
				// Security checks removed for testing purposes
				// TODO: Re-enable validations for production

				const { data, error } = await supabase.auth.signUp({
					email,
					password,
				});

				if (error) throw error;

				// Save full name to profiles table
				if (data.user) {
					const { error: profileError } = await supabase
						.from("profiles")
						.update({ full_name: fullName.trim() })
						.eq("id", data.user.id);

					if (profileError) {
						console.error("Error saving full name:", profileError);
					}
				}

				// Automatically login or set key if auto-login happens
				EncryptionService.setKey(password);

				alert(
					"Registro exitoso! Por favor verifica tu correo o inicia sesión."
				);
				setIsSignUp(false);
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password,
				});

				if (error) throw error;

				// Success feedback
				setSuccess("¡Bienvenido! Iniciando sesión...");
				setLoading(true); // Keep loading state during transition

				// Store encryption key
				EncryptionService.setKey(password);

				// Wait a bit to show success message before redirecting
				setTimeout(() => {
					onLogin();
				}, 1500);
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
						sx={{ mb: 2, textAlign: "left" }}
						action={
							error.includes("crea una") ? (
								<Button
									color="inherit"
									size="small"
									onClick={() => {
										setIsSignUp(true);
										setError(null);
										setPassword("");
										setConfirmPassword("");
										setFullName("");
									}}
								>
									REGISTRARSE
								</Button>
							) : null
						}
					>
						{error}
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
