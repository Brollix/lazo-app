import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import {
	Box,
	IconButton,
	Paper,
	Typography,
	Stack,
	Chip,
	useTheme,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	Collapse,
	Tooltip,
} from "@mui/material";
import {
	PlayArrow,
	Pause,
	Replay10,
	Forward10,
	Speed,
	PushPin,
	ExpandMore,
	ExpandLess,
} from "@mui/icons-material";
import {
	components as themeComponents,
	getExtendedColors,
} from "../styles.theme";

import { Biometry } from "./AudioUploader";

interface AudioPlayerProps {
	url: string;
	onReady?: () => void;
	onTimeUpdate?: (currentTime: number) => void;
	biometry?: Biometry;
	markers?: { timestamp: number; label: string }[];
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	onReady,
	onTimeUpdate,
	biometry,
	markers = [],
}) => {
	const theme = useTheme();
	const extendedColors = getExtendedColors(theme.palette.mode);
	const containerRef = useRef<HTMLDivElement>(null);
	const wavesurfer = useRef<WaveSurfer | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackRate, setPlaybackRate] = useState(1);
	const [showKeyMoments, setShowKeyMoments] = useState(true);

	// Initialize WaveSurfer
	useEffect(() => {
		if (!containerRef.current) return;

		if (wavesurfer.current) {
			wavesurfer.current.destroy();
		}

		wavesurfer.current = WaveSurfer.create({
			container: containerRef.current,
			waveColor:
				theme.palette.mode === "light"
					? theme.palette.grey[300]
					: "rgba(255, 255, 255, 0.2)",
			progressColor: theme.palette.primary.main,
			cursorColor: theme.palette.primary.main,
			barWidth: themeComponents.audioPlayer.barWidth,
			barGap: themeComponents.audioPlayer.barGap,
			barRadius: themeComponents.audioPlayer.barRadius,
			height: themeComponents.audioPlayer.waveHeight,
			normalize: true,
			url: url,
			dragToSeek: true,
		});

		wavesurfer.current.on("ready", () => {
			setDuration(wavesurfer.current?.getDuration() || 0);
			onReady?.();
		});

		// Use 'timeupdate' for smoother updates while dragging
		wavesurfer.current.on("timeupdate", (time) => {
			setCurrentTime(time);
			onTimeUpdate?.(time);
		});

		wavesurfer.current.on("play", () => setIsPlaying(true));
		wavesurfer.current.on("pause", () => setIsPlaying(false));

		wavesurfer.current.on("interaction", () => {
			setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
		});

		return () => {
			wavesurfer.current?.destroy();
		};
	}, [url, theme.palette.mode]);

	const handlePlayPause = () => {
		wavesurfer.current?.playPause();
	};

	const handleSkip = (seconds: number) => {
		wavesurfer.current?.skip(seconds);
	};

	const handleSpeedChange = () => {
		const speeds = [1, 1.5, 2];
		const nextSpeedIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
		const nextSpeed = speeds[nextSpeedIndex];
		setPlaybackRate(nextSpeed);
		wavesurfer.current?.setPlaybackRate(nextSpeed);
	};

	const seekTo = (time: number) => {
		if (!wavesurfer.current || !duration) return;
		// Validate time is within bounds
		const validTime = Math.max(0, Math.min(time, duration));
		wavesurfer.current?.setTime(validTime);
		wavesurfer.current?.play();
	};

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return "0:00";
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	// Validate and sort markers
	const validMarkers = markers
		.filter((m) => {
			// Filter out invalid markers
			return (
				m &&
				typeof m.timestamp === "number" &&
				!isNaN(m.timestamp) &&
				m.timestamp >= 0 &&
				m.label &&
				m.label.trim().length > 0
			);
		})
		.sort((a, b) => a.timestamp - b.timestamp);

	// Calculate marker position safely
	const getMarkerPosition = (timestamp: number): number => {
		if (!duration || duration <= 0 || isNaN(duration)) return 0;
		const position = (timestamp / duration) * 100;
		return Math.max(0, Math.min(100, position)); // Clamp between 0-100
	};

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 3,
				bgcolor: "background.paper",
				border: 1,
				borderColor: "divider",
			}}
		>
			<Stack spacing={2}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Typography
						variant="subtitle2"
						sx={{ fontWeight: 600, color: "text.primary" }}
					>
						Grabación de Sesión
					</Typography>
					<Chip
						label={`${playbackRate}x`}
						size="small"
						onClick={handleSpeedChange}
						clickable
						icon={<Speed sx={{ fontSize: 14 }} />}
						sx={{ height: 24, fontSize: "0.75rem", fontWeight: 600 }}
					/>
				</Box>

				{/* Alliance Chart */}
				{biometry && (
					<Box sx={{ px: 1 }}>
						<Stack
							direction="row"
							justifyContent="space-between"
							alignItems="center"
							mb={0.5}
						>
							<Typography variant="caption" sx={{ fontWeight: 700 }}>
								Alianza Terapéutica (Habla/Escucha)
							</Typography>
							<Typography variant="caption" color="text.secondary">
								P: {biometry.talkListenRatio.patient}% | T:{" "}
								{biometry.talkListenRatio.therapist}%
							</Typography>
						</Stack>
						<Box
							sx={{
								height: 8,
								width: "100%",
								bgcolor: "divider",
								borderRadius: 4,
								overflow: "hidden",
								display: "flex",
							}}
						>
							<Box
								sx={{
									width: `${biometry.talkListenRatio.patient}%`,
									bgcolor: "primary.main",
									height: "100%",
								}}
							/>
							<Box
								sx={{
									width: `${biometry.talkListenRatio.therapist}%`,
									bgcolor: "secondary.main",
									height: "100%",
								}}
							/>
						</Box>
					</Box>
				)}

				<Box sx={{ position: "relative" }}>
					<Box ref={containerRef} sx={{ width: "100%" }} />
					{/* Silence Markers Overlay */}
					{biometry?.silences.map((s, i) => {
						const position = getMarkerPosition(s.start);
						const width = getMarkerPosition(s.start + s.duration) - position;
						return (
							<Box
								key={`silence-${i}`}
								sx={{
									position: "absolute",
									top: 0,
									left: `${position}%`,
									width: `${width}%`,
									height: "100%",
									bgcolor: extendedColors.semantic.dangerBg,
									borderLeft: `1px dashed ${extendedColors.semantic.dangerBorder}`,
									borderRight: `1px dashed ${extendedColors.semantic.dangerBorder}`,
									pointerEvents: "none",
									zIndex: 0,
								}}
							/>
						);
					})}

					{/* Important Markers Overlay */}
					{validMarkers.map((m, i) => {
						const position = getMarkerPosition(m.timestamp);
						return (
							<Tooltip
								key={`marker-${i}`}
								title={
									<Box>
										<Typography variant="caption" sx={{ fontWeight: 700 }}>
											{formatTime(m.timestamp)}
										</Typography>
										<Typography variant="caption" display="block">
											{m.label}
										</Typography>
									</Box>
								}
								arrow
							>
								<Box
									onClick={(e) => {
										e.stopPropagation();
										seekTo(m.timestamp);
									}}
									sx={{
										position: "absolute",
										top: -4,
										left: `${position}%`,
										transform: "translateX(-50%)",
										width: "3px",
										height: "calc(100% + 8px)",
										bgcolor: "secondary.main",
										cursor: "pointer",
										zIndex: 5,
										transition: "all 0.2s",
										"&::before": {
											content: '""',
											position: "absolute",
											top: -10,
											left: -7,
											width: 16,
											height: 16,
											bgcolor: "secondary.main",
											borderRadius: "50%",
											border: "2px solid",
											borderColor: "background.paper",
											boxShadow: 2,
											transition: "all 0.2s",
										},
										"&:hover": {
											bgcolor: "primary.main",
											transform: "translateX(-50%) scale(1.2)",
											"&::before": {
												bgcolor: "primary.main",
												transform: "scale(1.3)",
											},
										},
									}}
								>
									<PushPin
										sx={{
											fontSize: 10,
											color: "white",
											position: "absolute",
											top: -8,
											left: -4,
											pointerEvents: "none",
										}}
									/>
								</Box>
							</Tooltip>
						);
					})}
				</Box>

				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Typography
						variant="caption"
						sx={{ color: "text.secondary", fontWeight: 500, minWidth: 40 }}
					>
						{formatTime(currentTime)}
					</Typography>

					<Box>
						<IconButton onClick={() => handleSkip(-10)} size="small">
							<Replay10 fontSize="small" />
						</IconButton>
						<IconButton
							onClick={handlePlayPause}
							sx={{
								mx: 1,
								bgcolor: "primary.main",
								color: "primary.contrastText",
								"&:hover": { bgcolor: "primary.dark" },
							}}
						>
							{isPlaying ? <Pause /> : <PlayArrow />}
						</IconButton>
						<IconButton onClick={() => handleSkip(10)} size="small">
							<Forward10 fontSize="small" />
						</IconButton>
					</Box>

					<Typography
						variant="caption"
						sx={{
							color: "text.secondary",
							fontWeight: 500,
							minWidth: 40,
							textAlign: "right",
						}}
					>
						{formatTime(duration)}
					</Typography>
				</Box>

				{/* Key Moments List */}
				{validMarkers.length > 0 && (
					<Box>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								cursor: "pointer",
								py: 0.5,
								px: 1,
								borderRadius: 1,
								"&:hover": { bgcolor: "action.hover" },
							}}
							onClick={() => setShowKeyMoments(!showKeyMoments)}
						>
							<Typography
								variant="caption"
								sx={{
									fontWeight: 700,
									color: "text.secondary",
									textTransform: "uppercase",
									letterSpacing: "0.05em",
								}}
							>
								Momentos Importantes ({validMarkers.length})
							</Typography>
							{showKeyMoments ? (
								<ExpandLess fontSize="small" />
							) : (
								<ExpandMore fontSize="small" />
							)}
						</Box>
						<Collapse in={showKeyMoments}>
							<List dense sx={{ pt: 0.5 }}>
								{validMarkers.map((marker, index) => (
									<ListItem key={index} disablePadding>
										<ListItemButton
											onClick={() => seekTo(marker.timestamp)}
											sx={{
												borderRadius: 1,
												py: 0.5,
												px: 1.5,
												"&:hover": {
													bgcolor: "action.hover",
												},
											}}
										>
											<Chip
												label={formatTime(marker.timestamp)}
												size="small"
												color="secondary"
												sx={{
													height: 20,
													fontSize: "0.7rem",
													fontWeight: 700,
													mr: 1.5,
													minWidth: 45,
												}}
											/>
											<ListItemText
												primary={marker.label}
												primaryTypographyProps={{
													variant: "body2",
													sx: { fontSize: "0.85rem" },
												}}
											/>
										</ListItemButton>
									</ListItem>
								))}
							</List>
						</Collapse>
					</Box>
				)}
			</Stack>
		</Paper>
	);
};
