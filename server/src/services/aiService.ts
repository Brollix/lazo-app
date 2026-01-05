import {
	BedrockRuntimeClient,
	InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { Groq } from "groq-sdk";
import { createClient } from "@deepgram/sdk";
import { File } from "node:buffer";
import dotenv from "dotenv";

dotenv.config();

// Bedrock is often available in specific regions (us-east-1, us-west-2).
// We'll default to us-east-1 for Model availability even if the app is in sa-east-1.
const MODEL_REGION = "us-east-1";

// Models
// Claude 3.5 Sonnet: Excellent intelligence, perfect for complex analysis.
// Claude 3 Haiku: Fast and cheap, good for simple tasks.
// Recommendation for Lazo (Therapy/Context): Use Sonnet 3.5 for best quality results.
const MODEL_ID = "anthropic.claude-3-5-sonnet-20240620-v1:0";

const client = new BedrockRuntimeClient({
	region: MODEL_REGION,
	// Credentials will be picked up from the IAM Role or .env automatically
});

// Initialize Groq
const groq = new Groq({
	apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY",
});

// Initialize Deepgram
const deepgram = createClient(
	process.env.DEEPGRAM_API_KEY || "YOUR_DEEPGRAM_API_KEY"
);

export const processTranscriptWithClaude = async (
	transcriptText: string,
	targetLanguage: string = "Spanish", // Default to Spanish
	noteFormat: "SOAP" | "DAP" | "BIRP" = "SOAP",
	patientName: string = "el paciente"
) => {
	const prompt = `You are an expert clinical AI assistant for "Lazo", a premium platform for psychologists and therapists.
    
    Session Context:
    - Patient Name: ${patientName}
    - Participants: ${patientName} (Patient) and the Therapist.
    
    Processing Task:
    Analyze the following therapy session transcription and generate a highly structured clinical note and session metadata.

    IMPORTANT - CLINICAL RIGOR:
    - Use professional, clinical language. 
    - Be concise but thorough.
    - Avoid generic statements; focus on specific evidence from the transcript.

    CRITICAL - NOTE FORMAT INSTRUCTIONS:
    You MUST follow the specific structure for: ${noteFormat}

    ${
			noteFormat === "SOAP"
				? `- **S (Subjective)**: Patient's report of symptoms, feelings, and experiences. Use direct quotes if relevant.
       - **O (Objective)**: Observable findings, behavioral data, status of the patient during the session (affect, tone, cooperation).
       - **A (Assessment)**: Your clinical interpretation. Synthesis of S and O. Identify progress, setbacks, or recurring themes.
       - **P (Plan)**: Specific next steps, homework, or focus for the next session.`
				: noteFormat === "DAP"
				? `- **D (Data)**: Objective and subjective information. What happened during the session? (Combines S and O from SOAP).
       - **A (Assessment)**: Interpretation of the data. What did this session mean for the therapeutic process?
       - **P (Plan)**: Future steps based on the assessment.`
				: `- **B (Behavior)**: Specific observations of the patient's behavior and presentation.
       - **I (Intervention)**: Specific interventions the therapist used during the session.
       - **R (Response)**: How the patient responded to the interventions.
       - **P (Plan)**: Recommendations and plan for the next session.`
		}

    Session Context:
    - Patient Name: ${patientName}
    
    Recognition Support:
    The transcription below includes speaker labels (e.g., [spk_0], [spk_1]). 
    IMPORTANT: Identify which speaker is "${patientName}" (the patient) and which is the Therapist based on the content of their Speech.
    - Usually, one speaker asks questions and provides guidance (Therapist).
    - The other speaker shares feelings, symptoms, and life details (${patientName}).
    - Use this mapping to accurately attribute all clinical findings.

    Transcript:
    "${transcriptText}"
    
    Output Format (JSON Only):
    {
      "clinical_note": "The full formatted note (using markdown headers like ## S, ## O, etc.) in ${
				targetLanguage === "Spanish" ? "Español" : targetLanguage
			}",
      "summary": "Professional executive summary (1 paragraph) in ${
				targetLanguage === "Spanish" ? "Español" : targetLanguage
			}",
      "topics": [
         { "label": "Topic Name", "frequency": 25, "sentiment": "Positivo|Negativo|Neutral" }
      ],
      "sentiment": "Positivo|Negativo|Neutral|Ansioso|Triste|Enojado|Confundido|Esperanzado|Abrumado|Frustrado",
      "action_items": ["Actionable step for therapist or patient"],
      "risk_assessment": {
         "has_risk": true/false,
         "alerts": ["Specific concerns"],
         "summary": "Brief risk analysis"
      },
      "entities": [
         { "name": "Entity Name", "type": "Persona|Proyecto|Ubicación|Otro" }
      ],
      "key_moments": [
         { "timestamp": 12.5, "label": "Short descriptive label of what happened" }
      ]
    }
    
    Final check: Ensure the output is valid JSON and timestamps are in seconds (numerical).`;

	const payload = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 3000,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: prompt }],
			},
		],
	};

	try {
		const command = new InvokeModelCommand({
			modelId: MODEL_ID,
			contentType: "application/json",
			accept: "application/json",
			body: JSON.stringify(payload),
		});

		const response = await client.send(command);
		const responseBody = JSON.parse(new TextDecoder().decode(response.body));

		if (responseBody.content && responseBody.content[0]?.text) {
			const textContent = responseBody.content[0].text;

			try {
				const jsonStart = textContent.indexOf("{");
				const jsonEnd = textContent.lastIndexOf("}");
				if (jsonStart !== -1 && jsonEnd !== -1) {
					const jsonString = textContent.substring(jsonStart, jsonEnd + 1);
					return JSON.parse(jsonString);
				}
				return { error: "Could not parse JSON", raw: textContent };
			} catch (e) {
				console.error("JSON Parsing Error from Bedrock:", e);
				return { error: "JSON Parsing Error", raw: textContent };
			}
		}

		return { error: "Unexpected response format", raw: responseBody };
	} catch (error: any) {
		console.error("Error invoking Bedrock:", error);
		if (error.name === "AccessDeniedException") {
			return {
				error:
					"AWS Permissions Error: Ensure IAM Role has bedrock:InvokeModel for us-east-1",
			};
		}
		throw error;
	}
};

