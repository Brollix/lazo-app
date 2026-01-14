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
} from "@mui/material";
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
	price_usd: number;
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
	const [dolarRate, setDolarRate] = useState<number>(1950);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(false);

	const apiUrl = import.meta.env.VITE_API_URL;

	useEffect(() => {
		if (open) {
			// Fetch plans from our backend
			fetch(`${apiUrl}/api/plans`)
				.then((res) => res.json())
				.then((data) => {
					console.log("Plans from backend:", data);
					setPlans(data.plans || []);
					if (data.rate) setDolarRate(data.rate);
				})
				.catch((err) => {
					console.error("Error fetching plans from backend:", err);
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
				body: JSON.stringify({ planId, userId, userEmail, redirectUrl }),
			});
			const data = await response.json();
			console.log("Subscription created:", data);

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
						<Typography
							variant="h3"
							fontWeight="bold"
							component="span"
							sx={{ color: color, fontSize: { xs: "1.75rem", sm: "2.5rem" } }}
						>
							{isFree
								? "Gratis"
								: isUltra && !plan.is_active
								? "Próximamente"
								: `ARS $${plan.price_ars?.toLocaleString("es-AR")}`}
						</Typography>
						{!isFree && !isUltra && (
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
					<Box sx={{ mb: 2, display: "block", minHeight: "2rem" }}>
						{isUltra && !plan.is_active ? (
							<Typography
								variant="body2"
								color="text.secondary"
								fontWeight={500}
							>
								{plan.description}
							</Typography>
						) : !isFree ? (
							<>
								<Typography
									variant="body2"
									color="text.secondary"
									fontWeight={500}
								>
									USD ${plan.price_usd} × Dólar Tarjeta
									<br />
									(Cotización: ARS ${dolarRate.toLocaleString("es-AR")})
								</Typography>
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
							</>
						) : (
							<Typography
								variant="body2"
								color="text.secondary"
								fontWeight={500}
							>
								{plan.description}
							</Typography>
						)}
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
						{loading ? (
							<CircularProgress size={24} color="inherit" />
						) : isUltra && !plan.is_active ? (
							"Próximamente"
						) : isFree ? (
							"Continuar Gratis"
						) : (
							"Elegir Plan"
						)}
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
