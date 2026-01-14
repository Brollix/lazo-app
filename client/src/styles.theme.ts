// Light mode colors (original terracotta palette)
const lightColors = {
	terracotta: "#D6684E", // Slightly deeper terracotta
	darkSlate: "#2D3047", // Slightly more navy slate
	cream: "#FAF9F6", // Softer off-white
	softGreen: "#6B9080", // Muted sage green
	deepOrange: "#E29578", // Complementary muted orange
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
	darkSlate: "#1F2133", // Slightly lighter for UI depth
	cream: "#0B0D11", // Deep background
	softGreen: "#81B29A",
	deepOrange: "#F2CC8F",
	white: "#FFFFFF",
	glassBorder: "rgba(255, 255, 255, 0.12)",
	text: {
		primary: "#FFFFFF",
		secondary: "#B0B5D1", // Much lighter for better contrast
	},
	status: {
		success: "#81B29A",
		error: "#E07A5F",
		warning: "#F2CC8F",
		info: "#B0B5D1",
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

// Border Radius Scale (using Material Design spacing scale)
// DESIGN RULE: When nesting rounded elements, parent padding should be >= child border-radius
// Example: If a card has borderRadius.md (2 = 16px), its container should have padding >= 2
export const borderRadius = {
	xs: 0.25, // 1px
	sm: 0.5, // 2px
	md: 1, // 4px
	lg: 1.5, // 6px
	xl: 2, // 8px
};

// Spacing Scale (multiplier of 8px base unit)
export const spacing = {
	xs: 0.5, // 4px
	sm: 1, // 8px
	md: 2, // 16px
	lg: 3, // 24px
	xl: 4, // 32px
	xxl: 6, // 48px
};

// Extended color palette - responsive to theme mode for better contrast
export const getExtendedColors = (mode: "light" | "dark") => ({
	neutral: {
		// Gray - lighter in dark mode for better contrast
		gray: mode === "light" ? "#757575" : "#9E9E9E",
		// Dark blue - much brighter in dark mode for readability
		darkBlue: mode === "light" ? "#1A237E" : "#5C6BC0", // Indigo 400
		darkBg: "#0F1116", // rgb(15, 17, 22)
		white: "#FFFFFF",
	},
	semantic: {
		dangerBg: "rgba(255, 0, 0, 0.05)",
		dangerBorder: "rgba(255, 0, 0, 0.1)",
	},
});

// Opacity scale
export const opacity = {
	low: 0.4,
	medium: 0.6,
	high: 0.8,
	veryHigh: 0.9,
	overlay: 0.7,
};

// Backgrounds with glassmorphism
export const getBackgrounds = (mode: "light" | "dark") => ({
	glass: {
		header:
			mode === "light" ? "rgba(255, 255, 255, 0.8)" : "rgba(15, 17, 22, 0.8)",
		panel:
			mode === "light" ? "rgba(255, 255, 255, 0.7)" : "rgba(15, 17, 22, 0.7)",
		modal:
			mode === "light" ? "rgba(255, 255, 255, 0.8)" : "rgba(26, 26, 26, 0.8)",
	},
	hover: {
		light: "rgba(0, 0, 0, 0.05)",
		dark: "rgba(255, 255, 255, 0.05)",
		primaryLight: "rgba(102, 60, 48, 0.1)",
	},
});

// Extended shadows
export const getExtendedShadows = (mode: "light" | "dark") => ({
	...getShadows(mode),
	panel:
		mode === "light"
			? "0 8px 32px rgba(0,0,0,0.06)"
			: "0 8px 32px rgba(0,0,0,0.5)",
	editor:
		mode === "light"
			? "0 2px 12px rgba(0,0,0,0.02)"
			: "0 2px 12px rgba(0,0,0,0.3)",
});

// Typography extended
export const typographyExtended = {
	fontSizes: {
		xxs: "0.625rem", // 10px
		xs: "0.7rem", // ~11px
		sm: "0.75rem", // 12px
		md: "0.875rem", // 14px
		lg: "1rem", // 16px
	},
	fontWeights: {
		light: 400,
		regular: 500,
		semibold: 600,
		bold: 700,
		extrabold: 800,
		black: 900,
	},
	letterSpacing: {
		tight: "-0.05em",
		slightlyTight: "-0.04em",
		slightlyTightMedium: "-0.03em",
		slightlyTightSmall: "-0.02em",
		normal: "0",
		relaxed: "0.05em",
		extraRelaxed: 1, // 1px for small caps
	},
};

// Component-specific constants
export const components = {
	subscriptionCard: {
		height: 460,
		borderWidth: 2,
	},
	popularBadge: {
		px: 1.5,
		py: 1.5, // Must be >= borderRadius.sm (1.5) per design rule
		fontSize: "0.7rem",
		fontWeight: 800,
		letterSpacing: 1,
	},
	planButton: {
		py: 1.2,
		fontWeight: 700,
	},
	titleBar: {
		height: 32,
		controlWidth: 46,
	},
	audioPlayer: {
		waveHeight: 48,
		barWidth: 2,
		barGap: 3,
		barRadius: 3,
		minPxPerSec: 50,
		avatarSize: 28,
	},
	chatMessage: {
		maxWidth: "85%",
		avatarSize: 28,
		borderRadius: {
			user: "12px 12px 2px 12px",
			bot: "2px 12px 12px 12px",
		},
	},
	dashboard: {
		headerHeight: 64,
		panelFlex: {
			left: 3,
			center: 4,
			right: 3,
		},
	},
};

// Default exports for backward compatibility (Deprecated: should use useTheme)
export const colors = lightColors;
export const gradients = getGradients("light");
export const shadows = getShadows("light");
