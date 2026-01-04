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
} from "@mui/icons-material";

interface AudioPlayerProps {
	url: string;
	onReady?: () => void;
	onTimeUpdate?: (currentTime: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	onReady,
	onTimeUpdate,
}) => {
	const theme = useTheme();
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
			barWidth: 2,
			barGap: 3,
			barRadius: 3,
			height: 48,
			normalize: true,
			minPxPerSec: 50,
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

				<Box ref={containerRef} sx={{ width: "100%" }} />

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
