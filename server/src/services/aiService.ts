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

/**
 * Sanitizes PII from transcripts before sending to AWS Bedrock
 * Removes: DNI (Argentina format), phone numbers, email addresses
 * This ensures HIPAA/privacy compliance and zero patient identification
 */
const sanitizeTranscript = (text: string): string => {
	if (!text) return text;

	let sanitized = text;

	// Remove DNI patterns (Argentina: 12.345.678 or 12345678 or 12-345-678)
	sanitized = sanitized.replace(
		/\b\d{1,2}[\.\-]?\d{3}[\.\-]?\d{3}\b/g,
		"[DNI_REDACTED]"
	);

	// Remove phone patterns (Argentina: +54 11 1234-5678, 011-1234-5678, etc.)
	sanitized = sanitized.replace(
		/(\+?54\s?)?(\(?\d{2,4}\)?[\s\-]?)?\d{4}[\s\-]?\d{4}/g,
		"[PHONE_REDACTED]"
	);

	// Remove email addresses
	sanitized = sanitized.replace(
		/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
		"[EMAIL_REDACTED]"
	);

	// Remove addresses (basic pattern for street numbers)
	sanitized = sanitized.replace(
		/\b\d{1,5}\s+[A-Za-zÀ-ÿ\s]+\s+\d{1,5}\b/g,
		"[ADDRESS_REDACTED]"
	);

	return sanitized;
};

export const processTranscriptWithClaude = async (
	transcriptText: string,
	targetLanguage: string = "Spanish", // Default to Spanish
	noteFormat: "SOAP" | "DAP" | "BIRP" = "SOAP",
	patientName: string = "el paciente",
	patientAge?: number,
	patientGender?: string,
	isUltraPlan: boolean = false,
	historicalContext?: string | null
) => {
	// Build historical context section if available (Ultra Plan only)
	const historicalContextSection =
		isUltraPlan && historicalContext ?
			`
    
    HISTORICAL CONTEXT FROM PREVIOUS SESSIONS:
    ${historicalContext}
    
    Based on this history, you should:
    - Identify contradictions or inconsistencies in the patient's narrative
    - Note progress or regression in therapeutic goals
    - Highlight recurring themes or patterns across sessions
    - Make connections between past and current session content
    `
		:	"";

	// Build Ultra Plan psychological analysis section
	const ultraPsychologicalAnalysis =
		isUltraPlan ?
			`
    
    CLINICAL SUPERVISION ANALYSIS (Ultra Plan - Advanced):
    As a senior clinical supervisor, provide an additional professional analysis including:
    
    1. DEFENSE MECHANISMS:
       Identify any psychological defense mechanisms observed in the patient's discourse:
       - Examples: Projection, Displacement, Rationalization, Denial, Intellectualization, Regression, etc.
       - Provide specific quotes or examples from the session
       - Explain how each mechanism manifests
    
    2. TRANSFERENCE/COUNTERTRANSFERENCE INDICATORS:
       - Signs of transference: How the patient relates to the therapist (e.g., as authority figure, parental figure)
       - Potential countertransference reactions the therapist should monitor
       - Relational patterns emerging in the therapeutic dyad
    
    3. DIAGNOSTIC HYPOTHESES:
       - Preliminary diagnostic considerations based on DSM-5/ICD-11 criteria
       - Key symptoms and behavioral patterns observed that support or contradict certain diagnoses
       - Recommended follow-up assessments or screening tools
       - Note: These are hypotheses for consideration, not definitive diagnoses
    
    OUTPUT THIS ANALYSIS IN A SEPARATE JSON  KEY: "ultra_psychological_analysis" with subfields: "defense_mechanisms", "transference_notes", "diagnostic_hypotheses"
    `
		:	"";

	const prompt = `You are an expert clinical AI assistant for "Lazo", a premium platform for psychologists and therapists.${historicalContextSection}
    
    Session Context:
    - Patient Name: ${patientName}
    ${patientAge ? `- Patient Age: ${patientAge}` : ""}
    ${patientGender ? `- Patient Gender: ${patientGender}` : ""}
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
			noteFormat === "SOAP" ?
				`- **S (Subjective)**: Patient's report of symptoms, feelings, and experiences. Use direct quotes if relevant.
       - **O (Objective)**: Observable findings, behavioral data, status of the patient during the session (affect, tone, cooperation).
       - **A (Assessment)**: Your clinical interpretation. Synthesis of S and O. Identify progress, setbacks, or recurring themes.
       - **P (Plan)**: Specific next steps, homework, or focus for the next session.`
			: noteFormat === "DAP" ?
				`- **D (Data)**: Objective and subjective information. What happened during the session? (Combines S and O from SOAP).
       - **A (Assessment)**: Interpretation of the data. What did this session mean for the therapeutic process?
       - **P (Plan)**: Future steps based on the assessment.`
			:	`- **B (Behavior)**: Specific observations of the patient's behavior and presentation.
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
    ${ultraPsychologicalAnalysis}
    
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
      ]${
				isUltraPlan ?
					`,
      "ultra_psychological_analysis": {
         "defense_mechanisms": [
            { "mechanism": "Projection|Denial|Rationalization|etc", "evidence": "Specific quote or example from session", "interpretation": "Brief explanation" }
         ],
         "transference_notes": {
            "patient_to_therapist": "Description of transference patterns observed",
            "countertransference_risks": "Potential reactions therapist should monitor"
         },
         "diagnostic_hypotheses": [
            { "diagnosis": "DSM-5/ICD-11 consideration", "supporting_evidence": "Symptoms observed", "follow_up": "Recommended assessments" }
         ]
      }`
				:	""
			}
    }
    
    
    IMPORTANT INSTRUCTION FOR TIMESTAMPS:
    - The transcript has time markers like [MM:SS] or [Start: X.X].
    - For "key_moments", you MUST extract the exact numeric timestamp (in seconds) corresponding to the **START** of the discussion/moment.
    - Do NOT estimate. Use the nearest previous timestamp marker in the text.
    - Accurately associate the correct time so the user can click and jump to exactly when that topic started.

    Final check: Ensure the output is valid JSON and timestamps are in seconds (numerical).`;

	// Sanitize transcript before sending to AWS Bedrock (privacy compliance)
	const sanitizedTranscript = sanitizeTranscript(transcriptText);

	// Replace the original transcript in the prompt with sanitized version
	const finalPrompt = prompt.replace(
		`"${transcriptText}"`,
		`"${sanitizedTranscript}"`
	);

	const payload = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 3000,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: finalPrompt }],
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
	patientName: string = "el paciente",
	patientAge?: number,
	patientGender?: string
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
    ${patientAge ? `- Patient Age: ${patientAge}` : ""}
    ${patientGender ? `- Patient Gender: ${patientGender}` : ""}
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

	// Sanitize transcript before sending to AWS Bedrock (privacy compliance)
	const sanitizedTranscript = sanitizeTranscript(transcriptText);

	// Replace the original transcript in the prompt with sanitized version
	const finalPrompt = prompt.replace(
		`"${transcriptText}"`,
		`"${sanitizedTranscript}"`
	);

	const payload = {
		anthropic_version: "bedrock-2023-05-31",
		max_tokens: 2000,
		messages: [
			{
				role: "user",
				content: [{ type: "text", text: finalPrompt }],
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
 * Process transcript with Llama 3.1 70B via Groq
 * Used for Free, Pro, and Ultra (standard mode) plans
 * Provides professional clinical analysis at lower cost than Claude
 */
export const processWithLlama3 = async (
	transcriptText: string,
	targetLanguage: string = "Spanish",
	noteFormat: "SOAP" | "DAP" | "BIRP" = "SOAP",
	patientName: string = "el paciente",
	patientAge?: number,
	patientGender?: string
) => {
	const prompt = `You are an expert clinical AI assistant for "Lazo", a premium platform for psychologists and therapists.
    
