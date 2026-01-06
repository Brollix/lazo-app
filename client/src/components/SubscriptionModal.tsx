import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	Button,
	Card,
	CardContent,
	Divider,
	CircularProgress,
	useTheme,
} from "@mui/material";
import {
	colors,
	shadows,
	borderRadius,
	components,
	getExtendedColors,
} from "../styles.theme";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface SubscriptionModalProps {
	open: boolean;
	onClose: () => void;
	userId: string;
	userEmail: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
	open,
	onClose,
	userId,
	userEmail,
}) => {
	const theme = useTheme();
	const extendedColors = getExtendedColors(theme.palette.mode);
	const [dolarRate, setDolarRate] = useState<number>(1950);
	const [prices, setPrices] = useState({ pro: 0, ultra: 0 });
	const [loading, setLoading] = useState(false);

	const apiUrl = import.meta.env.VITE_API_URL;

	// Precios locales (fallback si la API falla)
	const proPriceARS = prices.pro || Math.round(10 * dolarRate);
	const ultraPriceARS = prices.ultra || Math.round(30 * dolarRate);

	useEffect(() => {
		if (open) {
			// Fetch prices from our backend
			fetch(`${apiUrl}/api/prices`)
				.then((res) => res.json())
				.then((data) => {
					console.log("Backend prices:", data);
					setPrices({ pro: data.pro, ultra: data.ultra });
					if (data.rate) setDolarRate(data.rate);
				})
				.catch((err) => {
					console.error("Error fetching prices from backend:", err);
					// Fallback: Try to fetch dolar rate directly if backend fails
					fetch("https://dolarapi.com/v1/dolares/tarjeta")
						.then((res) => res.json())
						.then((data) => {
							const promedio = Math.round((data.compra + data.venta) / 2);
							setDolarRate(promedio);
						});
				});
		}
	}, [open, apiUrl]);

	const handleSubscribe = async (planId: "free" | "pro" | "ultra") => {
		if (planId === "free") {
			try {
				setLoading(true);
				const response = await fetch(`${apiUrl}/api/select-free-plan`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId }),
				});

				if (!response.ok) {
					console.error("Error setting free plan");
					// Optionally show error
				}
				onClose();
			} catch (error) {
				console.error("Error selecting free plan:", error);
			} finally {
				setLoading(false);
			}
			return;
		}
		setLoading(true);
		try {
			const redirectUrl = window.location.origin;
			const response = await fetch(`${apiUrl}/api/create-preference`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ planId, userId, userEmail, redirectUrl }),
			});
			const data = await response.json();
			console.log("Preference created:", data);
			if (data.id) {
				// Open MercadoPago in external browser
				const checkoutUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.id}`;
				console.log("Opening checkout URL:", checkoutUrl);

				// Web version: use window.open
				window.open(checkoutUrl, "_blank");
				onClose();
			} else {
				console.error("No preference ID returned", data);
			}
		} catch (error) {
			console.error("Error creating payment:", error);
		} finally {
			setLoading(false);
		}
	};

	const PlanCard = ({ title, price, features, planId, color }: any) => (
		<Card
			sx={{
				minHeight: { xs: "auto", sm: 480 },
				display: "flex",
				flexDirection: "column",
				borderRadius: borderRadius.md,
				boxShadow: shadows.card,
				border: components.subscriptionCard.borderWidth,
				borderColor: "transparent",
				"&:hover": {
					borderColor: color,
					transform: { xs: "none", sm: "translateY(-4px)" },
				},
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				bgcolor: "background.paper",
			}}
		>
			<CardContent
				sx={{
					p: { xs: 2, sm: 3 },
					flexGrow: 1,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Typography
					variant="h5"
					fontWeight="bold"
					gutterBottom
					sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
				>
					{title}
				</Typography>
				<Box sx={{ mb: 1 }}>
					<Typography
						variant="h3"
						fontWeight="bold"
						component="span"
						sx={{ color: color, fontSize: { xs: "1.75rem", sm: "2.5rem" } }}
					>
						{planId === "free"
							? "Gratis"
							: planId === "ultra"
							? "Próximamente"
							: `ARS $${price?.toLocaleString("es-AR")}`}
					</Typography>
					{planId !== "free" && planId !== "ultra" && (
						<Typography
							variant="body1"
							color="text.secondary"
							component="span"
							sx={{ ml: 1 }}
						>
							/mes
						</Typography>
					)}
				</Box>
				<Typography
					variant="body2"
					color="text.secondary"
					sx={{ mb: 2, display: "block", minHeight: "2rem", fontWeight: 500 }}
				>
					{planId === "ultra" ? (
						"Funcionalidades avanzadas en desarrollo"
					) : planId !== "free" ? (
						<>
							{price === 50 ? (
								<Typography
									component="span"
									variant="body2"
									sx={{ fontWeight: "bold", color: "primary.main" }}
								>
									Precio especial de prueba
								</Typography>
							) : (
								<>
									USD ${planId === "pro" ? 10 : 30} × Dólar Tarjeta
									<br />
									(Cotización: ARS ${dolarRate.toLocaleString("es-AR")})
								</>
							)}
							<br />
							<Typography
								component="span"
								variant="caption"
								sx={{ opacity: 0.8, fontSize: "0.7rem" }}
							>
								{planId === "pro" && price === 50
									? "Temporalmente 50 pesos para validación"
									: `USD $${planId === "pro" ? 10 : 30} aprox.`}
							</Typography>
						</>
					) : (
						"Perfecto para comenzar"
					)}
				</Typography>
				<Divider sx={{ mb: 2 }} />
				<Box sx={{ mb: 3, flexGrow: 1 }}>
					{features.map((f: string, i: number) => (
						<Box key={i} sx={{ display: "flex", gap: 1, mb: 1.5 }}>
							<CheckCircleOutlineIcon fontSize="small" sx={{ color }} />
							<Typography variant="body2" sx={{ lineHeight: 1.4 }}>
								{f}
							</Typography>
						</Box>
					))}
				</Box>
				<Button
					fullWidth
					variant="contained"
					disableElevation
					disabled={loading || planId === "ultra"}
					sx={{
						borderRadius: borderRadius.md,
						py: components.planButton.py,
						fontWeight: components.planButton.fontWeight,
						bgcolor: color,
						color: "white",
						"&:hover": {
							bgcolor: color,
							opacity: 0.9,
						},
					}}
					onClick={() => handleSubscribe(planId)}
				>
					{loading ? (
						<CircularProgress size={24} color="inherit" />
					) : planId === "ultra" ? (
						"Próximamente"
					) : planId === "free" ? (
						"Continuar Gratis"
					) : (
						"Elegir Plan"
					)}
				</Button>
			</CardContent>
		</Card>
	);

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="lg"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: borderRadius.lg,
					bgcolor: "background.default",
					maxHeight: "95vh",
					width: { xs: "100%", sm: "95%" },
					maxWidth: { xs: "100%", sm: "1100px !important" },
					m: { xs: 0, sm: 2 },
					"&::-webkit-scrollbar": { display: "none" },
					msOverflowStyle: "none",
					scrollbarWidth: "none",
				},
			}}
		>
			<Box
				sx={{
					textAlign: "center",
					pt: { xs: 3, sm: 6 },
					pb: 2,
					px: { xs: 2, sm: 0 },
				}}
			>
				<Typography
					variant="h3"
					component="h1"
					fontWeight="bold"
					sx={{
						color: colors.terracotta,
						fontSize: { xs: "1.75rem", sm: "2.5rem" },
					}}
				>
					Elige tu Plan Lazo
				</Typography>
				<Typography
					variant="h6"
					component="p"
					color="text.secondary"
					sx={{
						mt: 1,
						fontWeight: 400,
						fontSize: { xs: "0.875rem", sm: "1.25rem" },
					}}
				>
					Soluciones inteligentes para cada etapa de tu práctica.
				</Typography>
			</Box>
			<DialogContent
				sx={{
					pb: { xs: 3, sm: 6 },
					px: { xs: 2, sm: 4 },
					overflow: "auto",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
				}}
			>
				<Box
					sx={{
						display: "flex",
						flexDirection: { xs: "column", md: "row" },
						gap: { xs: 2, sm: 3 },
						mt: 1,
						justifyContent: "center",
						alignItems: { xs: "stretch", md: "flex-start" },
					}}
				>
					<Box
						sx={{
							flex: "1 1 0",
							maxWidth: { xs: "100%", md: 400 },
							width: "100%",
						}}
					>
						<PlanCard
							title="Plan Gratis"
							price={0}
							color={extendedColors.neutral.gray}
							planId="free"
							features={[
								"3 créditos de audio iniciales",
								"Transcripción Whisper-v3 (Groq)",
								"Análisis con Claude Sonnet 3.5",
								"Ideal para probar la plataforma",
								"Sin tarjeta de crédito",
							]}
						/>
					</Box>
					<Box
						sx={{
							flex: "1 1 0",
							maxWidth: { xs: "100%", md: 400 },
							width: "100%",
						}}
					>
						<PlanCard
							title="Plan Pro"
							price={proPriceARS}
							color={colors.terracotta}
							planId="pro"
							features={[
								"Grabaciones ilimitadas",
								"Transcripción Whisper-v3 (Groq)",
								"Análisis con Claude Sonnet 3.5",
								"Asistente IA 24/7 integrado",
								"Soporte prioritario por WhatsApp",
								"Exportación a PDF/Word",
							]}
						/>
					</Box>
					<Box
						sx={{
							flex: "1 1 0",
							maxWidth: { xs: "100%", md: 400 },
							width: "100%",
						}}
					>
						<PlanCard
							title="Plan Ultra"
							price={ultraPriceARS}
							color={extendedColors.neutral.darkBlue}
							planId="ultra"
							features={[
								"Todo lo de Pro",
								"Transcripción Deepgram Nova-2",
								"Precisión máxima (99.9%)",
								"Diarización avanzada (Speaker ID)",
								"Análisis multi-lenguaje nativo",
								"Respaldos cifrados automáticos",
							]}
						/>
					</Box>
				</Box>
				<Box sx={{ mt: 4, textAlign: "center" }}>
					<Typography variant="caption" color="text.secondary">
						* Precios basados en la cotización diaria del Dólar Tarjeta (ARS $
						{dolarRate.toLocaleString("es-AR")}).
					</Typography>
				</Box>
			</DialogContent>
		</Dialog>
	);
};
