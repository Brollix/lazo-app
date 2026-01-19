import React, { useState } from "react";
import {
	Box,
	Typography,
	Button,
	Paper,
	TextField,
	Alert,
	Stack,
	CircularProgress,
} from "@mui/material";

interface PasswordRecoveryWithPhraseProps {
	onSuccess: (message: string) => void;
	onCancel: () => void;
}

export const PasswordRecoveryWithPhrase: React.FC<
	PasswordRecoveryWithPhraseProps
> = ({ onSuccess, onCancel }) => {
	const [email, setEmail] = useState("");
	const [phrase, setPhrase] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleRecovery = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setError("Las contraseñas no coinciden");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL || ""}/api/auth/recover-with-phrase`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						email,
						recoveryPhrase: phrase.trim().toLowerCase(),
						newPassword,
					}),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Error al recuperar la cuenta");
			}

			onSuccess(
				"Contraseña restablecida correctamente. Ya puedes iniciar sesión.",
			);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Paper
			elevation={3}
			sx={{
				p: 4,
				maxWidth: 500,
				mx: "auto",
				borderRadius: 3,
			}}
		>
			<Box sx={{ mb: 3, textAlign: "center" }}>
				<Typography
					variant="h5"
					color="secondary"
					gutterBottom
					sx={{ fontWeight: "bold" }}
				>
					Recuperar con Frase
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Ingresa tu correo y tu frase de 12 palabras para restablecer tu
					contraseña.
				</Typography>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			<form onSubmit={handleRecovery}>
				<Stack spacing={2}>
					<TextField
						fullWidth
						label="Correo Electrónico"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={loading}
					/>
					<TextField
						fullWidth
						label="Frase de Recuperación (12 palabras)"
						multiline
						rows={3}
						value={phrase}
						onChange={(e) => setPhrase(e.target.value)}
						required
						disabled={loading}
						placeholder="ej: word1 word2 word3 ..."
					/>
					<Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
						Asegúrate de que las palabras estén en orden y separadas por
						espacios.
					</Typography>

					<TextField
						fullWidth
						label="Nueva Contraseña"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						required
						disabled={loading}
					/>
					<TextField
						fullWidth
						label="Confirmar Nueva Contraseña"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						required
						disabled={loading}
					/>

					<Box sx={{ mt: 3, display: "flex", gap: 2 }}>
						<Button
							fullWidth
							variant="outlined"
							onClick={onCancel}
							disabled={loading}
						>
							Cancelar
						</Button>
						<Button
							fullWidth
							variant="contained"
							color="secondary"
							type="submit"
							disabled={loading}
						>
							{loading ?
								<CircularProgress size={24} color="inherit" />
							:	"Restablecer"}
						</Button>
					</Box>
				</Stack>
			</form>
		</Paper>
	);
};
