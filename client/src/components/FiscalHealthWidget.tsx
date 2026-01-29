import React from "react";
import {
	Box,
	Paper,
	Typography,
	LinearProgress,
	Stack,
	Tooltip,
	useTheme,
} from "@mui/material";
import {
	TrendingUp,
	WarningAmber,
	ErrorOutline,
	CheckCircleOutline,
} from "@mui/icons-material";

interface FiscalHealthWidgetProps {
	grossRevenue30d: number;
	monthlyLimit: number;
}

export const FiscalHealthWidget: React.FC<FiscalHealthWidgetProps> = ({
	grossRevenue30d,
	monthlyLimit,
}) => {
	const theme = useTheme();

	// Thresholds
	const YELLOW_THRESHOLD = 500000;
	const RED_THRESHOLD = 800000;

	// Determine state
	let statusColor = theme.palette.success.main;
	let statusText = "Operación bajo el radar";
	let statusIcon = <CheckCircleOutline sx={{ fontSize: 18 }} />;
	let progressValue = (grossRevenue30d / monthlyLimit) * 100;

	if (grossRevenue30d >= RED_THRESHOLD) {
		statusColor = theme.palette.error.main;
		statusText = "LÍMITE DE RIESGO: INSCRIBIRSE AHORA";
		statusIcon = <ErrorOutline sx={{ fontSize: 18 }} />;
	} else if (grossRevenue30d >= YELLOW_THRESHOLD) {
		statusColor = theme.palette.warning.main;
		statusText = "Preparar inscripción en Monotributo";
		statusIcon = <WarningAmber sx={{ fontSize: 18 }} />;
	}

	const formatCurrency = (val: number) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			maximumFractionDigits: 0,
		}).format(val);
	};

	return (
		<Tooltip
			title={`Límite Monotributo Cat A: ${formatCurrency(monthlyLimit)}/mes`}
			arrow
		>
			<Paper
				elevation={0}
				sx={{
					p: 1.5,
					px: 2,
					borderRadius: 3,
					bgcolor:
						theme.palette.mode === "dark" ?
							"rgba(255, 255, 255, 0.03)"
						:	"rgba(0, 0, 0, 0.02)",
					border: "1px solid",
					borderColor: "divider",
					minWidth: 280,
					display: "flex",
					flexDirection: "column",
					gap: 1,
					transition: "all 0.2s ease-in-out",
					"&:hover": {
						borderColor: statusColor,
						bgcolor:
							theme.palette.mode === "dark" ?
								"rgba(255, 255, 255, 0.05)"
							:	"rgba(0, 0, 0, 0.03)",
					},
				}}
			>
				<Stack
					direction="row"
					justifyContent="space-between"
					alignItems="center"
				>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<TrendingUp sx={{ fontSize: 16, color: "text.secondary" }} />
						<Typography
							variant="caption"
							sx={{
								fontWeight: 600,
								color: "text.secondary",
								textTransform: "uppercase",
								letterSpacing: "0.05em",
							}}
						>
							Facturación (30d)
						</Typography>
					</Box>
					<Typography
						variant="subtitle2"
						sx={{ fontWeight: 800, color: statusColor }}
					>
						{formatCurrency(grossRevenue30d)}
					</Typography>
				</Stack>

				<Box sx={{ width: "100%", mt: 0.5 }}>
					<LinearProgress
						variant="determinate"
						value={Math.min(progressValue, 100)}
						sx={{
							height: 6,
							borderRadius: 3,
							bgcolor:
								theme.palette.mode === "dark" ?
									"rgba(255,255,255,0.1)"
								:	"rgba(0,0,0,0.05)",
							"& .MuiLinearProgress-bar": {
								bgcolor: statusColor,
								borderRadius: 3,
							},
						}}
					/>
				</Box>

				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						color: statusColor,
					}}
				>
					{statusIcon}
					<Typography
						variant="caption"
						sx={{ fontWeight: 700, fontSize: "0.7rem" }}
					>
						{statusText}
					</Typography>
				</Box>
			</Paper>
		</Tooltip>
	);
};