/**
 * Performs a specific AI action based on a predefined prompt.
 */
export const performAiAction = async (
	transcriptText: string,
	actionType: string,
	targetLanguage: string = "Spanish",
	patientName: string = "el paciente"
) => {
	let actionPrompt = "";

	switch (actionType) {
		case "resumen":
			actionPrompt =
				"Genera un resumen ejecutivo de la sesión, destacando los puntos más importantes discutidos.";
			break;
		case "tareas":
			actionPrompt =
				"Identifica todas las tareas, compromisos o 'homework' mencionados para el paciente o el terapeuta.";
			break;
		case "psicologico":
			actionPrompt =
				"Realiza un análisis psicológico profundo: identifica patrones de pensamiento, mecanismos de defensa o temas recurrentes en el discurso del paciente.";
			break;
		case "intervencion":
			actionPrompt =
				"Basado en esta sesión, sugiere 3 estrategias o intervenciones puntuales para que el terapeuta aplique en la próxima sesión.";
			break;
		case "animo":
			actionPrompt =
				"Analiza detalladamente la evolución del estado de ánimo del paciente durante la sesión. ¿Hubo cambios significativos?";
			break;
		default:
			actionPrompt = "Analiza la sesión y proporciona insights relevantes.";
	}

	const prompt = `You are an expert clinical AI assistant for "Lazo". 
    
    Task: ${actionPrompt}

    Context - Recognition Support:
    - Patient: ${patientName}
    The transcription below includes speaker labels (e.g., [spk_0], [spk_1]). 
    IMPORTANT: Identify which speaker is "${patientName}" (the patient) and which is the Therapist.
    
    Transcription of the session: 
    "${transcriptText}"

    Instructions:
    - Respond in ${
			targetLanguage === "Spanish" ? "Español de Latinoamérica" : targetLanguage
		}.
    - Use Markdown for formatting.
    - Be clinical, professional, and precise.
    - Do not include any introductory text, just the analysis.
    `;

	const payload = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 2000,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: prompt }],
			},
		],
	};

	try {
		const command = new InvokeModelCommand({
			modelId: MODEL_ID,
			contentType: "application/json",
			accept: "application/json",
			body: JSON.stringify(payload),
		});

		const response = await client.send(command);
		const responseBody = JSON.parse(new TextDecoder().decode(response.body));

		if (responseBody.content && responseBody.content[0]?.text) {
			return { result: responseBody.content[0].text };
		}
		return { error: "No response from AI" };
	} catch (error) {
		console.error("Error performing AI action:", error);
		throw error;
	}
};

/**
 * Unified Transcription Service
 * Standard (Free/Pro): Groq (Whisper-v3) or AWS (current fallback)
 * Ultra: Deepgram (Nova-2)
 */
export const transcribeAudio = async (
	fileBuffer: Buffer,
	planType: "free" | "pro" | "ultra" = "free",
	mimeType: string = "audio/wav"
) => {
	if (planType === "ultra") {
		console.log("[AI] Using Deepgram (Ultra) for transcription...");
		const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
			fileBuffer,
			{
				model: "nova-2",
				smart_format: true,
				diarize: true,
				language: "es",
			}
		);

		if (error) throw error;
		return result;
	} else {
		console.log("[AI] Using Groq (Pro/Free) for transcription...");
		// Note: Groq expects a File object or ReadStream. For simplicity in memory:
		// We'll use a hack to pass the buffer as a file-like object
		// or use AWS as fallback if Groq Key is not set.

		if (process.env.GROQ_API_KEY) {
			// Groq SDK expects a File-like object. We'll create one compatible with Node.js
			const file = new File([fileBuffer], "audio.wav", { type: mimeType });

			const transcription = await groq.audio.transcriptions.create({
				file: file as any,
				model: "whisper-large-v3",
				response_format: "verbose_json",
			});
			return transcription;
		}

		throw new Error("No transcription provider configured for this plan");
	}
};
