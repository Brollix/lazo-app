import React from "react";
import {
	Box,
	Typography,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
} from "@mui/material";
import { Topic } from "./AudioUploader";

interface ThemeCloudProps {
	topics: Topic[];
}

export const ThemeCloud: React.FC<ThemeCloudProps> = ({ topics }) => {
	if (!topics || topics.length === 0) return null;

	// Sort by frequency
	const sortedTopics = [...topics].sort((a, b) => b.frequency - a.frequency);

	const getSentimentColor = (sentiment?: string) => {
		if (!sentiment) return "default";
		switch (sentiment.toLowerCase()) {
			case "positive":
			case "positivo":
				return "success.main";
			case "negative":
			case "negativo":
				return "error.main";
			default:
				return "text.secondary";
		}
	};

	const getSentimentLabel = (sentiment?: string) => {
		if (!sentiment) return "Neutral";
		switch (sentiment.toLowerCase()) {
			case "positive":
			case "positivo":
				return "Positivo";
			case "negative":
			case "negativo":
				return "Negativo";
			default:
				return "Neutral";
		}
	};

	return (
		<Box sx={{ p: 1 }}>
			<Typography
				variant="caption"
				sx={{
					display: "block",
					mb: 1.5,
					fontWeight: 700,
					color: "text.secondary",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				Temas Recurrentes
			</Typography>
			<TableContainer
				component={Paper}
				variant="outlined"
				sx={{ borderRadius: 2, overflow: "hidden" }}
			>
				<Table size="small" sx={{ minWidth: 300 }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontWeight: 700 }}>Tema</TableCell>
							<TableCell sx={{ fontWeight: 700 }} align="center">
								Sentimiento
							</TableCell>
							<TableCell sx={{ fontWeight: 700 }} align="right">
								Relevancia
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{sortedTopics.map((topic, index) => (
							<TableRow
								key={index}
								sx={{
									"&:hover": {
										bgcolor: "action.hover",
									},
								}}
							>
								<TableCell>{topic.label}</TableCell>
								<TableCell
									align="center"
									sx={{
										color: getSentimentColor(topic.sentiment),
										fontWeight: 600,
									}}
								>
									{getSentimentLabel(topic.sentiment)}
								</TableCell>
								<TableCell align="right" sx={{ fontWeight: 600 }}>
									{topic.frequency}%
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	);
};
