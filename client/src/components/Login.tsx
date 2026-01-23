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
	Dialog,
} from "@mui/material";
import { supabase } from "../supabaseClient";
import { useEncryption } from "../hooks/useEncryption";
import { EncryptionService } from "../services/encryptionService";
import { RecoveryPhraseDisplay } from "./RecoveryPhraseDisplay";
import { RecoveryPhraseVerification } from "./RecoveryPhraseVerification";
import { PasswordRecoveryWithPhrase } from "./PasswordRecoveryWithPhrase";

export const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
	const encryption = useEncryption();
	const [isSignUp, setIsSignUp] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [fullName, setFullName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Recovery Phrase Flow State
	const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
	const [tempMasterKey, setTempMasterKey] = useState<string | null>(null);
	const [tempUserId, setTempUserId] = useState<string | null>(null);
	const [step, setStep] = useState<"auth" | "display" | "verify">("auth");
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			if (isSignUp) {
				if (password !== confirmPassword) {
					throw new Error("Las contraseñas no coinciden");
				}

				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: { full_name: fullName.trim() },
					},
				});

				if (error) throw error;
				if (!data.user) throw new Error("Error al crear la cuenta");

				// Generate recovery phrase and master key
				const response = await fetch(
					`${import.meta.env.VITE_API_URL || ""}/api/auth/generate-phrase`,
				);

				if (!response.ok) {
					throw new Error(
						"Error al generar la frase de recuperación. Intenta nuevamente.",
					);
				}

				const { phrase, masterKey } = await response.json();

				setRecoveryPhrase(phrase);
				setTempMasterKey(masterKey);
				setTempUserId(data.user.id);
				setStep("display");
			} else {
				const { data: authData, error } =
					await supabase.auth.signInWithPassword({
						email,
						password,
					});

				if (error) throw error;
				if (!authData.user) throw new Error("Error al iniciar sesión");

				// Get profile to check for master key / migration
				const { data: profile } = await supabase
					.from("profiles")
					.select("*")
					.eq("id", authData.user.id)
					.single();

				if (!profile) throw new Error("Perfil no encontrado");

				let currentMasterKey = "";

				if (profile.master_key_encrypted && profile.encryption_salt) {
					// MODERN USER: Decrypt master key using password
					try {
						const encryptedObj = JSON.parse(profile.master_key_encrypted);
						// Decrypt using the hook's decrypt function
						currentMasterKey = await encryption.decrypt(
							encryptedObj.password,
							profile.encryption_salt,
						);
					} catch (e) {
						console.error("Master key decryption failed:", e);
						throw new Error(
							"Error al desencriptar la llave maestra. Verifica tu contraseña.",
						);
					}
				} else {
					// LEGACY USER: Needs migration (handled in Dashboard or later)
					console.log("Legacy user detected. Migration needed.");
				}

				EncryptionService.setPassword(password);
				if (currentMasterKey) EncryptionService.setMasterKey(currentMasterKey);

				onLogin();
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleRecoverySetupComplete = async () => {
		setLoading(true);
		try {
			const salt = encryption.generateSalt();
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/setup-recovery`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: tempUserId,
						masterKey: tempMasterKey,
						password,
						recoveryPhrase,
						salt,
					}),
				},
			);

			if (!response.ok)
				throw new Error("Error al guardar la configuración de recuperación");

			// Update salt in profile (since setup-recovery handles the rest)
			await supabase
				.from("profiles")
				.update({ encryption_salt: salt })
				.eq("id", tempUserId);

			await supabase.auth.signOut();
			setStep("auth");
			setIsSignUp(false);
			setSuccess("¡Cuenta configurada! Verifica tu correo e inicia sesión.");
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (step === "display" && recoveryPhrase) {
		return (
			<Box sx={{ p: 4 }}>
				<RecoveryPhraseDisplay
					phrase={recoveryPhrase}
					onVerified={() => setStep("verify")}
				/>
			</Box>
		);
	}

	if (step === "verify" && recoveryPhrase) {
		return (
			<Box sx={{ p: 4 }}>
				<RecoveryPhraseVerification
					phrase={recoveryPhrase}
					onComplete={handleRecoverySetupComplete}
					onBack={() => setStep("display")}
				/>
				{loading && (
					<CircularProgress sx={{ display: "block", mx: "auto", mt: 2 }} />
				)}
			</Box>
		);
	}

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
				px: { xs: 2, sm: 0 },
			}}
		>
			<Paper
				elevation={3}
				sx={{
					p: { xs: 3, sm: 4, md: 6 },
					width: "100%",
					maxWidth: { xs: "100%", sm: 400 },
					borderRadius: 4,
					textAlign: "center",
				}}
			>
				<Typography
					variant="h2"
					color="primary"
					sx={{ mb: 1, fontWeight: "bold" }}
				>
					lazo
				</Typography>
				<Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
					Tu soporte clínico inteligente.
				</Typography>

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}
				{success && (
					<Alert severity="success" sx={{ mb: 2 }}>
						{success}
					</Alert>
				)}

				<form onSubmit={handleAuth}>
					{isSignUp && (
						<TextField
							fullWidth
							label="Nombre"
							margin="normal"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							disabled={loading}
						/>
					)}
					<TextField
						fullWidth
						label="Correo"
						margin="normal"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={loading}
					/>
					<TextField
						fullWidth
						label="Contraseña"
						type="password"
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
							margin="normal"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							disabled={loading}
						/>
					)}

					<Button
						fullWidth
						variant="contained"
						size="large"
						type="submit"
						disabled={loading}
						sx={{ mt: 3, py: 1.5 }}
					>
						{loading ?
							<CircularProgress size={24} color="inherit" />
						: isSignUp ?
							"Crear Cuenta"
						:	"Ingresar"}
					</Button>
				</form>

				<Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1 }}>
					<Link
						component="button"
						variant="body2"
						onClick={() => {
							setIsSignUp(!isSignUp);
							setError(null);
						}}
					>
						{isSignUp ?
							"¿Ya tienes una cuenta? Inicia sesión"
						:	"¿No tienes cuenta? Regístrate"}
					</Link>
					{!isSignUp && (
						<Link
							component="button"
							variant="body2"
							onClick={() => setShowRecoveryDialog(true)}
						>
							¿Olvidaste tu contraseña?
						</Link>
					)}
				</Box>
			</Paper>

			<Dialog
				open={showRecoveryDialog}
				onClose={() => setShowRecoveryDialog(false)}
			>
				<Box sx={{ p: 2 }}>
					<PasswordRecoveryWithPhrase
						onSuccess={(msg) => {
							setShowRecoveryDialog(false);
							setSuccess(msg);
						}}
						onCancel={() => setShowRecoveryDialog(false)}
					/>
				</Box>
			</Dialog>
		</Box>
	);
};