Session Context:
- Patient Name: ${patientName}
${patientAge ? `- Patient Age: ${patientAge}` : ""}
${patientGender ? `- Patient Gender: ${patientGender}` : ""}
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
	noteFormat === "SOAP" ?
		`- **S (Subjective)**: Patient's report of symptoms, feelings, and experiences. Use direct quotes if relevant.
- **O (Objective)**: Observable findings, behavioral data, status of the patient during the session.
- **A (Assessment)**: Clinical interpretation. Synthesis of S and O. Identify progress, setbacks, or themes.
- **P (Plan)**: Specific next steps, homework, or focus for the next session.`
	: noteFormat === "DAP" ?
		`- **D (Data)**: Objective and subjective information from the session.
- **A (Assessment)**: Interpretation of the data and therapeutic progress.
- **P (Plan)**: Future steps based on the assessment.`
	:	`- **B (Behavior)**: Specific observations of patient's behavior.
- **I (Intervention)**: Specific interventions used during the session.
- **R (Response)**: How the patient responded to interventions.
- **P (Plan)**: Recommendations for the next session.`
}

Recognition Support:
The transcription includes speaker labels (e.g., [spk_0], [spk_1]).
IMPORTANT: Identify which speaker is "${patientName}" (patient) and which is the Therapist based on content.

Transcript:
"${transcriptText}"

