import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Box,
	Paper,
	Typography,
	Button,
	Chip,
	IconButton,
	Stack,
	Avatar,
	Dialog,
	DialogContent,
	CircularProgress,
	useTheme,
	List,
	ListItem,
	ListItemButton,
	ListItemText,
	ListItemIcon,
} from "@mui/material";
import {
	SmartToy,
	ChevronLeft,
	Settings as SettingsIcon,
	Assignment,
	TaskAlt,
	Psychology,
	Category,
	CloudUpload,
	Description as DescriptionIcon,
	AddCircleOutline,
	History,
	EventNote,
	MenuBook,
	NotificationsActive as NotifyIcon,
	AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { Settings } from "./Settings";
import { SubscriptionModal } from "./SubscriptionModal";
import { AlertModal } from "./AlertModal";
import {
	getBackgrounds,
	getExtendedShadows,
	components as themeComponents,
	opacity,
	typographyExtended,
} from "../styles.theme";

import { AudioUploader, ProcessSessionResponse } from "./AudioUploader";
import { UpgradeToProModal } from "./UpgradeToProModal";
import { useUserPlan } from "../hooks/useUserPlan";
import { ContextPanel } from "./ContextPanel";
import { SoapNoteEditor } from "./SoapNoteEditor";
import { Patient } from "./PatientsList";
import { AudioPlayer } from "./AudioPlayer";
import { OnboardingTutorial } from "./OnboardingTutorial";
import { useEncryption } from "../hooks/useEncryption";
import { supabase } from "../supabaseClient";
import ReactMarkdown from "react-markdown";
import { ModeSelectionScreen } from "./ModeSelectionScreen";
import { ManualNotesScreen } from "./ManualNotesScreen";
import { useSessionProcessing } from "../contexts/SessionProcessingContext";

interface ChatMessage {
	id: string;
	sender: "user" | "bot";
	content: React.ReactNode;
	actions?: React.ReactNode;
	timestamp: Date;
}

export interface ClinicalSession {
	id: string;
	session_number: number;
	session_date: string;
	session_time?: string;
	encrypted_data: string;
}

const formatDuration = (seconds?: number) => {
	if (!seconds) return "";
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	if (mins === 0) return `(${secs} seg)`;
	return `(${mins} min ${secs.toString().padStart(2, "0")}s)`;
};

interface AnalysisChatActionsProps {
	usedActions: Set<string>;
	onAction: (
		action:
			| "soap"
			| "resumen"
			| "tareas"
			| "psicologico"
			| "intervencion"
			| "animo",
	) => void;
}

const AnalysisChatActions: React.FC<AnalysisChatActionsProps> = ({
	usedActions,
	onAction,
}) => {
	return (
		<Stack
			direction="row"
			spacing={1}
			sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}
		>
			<Button
				variant="outlined"
				size="small"
				onClick={() => onAction("resumen")}
				disabled={usedActions.has("resumen")}
				sx={{ borderRadius: 2, textTransform: "none" }}
			>
				Resumen Ejecutivo
			</Button>
			<Button
				variant="outlined"
				size="small"
				onClick={() => onAction("tareas")}
				disabled={usedActions.has("tareas")}
				sx={{ borderRadius: 2, textTransform: "none" }}
			>
				Tareas y Objetivos
			</Button>
			<Button
				variant="outlined"
				size="small"
				onClick={() => onAction("psicologico")}
				disabled={usedActions.has("psicologico")}
				sx={{ borderRadius: 2, textTransform: "none" }}
			>
				Análisis Psicológico
			</Button>
		</Stack>
	);
};

