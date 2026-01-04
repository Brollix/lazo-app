import React, { useState } from "react";
import { Box, Typography, TextField, Button, Paper } from "@mui/material";
// import { createClient } from "@supabase/supabase-js";
import { colors } from "../styles.theme";

// Placeholder Supabase init - usually done in a service
// const supabaseUrl =
// 	import.meta.env.VITE_SUPABASE_URL || "https://example.supabase.co";
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder";
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Login attempt", email);
		// const { error } = await supabase.auth.signInWithPassword({ email, password });
		// if (!error) onLogin();
		onLogin(); // Bypass for scaffold demo
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