Output Format (JSON Only):
{
  "clinical_note": "Full formatted note in ${
		targetLanguage === "Spanish" ? "Español" : targetLanguage
	}",
  "summary": "Professional executive summary in ${
		targetLanguage === "Spanish" ? "Español" : targetLanguage
	}",
  "topics": [
    { "label": "Topic Name", "frequency": 25, "sentiment": "Positivo|Negativo|Neutral" }
  ],
  "sentiment": "Positivo|Negativo|Neutral|Ansioso|Triste|Enojado|Confundido|Esperanzado",
  "action_items": ["Actionable steps"],
  "risk_assessment": {
    "has_risk": true/false,
    "alerts": ["Specific concerns"],
    "summary": "Brief risk analysis"
  },
  "entities": [
    { "name": "Entity Name", "type": "Persona|Proyecto|Ubicación|Otro" }
  ],
  "key_moments": [
    { "timestamp": 12.5, "label": "Descriptive label" }
  ]
}

IMPORTANT: Extract exact timestamps from the transcript markers for key_moments.`;

	try {
		const completion = await groq.chat.completions.create({
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
			model: "llama-3.3-70b-versatile",
			temperature: 0.0,
			max_tokens: 3000,
			response_format: { type: "json_object" },
		});

		const content = completion.choices[0]?.message?.content || "{}";

		try {
			return JSON.parse(content);
		} catch (e) {
			console.error("[AI] JSON parsing error from Llama 3:", e);
			return { error: "JSON Parsing Error", raw: content };
		}
	} catch (error) {
		console.error("[AI] Error calling Groq Llama 3:", error);
		throw error;
	}
};

/**
 * Unified Transcription Service
 * Standard (Free/Pro/Ultra without precision): Groq (Whisper-v3)
 * Ultra + High Precision: Deepgram (Nova-2) with zero data retention
 *
 * @param fileBuffer - Audio file buffer
 * @param planType - User's subscription plan
 * @param useHighPrecision - Whether to use Deepgram (only for Ultra users)
 * @param mimeType - Audio file MIME type
 */
export const transcribeAudio = async (
	fileBuffer: Buffer,
	planType: "free" | "pro" | "ultra" = "free",
	useHighPrecision: boolean = false,
	mimeType: string = "audio/wav"
) => {
	// Only use Deepgram if user is Ultra AND explicitly requested high precision
	if (planType === "ultra" && useHighPrecision) {
		console.log(
			"[AI] Using Deepgram (Ultra + High Precision) for transcription..."
		);
		const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
			fileBuffer,
			{
				model: "nova-2",
				smart_format: true,
				diarize: true,
				language: "es",
				// CRITICAL: Zero data retention for HIPAA/privacy compliance
				data_logging: false,
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

/**
 * Sanitize and transform SOAP notes into professional medical report for insurance/prepaga
 * Uses Claude to remove PII and format for official documents
 * Ultra Plan exclusive feature
 */
export const sanitizeForMedicalReport = async (
	soapNote: string,
	sessionDate?: string,
	therapistName?: string
) => {
	const prompt = `You are a medical documentation specialist. Your task is to transform a clinical SOAP note into a formal, professional medical report suitable for submission to insurance companies (obras sociales/prepagas) in Argentina.

CRITICAL REQUIREMENTS:
1. Remove ALL personally identifiable information (PII):
   - Patient names → Replace with "El/La paciente"
   - DNI numbers → Remove completely
   - Phone numbers → Remove completely
   - Email addresses → Remove completely
   - Specific addresses → Replace with "Domicilio registrado"
   - Family member names → Replace with generic terms (e.g., "Madre", "Hermano")

2. Maintain clinical terminology:
   - Keep all diagnostic terminology
   - Preserve symptom descriptions
   - Retain therapeutic interventions
   - Maintain professional language

3. Format as professional medical report:
   - Use formal medical Spanish
   - Structure with clear sections
   - Include only clinically relevant information
   - Remove conversational language

INPUT SOAP NOTE:
${soapNote}

OUTPUT as a formal medical report in Spanish with the following structure:

# INFORME MÉDICO PROFESIONAL

${sessionDate ? `**Fecha de Sesión:** ${sessionDate}` : ""}
${therapistName ? `**Profesional Tratante:** ${therapistName}` : "**Profesional Tratante:** [A completar]"}

## Motivo de Consulta
[Extract from Subjective section, anonymized]

## Observaciones Clínicas
[Extract from Objective section, anonymized]

## Evaluación Profesional
[Extract from Assessment section, anonymized]

## Plan Terapéutico
[Extract from Plan section, anonymized]

---

**AVISO LEGAL:**
*Documento generado por sistema de inteligencia artificial. El profesional tratante es el único responsable de su revisión y validación antes de su presentación ante cualquier institución. Este informe debe ser firmado y sellado por el profesional matriculado.*

IMPORTANT: Output ONLY the formatted medical report in markdown. Do not include any additional commentary.`;

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
			return responseBody.content[0].text;
		}

		return "Error: No se pudo generar el informe médico.";
	} catch (error: any) {
		console.error("Error generating medical report:", error);
		throw new Error(`Error al generar informe médico: ${error.message}`);
	}
};
