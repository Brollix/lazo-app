import { Box, styled, Typography } from "@mui/material";

// Modern Gradient Constants
export const gradients = {
	primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
	success: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
	warning: "linear-gradient(135deg, #fce38a 0%, #f38181 100%)",
	background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
	glass: "rgba(255, 255, 255, 0.25)",
};

export const shadows = {
	card: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
	soft: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

export const GlassCard = styled(Box)(({ theme }) => ({
	background: gradients.glass,
	backdropFilter: "blur(10px)",
	borderRadius: "20px",
	border: "1px solid rgba(255, 255, 255, 0.18)",
	boxShadow: shadows.card,
	padding: theme.spacing(4),
	transition: "transform 0.3s ease-in-out",
	"&:hover": {
		transform: "translateY(-5px)",
	},
}));

export const StyledDropzone = styled(Box)<{ isDragActive: boolean }>(
	({ theme, isDragActive }) => ({
		border: "2px dashed",
		borderColor: isDragActive ? "#764ba2" : "rgba(255, 255, 255, 0.5)",
		borderRadius: "20px",
		padding: theme.spacing(6),
		textAlign: "center",
		cursor: "pointer",
		transition: "all 0.3s ease",
		backgroundColor: isDragActive ? "rgba(118, 75, 162, 0.1)" : "transparent",
		"&:hover": {
			borderColor: "#764ba2",
			backgroundColor: "rgba(118, 75, 162, 0.05)",
		},
	})
);

export const statusColors = {
	uploading: "#667eea",
	processing: "#fce38a",
	completed: "#38ef7d",
	error: "#ff6b6b",
};
