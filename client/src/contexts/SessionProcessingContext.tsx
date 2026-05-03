import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	useRef,
	useCallback,
} from "react";
import { supabase } from "../supabaseClient";
import { useEncryption } from "../hooks/useEncryption";

export interface Topic {
	label: string;
	frequency: number;
	sentiment?: string;
}

export interface RiskAssessment {
	has_risk: boolean;
	alerts: string[];
	summary: string;
}

export interface AnalysisResult {
	clinical_note: string;
	summary: string;
	topics: Topic[];
	sentiment: string;
	action_items: string[];
	risk_assessment: RiskAssessment;
	entities: { name: string; type: string }[];
	key_moments?: { timestamp: number; label: string }[];
	ultra_psychological_analysis?: any;
}

export interface Biometry {
	talkListenRatio: { patient: number; therapist: number };
	silences: { start: number; duration: number }[];
}

export interface ProcessSessionResponse {
	message: string;
	transcript: string;
	analysis: AnalysisResult;
	biometry?: Biometry;
	localDuration?: number;
	noteFormat?: string;
	hasHistoricalContext?: boolean;
	patientIdentifier?: string | null;
}

export type ProcessingStatus =
	| "idle"
	| "uploading"
	| "processing"
	| "completed"
	| "error";

export interface ActiveSession {
	id: string; // processing_session_id
	patientId?: string;
	status: ProcessingStatus;
	result: ProcessSessionResponse | null;
	error: string | null;
	file?: File | null;
}

interface SessionProcessingContextType {
	activeSessions: Record<string, ActiveSession>;
	registerSession: (
		sessionId: string,
		patientId?: string,
		file?: File | null,
	) => void;
	clearSession: (sessionId: string) => void;
	getSession: (sessionId: string) => ActiveSession | undefined;
	getPatientSession: (patientId: string) => ActiveSession | undefined;
}

const SessionProcessingContext = createContext<
	SessionProcessingContextType | undefined
>(undefined);

