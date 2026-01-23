import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	Button,
	Stepper,
	Step,
	StepLabel,
	Paper,
	Stack,
	IconButton,
} from "@mui/material";
import {
	Lock as LockIcon,
	Mic as MicIcon,
	Psychology as PsychologyIcon,
	Close as CloseIcon,
	ArrowForward,
	ArrowBack,
	CheckCircle,
} from "@mui/icons-material";

interface OnboardingTutorialProps {
	open: boolean;
	onComplete: () => void;
}

const steps = [
	"Seguridad de Grado Médico",
	"Transcripción Inteligente",
	"Análisis con IA",
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
	open,
	onComplete,
}) => {
	const [activeStep, setActiveStep] = useState(0);

	const handleNext = () => {
		if (activeStep === steps.length - 1) {
			onComplete();
		} else {
			setActiveStep((prev) => prev + 1);
		}
	};

	const handleBack = () => {
		setActiveStep((prev) => prev - 1);
	};

	const handleSkip = () => {
		onComplete();
	};

	return (
		<Dialog
			open={open}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					p: 1,
					maxHeight: "90vh",
				},
			}}
		>
			<Box sx={{ position: "absolute", top: 8, right: 8 }}>
				<IconButton onClick={handleSkip} size="small">
					<CloseIcon />
				</IconButton>
			</Box>

			<DialogContent sx={{ pt: 2, pb: 2 }}>
				<Stepper activeStep={activeStep} sx={{ mb: 2 }}>
					{steps.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				{/* Step 1: Security */}
				{activeStep === 0 && (
					<Box sx={{ textAlign: "center", py: 1 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 1.5,
								borderRadius: "50%",
								bgcolor: "primary.main",
								color: "white",
								mb: 1.5,
							}}
						>
							<LockIcon sx={{ fontSize: 32 }} />
						</Box>

						<Typography variant="h6" gutterBottom fontWeight="bold">
							🔒 Tus datos están protegidos
						</Typography>

						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ mb: 2, maxWidth: 500, mx: "auto" }}
						>
							Lazo usa <strong>cifrado de grado médico</strong>. Tus datos se
							cifran antes de salir de tu dispositivo.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 2,
								borderRadius: 2,
								maxWidth: 500,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
								¿Qué es el SALT?
							</Typography>

							<Typography variant="body2" sx={{ mb: 1 }}>
								Un código único que se combina con tu contraseña para crear el
								cifrado.
							</Typography>

							<Stack spacing={0.5} sx={{ pl: 1 }}>
								<Typography variant="caption">
									• <strong>Seguridad extra:</strong> Cifrado único por usuario
								</Typography>
								<Typography variant="caption">
									• <strong>Protección:</strong> Imposible descifrar sin tu
									contraseña
								</Typography>
							</Stack>

							<Box
								sx={{
									mt: 1.5,
									p: 1.5,
									bgcolor: "warning.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "warning.main",
								}}
							>
								<Typography variant="caption" fontWeight="bold">
									⚠️ Tu contraseña es la única forma de acceder a tus datos.
									Guárdala en un lugar seguro.
								</Typography>
							</Box>
						</Paper>
					</Box>
				)}

				{/* Step 2: Transcription */}
				{activeStep === 1 && (
					<Box sx={{ textAlign: "center", py: 1 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 1.5,
								borderRadius: "50%",
								bgcolor: "success.main",
								color: "white",
								mb: 1.5,
							}}
						>
							<MicIcon sx={{ fontSize: 32 }} />
						</Box>

						<Typography variant="h6" gutterBottom fontWeight="bold">
							🎙️ Graba tus sesiones clínicas
						</Typography>

						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ mb: 2, maxWidth: 500, mx: "auto" }}
						>
							Sube audio y Lazo lo transcribe con{" "}
							<strong>Groq Whisper v3</strong>.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 2,
								borderRadius: 2,
								maxWidth: 500,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
								¿Cómo funciona?
							</Typography>

							<Stack spacing={1}>
								<Typography variant="body2">
									<strong>1.</strong> Sube tu audio (MP3, WAV, M4A)
								</Typography>
								<Typography variant="body2">
									<strong>2.</strong> Transcripción automática en segundos
								</Typography>
								<Typography variant="body2">
									<strong>3.</strong> Cifrado inmediato en la base de datos
								</Typography>
							</Stack>

							<Box
								sx={{
									mt: 1.5,
									p: 1.5,
									bgcolor: "info.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "info.main",
								}}
							>
								<Typography variant="caption">
									💡 Usa grabaciones claras para mejores resultados.
								</Typography>
							</Box>
						</Paper>
					</Box>
				)}

				{/* Step 3: AI Analysis */}
				{activeStep === 2 && (
					<Box sx={{ textAlign: "center", py: 1 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 1.5,
								borderRadius: "50%",
								bgcolor: "secondary.main",
								color: "white",
								mb: 1.5,
							}}
						>
							<PsychologyIcon sx={{ fontSize: 32 }} />
						</Box>

						<Typography variant="h6" gutterBottom fontWeight="bold">
							🧠 Análisis clínico automático
						</Typography>

						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ mb: 2, maxWidth: 500, mx: "auto" }}
						>
							IA avanzada para notas clínicas y análisis de cada sesión.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 2,
								borderRadius: 2,
								maxWidth: 500,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="subtitle2" fontWeight="bold" gutterBottom>
								¿Qué obtienes?
							</Typography>

							<Stack spacing={0.5}>
								<Typography variant="body2">
									📋 <strong>Notas SOAP</strong> automáticas
								</Typography>
								<Typography variant="body2">
									🎯 <strong>Resumen</strong> de puntos clave
								</Typography>
								<Typography variant="body2">
									✅ <strong>Tareas</strong> y objetivos identificados
								</Typography>
								<Typography variant="body2">
									🧠 <strong>Análisis</strong> del estado emocional
								</Typography>
								<Typography variant="body2">
									⚠️ <strong>Alertas</strong> de señales de riesgo
								</Typography>
							</Stack>

							<Box
								sx={{
									mt: 1.5,
									p: 1.5,
									bgcolor: "success.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "success.main",
								}}
							>
								<Typography variant="caption">
									✨ <strong>Privacidad:</strong> Los datos se descifran solo en
									memoria para el análisis.
								</Typography>
							</Box>
						</Paper>
					</Box>
				)}

				{/* Navigation Buttons */}
				<Stack
					direction="row"
					spacing={2}
					justifyContent="space-between"
					sx={{ mt: 2 }}
				>
					<Button
						onClick={handleBack}
						disabled={activeStep === 0}
						startIcon={<ArrowBack />}
						size="small"
					>
						Anterior
					</Button>

					<Button
						variant="contained"
						onClick={handleNext}
						endIcon={
							activeStep === steps.length - 1 ?
								<CheckCircle />
							:	<ArrowForward />
						}
					>
						{activeStep === steps.length - 1 ? "¡Comenzar!" : "Siguiente"}
					</Button>
				</Stack>
			</DialogContent>
		</Dialog>
	);
};
