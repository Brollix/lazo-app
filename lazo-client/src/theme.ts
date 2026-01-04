import { createTheme } from "@mui/material/styles";
import { getColors, typography } from "./styles.theme";

export const createAppTheme = (mode: "light" | "dark") => {
	const colors = getColors(mode);

	return createTheme({
		palette: {
			mode,
			primary: {
				main: colors.terracotta,
				contrastText: colors.white,
			},
			secondary: {
				main: colors.darkSlate,
				contrastText: colors.white,
			},
			background: {
				default: colors.cream,
				paper: mode === "light" ? colors.white : "#2d2d2d",
			},
			text: {
				primary: colors.text.primary,
				secondary: colors.text.secondary,
			},
			success: {
				main: colors.status.success,
			},
			warning: {
				main: colors.status.warning,
			},
			error: {
				main: colors.status.error,
			},
			info: {
				main: colors.status.info,
			},
		},
		typography: {
			fontFamily: typography.fontFamily,
			h1: {
				fontWeight: 900,
				letterSpacing: "-0.04em",
				color: colors.darkSlate,
			},
			h2: {
				fontWeight: 900,
				letterSpacing: "-0.04em",
				color: colors.darkSlate,
			},
			h3: {
				fontWeight: 900,
				letterSpacing: "-0.03em",
				color: colors.darkSlate,
			},
			h4: {
				fontWeight: 700,
				letterSpacing: "-0.02em",
				color: colors.darkSlate,
			},
			h5: {
				fontWeight: 700,
				letterSpacing: "-0.02em",
				color: colors.terracotta,
			},
			h6: { fontWeight: 700, color: colors.darkSlate },
			button: {
				textTransform: "none",
				fontWeight: 700,
			},
			subtitle1: { fontWeight: 600, color: colors.darkSlate },
			subtitle2: {
				fontWeight: 700,
				textTransform: "uppercase",
				fontSize: "0.75rem",
				letterSpacing: "0.05em",
				color: colors.softGreen,
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
							boxShadow: `0 4px 12px ${colors.terracotta}33`,
						},
					},
					contained: {
						boxShadow: "none",
					},
				},
			},
			MuiPaper: {
				styleOverrides: {
					root: {
						backgroundImage: "none",
					},
					elevation0: {
						border: `1px solid ${colors.glassBorder}`,
					},
				},
			},
			MuiTextField: {
				styleOverrides: {
					root: {
						"& .MuiOutlinedInput-root": {
							borderRadius: 12,
							"& fieldset": {
								borderColor:
									mode === "light"
										? "rgba(61, 64, 91, 0.1)"
										: "rgba(255, 255, 255, 0.1)",
							},
							"&:hover fieldset": { borderColor: colors.terracotta },
							"&.Mui-focused fieldset": { borderColor: colors.terracotta },
						},
					},
				},
			},
		},
	});
};

// Export default light theme for backward compatibility
export const theme = createAppTheme("light");
