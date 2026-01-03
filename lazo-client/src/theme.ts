import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
	palette: {
		primary: {
			main: "#E07A5F", // Terracotta
			contrastText: "#FFFFFF",
		},
		secondary: {
			main: "#3D405B", // Petrol Blueish / Dark Slate
			contrastText: "#FFFFFF",
		},
		background: {
			default: "#F4F1DE", // Cream/Eggshell
			paper: "#FFFFFF",
		},
		text: {
			primary: "#3D405B",
			secondary: "#81B29A", // Soft Green for accents/secondary text
		},
	},
	typography: {
		fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
		h1: { fontWeight: 900, letterSpacing: "-0.04em" },
		h2: { fontWeight: 900, letterSpacing: "-0.04em" },
		h3: { fontWeight: 900, letterSpacing: "-0.03em" },
		h4: { fontWeight: 700, letterSpacing: "-0.02em" },
		h5: { fontWeight: 700, letterSpacing: "-0.02em" },
		h6: { fontWeight: 700 },
		button: {
			textTransform: "none",
			fontWeight: 700,
		},
		subtitle1: { fontWeight: 600 },
		subtitle2: {
			fontWeight: 700,
			textTransform: "uppercase",
			fontSize: "0.75rem",
			letterSpacing: "0.05em",
		},
	},
	shape: {
		borderRadius: 16,
	},
	components: {
		MuiButton: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					boxShadow: "none",
					"&:hover": {
						boxShadow: "0 4px 12px rgba(26, 35, 126, 0.1)", // Subtle shadow on hover
					},
				},
				contained: {
					// background: "linear-gradient(45deg, #E07A5F 30%, #F2CC8F 90%)", // Optional: Revert to solid primary or different gradient
					boxShadow: "none",
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none", // Remove default elevation gradient
				},
				elevation0: {
					border: "1px solid rgba(0,0,0,0.06)",
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					"& .MuiOutlinedInput-root": {
						borderRadius: 12,
						"& fieldset": { borderColor: "rgba(0,0,0,0.1)" },
						"&:hover fieldset": { borderColor: "#E07A5F" }, // Terracotta
						"&.Mui-focused fieldset": { borderColor: "#E07A5F" }, // Terracotta
					},
				},
			},
		},
	},
});
