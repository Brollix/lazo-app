import React from "react";
import {
	Box,
	Typography,
	Container,
	Paper,
	Button,
	Grid,
	Chip,
	Divider,
	useTheme,
	Stack,
} from "@mui/material";
import {
	Security,
	VerifiedUser,
	CloudDone,
	Lock,
	Speed,
	Psychology,
} from "@mui/icons-material";

interface InfoPageProps {
	onNavigateToLogin: () => void;
}

export const InfoPage: React.FC<InfoPageProps> = ({ onNavigateToLogin }) => {
	const theme = useTheme();

	return (
		<Box
			sx={{
				minHeight: "100vh",
				background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
				py: { xs: 2, md: 4 },
			}}
		>
			<Container maxWidth="lg">
				{/* Header with Login/Register buttons */}
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						mb: 4,
					}}
				>
					<Typography
						variant="h4"
						color="primary"
						sx={{ fontWeight: "bold", display: { xs: "none", sm: "block" } }}
					>
						lazo
					</Typography>
					<Box sx={{ display: "flex", gap: 2, ml: "auto" }}>
						<Button
							onClick={onNavigateToLogin}
							variant="outlined"
							sx={{ textTransform: "none", fontWeight: 600 }}
						>
							Iniciar Sesión
						</Button>
						<Button
							onClick={onNavigateToLogin}
							variant="contained"
							sx={{ textTransform: "none", fontWeight: 600 }}
						>
							Registrarse
						</Button>
					</Box>
				</Box>

				{/* Hero Section */}
				<Paper
					elevation={3}
					sx={{
						p: { xs: 4, md: 8 },
						mb: 6,
						borderRadius: 4,
						textAlign: "center",
						background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
					}}
				>
					<Typography
						variant="h2"
						color="primary"
						sx={{
							fontWeight: "bold",
							mb: 2,
							fontSize: { xs: "2.5rem", md: "3.75rem" },
						}}
					>
						lazo
					</Typography>
					<Typography
						variant="h5"
						color="text.secondary"
						sx={{ mb: 3, fontSize: { xs: "1.25rem", md: "1.5rem" } }}
					>
						Tu Copiloto Inteligente para Terapia
					</Typography>
					<Typography
						variant="body1"
						color="text.primary"
						sx={{
							maxWidth: 700,
							mx: "auto",
							fontSize: { xs: "1rem", md: "1.125rem" },
							lineHeight: 1.7,
						}}
					>
						Diseñado para psicólogos y terapeutas que quieren enfocarse en sus
						pacientes, no en la burocracia. Transcripción automática, análisis
						clínico con IA, y documentación impecable en segundos.
					</Typography>
				</Paper>

				{/* What We Do */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, mb: 6, borderRadius: 3 }}
				>
					<Typography
						variant="h4"
						gutterBottom
						sx={{ fontWeight: "bold", textAlign: "center", mb: 4 }}
					>
						¿Qué hace Lazo?
					</Typography>
					<Grid container spacing={4} sx={{ justifyContent: "center" }}>
						<Grid item xs={12} md={10} lg={8}>
							<Stack spacing={4}>
								<Box>
									<Stack
										direction="row"
										spacing={2}
										alignItems="flex-start"
										sx={{ mb: 2 }}
									>
										<Speed
											sx={{
												fontSize: 48,
												color: theme.palette.primary.main,
												flexShrink: 0,
											}}
										/>
										<Box>
											<Typography
												variant="h6"
												sx={{ fontWeight: "bold", mb: 1 }}
											>
												Transcripción Automática de Sesiones
											</Typography>
											<Typography
												variant="body1"
												color="text.secondary"
												sx={{ lineHeight: 1.7 }}
											>
												Grabá tus sesiones terapéuticas y obtené transcripciones
												precisas en cuestión de segundos. El sistema convierte
												automáticamente el audio en texto, permitiéndote
												enfocarte completamente en tu paciente durante la
												consulta sin preocuparte por tomar notas. La
												transcripción captura fielmente el diálogo, facilitando
												la revisión posterior y la elaboración de documentación
												clínica.
											</Typography>
										</Box>
									</Stack>
								</Box>

								<Box>
									<Stack
										direction="row"
										spacing={2}
										alignItems="flex-start"
										sx={{ mb: 2 }}
									>
										<Psychology
											sx={{
												fontSize: 48,
												color: theme.palette.primary.main,
												flexShrink: 0,
											}}
										/>
										<Box>
											<Typography
												variant="h6"
												sx={{ fontWeight: "bold", mb: 1 }}
											>
												Análisis Clínico Inteligente y Toma de Notas
											</Typography>
											<Typography
												variant="body1"
												color="text.secondary"
												sx={{ lineHeight: 1.7, mb: 1.5 }}
											>
												La inteligencia artificial analiza la transcripción y
												genera automáticamente documentación clínica profesional
												en los formatos estándar más utilizados:{" "}
												<strong>SOAP</strong> (Subjetivo, Objetivo, Análisis,
												Plan), <strong>DAP</strong> (Data, Assessment, Plan) y{" "}
												<strong>BIRP</strong> (Behavior, Intervention, Response,
												Plan).
											</Typography>
											<Typography
												variant="body1"
												color="text.secondary"
												sx={{ lineHeight: 1.7 }}
											>
												Además, el sistema realiza análisis de sentimiento del
												paciente, identifica posibles factores de riesgo, extrae
												temas principales discutidos en la sesión, y genera
												resúmenes ejecutivos. Todo esto te permite mantener
												historias clínicas completas y bien organizadas con
												mínimo esfuerzo administrativo.
											</Typography>
										</Box>
									</Stack>
								</Box>

								<Box>
									<Stack direction="row" spacing={2} alignItems="flex-start">
										<Lock
											sx={{
												fontSize: 48,
												color: theme.palette.primary.main,
												flexShrink: 0,
											}}
										/>
										<Box>
											<Typography
												variant="h6"
												sx={{ fontWeight: "bold", mb: 1 }}
											>
												Privacidad y Seguridad Total
											</Typography>
											<Typography
												variant="body1"
												color="text.secondary"
												sx={{ lineHeight: 1.7 }}
											>
												Todos los datos de tus pacientes están protegidos con
												cifrado de grado militar (AES-256) mediante una
												arquitectura zero-knowledge. Esto significa que toda la
												información se cifra en tu navegador antes de enviarse a
												nuestros servidores. Ni nosotros ni terceros podemos
												acceder al contenido de tus sesiones. Vos sos el único
												con la llave de acceso a la información clínica,
												garantizando el cumplimiento del secreto profesional y
												las normativas de protección de datos. Podés recuperar
												tu acceso usando tu frase de recuperación en caso de
												olvidar tu contraseña.
											</Typography>
										</Box>
									</Stack>
								</Box>
							</Stack>
						</Grid>
					</Grid>
				</Paper>

				{/* Clinical Documentation Formats */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, mb: 6, borderRadius: 3 }}
				>
					<Typography
						variant="h4"
						gutterBottom
						sx={{ fontWeight: "bold", textAlign: "center", mb: 4 }}
					>
						Formatos de Documentación Clínica
					</Typography>
					<Grid container spacing={3}>
						<Grid item xs={12} md={4}>
							<Box
								sx={{
									p: 3,
									bgcolor: theme.palette.background.default,
									borderRadius: 2,
									height: "100%",
								}}
							>
								<Typography
									variant="h6"
									sx={{
										fontWeight: "bold",
										mb: 2,
										color: theme.palette.primary.main,
									}}
								>
									SOAP
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>S</strong>ubjetivo: Lo que el paciente reporta
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>O</strong>bjetivo: Observaciones del terapeuta
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>A</strong>nálisis: Evaluación clínica
								</Typography>
								<Typography variant="body2" color="text.secondary">
									<strong>P</strong>lan: Próximos pasos y tratamiento
								</Typography>
							</Box>
						</Grid>
						<Grid item xs={12} md={4}>
							<Box
								sx={{
									p: 3,
									bgcolor: theme.palette.background.default,
									borderRadius: 2,
									height: "100%",
								}}
							>
								<Typography
									variant="h6"
									sx={{
										fontWeight: "bold",
										mb: 2,
										color: theme.palette.primary.main,
									}}
								>
									DAP
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>D</strong>ata: Información objetiva de la sesión
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>A</strong>ssessment: Evaluación profesional
								</Typography>
								<Typography variant="body2" color="text.secondary">
									<strong>P</strong>lan: Objetivos y estrategias futuras
								</Typography>
							</Box>
						</Grid>
						<Grid item xs={12} md={4}>
							<Box
								sx={{
									p: 3,
									bgcolor: theme.palette.background.default,
									borderRadius: 2,
									height: "100%",
								}}
							>
								<Typography
									variant="h6"
									sx={{
										fontWeight: "bold",
										mb: 2,
										color: theme.palette.primary.main,
									}}
								>
									BIRP
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>B</strong>ehavior: Comportamiento observado
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>I</strong>ntervention: Intervenciones realizadas
								</Typography>
								<Typography variant="body2" color="text.secondary" paragraph>
									<strong>R</strong>esponse: Respuesta del paciente
								</Typography>
								<Typography variant="body2" color="text.secondary">
									<strong>P</strong>lan: Plan de tratamiento
								</Typography>
							</Box>
						</Grid>
					</Grid>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ textAlign: "center", mt: 3, fontStyle: "italic" }}
					>
						La IA genera automáticamente notas en cualquiera de estos formatos
						según tu preferencia
					</Typography>
				</Paper>

				{/* Security & Compliance */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, mb: 6, borderRadius: 3 }}
				>
					<Stack
						direction="row"
						alignItems="center"
						justifyContent="center"
						spacing={1}
						sx={{ mb: 2 }}
					>
						<Security />
						<Typography
							variant="h4"
							sx={{ fontWeight: "bold", textAlign: "center" }}
						>
							Seguridad y Cumplimiento Normativo
						</Typography>
					</Stack>
					<Divider sx={{ mb: 4 }} />

					<Typography
						variant="body1"
						paragraph
						sx={{ textAlign: "center", mb: 4, maxWidth: 800, mx: "auto" }}
					>
						Cumplimos con los más altos estándares de seguridad para datos de
						salud mental. Utilizamos infraestructura certificada y políticas de
						retención cero.
					</Typography>

					<Grid container spacing={2} sx={{ mb: 4 }}>
						<Grid item xs={12} sm={6} md={3}>
							<Chip
								icon={<VerifiedUser />}
								label="AWS BAA Certified"
								color="primary"
								sx={{ width: "100%", py: 2.5, fontSize: "0.875rem" }}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Chip
								icon={<CloudDone />}
								label="Groq Zero Retention"
								color="primary"
								sx={{ width: "100%", py: 2.5, fontSize: "0.875rem" }}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Chip
								icon={<Security />}
								label="AES-256 Encryption"
								color="primary"
								sx={{ width: "100%", py: 2.5, fontSize: "0.875rem" }}
							/>
						</Grid>
						<Grid item xs={12} sm={6} md={3}>
							<Chip
								icon={<VerifiedUser />}
								label="HIPAA Equivalent"
								color="primary"
								sx={{ width: "100%", py: 2.5, fontSize: "0.875rem" }}
							/>
						</Grid>
					</Grid>

					<Stack spacing={3}>
						<Box
							sx={{
								bgcolor: theme.palette.background.default,
								p: 3,
								borderRadius: 2,
							}}
						>
							<Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
								🔒 Arquitectura Zero-Knowledge
							</Typography>
							<Typography variant="body2" paragraph>
								<strong>Tu contraseña es tu única llave.</strong> Todos los
								datos clínicos se cifran en tu navegador antes de enviarse a
								nuestros servidores. Ni nosotros, ni nuestros proveedores pueden
								leer tus datos.
							</Typography>
							<Typography variant="body2">
								Utilizamos cifrado AES-256 con derivación de llaves PBKDF2. Si
								olvidás tu contraseña, podés recuperar el acceso a tus datos
								usando tu frase de recuperación (por eso es fundamental
								guardarla de forma segura).
							</Typography>
						</Box>

						<Box
							sx={{
								bgcolor: theme.palette.background.default,
								p: 3,
								borderRadius: 2,
							}}
						>
							<Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
								☁️ Procesamiento de IA Certificado
							</Typography>
							<Typography variant="body2" paragraph>
								<strong>Groq (Transcripción):</strong> Zero Data Retention
								(ZDR). Los audios se procesan en memoria volátil y se eliminan
								inmediatamente. No se almacenan, no se registran, no se usan
								para entrenamiento.
							</Typography>
							<Typography variant="body2">
								<strong>AWS Bedrock (Análisis):</strong> Business Associate
								Agreement (BAA). Infraestructura certificada HIPAA. Los datos NO
								se usan para entrenar modelos. Cumple con SOC 2 e ISO 27001.
							</Typography>
						</Box>

						<Box
							sx={{
								bgcolor: theme.palette.background.default,
								p: 3,
								borderRadius: 2,
							}}
						>
							<Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
								🌍 Cumplimiento Legal en Argentina
							</Typography>
							<Typography variant="body2" paragraph>
								Cumplimos con la{" "}
								<strong>Ley 25.326 de Protección de Datos Personales</strong> y
								los estándares de la AAIP (Agencia de Acceso a la Información
								Pública).
							</Typography>
							<Typography variant="body2">
								Aunque utilizamos servicios en la nube globales, el cifrado
								end-to-end garantiza que la transferencia internacional cumple
								con todos los requisitos de seguridad exigidos por la
								legislación argentina.
							</Typography>
						</Box>
					</Stack>
				</Paper>

				{/* How It Works */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, mb: 6, borderRadius: 3 }}
				>
					<Typography
						variant="h4"
						gutterBottom
						sx={{ fontWeight: "bold", textAlign: "center", mb: 4 }}
					>
						¿Cómo funciona?
					</Typography>
					<Grid container spacing={4} sx={{ justifyContent: "center" }}>
						<Grid item xs={12} md={10} lg={8}>
							<Stack spacing={3}>
								<Stack direction="row" spacing={2} alignItems="flex-start">
									<Box
										sx={{
											bgcolor: theme.palette.primary.main,
											color: "white",
											borderRadius: "50%",
											width: 48,
											height: 48,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											fontWeight: "bold",
											fontSize: "1.25rem",
										}}
									>
										1
									</Box>
									<Box>
										<Typography
											variant="h6"
											sx={{ fontWeight: "bold", mb: 0.5 }}
										>
											Grabá tu sesión
										</Typography>
										<Typography
											variant="body1"
											color="text.secondary"
											sx={{ lineHeight: 1.7 }}
										>
											Subí el audio de tu consulta de forma segura y cifrada.
										</Typography>
									</Box>
								</Stack>

								<Stack direction="row" spacing={2} alignItems="flex-start">
									<Box
										sx={{
											bgcolor: theme.palette.primary.main,
											color: "white",
											borderRadius: "50%",
											width: 48,
											height: 48,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											fontWeight: "bold",
											fontSize: "1.25rem",
										}}
									>
										2
									</Box>
									<Box>
										<Typography
											variant="h6"
											sx={{ fontWeight: "bold", mb: 0.5 }}
										>
											Transcripción automática
										</Typography>
										<Typography
											variant="body1"
											color="text.secondary"
											sx={{ lineHeight: 1.7 }}
										>
											Nuestra IA convierte el audio en texto con precisión
											médica.
										</Typography>
									</Box>
								</Stack>

								<Stack direction="row" spacing={2} alignItems="flex-start">
									<Box
										sx={{
											bgcolor: theme.palette.primary.main,
											color: "white",
											borderRadius: "50%",
											width: 48,
											height: 48,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											fontWeight: "bold",
											fontSize: "1.25rem",
										}}
									>
										3
									</Box>
									<Box>
										<Typography
											variant="h6"
											sx={{ fontWeight: "bold", mb: 0.5 }}
										>
											Análisis clínico
										</Typography>
										<Typography
											variant="body1"
											color="text.secondary"
											sx={{ lineHeight: 1.7 }}
										>
											Generá notas SOAP, análisis de sentimiento y detectá
											riesgos.
										</Typography>
									</Box>
								</Stack>

								<Stack direction="row" spacing={2} alignItems="flex-start">
									<Box
										sx={{
											bgcolor: theme.palette.primary.main,
											color: "white",
											borderRadius: "50%",
											width: 48,
											height: 48,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											flexShrink: 0,
											fontWeight: "bold",
											fontSize: "1.25rem",
										}}
									>
										4
									</Box>
									<Box>
										<Typography
											variant="h6"
											sx={{ fontWeight: "bold", mb: 0.5 }}
										>
											Documentación lista
										</Typography>
										<Typography
											variant="body1"
											color="text.secondary"
											sx={{ lineHeight: 1.7 }}
										>
											Obtené tu documentación clínica completa en segundos.
										</Typography>
									</Box>
								</Stack>
							</Stack>
						</Grid>
					</Grid>
				</Paper>

				{/* Terms & Responsibilities */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, mb: 6, borderRadius: 3 }}
				>
					<Typography
						variant="h4"
						gutterBottom
						sx={{ fontWeight: "bold", textAlign: "center", mb: 2 }}
					>
						Términos de Uso y Responsabilidades
					</Typography>
					<Divider sx={{ mb: 3 }} />
					<Typography
						variant="body1"
						paragraph
						sx={{ textAlign: "center", maxWidth: 800, mx: "auto" }}
					>
						Como profesional de la salud mental, vos sos el{" "}
						<strong>responsable del tratamiento</strong> de los datos de tus
						pacientes. Nosotros actuamos como{" "}
						<strong>procesador de datos</strong>.
					</Typography>
					<Typography
						variant="h6"
						gutterBottom
						sx={{ mt: 4, mb: 2, textAlign: "center" }}
					>
						Tus obligaciones:
					</Typography>
					<Box component="ul" sx={{ maxWidth: 700, mx: "auto", pl: 3 }}>
						<Typography component="li" variant="body2" paragraph>
							Obtener consentimiento informado de tus pacientes para grabar
							sesiones
						</Typography>
						<Typography component="li" variant="body2" paragraph>
							Informar sobre el uso de herramientas de IA en tu práctica
						</Typography>
						<Typography component="li" variant="body2" paragraph>
							Mantener la confidencialidad de tu contraseña y frase de
							recuperación
						</Typography>
						<Typography component="li" variant="body2">
							Cumplir con el secreto profesional establecido en tu código
							deontológico
						</Typography>
					</Box>
				</Paper>

				{/* Contact */}
				<Paper
					elevation={2}
					sx={{ p: { xs: 3, md: 5 }, borderRadius: 3, textAlign: "center" }}
				>
					<Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
						¿Preguntas sobre privacidad o seguridad?
					</Typography>
					<Typography variant="body1" color="text.secondary" paragraph>
						Para consultas sobre tratamiento de datos o ejercicio de derechos
						(acceso, rectificación, supresión):
					</Typography>
					<Button
						variant="contained"
						size="large"
						href="mailto:support@soylazo.com"
						sx={{ mt: 2, textTransform: "none", fontWeight: 600 }}
					>
						Contactar: support@soylazo.com
					</Button>
				</Paper>
			</Container>
		</Box>
	);
};
