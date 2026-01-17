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
	Alert,
	TextField,
	InputAdornment,
	Chip,
} from "@mui/material";
import { LocalOffer as PromoIcon } from "@mui/icons-material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

interface SubscriptionModalProps {
	open: boolean;
	onClose: () => void;
	userId: string;
	userEmail: string;
}

interface Plan {
	id: string;
	plan_type: string;
	name: string;
	description: string;
	price_ars: number;
	features: string[];
	credits_initial: number;
	credits_monthly: number;
	is_active: boolean;
	display_order: number;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
	open,
	onClose,
	userId,
	userEmail,
}) => {
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(false);
	const [promoCode, setPromoCode] = useState("");
	const [validatedPromo, setValidatedPromo] = useState<any>(null);
	const [validating, setValidating] = useState(false);
	const [promoError, setPromoError] = useState<string | null>(null);

	const apiUrl = import.meta.env.VITE_API_URL;

	useEffect(() => {
		if (open) {
			// Fetch plans from our backend
			fetch(`${apiUrl}/api/plans`)
				.then((res) => res.json())
				.then((data) => {
					console.log("Plans from backend:", data);
					setPlans(data.plans || []);
				})
				.catch((err) => {
					console.error("Error fetching plans from backend:", err);
				});
		}
	}, [open, apiUrl]);

	const handleValidatePromo = async () => {
		if (!promoCode || promoCode.length !== 4) {
			setPromoError("El código debe tener 4 caracteres");
			return;
		}

		setValidating(true);
		setPromoError(null);
		try {
			const res = await fetch(`${apiUrl}/api/validate-promo-code`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code: promoCode, userId }),
			});
			const data = await res.json();
			if (data.valid) {
				setValidatedPromo(data.promo_code);
				setPromoError(null);
			} else {
				setPromoError(data.error || "Código inválido");
				setValidatedPromo(null);
			}
		} catch (err: any) {
			setPromoError("Error al validar código");
			setValidatedPromo(null);
		} finally {
			setValidating(false);
		}
	};

	const calculateDiscountedPrice = (basePrice: number) => {
		if (!validatedPromo) return basePrice;
		const discount = basePrice * (validatedPromo.discount_percentage / 100);
		return Math.round(basePrice - discount);
	};

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
			const response = await fetch(`${apiUrl}/api/create-subscription`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					planId,
					userId,
					userEmail,
					redirectUrl,
					promoCode: validatedPromo?.code || null,
				}),
			});
			const data = await response.json();
			console.log("Subscription created:", data);

			// If promo code is valid, apply it
			if (validatedPromo && data.id) {
				const plan = plans.find((p) => p.plan_type === planId);
				if (plan) {
					await fetch(`${apiUrl}/api/apply-promo-code`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							code: validatedPromo.code,
							userId,
							subscriptionId: data.id,
							planType: planId,
							originalPrice: plan.price_ars,
						}),
					});
				}
			}

			if (data.init_point) {
				// Open MercadoPago subscription page
				console.log("Opening subscription URL:", data.init_point);
				window.open(data.init_point, "_blank");
				onClose();
			} else {
				console.error("No init_point returned", data);
			}
		} catch (error) {
			console.error("Error creating subscription:", error);
		} finally {
			setLoading(false);
		}
	};

	const getColorForPlan = (planType: string) => {
		switch (planType) {
			case "free":
				return "text.disabled";
			case "pro":
				return "primary.main";
			case "ultra":
				return "secondary.main";
			default:
				return "primary.main";
		}
	};

	const PlanCard = ({ plan }: { plan: Plan }) => {
		const color = getColorForPlan(plan.plan_type);
		const isUltra = plan.plan_type === "ultra";
		const isFree = plan.plan_type === "free";
		const basePrice = plan.price_ars;
		const discountedPrice = calculateDiscountedPrice(basePrice);
		const hasDiscount = validatedPromo && !isFree;

		return (
			<Card
				sx={{
					minHeight: { xs: "auto", sm: 480 },
					display: "flex",
					flexDirection: "column",
					borderRadius: 4,
					boxShadow: (theme) => theme.shadows[2],
					border: "1px solid",
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
						{plan.name}
					</Typography>
					<Box sx={{ mb: 1 }}>
						{hasDiscount && (
							<Typography
								variant="body2"
								color="text.secondary"
								sx={{ textDecoration: "line-through", mb: 0.5 }}
							>
								ARS ${basePrice?.toLocaleString("es-AR")}
							</Typography>
						)}
						<Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
							<Typography
								variant="h3"
								fontWeight="bold"
								component="span"
								sx={{
									color: hasDiscount ? "success.main" : color,
									fontSize: { xs: "1.75rem", sm: "2.5rem" },
								}}
							>
								{isFree ?
									"Gratis"
								: isUltra && !plan.is_active ?
									"Próximamente"
								:	`ARS $${(hasDiscount ? discountedPrice : basePrice)?.toLocaleString("es-AR")}`
								}
							</Typography>
							{!isFree && !isUltra && (
								<Typography
									variant="body1"
									color="text.secondary"
									component="span"
								>
									/mes
								</Typography>
							)}
						</Box>
						{hasDiscount && (
							<Chip
								label={`${validatedPromo.discount_percentage}% OFF por ${validatedPromo.duration_months} meses`}
								color="success"
								size="small"
								icon={<PromoIcon />}
								sx={{ mt: 1 }}
							/>
						)}
					</Box>
					<Box sx={{ mb: 2, display: "block", minHeight: "2rem" }}>
						{isUltra && !plan.is_active ?
							<Typography
								variant="body2"
								color="text.secondary"
								fontWeight={500}
							>
								{plan.description}
							</Typography>
						: !isFree ?
							<Typography
								variant="caption"
								sx={{
									color: "text.secondary",
									opacity: 0.8,
									fontSize: "0.7rem",
									display: "block",
									mt: 0.5,
								}}
							>
								Suscripción mensual recurrente • Cancela cuando quieras
							</Typography>
						:	<Typography
								variant="body2"
								color="text.secondary"
								fontWeight={500}
							>
								{plan.description}
							</Typography>
						}
					</Box>
					<Divider sx={{ mb: 2 }} />
					<Box sx={{ mb: 3, flexGrow: 1 }}>
						{plan.features.map((f: string, i: number) => (
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
						disabled={loading || (isUltra && !plan.is_active)}
						sx={{
							borderRadius: 2,
							py: 1.5,
							fontWeight: "bold",
							bgcolor: color,
							color: "white",
							"&:hover": {
								bgcolor: color,
								opacity: 0.9,
							},
						}}
						onClick={() => handleSubscribe(plan.plan_type as any)}
					>
						{loading ?
							<CircularProgress size={24} color="inherit" />
						: isUltra && !plan.is_active ?
							"Próximamente"
						: isFree ?
							"Continuar Gratis"
						:	"Elegir Plan"}
					</Button>
				</CardContent>
			</Card>
		);
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="lg"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 4,
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
						color: "primary.main",
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
				{/* Promo Code Input */}
				<Box
					sx={{
						mb: 3,
						width: "100%",
						maxWidth: { xs: "100%", md: 900 },
					}}
				>
					<TextField
						fullWidth
						size="small"
						label="Código Promocional (opcional)"
						value={promoCode}
						onChange={(e) =>
							setPromoCode(e.target.value.toUpperCase().slice(0, 4))
						}
						placeholder="Ej: PROMO"
						error={!!promoError}
						helperText={promoError}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<PromoIcon color="action" />
								</InputAdornment>
							),
							endAdornment: (
								<InputAdornment position="end">
									<Button
										size="small"
										onClick={handleValidatePromo}
										disabled={
											validating || promoCode.length !== 4 || !!validatedPromo
										}
										variant="contained"
										sx={{ borderRadius: 1 }}
									>
										{validating ?
											<CircularProgress size={20} color="inherit" />
										: validatedPromo ?
											"✓"
										:	"Aplicar"}
									</Button>
								</InputAdornment>
							),
						}}
						sx={{
							"& .MuiOutlinedInput-root": {
								borderRadius: 2,
							},
						}}
					/>
					{validatedPromo && (
						<Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
							<Typography variant="body2" fontWeight="bold">
								¡Código válido! 🎉
							</Typography>
							<Typography variant="body2">
								{validatedPromo.discount_percentage}% de descuento por{" "}
								{validatedPromo.duration_months}{" "}
								{validatedPromo.duration_months === 1 ? "mes" : "meses"}
							</Typography>
						</Alert>
					)}
				</Box>

				<Alert
					severity="info"
					sx={{
						mb: 3,
						borderRadius: 2,
						width: "100%",
						maxWidth: { xs: "100%", md: 900 },
					}}
				>
					<Typography variant="body2" sx={{ fontWeight: 500 }}>
						<strong>Nota:</strong> Puedes pagar con cualquier email en
						MercadoPago. El sistema guardará automáticamente tu email de pago
						para futuras renovaciones.
					</Typography>
				</Alert>
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
					{plans.map((plan) => (
						<Box
							key={plan.id}
							sx={{
								flex: "1 1 0",
								maxWidth: { xs: "100%", md: 400 },
								width: "100%",
							}}
						>
							<PlanCard plan={plan} />
						</Box>
					))}
				</Box>
			</DialogContent>
		</Dialog>
	);
};
