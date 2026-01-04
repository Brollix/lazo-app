import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
	TranscribeClient,
	StartTranscriptionJobCommand,
	GetTranscriptionJobCommand,
	MediaFormat,
} from "@aws-sdk/client-transcribe";
// cleaned up unused import
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "sa-east-1";

// Credentials are automatically loaded from IAM Role if running on EC2
// or from .env / ~/.aws/credentials locally
const s3Client = new S3Client({ region });
const transcribeClient = new TranscribeClient({ region });

export const uploadAudioToS3 = async (
	fileBuffer: Buffer,
	fileName: string,
	mimeType: string
): Promise<string> => {
	const bucketName = process.env.AWS_S3_BUCKET_NAME;
	if (!bucketName) throw new Error("AWS_S3_BUCKET_NAME is not defined");

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: fileName,
		Body: fileBuffer,
		ContentType: mimeType,
	});

	await s3Client.send(command);

	// Return the S3 URI
	return `s3://${bucketName}/${fileName}`;
};

export const startTranscriptionJob = async (jobName: string, s3Uri: string) => {
	const command = new StartTranscriptionJobCommand({
		TranscriptionJobName: jobName,
		LanguageCode: "es-ES", // Assuming Spanish based on user language ("lazo-app", "como empiezo")
		Media: { MediaFileUri: s3Uri },
		// OutputBucketName: process.env.AWS_S3_BUCKET_NAME, // Optional: if we want Transcribe to write the JSON to our bucket
	});

	return await transcribeClient.send(command);
};

export const getTranscriptionJobStatus = async (jobName: string) => {
	const command = new GetTranscriptionJobCommand({
		TranscriptionJobName: jobName,
	});

	return await transcribeClient.send(command);
};

// Helper to fetch the transcript JSON content after the job is completed
export const fetchTranscriptContent = async (transcriptFileUri: string) => {
	// If the transcript is in our bucket (if OutputBucketName was used), we use S3 GetObject
	// However, if OutputBucketName was NOT used, Transcribe provides a pre-signed
	// HTTPS URL where we can download the JSON directly.

	// For simplicity, we'll assume we access the URL provided by Transcribe
	const response = await fetch(transcriptFileUri);
	if (!response.ok) {
		throw new Error(`Failed to fetch transcript: ${response.statusText}`);
	}
	return await response.json();
};