export const SessionProcessingProvider: React.FC<{
	children: React.ReactNode;
	userId?: string;
	userSalt?: string | null;
	userPlan?: string | null;
}> = ({ children, userId, userSalt, userPlan }) => {
	const [activeSessions, setActiveSessions] = useState<
		Record<string, ActiveSession>
	>({});
	const encryption = useEncryption();

	// Track processing state to avoid race conditions
	const processingRefs = useRef<Record<string, boolean>>({});
	const deliveredRefs = useRef<Record<string, boolean>>({});

	const registerSession = useCallback(
		(sessionId: string, patientId?: string, file?: File | null) => {
			setActiveSessions((prev) => ({
				...prev,
				[sessionId]: {
					id: sessionId,
					patientId,
					status: "processing",
					result: null,
					error: null,
					file,
				},
			}));
		},
		[],
	);

	const clearSession = useCallback((sessionId: string) => {
		setActiveSessions((prev) => {
			const next = { ...prev };
			delete next[sessionId];
			return next;
		});
		delete processingRefs.current[sessionId];
		delete deliveredRefs.current[sessionId];
	}, []);

	const getSession = useCallback(
		(sessionId: string) => activeSessions[sessionId],
		[activeSessions],
	);

	const getPatientSession = useCallback(
		(patientId: string) => {
			return Object.values(activeSessions).find(
				(s) => s.patientId === patientId,
			);
		},
		[activeSessions],
	);

	// Effect to manage subscriptions for all active sessions
	useEffect(() => {
		if (!userId || !userSalt) return;

		const sessionIds = Object.keys(activeSessions).filter(
			(id) => activeSessions[id].status === "processing",
		);

		const subscriptions: Record<string, any> = {};
		const pollIntervals: Record<string, any> = {};

		sessionIds.forEach((sessionId) => {
			if (processingRefs.current[sessionId]) return;

			console.log(`[GlobalSessionContext] Subscribing to session ${sessionId}`);

			const handleFinishedResult = async (sessionData: any) => {
				if (processingRefs.current[sessionId]) return;
				if (deliveredRefs.current[sessionId]) return;

				processingRefs.current[sessionId] = true;

				try {
					const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

					// 1. Verify encryption keys are available
					const hasPassword = encryption.getPassword();
					const hasMasterKey = encryption.getMasterKey();
					if (!hasPassword && !hasMasterKey) {
						console.error(
							"[GlobalSessionContext] Encryption keys not available. Session result cannot be saved.",
						);
						setActiveSessions((prev) => ({
							...prev,
							[sessionId]: {
								...prev[sessionId],
								status: "error",
								error:
									"Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
							},
						}));
						return;
					}

					// 2. Encrypt result using current standard (Master Key preferred)
					if (!userSalt) {
						throw new Error("Salt de encriptación no disponible");
					}
					const encryptedResult = await encryption.encryptWithCurrentStandard(
						sessionData,
						userSalt,
					);

					// 3. Save encrypted result
					await fetch(`${apiUrl}/api/save-encrypted-result`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							sessionId,
							encryptedResult,
							userId,
						}),
					});

					// 4. Clear temp result
					await fetch(`${apiUrl}/api/clear-temp-result`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ sessionId, userId }),
					});

					// 5. Save patient summary (Ultra)
					if (userPlan === "ultra" && sessionData.patientIdentifier) {
						try {
							const summaryText =
								sessionData.analysis?.clinical_note ||
								sessionData.analysis?.summary ||
								"";
							if (summaryText && userSalt) {
								const encryptedSummary =
									await encryption.encryptWithCurrentStandard(
										summaryText,
										userSalt,
									);
								await fetch(`${apiUrl}/api/save-patient-summary`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										userId,
										patientIdentifier: sessionData.patientIdentifier,
										encryptedSummary,
									}),
								});
							}
						} catch (e) {
							console.error("[GlobalSessionContext] Error saving summary:", e);
						}
					}

					deliveredRefs.current[sessionId] = true;

					setActiveSessions((prev) => ({
						...prev,
						[sessionId]: {
							...prev[sessionId],
							status: "completed",
							result: {
								message: "Procesamiento completado",
								transcript: sessionData.transcript || "",
								analysis: sessionData.analysis,
								biometry: sessionData.biometry,
								hasHistoricalContext: sessionData.hasHistoricalContext,
								patientIdentifier: sessionData.patientIdentifier,
							},
						},
					}));
				} catch (err) {
					console.error(
						`[GlobalSessionContext] Error processing result for ${sessionId}:`,
						err,
					);
					setActiveSessions((prev) => ({
						...prev,
						[sessionId]: {
							...prev[sessionId],
							status: "error",
							error: "Error al cifrar el resultado.",
						},
					}));
				} finally {
					processingRefs.current[sessionId] = false;
				}
			};

			// Supabase Subscription
			const sub = supabase
				.channel(`global_session_${sessionId}`)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "processing_sessions",
						filter: `id=eq.${sessionId}`,
					},
					async (payload) => {
						const session = payload.new as any;
						if (session.temp_result && !session.temp_result_consumed) {
							await handleFinishedResult(session.temp_result);
						} else if (session.status === "error") {
							setActiveSessions((prev) => ({
								...prev,
								[sessionId]: {
									...prev[sessionId],
									status: "error",
									error: session.error_message || "Error en el procesamiento",
								},
							}));
						}
					},
				)
				.subscribe();

			subscriptions[sessionId] = sub;

			// Polling Fallback
			const poll = setInterval(async () => {
				try {
					const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
					const response = await fetch(
						`${apiUrl}/api/session/${sessionId}?t=${Date.now()}`,
					);
					if (response.ok) {
						const session = await response.json();
						if (session.temp_result && !session.temp_result_consumed) {
							await handleFinishedResult(session.temp_result);
							clearInterval(poll);
						} else if (
							session.status === "completed" &&
							session.encrypted_result
						) {
							// If it's already completed and encrypted on server but we missed it
							if (!deliveredRefs.current[sessionId]) {
								deliveredRefs.current[sessionId] = true;
								try {
									const decrypted = await encryption.decrypt(
										session.encrypted_result,
										userSalt,
									);
									let finalData = decrypted;
									if (typeof decrypted === "string") {
										try {
											finalData = JSON.parse(decrypted);
										} catch {}
									}
									setActiveSessions((prev) => ({
										...prev,
										[sessionId]: {
											...prev[sessionId],
											status: "completed",
											result: {
												message: "Procesamiento completado",
												transcript: finalData.transcript || "",
												analysis: finalData.analysis,
												biometry: finalData.biometry,
												patientIdentifier: finalData.patientIdentifier,
											},
										},
									}));
								} catch (e) {
									console.error(
										"[GlobalSessionContext] Case 2 decrypt error",
										e,
									);
								}
							}
							clearInterval(poll);
						} else if (session.status === "error") {
							setActiveSessions((prev) => ({
								...prev,
								[sessionId]: {
									...prev[sessionId],
									status: "error",
									error: session.error || "Error en el procesamiento",
								},
							}));
							clearInterval(poll);
						}
					}
				} catch (e) {
					console.error(
						`[GlobalSessionContext] Polling error for ${sessionId}:`,
						e,
					);
				}
			}, 3000);

			pollIntervals[sessionId] = poll;
		});

		return () => {
			Object.values(subscriptions).forEach((s) => s.unsubscribe());
			Object.values(pollIntervals).forEach((p) => clearInterval(p));
		};
	}, [activeSessions, userId, userSalt, userPlan, encryption]);

	return (
		<SessionProcessingContext.Provider
			value={{
				activeSessions,
				registerSession,
				clearSession,
				getSession,
				getPatientSession,
			}}
		>
			{children}
		</SessionProcessingContext.Provider>
	);
};

export const useSessionProcessing = () => {
	const context = useContext(SessionProcessingContext);
	if (context === undefined) {
		throw new Error(
			"useSessionProcessing must be used within a SessionProcessingProvider",
		);
	}
	return context;
};
