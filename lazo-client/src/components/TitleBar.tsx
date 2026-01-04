import { Box, Typography, ButtonBase } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useState, useContext } from "react";
import { ThemeContext } from "../App";

interface WindowControlProps {
	onClick: () => void;
	children: React.ReactNode;
	hoverColor: string | ((theme: any) => string);
	hoverIconColor?: string;
}

const WindowControl = ({
	onClick,
	children,
	hoverColor,
	hoverIconColor,
}: WindowControlProps) => {
	const theme = useTheme();
	return (
		<ButtonBase
			onClick={onClick}
			disableRipple
			sx={{
				width: "46px",
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
						fill: hoverIconColor || theme.palette.text.primary,
					},
					"& svg": {
						stroke: hoverIconColor || theme.palette.text.primary,
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
	const [isMaximized, setIsMaximized] = useState(false);
	const { mode, toggleTheme } = useContext(ThemeContext);

	const handleMinimize = () => {
		if ((window as any).ipcRenderer) {
			(window as any).ipcRenderer.send("window-minimize");
		}
	};

	const handleMaximize = () => {
		if ((window as any).ipcRenderer) {
			(window as any).ipcRenderer.send("window-maximize");
			setIsMaximized(!isMaximized);
		}
	};

	const handleClose = () => {
		if ((window as any).ipcRenderer) {
			(window as any).ipcRenderer.send("window-close");
		}
	};

	return (
		<Box
			sx={{
				height: "32px",
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
				<WindowControl
					onClick={toggleTheme}
					hoverColor={(theme) =>
						theme.palette.mode === "light"
							? "rgba(0,0,0,0.05)"
							: "rgba(255,255,255,0.05)"
					}
				>
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

				<WindowControl
					onClick={handleMinimize}
					hoverColor={(theme) =>
						theme.palette.mode === "light"
							? "rgba(0,0,0,0.05)"
							: "rgba(255,255,255,0.05)"
					}
				>
					<svg width="10" height="1" viewBox="0 0 10 1">
						<path d="M0 0h10v1H0z" fill={theme.palette.text.primary} />
					</svg>
				</WindowControl>

				<WindowControl
					onClick={handleMaximize}
					hoverColor={(theme) =>
						theme.palette.mode === "light"
							? "rgba(0,0,0,0.05)"
							: "rgba(255,255,255,0.05)"
					}
				>
					{isMaximized ? (
						<svg width="10" height="10" viewBox="0 0 10 10">
							<path
								d="M2.1,0v2H0v8h8V8h2V0H2.1z M7,9H1V3h6V9z M9,7H8V2H3V1h6V7z"
								fill={theme.palette.text.primary}
							/>
						</svg>
					) : (
						<svg width="10" height="10" viewBox="0 0 10 10">
							<path
								d="M0,0v10h10V0H0z M9,9H1V1h8V9z"
								fill={theme.palette.text.primary}
							/>
						</svg>
					)}
				</WindowControl>

				<WindowControl
					onClick={handleClose}
					hoverColor={(theme) => theme.palette.error.main}
					hoverIconColor="#FFFFFF"
				>
					<svg width="10" height="10" viewBox="0 0 10 10">
						<path
							d="M0,0h0l5,5l-5,5v0h0l1,1h0l5-5l5,5h0l1-1v0L6,5l5-5l-1-1l-5,5L1-1H0z"
							fill={theme.palette.text.primary}
						/>
					</svg>
				</WindowControl>
			</Box>
		</Box>
	);
};

export default TitleBar;
