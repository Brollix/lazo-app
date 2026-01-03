import React, {
	useEffect,
	useRef,
	useState,
	useMemo,
	useCallback,
} from "react";
import WaveSurfer from "wavesurfer.js";
import {
	Box,
	IconButton,
	Paper,
	Typography,
	Slider,
	Stack,
	Chip,
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
	onSeek?: (time: number) => void;
	onTimeUpdate?: (currentTime: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	onReady,
	onSeek,
	onTimeUpdate,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const wavesurfer = useRef<WaveSurfer | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackRate, setPlaybackRate] = useState(1);

	// Initialize WaveSurfer
	useEffect(() => {
		if (!containerRef.current) return;

		wavesurfer.current = WaveSurfer.create({
			container: containerRef.current,
			waveColor: "#E0E0E0",
			progressColor: "#2196F3",
			cursorColor: "#2196F3",
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
		wavesurfer.current.on("seek", (time) => {
			setCurrentTime(wavesurfer.current?.getCurrentTime() || 0); // Update local state immediately
			onSeek?.(time);
		});

		return () => {
			wavesurfer.current?.destroy();
		};
	}, [url]);

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

	// Expose specific methods via ref if needed, or effect for external control
	// For this simplified version we'll just handle internal state

	return (
		<Paper
			elevation={0}
			sx={{
				p: 2,
				borderRadius: 3,
				bgcolor: "#fafafa",
				border: "1px solid rgba(0,0,0,0.04)",
			}}
		>
			<Stack spacing={2}>
				{/* Header / Meta */}
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
						Zoom_Reunion_Juan_Perez.mp3
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

				{/* Waveform */}
				<Box ref={containerRef} sx={{ width: "100%" }} />

				{/* Controls */}
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
								color: "white",
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
