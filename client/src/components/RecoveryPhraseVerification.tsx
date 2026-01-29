import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Button,
	Paper,
	TextField,
	Alert,
	Stack,
} from "@mui/material";

interface RecoveryPhraseVerificationProps {
	phrase: string;
	onComplete: () => void;
	onBack: () => void;
}

export const RecoveryPhraseVerification: React.FC<
	RecoveryPhraseVerificationProps
> = ({ phrase, onComplete, onBack }) => {
	const words = phrase.split(" ");
	const [indices, setIndices] = useState<number[]>([]);
	const [userWords, setUserWords] = useState<Record<number, string>>({});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Pick 3 random unique indices
		const randomIndices: number[] = [];
		while (randomIndices.length < 3) {
			const r = Math.floor(Math.random() * 12);
			if (!randomIndices.includes(r)) {
				randomIndices.push(r);
			}
		}
		setIndices(randomIndices.sort((a, b) => a - b));
	}, []);

	const handleWordChange = (index: number, value: string) => {
		setUserWords((prev) => ({
			...prev,
			[index]: value.trim().toLowerCase(),
		}));
		setError(null);
	};

	const verify = () => {
		const isCorrect = indices.every(
			(idx) => userWords[idx] === words[idx].toLowerCase(),
		);

		if (isCorrect) {
			onComplete();
		} else {
			setError("Algunas palabras no coinciden. Por favor, verifica tu frase.");
		}
	};

	return (
		<Paper
			elevation={3}
			sx={{
				p: 4,
				maxWidth: 600,
				mx: "auto",
				borderRadius: 3,
			}}
		>
			<Box sx={{ mb: 3, textAlign: "center" }}>
				<Typography
					variant="h5"
					color="primary"
					gutterBottom
					sx={{ fontWeight: "bold" }}
				>
					Verificación de Frase
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Para asegurar que guardaste la frase correctamente, por favor ingresa
					las siguientes palabras:
				</Typography>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 3 }}>
					{error}
				</Alert>
			)}

			<Stack spacing={3} sx={{ mb: 4 }}>
				{indices.map((idx) => (
					<TextField
						key={idx}
						label={`Palabra número ${idx + 1}`}
						variant="outlined"
						fullWidth
						value={userWords[idx] || ""}
						onChange={(e) => handleWordChange(idx, e.target.value)}
						placeholder={`Ingresa la palabra ${idx + 1}`}
						autoComplete="off"
					/>
				))}
			</Stack>

			<Stack direction="row" spacing={2}>
				<Button fullWidth variant="outlined" size="large" onClick={onBack}>
					Volver a ver frase
				</Button>
				<Button
					fullWidth
					variant="contained"
					size="large"
					onClick={verify}
					disabled={indices.some((idx) => !userWords[idx])}
				>
					Verificar y Finalizar
				</Button>
			</Stack>
		</Paper>
	);
};
