import React, { useEffect, useRef, useState } from "react";
import {
	Box,
	IconButton,
	Paper,
	Typography,
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
}) => {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [playbackRate, setPlaybackRate] = useState(1);

	// Initialize Audio
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleLoadedMetadata = () => {
			setDuration(audio.duration || 0);
			onReady?.();
		};

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
			onTimeUpdate?.(audio.currentTime);
		};

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);

		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);

		return () => {
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
		};
	}, [url, onReady, onTimeUpdate]);

	const handlePlayPause = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	};

	const handleSkip = (seconds: number) => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, duration));
	};

	const handleSpeedChange = () => {
		const audio = audioRef.current;
		if (!audio) return;

		const speeds = [1, 1.5, 2];
		const nextSpeedIndex = (speeds.indexOf(playbackRate) + 1) % speeds.length;
		const nextSpeed = speeds[nextSpeedIndex];
		setPlaybackRate(nextSpeed);
		audio.playbackRate = nextSpeed;
	};

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return "0:00";
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	};

	return (
		<Paper
			elevation={0}
			sx={{
				p: { xs: 1.5, sm: 2 },
				borderRadius: 4,
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

				{/* Hidden audio element */}
				<audio ref={audioRef} src={url} preload="metadata" />

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