export const Dashboard: React.FC<{
	onLogout: () => void;
	patient: Patient | null;
	initialSession?: ClinicalSession | null;
	initialDate?: string;
	initialTime?: string;
	onBack?: () => void;
	userId?: string;
	isAdmin?: boolean;
	onNavigateToAdmin?: () => void;
}> = ({
	onLogout,
	patient,
	initialSession,
	initialDate,
	initialTime,
	onBack,
	userId,
	isAdmin,
	onNavigateToAdmin,
}) => {
	const encryption = useEncryption();
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const extendedShadows = getExtendedShadows(theme.palette.mode);
	const { getPatientSession } = useSessionProcessing();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
	const [userAppPlan, setUserAppPlan] = useState<string | null>(null);
	const [userEmail, setUserEmail] = useState<string>("");
	const [userSalt, setUserSalt] = useState<string | null>(null);
	const [sessionMode, setSessionMode] = useState<null | "audio" | "notes">(
		null,
	); // Mode selection
	const [audioFile, setAudioFile] = useState<string | null>(null); // null = "listening/empty", string = "playback"
	const [soapContent, setSoapContent] = useState("");
	const [sessionData, setSessionData] = useState<ProcessSessionResponse | null>(
		null,
	);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [usedActions, setUsedActions] = useState<Set<string>>(new Set());
	const [isActionLoading, setIsActionLoading] = useState(false);
	const [openUploadModal, setOpenUploadModal] = useState(false); // State for the new Dialog

	const [isFocusMode, setIsFocusMode] = useState(false);

	const [draftDialogOpen, setDraftDialogOpen] = useState(false);
	const [pendingDraft, setPendingDraft] = useState<{
		sessionData: ProcessSessionResponse | null;
		soapContent: string;
		messages: ChatMessage[];
		lastUpdated: string;
	} | null>(null);
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [announcement, setAnnouncement] = useState<{
		message: string;
		created_at: string;
	} | null>(null);
	const [alertModal, setAlertModal] = useState<{
		open: boolean;
		title?: string;
		message: string;
		severity?: "success" | "error" | "warning" | "info";
	}>({
		open: false,
		message: "",
		severity: "info",
	});

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const sessionDataRef = useRef<ProcessSessionResponse | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [sessions, setSessions] = useState<ClinicalSession[]>([]);
	const [sessionsLoading, setSessionsLoading] = useState(false);
	const [showSessionsSidebar, setShowSessionsSidebar] = useState(false);
	const { planData, refreshPlan } = useUserPlan(userId);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [currentSessionId, setCurrentSessionId] = useState<string | null>(
		initialSession?.id || null,
	);
	const [sessionNumber, setSessionNumber] = useState<number | null>(
		initialSession?.session_number || null,
	);

	// Sync ref with state
	useEffect(() => {
		sessionDataRef.current = sessionData;
	}, [sessionData]);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	useEffect(() => {
		const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

		// Fetch user plan and encryption salt
		if (userId) {
			fetch(`${apiUrl}/api/user-plan/${userId}`)
				.then((res) => res.json())
				.then((data) => {
					setUserAppPlan(data.plan_type);
					setUserEmail(data.email || "");
				})
				.catch((err) => console.error("Error fetching user plan:", err));

			// Fetch encryption salt from profile
			supabase
				.from("profiles")
				.select("encryption_salt")
				.eq("id", userId)
				.single()
				.then(({ data, error }) => {
					if (error) {
						console.error("Error fetching encryption salt:", error);
					} else if (data?.encryption_salt) {
						setUserSalt(data.encryption_salt);
					}
				});

			// Check if user has seen onboarding
			const hasSeenOnboarding = localStorage.getItem(
				`lazo_onboarding_${userId}`,
			);
			if (!hasSeenOnboarding) {
				setShowOnboarding(true);
			}
		}

		// Fetch announcements
		fetch(`${apiUrl}/api/announcements`)
			.then((res) => res.json())
			.then((data) => {
				if (data && data.length > 0) {
					setAnnouncement(data[0]);
				}
			})
			.catch((err) => console.error("Error fetching announcements:", err));
	}, [userId]);

	/* Moved definitions up to avoid hoisting issues */
	const fetchSessions = useCallback(async () => {
		if (!patient?.id) return;
		try {
			setSessionsLoading(true);
			const { data, error } = await supabase
				.from("sessions")
				.select("id, session_number, session_date, encrypted_data")
				.eq("patient_id", patient.id)
				.order("session_number", { ascending: false });

			if (error) throw error;
			setSessions(data || []);
		} catch (err) {
			console.error("Error fetching sessions:", err);
		} finally {
			setSessionsLoading(false);
		}
	}, [patient?.id]);

	const handleLoadSession = useCallback(
		async (session: ClinicalSession) => {
			setUsedActions(new Set());
			try {
				if (!userId) {
					setAlertModal({
						open: true,
						message: "Error de seguridad: Usuario no autenticado.",
						severity: "error",
					});
					return;
				}

				// Verify encryption is set up and salt is available
				const hasPassword = encryption.getPassword();
				const hasMasterKey = encryption.getMasterKey();
				if ((!hasPassword && !hasMasterKey) || !userSalt) {
					setAlertModal({
						open: true,
						message:
							"Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
						severity: "error",
					});
					return;
				}

				let data;
				try {
					data = await encryption.decryptWithFallback(
						session.encrypted_data,
						userSalt,
						userId,
					);
				} catch (decryptErr) {
					console.error("Error decrypting session data:", decryptErr);
					setAlertModal({
						open: true,
						message:
							"Error al cargar la sesión: No se pudo desencriptar los datos con ningún método conocido.",
						severity: "error",
					});
					return;
				}

				// Patch session object with time from encrypted data if available
				if (data.session_time) {
					session.session_time = data.session_time;
				}

				// Restore full session data if available
				if (data.full_analysis_data) {
					setSessionData(data.full_analysis_data);
				}

				setSoapContent(data.clinical_note || "");
				// Show a message in chat about loaded session
				setMessages([
					{
						id: "loaded-msg",
						sender: "bot",
						content: `He cargado la **Nota Clínica** de la **Sesión #${session.session_number}** (${session.session_date}).`,
						timestamp: new Date(),
					},
				]);
				setShowSessionsSidebar(false);
			} catch (err: any) {
				console.error("Error parsing session data:", err);
				setAlertModal({
					open: true,
					message: "Error al cargar la sesión",
					severity: "error",
				});
			}
		},
		[userId, userSalt, encryption],
	);

	const getStorageKey = useCallback(
		() => (patient ? `lazo_draft_${patient.id}` : null),
		[patient],
	);

	const addMessage = (
		sender: "user" | "bot",
		content: string | React.ReactNode,
		actions?: React.ReactNode,
	) => {
		const newMessage: ChatMessage = {
			id: Date.now().toString(),
			sender,
			content,
			actions,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, newMessage]);
	};

	// Fetch sessions when patient changes
	useEffect(() => {
		if (patient?.id) {
			fetchSessions();

			// If initialSession is provided, load it
			if (initialSession) {
				// Si la sesión tiene datos encriptados, cargarla
				// Si no tiene datos (sesión recién creada), solo establecer el ID
				if (initialSession.encrypted_data && initialSession.encrypted_data.length > 0) {
					// Sesión existente con datos - cargarla
					handleLoadSession(initialSession);
				} else {
					// Sesión nueva vacía - solo establecer el ID y modo
					setCurrentSessionId(initialSession.id);
					setSessionNumber(initialSession.session_number);
					setSoapContent("");
					setMessages([
						{
							id: "new-session-msg",
							sender: "bot",
							content: `Sesión #${initialSession.session_number} creada. Puedes comenzar a escribir tus notas.`,
							timestamp: new Date(),
						},
					]);
				}
				setSessionMode("audio"); // Set to audio mode when loading existing session
			} else {
				// Check for background processing sessions for this patient
				const activeSession = getPatientSession(patient.id);
				if (activeSession && activeSession.status === "processing") {
					setOpenUploadModal(true);
					setSessionMode("audio");
				}

				// Otherwise try draft, but don't auto-open sidebar anymore
				const draftKey = getStorageKey();
				if (!draftKey || !localStorage.getItem(draftKey)) {
					// If no draft and no session, show mode selection
					if (!activeSession) setSessionMode(null);
				}
			}
		} else {
			setSessions([]);
		}
	}, [
		patient?.id,
		initialSession,
		fetchSessions,
		handleLoadSession,
		getPatientSession,
		getStorageKey,
	]);

	// Load draft on mount or patient change
	useEffect(() => {
		const key = getStorageKey();
		if (!key) return;

		const saved = localStorage.getItem(key);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);

				// If we are starting a NEW session (no initialSession provided), check draft
				if (!initialSession) {
					// Ask user before loading
					setPendingDraft(parsed);
					setDraftDialogOpen(true);
					setSessionMode("audio"); // Priority: show draft dialog in audio mode
					// Do NOT load yet
				} else {
					// If viewing an existing session, we generally ignore drafts
					// unless we want to support "auto-save edits", which is complex.
					// For now, let's assume drafts are only for NEW sessions.
				}
			} catch (e) {
				console.error("Error loading draft from localStorage:", e);
			}
		} else {
			// Clear state if no draft for this patient AND we are new
			if (!initialSession) {
				setSessionData(null);
				setSoapContent("");
				setMessages([]);
			}
		}
	}, [patient?.id, initialSession, getStorageKey]); // Dependency on initialSession is key

	// Save draft on state changes
	useEffect(() => {
		const key = getStorageKey();
		if (!key) return;

		// We only save if there's something to save
		if (!sessionData && !soapContent && messages.length === 0) {
			return;
		}

		// Filter messages to only persist those with string content
		// since ReactNodes cannot be serialized to JSON
		const serializableMessages = messages
			.filter((m) => typeof m.content === "string")
			.map((m) => ({
				...m,
				actions: undefined, // Actions are usually components/buttons
			}));

		const draft = {
			sessionData,
			soapContent,
			messages: serializableMessages,
			lastUpdated: new Date().toISOString(),
		};

		localStorage.setItem(key, JSON.stringify(draft));
	}, [sessionData, soapContent, messages, patient?.id, getStorageKey]);

	// Reset used actions when switching sessions
	useEffect(() => {
		setUsedActions(new Set());
	}, [initialSession?.id]);
	// -------------------------

	const handleAnalysisComplete = (data: ProcessSessionResponse) => {
		setSessionData(data);

		// Show analyzed greeting with chips as requested
		addMessage(
			"bot",
			`He analizado el audio de **${
				patient?.name || "Paciente"
			} ${formatDuration(data.localDuration)}**. ¿Por dónde quieres empezar?`,
			"analysis-actions" as any,
		);

		// Check for Risks
		if (data.analysis.risk_assessment?.has_risk) {
			addMessage(
				"bot",
				<Box
					sx={{
						p: 2,
						bgcolor: "error.dark",
						color: "#ffffff",
						borderRadius: 2,
						border: "2px solid",
						borderColor: "error.main",
					}}
				>
					<Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
						ALERTA DE RIESGO DETECTADA
					</Typography>
					<Typography variant="body2">
						{data.analysis.risk_assessment.summary}
					</Typography>
					<Box sx={{ mt: 1 }}>
						{data.analysis.risk_assessment.alerts.map((alert, i) => (
							<Chip
								key={i}
								label={alert}
								size="small"
								sx={{
									mr: 0.5,
									bgcolor: "#ffffff",
									color: "error.dark",
									fontWeight: "bold",
								}}
							/>
						))}
					</Box>
				</Box>,
			);
		}

		// We don't auto-generate SOAP here anymore as per new flow,
		// but we keep the data for when the user clicks the button.
		setOpenUploadModal(false);
	};

	const generateClinicalNote = (data: ProcessSessionResponse) => {
		const newContent = data.analysis.clinical_note || "";
		setSoapContent(newContent);
		return newContent;
	};

	const handleAudioSelected = (file: File) => {
		const url = URL.createObjectURL(file);
		setAudioFile(url);
	};

	const handleQuickAction = async (
		action:
			| "soap"
			| "resumen"
			| "tareas"
			| "psicologico"
			| "intervencion"
			| "animo",
	) => {
		const currentSessionData = sessionDataRef.current;
		if (!currentSessionData || usedActions.has(action)) return;

		if (action === "soap") {
			if (planData?.plan_type === "free" && planData.credits_remaining <= 0) {
				setUpgradeModalOpen(true);
				return;
			}
			generateClinicalNote(currentSessionData);
			addMessage(
				"bot",
				`### Nota Clínica Generada\n\nHe redactado la nota basada en el formato solicitado (**${
					currentSessionData.analysis.clinical_note.includes("## S") ?
						"SOAP"
					:	"Clínico"
				}**). Ya puedes verla y editarla en el panel de la izquierda.`,
			);
			return;
		}

		if (planData?.plan_type === "free" && planData.credits_remaining <= 0) {
			setUpgradeModalOpen(true);
			return;
		}

		setIsActionLoading(true);

		const actionLabels: Record<string, string> = {
			resumen: "Generando Resumen Ejecutivo...",
			tareas: "Extrayendo Tareas y Objetivos...",
			psicologico: "Realizando Análisis Psicológico...",
			intervencion: "Sugiriendo Intervenciones...",
			animo: "Analizando Estado de Ánimo...",
		};

		const loadingMsgId = Date.now().toString() + "loading";
		setMessages((prev) => [
			...prev,
			{
				id: loadingMsgId,
				sender: "bot",
				content: (
					<Stack direction="row" spacing={1} alignItems="center">
						<CircularProgress size={16} />
						<Typography variant="body2">
							{actionLabels[action] || "Procesando..."}
						</Typography>
					</Stack>
				),
				timestamp: new Date(),
			} as ChatMessage,
		]);

		try {
			const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
			const response = await fetch(`${apiUrl}/api/ai-action`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					transcriptText: currentSessionData.transcript,
					actionType: action,
					patientName: patient?.name || "el paciente",
					userId: userId,
				}),
			});

			if (!response.ok) throw new Error("Error en la acción de IA");

			const data = await response.json();

			// Add to used actions
			setUsedActions((prev) => new Set(prev).add(action));

			// Remove loading message and add result
			setMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));

			const actionTitles: Record<string, string> = {
				resumen: "Resumen Ejecutivo",
				tareas: "Tareas y Objetivos",
				psicologico: "Análisis Psicológico",
				intervencion: "Sugerencias de Intervención",
				animo: "Análisis de Ánimo",
			};

			addMessage(
				"bot",
				`### ${actionTitles[action]}\n\n${data.result}`,
				<Button
					size="small"
					startIcon={<AddCircleOutline />}
					onClick={() =>
						setSoapContent(
							(prev) =>
								prev +
								(prev ? "\n\n" : "") +
								`### ${actionTitles[action]}\n${data.result}`,
						)
					}
					sx={{
						textTransform: "none",
						fontSize: typographyExtended.fontSizes.xs,
						mt: 1,
					}}
				>
					Meter en la nota
				</Button>,
			);
		} catch (error) {
			console.error("AI Action error:", error);
			setMessages((prev) => prev.filter((m) => m.id !== loadingMsgId));
			addMessage(
				"bot",
				"Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.",
			);
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleExportTxt = () => {
		if (!soapContent) {
			setAlertModal({
				open: true,
				message: "No hay contenido para exportar.",
				severity: "warning",
			});
			return;
		}

		const element = document.createElement("a");
		const file = new Blob([soapContent], { type: "text/plain" });
		element.href = URL.createObjectURL(file);
		const date = new Date().toISOString().split("T")[0];
		element.download = `Nota_${patient?.name || "Paciente"}_${date}.txt`;
		document.body.appendChild(element); // Required for this to work in FireFox
		element.click();
		document.body.removeChild(element);
	};

	// Función de autoguardado silencioso (sin alertas)
	const handleAutoSave = async (content: string) => {
		if (!patient?.id || !userId || !encryption.isSetup() || !userSalt) {
			return;
		}

		try {
			// Prepare session data object
			const sessionRecord = {
				clinical_note: content,
				summary: sessionData?.analysis.summary,
				topics: sessionData?.analysis.topics,
				transcript: sessionData?.transcript,
				session_time:
					initialTime ||
					new Date().toTimeString().split(" ")[0].substring(0, 5),
				full_analysis_data:
					sessionData ?
						{
							...sessionData,
							analysis: {
								...sessionData.analysis,
								clinical_note: content,
							},
						}
					:	null,
			};

			const encryptedData = await encryption.encryptWithCurrentStandard(
				sessionRecord,
				userSalt,
			);

			// Usar currentSessionId si existe, o initialSession.id si fue pasado
			const sessionIdToUpdate = currentSessionId || initialSession?.id;

			if (sessionIdToUpdate) {
				// --- UPDATE EXISTING SESSION ---
				const { error: updateError } = await supabase
					.from("sessions")
					.update({
						encrypted_data: encryptedData,
						updated_at: new Date().toISOString(),
					})
					.eq("id", sessionIdToUpdate);

				if (updateError) throw updateError;
				
				// Si no teníamos currentSessionId pero sí initialSession, guardarlo ahora
				if (!currentSessionId && initialSession) {
					setCurrentSessionId(initialSession.id);
					setSessionNumber(initialSession.session_number);
				}
			} else {
				// --- CREATE NEW SESSION (primera vez) ---
				const { data: nextNum, error: rpcError } = await supabase.rpc(
					"get_next_session_number",
					{ p_patient_id: patient.id },
				);

				if (rpcError) throw rpcError;

				const { data: newSession, error: insertError } = await supabase
					.from("sessions")
					.insert({
						patient_id: patient.id,
						user_id: userId,
						session_number: nextNum,
						encrypted_data: encryptedData,
						session_date: initialDate || new Date().toISOString().split("T")[0],
						session_time:
							initialTime ||
							new Date().toTimeString().split(" ")[0].substring(0, 5),
					})
					.select()
					.single();

				if (insertError) throw insertError;

				// Guardar el ID de la sesión para futuras actualizaciones
				if (newSession) {
					setCurrentSessionId(newSession.id);
					setSessionNumber(nextNum);
				}

				// Clear draft only on new save
				const draftKey = getStorageKey();
				if (draftKey) localStorage.removeItem(draftKey);
			}

			// Update last visit for patient silently
			const sessionDate = initialDate || new Date().toISOString().split("T")[0];
			const updatedPatientData = {
				name: patient.name,
				age: patient.age,
				gender: patient.gender,
				lastVisit: sessionDate,
				consultationReason: patient.consultationReason,
				status: patient.status,
				admissionDate: patient.admissionDate,
			};
			const encryptedPatientData = await encryption.encryptWithCurrentStandard(
				updatedPatientData,
				userSalt,
			);

			await supabase
				.from("patients")
				.update({
					encrypted_data: encryptedPatientData,
					updated_at: new Date().toISOString(),
				})
				.eq("id", patient.id);
		} catch (err: any) {
			console.error("Error en autoguardado:", err);
			// No mostrar alerta para no interrumpir al usuario
		}
	};

	const handleSaveSession = async () => {
		if (!patient?.id || !userId) return;

		try {
			setIsActionLoading(true);

			if (!userId) {
				setAlertModal({
					open: true,
					message: "Error de seguridad: Usuario no autenticado.",
					severity: "error",
				});
				setIsActionLoading(false);
				return;
			}

			// Verify encryption is set up and salt is available
			if (!encryption.isSetup() || !userSalt) {
				setAlertModal({
					open: true,
					message:
						"Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
					severity: "error",
				});
				setIsActionLoading(false);
				return;
			}

			// Si ya existe una sesión guardada, solo actualizar
			if (currentSessionId) {
				await handleAutoSave(soapContent);
				setAlertModal({
					open: true,
					message: `Sesión #${sessionNumber} guardada exitosamente`,
					severity: "success",
				});
			} else {
				// Crear nueva sesión
				await handleAutoSave(soapContent);
				setAlertModal({
					open: true,
					message: `Sesión #${sessionNumber} guardada exitosamente`,
					severity: "success",
				});
			}

			setSoapContent("");
			setSessionData(null);
			setMessages([]);
			setUsedActions(new Set());
			setCurrentSessionId(null);
			setSessionNumber(null);

			await fetchSessions();
			if (onBack) onBack(); // Go back to sessions list after save
		} catch (err: any) {
			console.error("Error saving session:", err);
			setAlertModal({
				open: true,
				message: `Error al guardar sesión: ${err.message}`,
				severity: "error",
			});
		} finally {
			setIsActionLoading(false);
		}
	};

	const handleUploadCheck = () => {
		if (!userAppPlan) {
			setSubscriptionModalOpen(true);
		} else if (
			userAppPlan === "free" &&
			planData &&
			planData.credits_remaining <= 0
		) {
			setUpgradeModalOpen(true);
		} else {
			setOpenUploadModal(true);
		}
	};

	const handleConfirmDraft = (resume: boolean) => {
		if (resume && pendingDraft) {
			const {
				sessionData: savedSession,
				soapContent: savedSoap,
				messages: savedMessages,
			} = pendingDraft;

			if (savedSession) setSessionData(savedSession);
			if (savedSoap) setSoapContent(savedSoap);
			if (savedMessages) {
				setMessages(
					savedMessages.map((m: any) => ({
						...m,
						timestamp: new Date(m.timestamp),
					})),
				);
			}
		} else {
			// Discard logic
			const key = getStorageKey();
			if (key) localStorage.removeItem(key);
			setSessionData(null);
			setSoapContent("");
			setMessages([]);
			setUsedActions(new Set());
			// No longer auto-opening upload modal here to avoid being intrusive
		}
		setDraftDialogOpen(false);
		setPendingDraft(null);
	};

	const handleCompleteOnboarding = () => {
		if (userId) {
			localStorage.setItem(`lazo_onboarding_${userId}`, "true");
		}
		setShowOnboarding(false);
	};

	const handleUpgradeClose = () => {
		setUpgradeModalOpen(false);
		refreshPlan();
	};

	const handleSelectAudioMode = () => {
		setSessionMode("audio");
		// Only open upload check if no draft is pending to avoid double modals
		if (!pendingDraft) {
			handleUploadCheck();
		}
	};

	const handleSelectNotesMode = () => {
		setSessionMode("notes");
	};

	const handleBackToModeSelection = () => {
		setSessionMode(null);
		// Clear any session data
		setSessionData(null);
		setSoapContent("");
		setMessages([]);
		setUsedActions(new Set());
		setAudioFile(null);
	};

	return (
		<Box
			sx={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				bgcolor: "background.default",
			}}
		>
			{/* Mode Selection Screen */}
			{sessionMode === null && (
				<ModeSelectionScreen
					patient={patient}
					onSelectAudioMode={handleSelectAudioMode}
					onSelectNotesMode={handleSelectNotesMode}
				/>
			)}

		{/* Manual Notes Screen */}
		{sessionMode === "notes" && (
			<ManualNotesScreen
				patient={patient}
				onBack={handleBackToModeSelection}
				onAutoSave={handleAutoSave}
				onDownload={handleExportTxt}
				content={soapContent}
				onChange={setSoapContent}
				userId={userId || undefined}
				userPlan={userAppPlan || undefined}
				onAnalysisComplete={(data) => {
					setSessionData(data);
					setSoapContent(data.analysis.clinical_note);
				}}
			/>
		)}

			{/* Audio Dashboard Content - Only show when mode is 'audio' */}
			{sessionMode === "audio" && (
				<>
					{/* Header */}
					<Paper
						elevation={0}
						square
						sx={{
							height: {
								xs: "auto",
								sm: themeComponents.dashboard.headerHeight,
							},
							px: { xs: 2, sm: 3 },
							py: { xs: 1.5, sm: 0 },
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							borderBottom: "1px solid",
							borderColor: "divider",
							bgcolor: backgrounds.glass.header,
							backdropFilter: "blur(12px)",
							position: "sticky",
							top: 0,
							zIndex: 10,
						}}
					>
						{/* Left: Back button */}
						<Box
							sx={{
								display: { xs: "flex", sm: "flex" },
								alignItems: "center",
								minWidth: { xs: "auto", sm: 120 },
							}}
						>
							{onBack && (
								<IconButton onClick={onBack} size="small">
									<ChevronLeft />
								</IconButton>
							)}
							<IconButton
								onClick={() => setShowSessionsSidebar(!showSessionsSidebar)}
								size="small"
								sx={{
									ml: 1,
									color: showSessionsSidebar ? "primary.main" : "inherit",
								}}
								title="Historial de Sesiones"
							>
								<History />
							</IconButton>
						</Box>

						{/* Center: Patient name */}
						<Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
							<Typography
								variant="h4"
								sx={{
									fontWeight: typographyExtended.fontWeights.bold,
									letterSpacing: typographyExtended.letterSpacing.tight,
									color: "text.primary",
									fontSize: { xs: "1.25rem", sm: "1.5rem", md: "2rem" },
								}}
							>
								{patient ? patient.name : "Nueva Sesión"}
							</Typography>
						</Box>

						{/* Right: Settings icon */}
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								minWidth: { xs: "auto", sm: 120 },
								justifyContent: "flex-end",
							}}
						>
							<IconButton
								onClick={() => setSettingsOpen(true)}
								size="small"
								sx={{ borderRadius: 2 }}
							>
								<SettingsIcon />
							</IconButton>
							{isAdmin && onNavigateToAdmin && (
								<IconButton
									onClick={onNavigateToAdmin}
									size="small"
									color="primary"
									title="Panel de Administración"
									sx={{ borderRadius: 2 }}
								>
									<AdminIcon />
								</IconButton>
							)}
						</Box>
					</Paper>

					{/* Global Announcement Bar */}
					{announcement && (
						<Box
							sx={{
								bgcolor: "primary.main",
								color: "primary.contrastText",
								px: 3,
								py: 1,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 1.5,
								boxShadow: (theme) => theme.shadows[2],
								zIndex: 9,
							}}
						>
							<NotifyIcon sx={{ fontSize: 20 }} />
							<Typography variant="body2" fontWeight="500">
								{announcement.message}
							</Typography>
							<IconButton
								size="small"
								onClick={() => setAnnouncement(null)}
								sx={{ color: "inherit", ml: 2 }}
							>
								<ChevronLeft sx={{ transform: "rotate(90deg)" }} />
							</IconButton>
						</Box>
					)}

					<Settings
						open={settingsOpen}
						onClose={() => setSettingsOpen(false)}
						onLogout={onLogout}
					/>

					<SubscriptionModal
						open={subscriptionModalOpen}
						onClose={() => {
							setSubscriptionModalOpen(false);
							// Re-fetch plan to see if they subscribed
							if (userId) {
								const apiUrl = (import.meta.env.VITE_API_URL || "").trim();
								fetch(`${apiUrl}/api/user-plan/${userId}`)
									.then((res) => res.json())
									.then((data) => {
										setUserAppPlan(data.plan_type);
										// Auto-open upload modal if they now have a plan
										if (data.plan_type) {
											setOpenUploadModal(true);
										}
									});
							}
						}}
						userId={userId || ""}
						userEmail={userEmail}
					/>

					{/* Main Content - Responsive Layout */}
					<Box
						sx={{
							flexGrow: 1,
							display: "flex",
							flexDirection: { xs: "column", lg: "row" },
							p: { xs: 1, sm: 2 },
							gap: { xs: 1, sm: 2 },
							overflow: { xs: "auto", lg: "hidden" },
						}}
					>
					{/* Column 1: SOAP Editor (Left) */}
					<SoapNoteEditor
						content={soapContent}
						onChange={setSoapContent}
						onAutoSave={handleAutoSave}
						onDownload={handleExportTxt}
						method={sessionData?.noteFormat}
						isFocused={isFocusMode}
						onToggleFocus={() => setIsFocusMode(!isFocusMode)}
					/>

						{/* Column 2: Command Center (Center) */}
						<Paper
							elevation={0}
							sx={{
								flex: themeComponents.dashboard.panelFlex.center,
								display: isFocusMode ? "none" : "flex", // Hide center in focus mode
								flexDirection: "column",
								borderRadius: 4,
								overflow: "hidden",
								border: "1px solid",
								borderColor: "divider",
								boxShadow: extendedShadows.panel,
								bgcolor: backgrounds.glass.panel,
								backdropFilter: "blur(16px)",
							}}
						>
							{/* Top Section: Audio Player or New Session Button */}
							<Box
								sx={{
									p: 2,
									bgcolor: "background.paper",
									borderBottom: "1px solid",
									borderColor: "divider",
									flexShrink: 0,
								}}
							>
								{audioFile ?
									<AudioPlayer
										url={audioFile}
										biometry={sessionData?.biometry}
										markers={sessionData?.analysis.key_moments}
									/>
								: sessionData ?
									<Box
										sx={{
											p: 2,
											textAlign: "center",
											bgcolor: "action.hover",
											borderRadius: 2,
											border: "1px dashed",
											borderColor: "primary.main",
										}}
									>
										<Typography variant="body2" color="primary" sx={{ mb: 1 }}>
											Sesión restaurada. Sube el audio nuevamente para habilitar
											la reproducción.
										</Typography>
										<Button
											size="small"
											variant="outlined"
											startIcon={<CloudUpload />}
											onClick={() => fileInputRef.current?.click()}
										>
											Vincular Audio de Nuevo
										</Button>
										<input
											type="file"
											ref={fileInputRef}
											style={{ display: "none" }}
											accept="audio/*"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) handleAudioSelected(file);
											}}
										/>
									</Box>
								:	<Button
										fullWidth
										variant="outlined"
										startIcon={<CloudUpload />}
										onClick={handleUploadCheck}
										sx={{
											py: 2,
											borderRadius: 4,
											borderStyle: "dashed",
											borderWidth: 2,
											"&:hover": {
												borderStyle: "dashed",
												borderWidth: 2,
												bgcolor:
													theme.palette.mode === "light" ?
														"primary.light"
													:	backgrounds.hover.primaryLight,
											},
										}}
									>
										Subir Audio de Sesión
									</Button>
								}
							</Box>

							{/* Middle: AI Assistant Header & Quick Actions */}
							<Box
								sx={{
									p: 1.5,
									borderBottom: "1px solid",
									borderColor: "divider",
									bgcolor: "background.default",
									flexShrink: 0,
								}}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										mb: sessionData ? 1.5 : 0,
									}}
								>
									<Stack direction="row" alignItems="center" gap={1}>
										<SmartToy color="primary" fontSize="small" />
										<Typography
											variant="subtitle2"
											sx={{
												fontWeight: typographyExtended.fontWeights.bold,
												color: "primary.main",
												textTransform: "uppercase",
												fontSize: typographyExtended.fontSizes.sm,
												letterSpacing: typographyExtended.letterSpacing.relaxed,
											}}
										>
											Asistente IA
										</Typography>
									</Stack>
								</Box>

								{/* Quick Actions Toolbar */}
								{sessionData && (
									<Stack
										direction="row"
										spacing={1}
										sx={{ overflowX: "auto", pb: 0.5 }}
									>
										<Chip
											icon={<Assignment fontSize="small" />}
											label="Nota Clínica"
											onClick={() => handleQuickAction("soap")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={isActionLoading || usedActions.has("soap")}
										/>
										<Chip
											icon={<DescriptionIcon fontSize="small" />}
											label="Resumen"
											onClick={() => handleQuickAction("resumen")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={isActionLoading || usedActions.has("resumen")}
										/>
										<Chip
											icon={<TaskAlt fontSize="small" />}
											label="Tareas"
											onClick={() => handleQuickAction("tareas")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={isActionLoading || usedActions.has("tareas")}
										/>
										<Chip
											icon={<Psychology fontSize="small" />}
											label="Psicológico"
											onClick={() => handleQuickAction("psicologico")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={
												isActionLoading || usedActions.has("psicologico")
											}
										/>
										<Chip
											icon={<SmartToy fontSize="small" />}
											label="Intervenciones"
											onClick={() => handleQuickAction("intervencion")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={
												isActionLoading || usedActions.has("intervencion")
											}
										/>
										<Chip
											icon={<Category fontSize="small" />}
											label="Ánimo"
											onClick={() => handleQuickAction("animo")}
											size="small"
											clickable
											color="primary"
											variant="outlined"
											disabled={isActionLoading || usedActions.has("animo")}
										/>
									</Stack>
								)}
							</Box>

							{/* Chat Area */}
							<Box
								sx={{
									flex: 1, // Take all remaining space
									p: 3,
									bgcolor: "background.paper",
									overflowY: "auto",
									display: "flex",
									flexDirection: "column",
									gap: 2,
								}}
							>
								{messages.length === 0 ?
									<Box
										sx={{
											flex: 1,
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											opacity: opacity.medium,
											textAlign: "center",
											px: 4,
										}}
									>
										<SmartToy
											sx={{
												fontSize: 48,
												color: "primary.main",
												mb: 2,
												opacity: opacity.low,
											}}
										/>
										<Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
											{patient ?
												`Asistente de sesión con ${patient.name}`
											:	"Asistente Lazo"}
										</Typography>
										<Typography variant="body2" color="text.secondary">
											Sube el audio de la sesión para comenzar el análisis
											automático y generar tu nota SOAP.
										</Typography>
									</Box>
								:	messages.map((msg) => (
										<Box
											key={msg.id}
											sx={{
												alignSelf:
													msg.sender === "user" ? "flex-end" : "flex-start",
												maxWidth: themeComponents.chatMessage.maxWidth,
												display: "flex",
												gap: 1.5,
											}}
										>
											{msg.sender === "bot" && (
												<Avatar
													sx={{
														width: themeComponents.chatMessage.avatarSize,
														height: themeComponents.chatMessage.avatarSize,
														bgcolor: "primary.main",
													}}
												>
													<SmartToy sx={{ fontSize: 16 }} />
												</Avatar>
											)}
											<Paper
												elevation={0}
												sx={{
													p: 2,
													bgcolor:
														msg.sender === "user" ?
															"primary.main"
														:	"background.default",
													color:
														msg.sender === "user" ?
															"primary.contrastText"
														:	"text.primary",
													borderRadius:
														msg.sender === "user" ?
															themeComponents.chatMessage.borderRadius.user
														:	themeComponents.chatMessage.borderRadius.bot,
												}}
											>
												{typeof msg.content === "string" ?
													<Box
														sx={{
															"& p": {
																m: 0,
																fontSize: typographyExtended.fontSizes.md,
															},
															"& h3": {
																m: "0 0 8px 0",
																fontSize: typographyExtended.fontSizes.lg,
																fontWeight: typographyExtended.fontWeights.bold,
															},
															"& ul": { m: "8px 0", pl: 2 },
														}}
													>
														<ReactMarkdown>{msg.content}</ReactMarkdown>
													</Box>
												:	msg.content}
												{msg.actions === "analysis-actions" ?
													<AnalysisChatActions
														usedActions={usedActions}
														onAction={handleQuickAction}
													/>
												: msg.actions ?
													<Box sx={{ mt: 1 }}>{msg.actions}</Box>
												:	null}
											</Paper>
										</Box>
									))
								}
								<div ref={messagesEndRef} />
							</Box>

							<Box
								sx={{
									p: 2,
									borderTop: "1px solid",
									borderColor: "divider",
									bgcolor: "background.paper",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 1,
									flexShrink: 0,
								}}
							>
								<Typography
									variant="caption"
									color="text.secondary"
									sx={{
										fontStyle: "italic",
										textAlign: "center",
										width: "100%",
									}}
								>
									Selecciona una de las acciones predefinidas arriba para
									analizar la sesión.
								</Typography>
							</Box>
						</Paper>

						{/* Column 3: Context Panel (Right) */}
						{!isFocusMode && !showSessionsSidebar && (
							<ContextPanel
								onAddToNote={(text) => {
									setSoapContent((prev) => prev + (prev ? "\n" : "") + text);
								}}
								analysisData={sessionData ? sessionData.analysis : undefined}
								biometry={sessionData ? sessionData.biometry : undefined}
							/>
						)}

						{/* Column 3 Alternate: Sessions History Sidebar */}
						{!isFocusMode && showSessionsSidebar && (
							<Paper
								elevation={0}
								sx={{
									flex: { xs: "0 0 auto", lg: 3 },
									display: "flex",
									flexDirection: "column",
									borderRadius: 4,
									overflow: "hidden",
									border: "1px solid",
									borderColor: "divider",
									boxShadow: extendedShadows.panel,
									height: "100%",
									bgcolor: backgrounds.glass.panel,
									backdropFilter: "blur(16px)",
								}}
							>
								<Box
									sx={{
										p: 2,
										borderBottom: "1px solid",
										borderColor: "divider",
										bgcolor: "background.default",
									}}
								>
									<Stack direction="row" alignItems="center" gap={1}>
										<History color="primary" fontSize="small" />
										<Typography
											variant="subtitle2"
											sx={{
												fontWeight: 700,
												textTransform: "uppercase",
												fontSize: "0.75rem",
												letterSpacing: "0.05em",
											}}
										>
											Historial de Sesiones
										</Typography>
									</Stack>
								</Box>
								<Box sx={{ flex: 1, overflowY: "auto" }}>
									{sessionsLoading ?
										<Box sx={{ p: 4, textAlign: "center" }}>
											<CircularProgress size={24} />
										</Box>
									: sessions.length === 0 ?
										<Box sx={{ p: 4, textAlign: "center", opacity: 0.6 }}>
											<MenuBook sx={{ fontSize: 40, mb: 1, opacity: 0.3 }} />
											<Typography variant="body2">
												No hay sesiones registradas aún.
											</Typography>
										</Box>
									:	<List sx={{ p: 0 }}>
											{sessions.map((s) => (
												<ListItem
													key={s.id}
													disablePadding
													sx={{
														borderBottom: "1px solid",
														borderColor: "divider",
													}}
												>
													<ListItemButton
														onClick={() => handleLoadSession(s)}
														sx={{ py: 1.5 }}
													>
														<ListItemIcon sx={{ minWidth: 40 }}>
															<EventNote color="action" fontSize="small" />
														</ListItemIcon>
														<ListItemText
															primary={`Sesión #${s.session_number}`}
															secondary={s.session_date}
															primaryTypographyProps={{
																variant: "body2",
																fontWeight: 600,
															}}
															secondaryTypographyProps={{ variant: "caption" }}
														/>
													</ListItemButton>
												</ListItem>
											))}
										</List>
									}
								</Box>
							</Paper>
						)}
					</Box>

					{/* Draft Confirmation Dialog */}
					<Dialog
						open={draftDialogOpen}
						onClose={() => {}} // User MUST choose to proceed properly
						PaperProps={{
							sx: {
								borderRadius: 4,
								bgcolor: "background.paper",
								backgroundImage: "none",
								boxShadow: extendedShadows.panel,
							},
						}}
					>
						<DialogContent sx={{ p: 3 }}>
							<Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
								Sesión No Guardada Encontrada
							</Typography>
							<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
								Tienes una sesión anterior que no fue guardada para{" "}
								<strong>{patient?.name}</strong>.
							</Typography>
							<Typography variant="body2" color="text.secondary">
								¿Quieres continuar con ella o empezar una nueva?
							</Typography>
						</DialogContent>
						<Box
							sx={{
								p: 3,
								pt: 0,
								display: "flex",
								flexDirection: { xs: "column", sm: "row" },
								justifyContent: "flex-end",
								gap: 1.5,
							}}
						>
							<Button
								variant="outlined"
								color="error"
								onClick={() => handleConfirmDraft(false)}
								sx={{ borderRadius: 2, textTransform: "none" }}
							>
								Empezar Nueva
							</Button>
							<Button
								variant="contained"
								onClick={() => handleConfirmDraft(true)}
								sx={{ borderRadius: 2, textTransform: "none" }}
							>
								Continuar Sesión
							</Button>
						</Box>
					</Dialog>

					{/* Audio Upload Modal */}
					<Dialog
						open={openUploadModal}
						onClose={() => {
							setOpenUploadModal(false);
						}}
						maxWidth="sm"
						fullWidth
						PaperProps={{
							sx: {
								borderRadius: 4,
								bgcolor: "background.paper",
								backgroundImage: "none",
								boxShadow: extendedShadows.panel,
							},
						}}
					>
						<DialogContent sx={{ p: 0 }}>
							<Box>
								<Box
									sx={{
										p: 2,
										borderBottom: "1px solid",
										borderColor: "divider",
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<Typography variant="h6" sx={{ fontWeight: 600 }}>
										Subir Audio
									</Typography>
								</Box>
								<AudioUploader
									onAnalysisComplete={handleAnalysisComplete}
									onAudioSelected={handleAudioSelected}
									onClose={() => setOpenUploadModal(false)}
									patientName={patient?.name}
									patientAge={patient?.age}
									patientGender={patient?.gender}
									patientId={patient?.id}
									userId={userId}
									userPlan={userAppPlan}
								/>
							</Box>
						</DialogContent>
					</Dialog>

					{/* Alert Modal */}
					<AlertModal
						open={alertModal.open}
						onClose={() => setAlertModal({ ...alertModal, open: false })}
						title={alertModal.title}
						message={alertModal.message}
						severity={alertModal.severity}
					/>

					{/* Onboarding Tutorial */}
					<OnboardingTutorial
						open={showOnboarding}
						onComplete={handleCompleteOnboarding}
					/>

					{planData && userId && (
						<UpgradeToProModal
							open={upgradeModalOpen}
							onClose={handleUpgradeClose}
							userId={userId}
							userEmail={planData.email || ""}
							usedTranscriptions={3}
							monthYear={new Date().toISOString().slice(0, 7)}
						/>
					)}
				</>
			)}
		</Box>
	);
};
