// Light mode colors (original terracotta palette)
const lightColors = {
	terracotta: "#E07A5F",
	darkSlate: "#3D405B",
	cream: "#F4F1DE",
	softGreen: "#81B29A",
	deepOrange: "#F2CC8F",
	white: "#FFFFFF",
	glassBorder: "rgba(255, 255, 255, 0.18)",
	text: {
		primary: "#3D405B",
		secondary: "#81B29A",
	},
	status: {
		success: "#81B29A",
		error: "#D32F2F",
		warning: "#F2CC8F",
		info: "#3D405B",
	},
};

// Dark mode colors (refined for better contrast and aesthetics)
const darkColors = {
	terracotta: "#E07A5F",
	darkSlate: "#1E2030", // Dark navy/slate
	cream: "#0F1116", // Very dark background
	softGreen: "#81B29A",
	deepOrange: "#F2CC8F",
	white: "#FFFFFF",
	glassBorder: "rgba(255, 255, 255, 0.12)",
	text: {
		primary: "#FFFFFF",
		secondary: "#9499B6",
	},
	status: {
		success: "#81B29A",
		error: "#E07A5F",
		warning: "#F2CC8F",
		info: "#1E2030",
	},
};

export const getColors = (mode: "light" | "dark") => {
	return mode === "light" ? lightColors : darkColors;
};

export const getGradients = (mode: "light" | "dark") => {
	const c = getColors(mode);
	return {
		primary: `linear-gradient(135deg, ${c.terracotta} 0%, ${c.deepOrange} 100%)`,
		secondary: `linear-gradient(135deg, ${c.darkSlate} 0%, ${c.softGreen} 100%)`,
		glass:
			mode === "light" ? "rgba(255, 255, 255, 0.6)" : "rgba(30, 32, 48, 0.7)", // Darker glass for dark mode
	};
};

export const getShadows = (mode: "light" | "dark") => {
	return mode === "light"
		? {
				card: "0 8px 32px 0 rgba(61, 64, 91, 0.1)",
				soft: "0 4px 6px -1px rgba(61, 64, 91, 0.1), 0 2px 4px -1px rgba(61, 64, 91, 0.06)",
		  }
		: {
				card: "0 8px 32px 0 rgba(0, 0, 0, 0.6)",
				soft: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)",
		  };
};

export const typography = {
	fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
};

// Default exports for backward compatibility (Deprecated: should use useTheme)
export const colors = lightColors;
export const gradients = getGradients("light");
export const shadows = getShadows("light");
