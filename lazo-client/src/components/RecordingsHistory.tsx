import React, { useEffect, useState } from "react";
import {
	Box,
	Typography,
	Paper,
	List,
	ListItem,
	ListItemText,
	ListItemAvatar,
	Avatar,
	Chip,
	IconButton,
	Container,
	useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MicIcon from "@mui/icons-material/Mic";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { getBackgrounds } from "../styles.theme";

interface Recording {
	id: number;
	filename: string;
	file_path: string;
	detected_at: string;
	status: "new" | "processed" | "archived";
	duration: number;
}

interface RecordingsHistoryProps {
	onBack: () => void;
}

export const RecordingsHistory: React.FC<RecordingsHistoryProps> = ({
	onBack,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const [recordings, setRecordings] = useState<Recording[]>([]);

	useEffect(() => {
		loadRecordings();

		const handleFileDetected = (_event: unknown, _filePath: string) => {
			loadRecordings();
		};

		// @ts-ignore
		window.ipcRenderer?.on("file-detected", handleFileDetected);

		return () => {
			// @ts-ignore
			window.ipcRenderer?.off("file-detected", handleFileDetected);
		};
	}, []);

	const loadRecordings = async () => {
		// @ts-ignore
		const data = await window.ipcRenderer?.getRecordings();
		if (data) {
			setRecordings(data);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	return (
		<Box
			sx={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				bgcolor: "background.default",
			}}
		>
			{/* Header */}
			<Paper
				elevation={0}
				square
				sx={{
					height: 64,
					px: 3,
					display: "flex",
					alignItems: "center",
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: backgrounds.glass.modal,
					backdropFilter: "blur(12px)",
					position: "sticky",
					top: 0,
					zIndex: 10,
				}}
			>
				<IconButton onClick={onBack} sx={{ mr: 2 }}>
					<ArrowBackIcon />
				</IconButton>
				<Typography
					variant="h6"
					sx={{
						fontWeight: 700,
						color: "primary.main",
					}}
				>
					Historial de Grabaciones
				</Typography>
			</Paper>

			<Container maxWidth="md" sx={{ mt: 4, mb: 4, flex: 1, overflow: "auto" }}>
				{recordings.length === 0 ? (
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							height: "50vh",
							opacity: 0.7,
						}}
					>
						<MicIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
						<Typography variant="h6" color="text.secondary">
							No hay grabaciones detectadas aún
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Las grabaciones de la carpeta vigilada aparecerán aquí.
						</Typography>
					</Box>
				) : (
					<Paper
						elevation={0}
						sx={{
							border: "1px solid",
							borderColor: "divider",
							borderRadius: 3,
							overflow: "hidden",
						}}
					>
						<List sx={{ p: 0 }}>
							{recordings.map((recording, index) => (
								<React.Fragment key={recording.id}>
									<ListItem
										secondaryAction={
											<IconButton edge="end" aria-label="play">
												<PlayArrowIcon />
											</IconButton>
										}
										sx={{
											py: 2,
											"&:hover": { bgcolor: "action.hover" },
										}}
									>
										<ListItemAvatar>
											<Avatar
												sx={{
													bgcolor:
														recording.status === "new"
															? "primary.light"
															: "action.disabledBackground",
												}}
											>
												<MicIcon />
											</Avatar>
										</ListItemAvatar>
										<ListItemText
											primary={
												<Box
													sx={{ display: "flex", alignItems: "center", gap: 1 }}
												>
													<Typography variant="subtitle1" fontWeight={500}>
														{recording.filename}
													</Typography>
													{recording.status === "new" && (
														<Chip
															label="Nuevo"
															size="small"
															color="primary"
															variant="outlined"
															sx={{ height: 20, fontSize: "0.7rem" }}
														/>
													)}
												</Box>
											}
											secondary={formatDate(recording.detected_at)}
										/>
									</ListItem>
									{index < recordings.length - 1 && (
										<Box
											component="li"
											sx={{
												borderBottom: "1px solid",
												borderColor: "divider",
											}}
										/>
									)}
								</React.Fragment>
							))}
						</List>
					</Paper>
				)}
			</Container>
		</Box>
	);
};
