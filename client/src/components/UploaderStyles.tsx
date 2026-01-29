import { Box, styled, alpha } from "@mui/material";
import { getGradients, getShadows } from "../styles.theme";

// Helper to get theme mode from MUI theme
const getMode = (theme: any) => theme.palette.mode || "light";

export const GlassCard = styled(Box)(({ theme }) => {
	const gradients = getGradients(getMode(theme));
	const shadows = getShadows(getMode(theme));

	return {
		background: gradients.glass,
		backdropFilter: "blur(10px)",
		borderRadius: (theme.shape.borderRadius as number) * 1.25,
		border: "1px solid rgba(255, 255, 255, 0.18)",
		boxShadow: shadows.card,
		padding: theme.spacing(4),
		transition: "transform 0.3s ease-in-out",
		"&:hover": {
			transform: "translateY(-5px)",
		},
	};
});

export const StyledDropzone = styled(Box, {
	shouldForwardProp: (prop) => prop !== "isDragActive",
})<{ isDragActive: boolean }>(({ theme, isDragActive }) => {
	return {
		border: "2px dashed",
		borderColor: isDragActive
			? theme.palette.primary.main
			: theme.palette.divider,
		borderRadius: (theme.shape.borderRadius as number) * 1.25,
		padding: theme.spacing(6),
		textAlign: "center",
		cursor: "pointer",
		transition: "all 0.3s ease",
		backgroundColor: isDragActive
			? alpha(theme.palette.primary.main, 0.1)
			: "transparent",
		"&:hover": {
			borderColor: theme.palette.primary.main,
			backgroundColor: alpha(theme.palette.primary.main, 0.05),
		},
	};
});

export const getStatusColors = (theme: any) => {
	return {
		uploading: theme.palette.primary.main,
		processing: theme.palette.warning.main,
		completed: theme.palette.success.main,
		error: theme.palette.error.main,
	};
};
