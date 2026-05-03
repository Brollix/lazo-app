import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Box,
	Typography,
	Button,
	Paper,
	Stack,
	alpha,
	useTheme,
} from "@mui/material";
import {
	Mic as MicIcon,
	Stop as StopIcon,
	GraphicEq as WaveIcon,
	Refresh as RefreshIcon,
	CloudUpload as UploadIcon,
	ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { getGradients } from "../styles.theme";

// Types
interface LiveTranscriptionProps {
	onTranscriptUpdate?: (transcript: string) => void;
	onComplete?: (audioFile: File, transcript: string) => void;
}

export const LiveTranscription: React.FC<LiveTranscriptionProps> = ({
	onComplete,
}) => {
	const theme = useTheme();
	const gradients = getGradients(theme.palette.mode as "light" | "dark");

	const [isRecording, setIsRecording] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [elapsedTime, setElapsedTime] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

	// Refs
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recognitionRef = useRef<any | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	// Initialize Web Speech API
	useEffect(() => {
		if (
			!("webkitSpeechRecognition" in window) &&
			!("SpeechRecognition" in window)
		) {
			setError(
				"Tu navegador no soporta transcripción en vivo. Recomendamos usar Chrome o Edge.",
			);
			return;
		}

		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		const recognition = new SpeechRecognition();

		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "es-ES"; // Default to Spanish

		recognition.onresult = (event: any) => {
			let finalContent = "";
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					finalContent += event.results[i][0].transcript;
				}
			}

			if (finalContent) {
				setTranscript(
					(prev) => prev + (prev && finalContent ? " " : "") + finalContent,
				);
			}

			// We could optionally display interim content in a separate UI element or transient state
			// but for now, let's just commit the final results to the main transcript to be safe
			// and avoid visual jumping or duplication.
			// If we want to show interim, we'd need a separate state like `interimTranscript`
			// and render `{transcript} {interimTranscript}`.
			// Given the user's issue with massive duplication, I'll stick to safe final results first.
		};

		recognition.onerror = (event: any) => {
			console.error("Speech recognition error", event.error);
			if (event.error === "not-allowed") {
				setError("Permiso de micrófono denegado.");
			}
		};

		recognitionRef.current = recognition;

		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.abort();
			}
		};
	}, []);

	// Visualizer Logic
	const drawVisualizer = useCallback(() => {
		if (!canvasRef.current || !analyserRef.current) return;

		const canvas = canvasRef.current;
		const canvasCtx = canvas.getContext("2d");
		if (!canvasCtx) return;

		const analyser = analyserRef.current;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const draw = () => {
			if (!isRecording) return;

			animationFrameRef.current = requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);

			canvasCtx.clearRect(0, 0, canvas.width, canvas.height); // Clear

			const barWidth = (canvas.width / bufferLength) * 2.5;
			let barHeight;
			let x = 0;

			// Gradient based on primary color
			const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
			gradient.addColorStop(0, theme.palette.primary.light);
			gradient.addColorStop(1, theme.palette.primary.main);

			for (let i = 0; i < bufferLength; i++) {
				barHeight = dataArray[i] / 2;

				canvasCtx.fillStyle = gradient;
				canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

				x += barWidth + 1;
			}
		};

		draw();
	}, [isRecording, theme]);

	const startRecording = async () => {
		setError(null);
		setTranscript("");
		setElapsedTime(0);
		chunksRef.current = [];

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Setup MediaRecorder
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: "audio/wav" }); // Approximate MIME
				setAudioBlob(blob);

				// Clean up stream tracks
				stream.getTracks().forEach((track) => track.stop());

				// Clean up Audio Context
				if (audioContextRef.current) {
					audioContextRef.current.close();
				}
			};

			mediaRecorder.start();
			setIsRecording(true);

			// Start Web Speech API
			if (recognitionRef.current) {
				try {
					recognitionRef.current.start();
				} catch (e) {
					console.warn("Recognition already started or failed", e);
				}
			}

			// Setup Audio Visualizer
			const audioCtx = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			audioContextRef.current = audioCtx;
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 256;
			analyserRef.current = analyser;
			const source = audioCtx.createMediaStreamSource(stream);
			sourceRef.current = source;
			source.connect(analyser);
			drawVisualizer();

			// Start Timer
			timerRef.current = setInterval(() => {
				setElapsedTime((prev) => prev + 1);
			}, 1000);
		} catch (err: any) {
			console.error("Error accessing microphone:", err);
			setError("No se pudo acceder al micrófono. Verifica los permisos.");
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && isRecording) {
			mediaRecorderRef.current.stop();
			setIsRecording(false);

			if (recognitionRef.current) {
				recognitionRef.current.stop();
			}

			if (timerRef.current) {
				clearInterval(timerRef.current);
			}

			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		}
	};

	const handleUpload = () => {
		if (audioBlob) {
			// Convert Blob to File
			const file = new File([audioBlob], "live_recording.wav", {
				type: "audio/wav",
			});
			if (onComplete) {
				onComplete(file, transcript);
			}
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	return (
		<Paper
			elevation={0}
			sx={{
				p: 3,
				borderRadius: 3,
				border: "1px solid",
				borderColor: "divider",
				bgcolor: "background.paper",
				display: "flex",
				flexDirection: "column",
				gap: 3,
				alignItems: "center",
			}}
		>
			{/* Header Status */}
			<Box sx={{ textAlign: "center" }}>
				<Typography variant="h6" fontWeight="bold" gutterBottom>
					{isRecording ? "Grabando Sesión..." : "Listo para Grabar"}
				</Typography>
				<Typography
					variant="h3"
					sx={{
						fontFamily: "monospace",
						color: isRecording ? "error.main" : "text.secondary",
						fontWeight: "bold",
					}}
				>
					{formatTime(elapsedTime)}
				</Typography>
			</Box>

			{/* Visualizer Canvas */}
			<Box
				sx={{
					width: "100%",
					height: 100,
					bgcolor: alpha(theme.palette.background.default, 0.5),
					borderRadius: 2,
					overflow: "hidden",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					border: "1px solid",
					borderColor: "divider",
				}}
			>
				{isRecording ?
					<canvas
						ref={canvasRef}
						width={600}
						height={100}
						style={{ width: "100%", height: "100%" }}
					/>
				:	<WaveIcon sx={{ fontSize: 48, color: "action.disabled" }} />}
			</Box>

			{/* Transcript Preview */}
			<Box
				sx={{
					width: "100%",
					minHeight: 100,
					maxHeight: 200,
					overflowY: "auto",
					p: 2,
					bgcolor: "background.default",
					borderRadius: 2,
					border: "1px solid",
					borderColor: "divider",
				}}
			>
				{transcript ?
					<Typography variant="body1" color="text.primary">
						{transcript}
					</Typography>
				:	<Typography variant="body2" color="text.secondary" fontStyle="italic">
						{isRecording ?
							"Escuchando..."
						:	"La transcripción en tiempo real aparecerá aquí..."}
					</Typography>
				}
			</Box>

			{/* Error Message */}
			{error && (
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						gap: 1,
						color: "error.main",
						bgcolor: alpha(theme.palette.error.main, 0.1),
						p: 1,
						px: 2,
						borderRadius: 2,
					}}
				>
					<ErrorIcon fontSize="small" />
					<Typography variant="body2">{error}</Typography>
				</Box>
			)}

			{/* Controls */}
			<Stack direction="row" spacing={2}>
				{!isRecording && !audioBlob && (
					<Button
						variant="contained"
						color="primary"
						size="large"
						startIcon={<MicIcon />}
						onClick={startRecording}
						sx={{
							borderRadius: 30,
							px: 4,
							py: 1.5,
							background: gradients.primary,
							boxShadow: theme.shadows[4],
						}}
					>
						Comenzar Grabación
					</Button>
				)}

				{isRecording && (
					<Button
						variant="contained"
						color="error"
						size="large"
						startIcon={<StopIcon />}
						onClick={stopRecording}
						sx={{
							borderRadius: 30,
							px: 4,
							py: 1.5,
							bgcolor: "error.main",
							"&:hover": { bgcolor: "error.dark" },
							boxShadow: theme.shadows[4],
							animation: "pulse 1.5s infinite",
							"@keyframes pulse": {
								"0%": {
									boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.4)}`,
								},
								"70%": {
									boxShadow: `0 0 0 10px ${alpha(theme.palette.error.main, 0)}`,
								},
								"100%": {
									boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0)}`,
								},
							},
						}}
					>
						Detener
					</Button>
				)}

				{!isRecording && audioBlob && (
					<>
						<Button
							variant="outlined"
							color="inherit"
							onClick={() => {
								setAudioBlob(null);
								setTranscript("");
								setElapsedTime(0);
							}}
							startIcon={<RefreshIcon />}
							sx={{ borderRadius: 30 }}
						>
							Descartar
						</Button>
						<Button
							variant="contained"
							color="primary"
							onClick={handleUpload}
							startIcon={<UploadIcon />}
							sx={{
								borderRadius: 30,
								px: 4,
								background: gradients.primary,
							}}
						>
							Subir y Analizar
						</Button>
					</>
				)}
			</Stack>
		</Paper>
	);
};
