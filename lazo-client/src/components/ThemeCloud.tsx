import React from "react";
import { Box, Chip, Typography, Tooltip } from "@mui/material";
import { Topic } from "./AudioUploader";

interface ThemeCloudProps {
	topics: Topic[];
}

export const ThemeCloud: React.FC<ThemeCloudProps> = ({ topics }) => {
	if (!topics || topics.length === 0) return null;

	// Sort by frequency
	const sortedTopics = [...topics].sort((a, b) => b.frequency - a.frequency);

	const getFontSize = (frequency: number) => {
		const base = 0.8;
		const scale = 0.6;
		return `${base + (frequency / 100) * scale}rem`;
	};

	const getSentimentColor = (sentiment?: string) => {
		if (!sentiment) return "default";
		switch (sentiment.toLowerCase()) {
			case "positive":
			case "positivo":
				return "success";
			case "negative":
			case "negativo":
				return "error";
			default:
				return "default";
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
				Nube de Temas Recurrentes
			</Typography>
			<Box
				sx={{
					display: "flex",
					flexWrap: "wrap",
					gap: 1.5,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{sortedTopics.map((topic, index) => (
					<Tooltip
						key={index}
						title={`${topic.frequency}% de relevancia${
							topic.sentiment ? ` - ${topic.sentiment}` : ""
						}`}
					>
						<Chip
							label={topic.label}
							size="small"
							variant="outlined"
							color={getSentimentColor(topic.sentiment) as any}
							sx={{
								fontSize: getFontSize(topic.frequency),
								height: "auto",
								py: 0.5,
								px: 1,
								borderRadius: 2,
								borderColor: "divider",
								"& .MuiChip-label": {
									px: 1,
								},
								transition: "all 0.2s",
								"&:hover": {
									transform: "scale(1.1)",
									bgcolor: "action.hover",
								},
							}}
						/>
					</Tooltip>
				))}
			</Box>
		</Box>
	);
};
