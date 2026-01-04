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
	const [loading, setLoading] = useState(false);
	const [loadingPrices, setLoadingPrices] = useState(true);

	const apiUrl = import.meta.env.VITE_API_URL;

	// Precios en USD
	const proPriceUSD = 10;
	const ultraPriceUSD = 30; // No se usa, Ultra está en "Próximamente"

	// Calcular precios en ARS
	const proPriceARS = Math.round(proPriceUSD * dolarRate);
	const ultraPriceARS = Math.round(ultraPriceUSD * dolarRate);

	useEffect(() => {
		if (open) {
			setLoadingPrices(true);
			fetch("https://dolarapi.com/v1/dolares/tarjeta")
				.then((res) => res.json())
				.then((data) => {
					console.log("Dolar API response:", data);
					// Calcular promedio entre compra y venta
					const promedio = Math.round((data.compra + data.venta) / 2);
					console.log(
						`Dólar Tarjeta - Compra: ${data.compra}, Venta: ${data.venta}, Promedio: ${promedio}`
					);
					setDolarRate(promedio);
					setLoadingPrices(false);
				})
				.catch((err) => {
					console.error("Error fetching dolar rate:", err);
					setLoadingPrices(false);
					// Mantener el valor por defecto de 1950
				});
		}
	}, [open]);

	const handleSubscribe = async (planId: "free" | "pro" | "ultra") => {
		if (planId === "free") {
			onClose();
			return;
		}
		setLoading(true);
		try {
			const response = await fetch(`${apiUrl}/api/create-preference`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ planId, userId, userEmail }),
			});
			const data = await response.json();
			if (data.id) {
				// Open MercadoPago in external browser
				const checkoutUrl = `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${data.id}`;

				// Use Electron's shell API to open external browser
				if (window.electron && window.electron.shell) {
					window.electron.shell.openExternal(checkoutUrl);
					onClose(); // Close the modal after opening the browser
				} else {
					// Fallback for web version
					window.open(checkoutUrl, "_blank");
				}
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
				minHeight: 480,
				display: "flex",
				flexDirection: "column",
				borderRadius: borderRadius.md,
				boxShadow: shadows.card,
				border: components.subscriptionCard.borderWidth,
				borderColor: "transparent",
				"&:hover": { borderColor: color, transform: "translateY(-4px)" },
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				bgcolor: "background.paper",
			}}
		>
			<CardContent
				sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column" }}
			>
				<Typography variant="h5" fontWeight="bold" gutterBottom>
					{title}
				</Typography>
				<Box sx={{ mb: 1 }}>
					<Typography
						variant="h3"
						fontWeight="bold"
						component="span"
						sx={{ color: color }}
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
							USD ${planId === "pro" ? 10 : 30} × Dólar Tarjeta
							<br />
							<Typography
								component="span"
								variant="caption"
								sx={{ opacity: 0.8 }}
							>
								(Cotización: ARS ${dolarRate.toLocaleString("es-AR")})
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
						"Empezar Gratis"
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
					maxHeight: "90vh",
				},
			}}
		>
			<Box sx={{ textAlign: "center", pt: 6, pb: 2 }}>
				<Typography
					variant="h3"
					component="h1"
					fontWeight="bold"
					sx={{ color: colors.terracotta }}
				>
					Elige tu Plan Lazo
				</Typography>
				<Typography
					variant="h6"
					component="p"
					color="text.secondary"
					sx={{ mt: 1, fontWeight: 400 }}
				>
					Soluciones inteligentes para cada etapa de tu práctica.
				</Typography>
			</Box>
			<DialogContent sx={{ pb: 6, px: 4, overflow: "visible" }}>
				<Box
					sx={{
						display: "flex",
						gap: 3,
						mt: 1,
						justifyContent: "center",
						alignItems: "flex-start",
					}}
				>
					<Box sx={{ flex: "1 1 0", maxWidth: 400 }}>
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
					<Box sx={{ flex: "1 1 0", maxWidth: 400 }}>
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
					<Box sx={{ flex: "1 1 0", maxWidth: 400 }}>
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
