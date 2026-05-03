import React, { useState, useRef, useEffect } from "react";
import { IconButton, Tooltip, alpha, useTheme, Box } from "@mui/material";
import { Mic, Stop } from "@mui/icons-material";

interface DictationButtonProps {
	onTranscript: (text: string) => void;
	language?: string;
}

export const DictationButton: React.FC<DictationButtonProps> = ({
	onTranscript,
	language = "es-ES",
}) => {
	const theme = useTheme();
	const [isRecording, setIsRecording] = useState(false);
	const recognitionRef = useRef<any>(null);

	useEffect(() => {
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;

		if (SpeechRecognition) {
			const recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = false;
			recognition.lang = language;

			recognition.onresult = (event: any) => {
				let finalContent = "";
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					if (event.results[i].isFinal) {
						finalContent += event.results[i][0].transcript;
					}
				}

				if (finalContent) {
					onTranscript(finalContent);
				}
			};

			recognition.onerror = (event: any) => {
				console.error("Dictation error:", event.error);
				setIsRecording(false);
			};

			recognition.onend = () => {
				setIsRecording(false);
			};

			recognitionRef.current = recognition;
		}

		return () => {
			if (recognitionRef.current) {
				recognitionRef.current.abort();
			}
		};
	}, [language, onTranscript]);

	const toggleRecording = () => {
		if (!recognitionRef.current) {
			alert("Tu navegador no soporta dictado por voz.");
			return;
		}

		if (isRecording) {
			recognitionRef.current.stop();
			setIsRecording(false);
		} else {
			try {
				recognitionRef.current.start();
				setIsRecording(true);
			} catch (err) {
				console.error("Failed to start recognition:", err);
			}
		}
	};

	return (
		<Tooltip title={isRecording ? "Detener Dictado" : "Dictar Resumen"}>
			<Box sx={{ position: "relative", display: "inline-flex" }}>
				<IconButton
					onClick={toggleRecording}
					size="small"
					sx={{
						color: isRecording ? "error.main" : "primary.main",
						bgcolor:
							isRecording ?
								alpha(theme.palette.error.main, 0.1)
							:	"transparent",
						transition: "all 0.3s ease",
						"&:hover": {
							bgcolor:
								isRecording ?
									alpha(theme.palette.error.main, 0.2)
								:	alpha(theme.palette.primary.main, 0.1),
						},
						...(isRecording && {
							animation: "pulse-mic 1.5s infinite",
							"@keyframes pulse-mic": {
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
						}),
					}}
				>
					{isRecording ?
						<Stop fontSize="small" />
					:	<Mic fontSize="small" />}
				</IconButton>
			</Box>
		</Tooltip>
	);
};
