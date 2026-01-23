import React, { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	Box,
	Typography,
	Button,
	useTheme,
	Stack,
	Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface UpgradeToProModalProps {
	open: boolean;
	onClose: () => void;
	userId: string;
	userEmail: string;
	usedTranscriptions: number;
	monthYear: string;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
	open,
	onClose,
	userId,
	userEmail,
	usedTranscriptions,
	monthYear,
}) => {
	const theme = useTheme();
	const [loading, setLoading] = useState(false);
	const [proPrice, setProPrice] = useState(19500);

	const apiUrl = import.meta.env.VITE_API_URL;

	useEffect(() => {
		if (open) {
			fetch(`${apiUrl}/api/prices`)
				.then((res) => res.json())
				.then((data) => {
					if (data.pro) setProPrice(data.pro);
				})
				.catch((err) => console.error("Error fetching prices:", err));
		}
	}, [open, apiUrl]);

	const handleUpgrade = async () => {
		setLoading(true);
		try {
			const redirectUrl = window.location.origin;
			const response = await fetch(`${apiUrl}/api/create-subscription`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					planId: "pro",
					userId,
					userEmail,
					redirectUrl,
				}),
			});
			const data = await response.json();

			if (data.init_point) {
				window.open(data.init_point, "_blank");
				onClose();
			}
		} catch (error) {
			console.error("Error creating subscription:", error);
		} finally {
			setLoading(false);
		}
	};

	const formatMonthYear = (monthYearVal: string) => {
		if (!monthYearVal) return "";
		const [year, month] = monthYearVal.split("-");
		const monthNames = [
			"Enero",
			"Febrero",
			"Marzo",
			"Abril",
			"Mayo",
			"Junio",
			"Julio",
			"Agosto",
			"Septiembre",
			"Octubre",
			"Noviembre",
			"Diciembre",
		];
		return `${monthNames[parseInt(month) - 1]} ${year}`;
	};

	const getNextMonth = () => {
		const date = new Date();
		date.setMonth(date.getMonth() + 1);
		return formatMonthYear(date.toISOString().slice(0, 7));
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth="sm"
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 3,
					bgcolor: "background.default",
					overflow: "hidden",
					maxHeight: "90vh",
				},
			}}
		>
			<Box
				sx={{
					background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
					p: 2.5,
					textAlign: "center",
					color: "primary.contrastText",
				}}
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", duration: 0.5 }}
				>
					<RocketLaunchIcon sx={{ fontSize: 40, mb: 1 }} />
				</motion.div>
				<Typography variant="h5" fontWeight="bold" gutterBottom>
					¡Alcanzaste tu límite mensual!
				</Typography>
				<Typography variant="body2" sx={{ opacity: 0.95 }}>
					Has usado {usedTranscriptions} de 3 transcripciones gratuitas en{" "}
					{formatMonthYear(monthYear)}
				</Typography>
			</Box>

			<DialogContent sx={{ p: 2.5 }}>
				<Stack spacing={2}>
					<Box>
						<Typography variant="subtitle1" fontWeight="bold" gutterBottom>
							Desbloquea transcripciones ilimitadas
						</Typography>
						<Typography variant="caption" color="text.secondary">
							Actualiza al Plan Pro y disfruta de todos estos beneficios:
						</Typography>
					</Box>

					<Stack spacing={1}>
						{[
							"Grabaciones ilimitadas cada mes",
							"Transcripción Whisper-v3 de alta calidad",
							"Análisis con Claude Sonnet 3.5",
							"Asistente IA 24/7 integrado",
							"Soporte prioritario por WhatsApp",
							"Exportación a PDF/Word",
						].map((feature, i) => (
							<Box
								key={i}
								sx={{ display: "flex", gap: 1, alignItems: "center" }}
							>
								<CheckCircleIcon sx={{ color: "primary.main", fontSize: 18 }} />
								<Typography variant="body2">{feature}</Typography>
							</Box>
						))}
					</Stack>

					<Divider />

					<Box sx={{ textAlign: "center" }}>
						<Typography
							variant="h4"
							fontWeight="bold"
							sx={{ color: "primary.main" }}
						>
							ARS ${proPrice.toLocaleString("es-AR")}
						</Typography>
						<Typography variant="caption" color="text.secondary">
							por mes • Cancela cuando quieras
						</Typography>
					</Box>

					<Stack direction="row" spacing={2}>
						<Button
							fullWidth
							variant="outlined"
							onClick={onClose}
							sx={{
								borderRadius: 2,
								py: 1.5,
								fontWeight: "bold",
								borderColor: "divider",
							}}
						>
							Tal vez después
						</Button>
						<Button
							fullWidth
							variant="contained"
							onClick={handleUpgrade}
							disabled={loading}
							sx={{
								borderRadius: 2,
								py: 1.5,
								fontWeight: "bold",
								bgcolor: "primary.main",
								"&:hover": {
									bgcolor: "primary.dark",
								},
							}}
						>
							{loading ? "Procesando..." : "Actualizar a Pro"}
						</Button>
					</Stack>

					<Typography
						variant="caption"
						color="text.secondary"
						textAlign="center"
					>
						Tu límite se renovará el 1° de {getNextMonth()}
					</Typography>
				</Stack>
			</DialogContent>
		</Dialog>
	);
};
