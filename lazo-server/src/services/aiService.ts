import {
	BedrockRuntimeClient,
	InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
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

export const processTranscriptWithClaude = async (
	transcriptText: string,
	targetLanguage: string = "Spanish", // Default to Spanish
	noteFormat: "SOAP" | "DAP" | "BIRP" = "SOAP"
) => {
	const prompt = `You are an expert AI assistant for "Lazo", an app for tracking therapy sessions.
    
    Processing Task:
    Analyze the following transcription of a therapy session and extract structured data into JSON format.
    
    Clinical Note Format: ${noteFormat}
    - SOAP: Subjective (what the patient says), Objective (what is observed), Assessment (clinical impression), Plan (next steps).
    - DAP: Data (subjective/objective details), Assessment (clinical impression), Plan (next steps).
    - BIRP: Behavior (observation), Intervention (what therapist did), Response (how patient responded), Plan (next steps).

    Risk Analysis:
    Identify any "Red Flags" related to suicide, self-harm, abuse, or violence. Respond with clear warnings if detected.

    IMPORTANT: The output JSON values MUST be written in ${targetLanguage}.

    Transcript:
    "${transcriptText}"
    
    Output Format (JSON Only):
    {
      "clinical_note": "The full formatted note in ${noteFormat} style using professional clinical language",
      "summary": "Brief summary for the dashboard",
      "topics": [
         { "label": "Topic Name", "frequency": 25, "sentiment": "Positive|Negative|Neutral" }
      ],
      "sentiment": "Positivo|Negativo|Neutral|Ansioso|Triste|Enojado|Confundido|Esperanzado|Abrumado|Frustrado",
      "action_items": ["action1", "action2"],
      "risk_assessment": {
         "has_risk": true/false,
         "alerts": ["List of detected red flag topics"],
         "summary": "Specific risk explanation"
      },
      "entities": [
         { "name": "Entity Name", "type": "Person|Project|Location|Other" }
      ]
    }
    
    For sentiment, select the MOST DOMINANT emotional state from the list above. Use the exact spelling as shown.
    
    Ensure the output is valid JSON and nothing else. Do not add markdown blocks like \`\`\`json.`;

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

		// Extract content from Bedrock Claude response structure
		// Response format: { "content": [ { "type": "text", "text": "..." } ], ... }
		if (responseBody.content && responseBody.content[0]?.text) {
			const textContent = responseBody.content[0].text;

			// Try to parse JSON
			try {
				// Find JSON brackets just in case there is chatty text
				const jsonStart = textContent.indexOf("{");
				const jsonEnd = textContent.lastIndexOf("}");
				if (jsonStart !== -1 && jsonEnd !== -1) {
					const jsonString = textContent.substring(jsonStart, jsonEnd + 1);
					return JSON.parse(jsonString);
				}
				// Fallback if no brackets found (unlikely with Sonnet)
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
