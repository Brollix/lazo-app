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
			maxWidth="md"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					p: 2,
				},
			}}
		>
			<Box sx={{ position: "absolute", top: 16, right: 16 }}>
				<IconButton onClick={handleSkip} size="small">
					<CloseIcon />
				</IconButton>
			</Box>

			<DialogContent sx={{ pt: 4 }}>
				<Stepper activeStep={activeStep} sx={{ mb: 4 }}>
					{steps.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				{/* Step 1: Security */}
				{activeStep === 0 && (
					<Box sx={{ textAlign: "center", py: 3 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 3,
								borderRadius: "50%",
								bgcolor: "primary.main",
								color: "white",
								mb: 3,
								animation: "pulse 2s infinite",
								"@keyframes pulse": {
									"0%, 100%": { transform: "scale(1)" },
									"50%": { transform: "scale(1.05)" },
								},
							}}
						>
							<LockIcon sx={{ fontSize: 60 }} />
						</Box>

						<Typography variant="h4" gutterBottom fontWeight="bold">
							🔒 Tus datos están protegidos
						</Typography>

						<Typography
							variant="body1"
							color="text.secondary"
							sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
						>
							Lazo usa <strong>cifrado de grado médico</strong> para proteger
							toda tu información clínica. Tus datos se cifran antes de salir de
							tu dispositivo y solo tú puedes acceder a ellos.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 3,
								borderRadius: 2,
								maxWidth: 600,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="h6" gutterBottom>
								¿Qué es el SALT y por qué es importante?
							</Typography>

							<Typography variant="body2" paragraph>
								El <strong>SALT</strong> es un código único y aleatorio que se
								genera cuando creas tu cuenta. Funciona como una "llave maestra"
								que se combina con tu contraseña para crear el cifrado.
							</Typography>

							<Typography variant="body2" paragraph>
								<strong>¿Por qué usamos SALT?</strong>
							</Typography>
							<Stack spacing={1} sx={{ pl: 2 }}>
								<Typography variant="body2">
									• <strong>Seguridad extra:</strong> Aunque dos personas usen
									la misma contraseña, sus datos estarán cifrados de forma
									completamente diferente
								</Typography>
								<Typography variant="body2">
									• <strong>Protección contra ataques:</strong> Hace imposible
									descifrar tus datos sin tu contraseña específica
								</Typography>
								<Typography variant="body2">
									• <strong>Cambio de contraseña:</strong> Si cambias tu
									contraseña en el futuro, el SALT permite mantener tus datos
									seguros sin tener que re-cifrar todo
								</Typography>
							</Stack>

							<Box
								sx={{
									mt: 3,
									p: 2,
									bgcolor: "warning.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "warning.main",
								}}
							>
								<Typography variant="body2" fontWeight="bold" gutterBottom>
									⚠️ Importante:
								</Typography>
								<Typography variant="body2">
									Tu contraseña es la única forma de acceder a tus datos
									cifrados. Si la olvidas,{" "}
									<strong>no podremos recuperar tu información</strong>.
									Guárdala en un lugar seguro.
								</Typography>
							</Box>
						</Paper>
					</Box>
				)}

				{/* Step 2: Transcription */}
				{activeStep === 1 && (
					<Box sx={{ textAlign: "center", py: 3 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 3,
								borderRadius: "50%",
								bgcolor: "success.main",
								color: "white",
								mb: 3,
								animation: "wave 1.5s infinite",
								"@keyframes wave": {
									"0%, 100%": { transform: "scale(1) rotate(0deg)" },
									"25%": { transform: "scale(1.1) rotate(-5deg)" },
									"75%": { transform: "scale(1.1) rotate(5deg)" },
								},
							}}
						>
							<MicIcon sx={{ fontSize: 60 }} />
						</Box>

						<Typography variant="h4" gutterBottom fontWeight="bold">
							🎙️ Graba tus sesiones clínicas
						</Typography>

						<Typography
							variant="body1"
							color="text.secondary"
							sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
						>
							Sube archivos de audio de tus sesiones y Lazo los transcribirá
							automáticamente usando <strong>Groq Whisper v3</strong>, la
							tecnología de transcripción más avanzada.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 3,
								borderRadius: 2,
								maxWidth: 600,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="h6" gutterBottom>
								¿Cómo funciona?
							</Typography>

							<Stack spacing={2}>
								<Box>
									<Typography variant="body2" fontWeight="bold">
										1. Sube tu audio
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Haz clic en "Subir Audio" y selecciona el archivo de tu
										sesión clínica (MP3, WAV, M4A, etc.)
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										2. Transcripción automática
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Groq procesa el audio y genera una transcripción precisa en
										segundos, incluso identificando diferentes hablantes
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										3. Cifrado inmediato
									</Typography>
									<Typography variant="body2" color="text.secondary">
										La transcripción se cifra automáticamente antes de guardarse
										en la base de datos
									</Typography>
								</Box>
							</Stack>

							<Box
								sx={{
									mt: 3,
									p: 2,
									bgcolor: "info.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "info.main",
								}}
							>
								<Typography variant="body2">
									💡 <strong>Tip:</strong> Para mejores resultados, usa
									grabaciones claras con poco ruido de fondo. El audio se
									procesa de forma segura y nunca se almacena sin cifrar.
								</Typography>
							</Box>
						</Paper>
					</Box>
				)}

				{/* Step 3: AI Analysis */}
				{activeStep === 2 && (
					<Box sx={{ textAlign: "center", py: 3 }}>
						<Box
							sx={{
								display: "inline-flex",
								p: 3,
								borderRadius: "50%",
								bgcolor: "secondary.main",
								color: "white",
								mb: 3,
								animation: "sparkle 2s infinite",
								"@keyframes sparkle": {
									"0%, 100%": { transform: "scale(1)", opacity: 1 },
									"50%": { transform: "scale(1.15)", opacity: 0.8 },
								},
							}}
						>
							<PsychologyIcon sx={{ fontSize: 60 }} />
						</Box>

						<Typography variant="h4" gutterBottom fontWeight="bold">
							🧠 Análisis clínico automático
						</Typography>

						<Typography
							variant="body1"
							color="text.secondary"
							sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
						>
							Lazo usa <strong>AWS Bedrock</strong> con modelos de IA avanzados
							para generar automáticamente notas clínicas estructuradas y
							análisis profundos de cada sesión.
						</Typography>

						<Paper
							elevation={0}
							sx={{
								bgcolor: "background.default",
								p: 3,
								borderRadius: 2,
								maxWidth: 600,
								mx: "auto",
								textAlign: "left",
							}}
						>
							<Typography variant="h6" gutterBottom>
								¿Qué obtienes?
							</Typography>

							<Stack spacing={2}>
								<Box>
									<Typography variant="body2" fontWeight="bold">
										📋 Notas SOAP automáticas
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Genera notas clínicas en formato SOAP (Subjetivo, Objetivo,
										Análisis, Plan) listas para usar
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										🎯 Resumen ejecutivo
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Obtén un resumen conciso de los puntos clave de la sesión
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										✅ Tareas y objetivos
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Identifica automáticamente tareas pendientes y objetivos
										terapéuticos
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										🧠 Análisis psicológico
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Recibe insights sobre el estado emocional y patrones de
										comportamiento del paciente
									</Typography>
								</Box>

								<Box>
									<Typography variant="body2" fontWeight="bold">
										⚠️ Detección de riesgos
									</Typography>
									<Typography variant="body2" color="text.secondary">
										Alertas automáticas si se detectan señales de riesgo que
										requieren atención inmediata
									</Typography>
								</Box>
							</Stack>

							<Box
								sx={{
									mt: 3,
									p: 2,
									bgcolor: "success.light",
									borderRadius: 1,
									border: "1px solid",
									borderColor: "success.main",
								}}
							>
								<Typography variant="body2">
									✨ <strong>Privacidad garantizada:</strong> Los datos se
									descifran solo en memoria para el análisis y se vuelven a
									cifrar antes de guardarse. Nunca se almacenan sin protección.
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
					sx={{ mt: 4 }}
				>
					<Button
						onClick={handleBack}
						disabled={activeStep === 0}
						startIcon={<ArrowBack />}
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
						size="large"
					>
						{activeStep === steps.length - 1 ? "¡Comenzar!" : "Siguiente"}
					</Button>
				</Stack>
			</DialogContent>
		</Dialog>
	);
};
