import { Box, Typography, ButtonBase } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useContext } from "react";
import { ThemeContext } from "../App";
import { components as themeComponents } from "../styles.theme";

interface WindowControlProps {
	onClick: () => void;
	children: React.ReactNode;
	hoverColor: string | ((theme: any) => string);
}

const WindowControl = ({
	onClick,
	children,
	hoverColor,
}: WindowControlProps) => {
	const theme = useTheme();
	return (
		<ButtonBase
			onClick={onClick}
			disableRipple
			sx={{
				width: themeComponents.titleBar.controlWidth,
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				border: "none",
				outline: "none",
				"&:focus": { outline: "none" },
				"&:focus-visible": { outline: "none" },
				WebkitAppRegion: "no-drag",
				"&:hover": {
					backgroundColor:
						typeof hoverColor === "function" ? hoverColor(theme) : hoverColor,
					"& svg path": {
						fill: theme.palette.text.primary,
					},
					"& svg": {
						stroke: theme.palette.text.primary,
					},
				},
			}}
			style={{ WebkitAppRegion: "no-drag" } as any}
		>
			{children}
		</ButtonBase>
	);
};

const TitleBar = () => {
	const theme = useTheme();
	const { mode, toggleTheme } = useContext(ThemeContext);

	return (
		<Box
			sx={{
				height: themeComponents.titleBar.height,
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				bgcolor: "background.default",
				userSelect: "none",
				px: 2,
				borderBottom: "1px solid",
				borderColor: "divider",
			}}
			style={{ WebkitAppRegion: "drag" } as any}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Typography
					variant="subtitle2"
					sx={{ color: "text.primary", fontWeight: 600 }}
				>
					lazo
				</Typography>
			</Box>

			<Box
				sx={{ display: "flex", height: "100%", alignItems: "center", gap: 0.5 }}
			>
				<WindowControl onClick={toggleTheme} hoverColor="action.hover">
					{mode === "light" ? (
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<path
								d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
								fill={theme.palette.text.primary}
							/>
						</svg>
					) : (
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<circle cx="12" cy="12" r="5" fill={theme.palette.text.primary} />
							<path
								d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
								stroke={theme.palette.text.primary}
								strokeWidth="2"
								strokeLinecap="round"
							/>
						</svg>
					)}
				</WindowControl>
			</Box>
		</Box>
	);
};

export default TitleBar;
