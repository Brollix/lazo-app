import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper } from "@mui/material";

export const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		// Auth logic should go here
		onLogin();
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
			}}
		>
			<Paper
				elevation={3}
				sx={{
					p: 6,
					width: 400,
					borderRadius: 4,
					textAlign: "center",
				}}
			>
				{/* Brand Section */}
				<Box sx={{ mb: 4 }}>
					<Typography variant="h2" color="primary" sx={{ mb: 1 }}>
						lazo
					</Typography>
					<Typography variant="body1" color="text.secondary">
						Tu soporte clínico inteligente.
					</Typography>
				</Box>

				<form onSubmit={handleLogin}>
					<TextField
						fullWidth
						label="Correo"
						variant="outlined"
						margin="normal"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
					/>
					<TextField
						fullWidth
						label="Contraseña"
						type="password"
						variant="outlined"
						margin="normal"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<Button
						fullWidth
						variant="contained"
						size="large"
						type="submit"
						sx={{ mt: 4, py: 1.5, fontSize: "1.1rem" }}
					>
						Ingresar
					</Button>
				</form>
			</Paper>
		</Box>
	);
};
