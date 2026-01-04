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
} from "@mui/material";
import {
	PlayArrow,
	Pause,
	Replay10,
	Forward10,
	Speed,
	PushPin,
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
			minPxPerSec: themeComponents.audioPlayer.minPxPerSec,
			url: url,
		});

		wavesurfer.current.on("ready", () => {
			setDuration(wavesurfer.current?.getDuration() || 0);
			onReady?.();
		});

		wavesurfer.current.on("audioprocess", (time) => {
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
		wavesurfer.current?.setTime(time);
		wavesurfer.current?.play();
	};

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
					{biometry?.silences.map((s, i) => (
						<Box
							key={`silence-${i}`}
							sx={{
								position: "absolute",
								top: 0,
								left: `${(s.start / duration) * 100}%`,
								width: `${(s.duration / duration) * 100}%`,
								height: "100%",
								bgcolor: extendedColors.semantic.dangerBg,
								borderLeft: `1px dashed ${extendedColors.semantic.dangerBorder}`,
								borderRight: `1px dashed ${extendedColors.semantic.dangerBorder}`,
								pointerEvents: "none",
								zIndex: 1,
							}}
						/>
					))}

					{/* Important Markers Overlay */}
					{markers.map((m, i) => (
						<Box
							key={`marker-${i}`}
							onClick={(e) => {
								e.stopPropagation();
								seekTo(m.timestamp);
							}}
							title={m.label}
							sx={{
								position: "absolute",
								top: -4,
								left: `${(m.timestamp / duration) * 100}%`,
								width: "2px",
								height: "calc(100% + 8px)",
								bgcolor: "secondary.main",
								cursor: "pointer",
								zIndex: 10,
								"&::after": {
									content: '""',
									position: "absolute",
									top: -8,
									left: -6,
									width: 14,
									height: 14,
									bgcolor: "secondary.main",
									borderRadius: "50%",
									boxShadow: 2,
								},
								"&:hover": {
									bgcolor: "primary.main",
									"&::after": { bgcolor: "primary.main" },
								},
							}}
						>
							<PushPin
								sx={{
									fontSize: 10,
									color: "white",
									position: "absolute",
									top: -6,
									left: -4,
								}}
							/>
						</Box>
					))}
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
			</Stack>
		</Paper>
	);
};
