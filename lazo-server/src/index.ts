import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post("/api/process-session", (req, res) => {
	// Placeholder for authentication verification and processing
	// pipeline: Audio -> AWS Transcribe -> Text -> Claude 3.5 Sonnet -> JSON
	res.status(501).json({ message: "Not Implemented Yet" });
});

app.listen(port, () => {
	console.log(`Lazo Server listening at http://localhost:${port}`);
});
