import { Box, Typography, ButtonBase } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";

const TitleBar = () => {
	const theme = useTheme();
	const [isMaximized, setIsMaximized] = useState(false);

	// Removed useEffect logs

	const handleMinimize = () => {
		// Removed debug log
		if ((window as any).ipcRenderer) {
			(window as any).ipcRenderer.send("window-minimize");
		}
	};

	const handleMaximize = () => {
		// Removed debug log
		if ((window as any).ipcRenderer) {
			(window as any).ipcRenderer.send("window-maximize");
			setIsMaximized(!isMaximized);
		}
	};

	const handleClose = () => {
		// Removed debug log
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
				backgroundColor: theme.palette.background.default,
				userSelect: "none",
				paddingLeft: 2,
			}}
			style={{ WebkitAppRegion: "drag" } as any}
		>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
				<Typography
					variant="subtitle2"
					sx={{ color: theme.palette.text.primary, fontWeight: 600 }}
				>
					lazo
				</Typography>
			</Box>

			<Box sx={{ display: "flex", height: "100%" }}>
				<WindowControl onClick={handleMinimize} hoverColor="rgba(0,0,0,0.1)">
					<svg width="10" height="1" viewBox="0 0 10 1">
						<path d="M0 0h10v1H0z" fill={theme.palette.text.primary} />
					</svg>
				</WindowControl>

				<WindowControl onClick={handleMaximize} hoverColor="rgba(0,0,0,0.1)">
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
					hoverColor="#E81123"
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

interface WindowControlProps {
	onClick: () => void;
	children: React.ReactNode;
	hoverColor: string;
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
				// Remove focus outline behavior
				"&:focus": {
					outline: "none",
				},
				"&:focus-visible": {
					outline: "none",
				},
				WebkitAppRegion: "no-drag",
				"&:hover": {
					backgroundColor: hoverColor,
					"& svg path": {
						fill: hoverIconColor || theme.palette.text.primary,
					},
				},
			}}
			style={{ WebkitAppRegion: "no-drag" } as any}
		>
			{children}
		</ButtonBase>
	);
};

export default TitleBar;
