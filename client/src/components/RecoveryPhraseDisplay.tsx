import React, { useState } from "react";
import {
	Box,
	Typography,
	Button,
	Paper,
	Grid,
	IconButton,
	Tooltip,
	Alert,
	Checkbox,
	FormControlLabel,
	Stack,
} from "@mui/material";
import {
	ContentCopy,
	Download,
	Print,
	Visibility,
	VisibilityOff,
	Info,
	Warning,
} from "@mui/icons-material";

interface RecoveryPhraseDisplayProps {
	phrase: string;
	onVerified: () => void;
}

export const RecoveryPhraseDisplay: React.FC<RecoveryPhraseDisplayProps> = ({
	phrase,
	onVerified,
}) => {
	const [showPhrase, setShowPhrase] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const words = phrase.split(" ");

	const copyToClipboard = () => {
		navigator.clipboard.writeText(phrase);
	};

	const downloadAsFile = () => {
		const element = document.createElement("a");
		const file = new Blob(
			[
				`FRASE DE RECUPERACIÓN LAZO\n\n${phrase}\n\nGuarda esta frase en un lugar seguro. Si la pierdes, no podrás recuperar tus datos si olvidas tu contraseña.`,
			],
			{
				type: "text/plain",
			},
		);
		element.href = URL.createObjectURL(file);
		element.download = "lazo-recovery-phrase.txt";
		document.body.appendChild(element);
		element.click();
	};

	const printPhrase = () => {
		window.print();
	};

	return (
		<Paper
			elevation={3}
			sx={{
				p: 4,
				maxWidth: 600,
				mx: "auto",
				borderRadius: 3,
				bgcolor: "background.paper",
			}}
		>
			<Box sx={{ mb: 3, textAlign: "center" }}>
				<Typography
					variant="h5"
					color="primary"
					gutterBottom
					sx={{ fontWeight: "bold" }}
				>
					Tu Frase de Recuperación
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Esta frase de 12 palabras es la única forma de recuperar tus datos si
					olvidas tu contraseña.
				</Typography>
			</Box>

			<Alert
				severity="warning"
				icon={<Warning />}
				sx={{ mb: 3, "& .MuiAlert-message": { fontWeight: "bold" } }}
			>
				NUNCA la compartas con nadie. Los empleados de Lazo jamás te la pedirán.
			</Alert>

			<Box
				sx={{
					position: "relative",
					p: 3,
					bgcolor: "action.hover",
					borderRadius: 2,
					mb: 3,
					minHeight: 120,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{!showPhrase && (
					<Box
						sx={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							bgcolor: "rgba(255, 255, 255, 0.8)",
							zIndex: 1,
							borderRadius: 2,
							backdropFilter: "blur(4px)",
						}}
					>
						<Button
							variant="contained"
							startIcon={<Visibility />}
							onClick={() => setShowPhrase(true)}
						>
							Mostrar Frase
						</Button>
					</Box>
				)}

				<Grid container spacing={2}>
					{words.map((word, index) => (
						<Grid item xs={4} key={index}>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									p: 1,
									bgcolor: "background.paper",
									borderRadius: 1,
									boxShadow: 1,
								}}
							>
								<Typography
									variant="caption"
									sx={{ mr: 1, color: "text.disabled", minWidth: 20 }}
								>
									{index + 1}.
								</Typography>
								<Typography
									variant="body1"
									sx={{ fontWeight: "medium", fontFamily: "monospace" }}
								>
									{word}
								</Typography>
							</Box>
						</Grid>
					))}
				</Grid>

				{showPhrase && (
					<IconButton
						size="small"
						onClick={() => setShowPhrase(false)}
						sx={{ position: "absolute", top: 8, right: 8 }}
					>
						<VisibilityOff />
					</IconButton>
				)}
			</Box>

			<Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
				<Tooltip title="Copiar al portapapeles">
					<Button
						startIcon={<ContentCopy />}
						onClick={copyToClipboard}
						size="small"
					>
						Copiar
					</Button>
				</Tooltip>
				<Tooltip title="Descargar como archivo .txt">
					<Button
						startIcon={<Download />}
						onClick={downloadAsFile}
						size="small"
					>
						Descargar
					</Button>
				</Tooltip>
				<Tooltip title="Imprimir">
					<Button startIcon={<Print />} onClick={printPhrase} size="small">
						Imprimir
					</Button>
				</Tooltip>
			</Stack>

			<Box sx={{ p: 2, bgcolor: "info.lighter", borderRadius: 2, mb: 3 }}>
				<Stack direction="row" spacing={1} alignItems="flex-start">
					<Info color="info" sx={{ mt: 0.3 }} />
					<Typography variant="body2" color="info.main">
						Te recomendamos guardarla en un gestor de contraseñas o escribirla
						en papel y guardarla bajo llave.
					</Typography>
				</Stack>
			</Box>

			<FormControlLabel
				control={
					<Checkbox
						checked={confirmed}
						onChange={(e) => setConfirmed(e.target.checked)}
						color="primary"
					/>
				}
				label={
					<Typography variant="body2" sx={{ fontWeight: "bold" }}>
						Confirmo que he guardado mi frase de recuperación en un lugar
						seguro.
					</Typography>
				}
				sx={{ mb: 3, display: "block" }}
			/>

			<Button
				fullWidth
				variant="contained"
				size="large"
				disabled={!confirmed}
				onClick={onVerified}
				sx={{ py: 1.5 }}
			>
				Continuar
			</Button>
		</Paper>
	);
};
