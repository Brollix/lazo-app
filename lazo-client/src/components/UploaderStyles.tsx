import { Box, styled, Theme } from "@mui/material";
import { getColors, getGradients, getShadows } from "../styles.theme";

// Helper to get theme mode from MUI theme
const getMode = (theme: Theme) => theme.palette.mode || "light";

export const GlassCard = styled(Box)(({ theme }) => {
	const mode = getMode(theme);
	const gradients = getGradients(mode);
	const shadows = getShadows(mode);
	const colors = getColors(mode);

	return {
		background: gradients.glass,
		backdropFilter: "blur(10px)",
		borderRadius: "20px",
		border: `1px solid ${colors.glassBorder}`,
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
	const mode = getMode(theme);
	const colors = getColors(mode);

	return {
		border: "2px dashed",
		borderColor: isDragActive
			? colors.terracotta
			: mode === "light"
			? "rgba(0,0,0,0.1)"
			: "rgba(255,255,255,0.1)",
		borderRadius: "20px",
		padding: theme.spacing(6),
		textAlign: "center",
		cursor: "pointer",
		transition: "all 0.3s ease",
		backgroundColor: isDragActive ? `${colors.terracotta}1A` : "transparent",
		"&:hover": {
			borderColor: colors.terracotta,
			backgroundColor: `${colors.terracotta}0D`,
		},
	};
});

export const getStatusColors = (mode: "light" | "dark") => {
	const colors = getColors(mode);
	return {
		uploading: colors.terracotta,
		processing: colors.deepOrange,
		completed: colors.softGreen,
		error: colors.status.error,
	};
};
