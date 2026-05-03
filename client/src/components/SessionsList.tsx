import React, { useState, useEffect } from "react";
import {
	Box,
	List,
	ListItem,
	ListItemButton,
	ListItemAvatar,
	ListItemText,
	Avatar,
	Typography,
	Paper,
	IconButton,
	Container,
	Button,
	CircularProgress,
	useTheme,
	Stack,
} from "@mui/material";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Patient } from "./PatientsList";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Menu,
	MenuItem,
	ListItemIcon,
} from "@mui/material";
import { supabase } from "../supabaseClient";
import { useEncryption } from "../hooks/useEncryption";
import { getBackgrounds, getExtendedShadows } from "../styles.theme";
import { Settings } from "./Settings";
import { AlertModal } from "./AlertModal";
import { UpgradeToProModal } from "./UpgradeToProModal";
import { useUserPlan } from "../hooks/useUserPlan";

import { ClinicalSession } from "./Dashboard";

interface SessionsListProps {
	patient: Patient;
	onSelectSession: (session: ClinicalSession) => void;
	onNewSession: (date: string, time: string) => void;
	onBack: () => void;
	onLogout: () => void;
	onNavigateToAdmin?: () => void;
	userId?: string;
	isAdmin?: boolean;
}

export const SessionsList: React.FC<SessionsListProps> = ({
	patient,
	onSelectSession,
	onNewSession,
	onBack,
	onLogout,
	onNavigateToAdmin,
	userId,
	isAdmin,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const extendedShadows = getExtendedShadows(theme.palette.mode);
	const [sessions, setSessions] = useState<ClinicalSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newSessionDialogOpen, setNewSessionDialogOpen] = useState(false);
	const [newSessionDate, setNewSessionDate] = useState(
		new Date().toISOString().split("T")[0],
	);
	const [newSessionTime, setNewSessionTime] = useState(
		new Date().toTimeString().split(" ")[0].substring(0, 5),
	);
	const { planData, refreshPlan } = useUserPlan(userId);
	const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
	const [creatingSession, setCreatingSession] = useState(false);

	// Action Menu State
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [selectedActionSession, setSelectedActionSession] =
		useState<ClinicalSession | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

	const encryption = useEncryption();

	const handleMenuOpen = (
		event: React.MouseEvent<HTMLButtonElement>,
		session: ClinicalSession,
	) => {
		event.stopPropagation();
		setAnchorEl(event.currentTarget);
		setSelectedActionSession(session);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
		setSelectedActionSession(null);
	};

	const handleEdit = () => {
		if (selectedActionSession) {
			onSelectSession(selectedActionSession);
		}
		handleMenuClose();
	};

	const confirmDelete = () => {
		setDeleteDialogOpen(true);
		// Keep session selected but close menu
		setAnchorEl(null);
	};

	const handleDelete = async () => {
		if (!selectedActionSession) return;
		try {
			setLoading(true);

			// Call the RPC function to delete and reorder
			const { error } = await supabase.rpc("delete_session_and_reorder", {
				p_session_id: selectedActionSession.id,
				p_patient_id: patient.id,
			});

			if (error) throw error;

			setSessions((prev) =>
				prev.filter((s) => s.id !== selectedActionSession.id),
			);

			// Refresh to get new numbers
			await fetchSessions();
		} catch (error) {
			console.error("Error deleting session:", error);
			setAlertModal({
				open: true,
				message: "Error al eliminar la sesión",
				severity: "error",
			});
		} finally {
			setLoading(false);
			setDeleteDialogOpen(false);
			setSelectedActionSession(null);
		}
	};

	const handleCreateNewSession = async () => {
		if (!userId) {
			setAlertModal({
				open: true,
				message: "Error: No se pudo autenticar al usuario.",
				severity: "error",
			});
			return;
		}

		// Verificar que tenemos las claves de encriptación disponibles
		const hasPassword = encryption.getPassword();
		const hasMasterKey = encryption.getMasterKey();
		if (!hasPassword && !hasMasterKey) {
			setAlertModal({
				open: true,
				message: "Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
				severity: "error",
			});
			return;
		}

		try {
			setCreatingSession(true);

			// Fetch encryption salt
			const { data: profile } = await supabase
				.from("profiles")
				.select("encryption_salt")
				.eq("id", userId)
				.single();

			const salt = profile?.encryption_salt || "";

			// Get next session number
			const { data: nextNum, error: rpcError } = await supabase.rpc(
				"get_next_session_number",
				{ p_patient_id: patient.id },
			);

			if (rpcError) throw rpcError;

			// Prepare empty session data
			const sessionRecord = {
				clinical_note: "",
				summary: null,
				topics: null,
				transcript: null,
				session_time: newSessionTime,
				full_analysis_data: null,
			};

			const encryptedData = await encryption.encryptWithCurrentStandard(
				sessionRecord,
				salt,
			);

			// Create session in database
			const { data: newSession, error: insertError } = await supabase
				.from("sessions")
				.insert({
					patient_id: patient.id,
					user_id: userId,
					session_number: nextNum,
					encrypted_data: encryptedData,
					session_date: newSessionDate,
					session_time: newSessionTime,
				})
				.select()
				.single();

			if (insertError) throw insertError;

			// Refresh sessions list to show the new empty session
			await fetchSessions();

			// Close dialog and navigate to the new session
			setNewSessionDialogOpen(false);
			
			// Navigate to the session with the new session data
			if (newSession) {
				// Pass the newly created session WITHOUT encrypted_data
				// para que el Dashboard sepa que es una sesión nueva vacía
				const sessionToLoad: ClinicalSession = {
					id: newSession.id,
					session_number: nextNum,
					session_date: newSessionDate,
					session_time: newSessionTime,
					encrypted_data: "", // Vacío para indicar sesión nueva
				};
				onSelectSession(sessionToLoad);
			}
		} catch (error: any) {
			console.error("Error creating session:", error);
			setAlertModal({
				open: true,
				message: `Error al crear la sesión: ${error.message}`,
				severity: "error",
			});
		} finally {
			setCreatingSession(false);
		}
	};

	useEffect(() => {
		if (patient.id) {
			fetchSessions();
		}
	}, [patient.id]);

	const fetchSessions = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("sessions")
				.select("*")
				.eq("patient_id", patient.id)
				.order("session_number", { ascending: false });

			if (error) throw error;

			// Verify encryption is set up before attempting to decrypt
			const canDecrypt = userId && encryption.isSetup();

			// Fetch salt
			let salt = "";
			if (canDecrypt) {
				const { data: profile } = await supabase
					.from("profiles")
					.select("encryption_salt")
					.eq("id", userId)
					.single();
				salt = profile?.encryption_salt || "";
			}

			const mappedSessions = await Promise.all(
				(data || []).map(async (s: any) => {
					let sessionTime = s.session_time;
					if (canDecrypt) {
						try {
							const decoded = await encryption.decryptWithFallback(
								s.encrypted_data,
								salt,
								userId!,
							);
							if (decoded?.session_time) sessionTime = decoded.session_time;
						} catch (e) {
							console.warn("Failed to decrypt or parse session", s.id);
						}
					}
					return { ...s, session_time: sessionTime };
				}),
			);

			setSessions(mappedSessions);
		} catch (error) {
			console.error("Error fetching sessions:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box
			sx={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				bgcolor: "background.default",
			}}
		>
			{/* Header */}
			<Paper
				elevation={0}
				square
				sx={{
					height: { xs: "auto", sm: 64 },
					px: { xs: 2, sm: 3 },
					py: { xs: 1.5, sm: 0 },
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					borderBottom: "1px solid",
					borderColor: "divider",
					bgcolor: backgrounds.glass.modal,
					backdropFilter: "blur(12px)",
					position: "sticky",
					top: 0,
					zIndex: 10,
				}}
			>
				<Stack direction="row" alignItems="center" spacing={1}>
					<IconButton onClick={onBack} size="small" sx={{ mr: 1 }}>
						<ArrowBackIcon />
					</IconButton>
					<Typography
						variant="h6"
						sx={{
							fontWeight: 700,
							color: "primary.main",
							fontSize: { xs: "1.1rem", sm: "1.25rem" },
						}}
					>
						lazo
					</Typography>
				</Stack>

				<Box sx={{ display: "flex", gap: 1 }}>
					<IconButton
						onClick={() => setSettingsOpen(true)}
						color="default"
						size="small"
					>
						<SettingsIcon />
					</IconButton>
					{isAdmin && onNavigateToAdmin && (
						<IconButton
							onClick={onNavigateToAdmin}
							color="primary"
							size="small"
							title="Panel de Administración"
						>
							<AdminPanelSettingsIcon />
						</IconButton>
					)}
					<IconButton onClick={onLogout} color="default" size="small">
						<LogoutIcon />
					</IconButton>
				</Box>
			</Paper>

			<Container
				maxWidth="md"
				sx={{
					mt: { xs: 2, sm: 4 },
					mb: { xs: 2, sm: 4 },
					flex: 1,
					overflow: "auto",
					px: { xs: 2, sm: 3 },
				}}
			>
				{/* Patient Info Card */}
				<Paper
					elevation={0}
					sx={{
						p: 3,
						mb: 4,
						borderRadius: 4,
						bgcolor: backgrounds.glass.panel,
						border: "1px solid",
						borderColor: "divider",
						display: "flex",
						alignItems: "center",
						gap: 3,
						boxShadow: extendedShadows.panel,
					}}
				>
					<Avatar
						sx={{
							width: 64,
							height: 64,
							bgcolor: "primary.light",
							color: "primary.main",
						}}
					>
						<Typography variant="h5" fontWeight="bold">
							{patient.name.charAt(0)}
						</Typography>
					</Avatar>
					<Box>
						<Typography variant="h5" fontWeight="800" gutterBottom>
							{patient.name}
						</Typography>
						<Typography variant="body2" color="text.secondary">
							{patient.age} años • {patient.gender || "Sin género"} • Última
							consulta:{" "}
							{sessions[0]?.session_date ?
								`${sessions[0].session_date}${
									sessions[0].session_time ?
										` (${sessions[0].session_time})`
									:	""
								}`
							:	patient.lastVisit}
						</Typography>
					</Box>
				</Paper>

				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						mb: 3,
						alignItems: "center",
					}}
				>
					<Typography variant="h6" sx={{ fontWeight: 700 }}>
						Sesiones Registradas
					</Typography>
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						onClick={() => {
							if (
								planData?.plan_type === "free" &&
								planData.credits_remaining <= 0
							) {
								setUpgradeModalOpen(true);
							} else {
								setNewSessionDialogOpen(true);
							}
						}}
						sx={{ borderRadius: 3, px: 3 }}
					>
						Nueva Sesión
					</Button>
				</Box>

				<Paper
					elevation={0}
					sx={{
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 4,
						overflow: "hidden",
						boxShadow: (theme) => theme.shadows[2],
					}}
				>
					{loading ?
						<Box sx={{ p: 4, textAlign: "center" }}>
							<CircularProgress />
						</Box>
					: sessions.length === 0 ?
						<Box sx={{ p: 6, textAlign: "center", opacity: 0.6 }}>
							<EventNoteIcon sx={{ fontSize: 48, mb: 2, opacity: 0.1 }} />
							<Typography variant="body1">
								No hay sesiones registradas aún.
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Haz clic en "Nueva Sesión" para comenzar un análisis.
							</Typography>
						</Box>
					:	<List sx={{ p: 0 }}>
							{sessions.map((session, index) => (
								<React.Fragment key={session.id}>
									<ListItem disablePadding>
										<ListItemButton
											onClick={() => onSelectSession(session)}
											sx={{
												py: 2.5,
												px: 3,
												"&:hover": { bgcolor: "action.hover" },
											}}
										>
											<ListItemAvatar>
												<Avatar
													sx={{
														bgcolor: "background.default",
														color: "text.primary",
														border: "1px solid",
														borderColor: "divider",
													}}
												>
													<EventNoteIcon fontSize="small" />
												</Avatar>
											</ListItemAvatar>
											<ListItemText
												primary={
													<Typography variant="subtitle1" fontWeight={700}>
														Sesión #{session.session_number}
													</Typography>
												}
												secondary={`${session.session_date}${
													session.session_time ?
														` • ${session.session_time}`
													:	""
												}`}
											/>
											<IconButton
												edge="end"
												onClick={(e) => handleMenuOpen(e, session)}
												sx={{ mr: 1 }}
											>
												<MoreVertIcon />
											</IconButton>
											<ChevronRightIcon sx={{ opacity: 0.3 }} />
										</ListItemButton>
									</ListItem>
									{index < sessions.length - 1 && (
										<Box
											component="li"
											sx={{ borderBottom: "1px solid", borderColor: "divider" }}
										/>
									)}
								</React.Fragment>
							))}
						</List>
					}
				</Paper>
			</Container>

			<Settings
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				onLogout={onLogout}
			/>

			{/* New Session Dialog */}
			<Dialog
				open={newSessionDialogOpen}
				onClose={() => setNewSessionDialogOpen(false)}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle sx={{ fontWeight: 800 }}>
					Programar Nueva Sesión
				</DialogTitle>
				<DialogContent>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Indica la fecha y hora de la sesión para organizarla correctamente.
					</Typography>
					<Stack spacing={2} sx={{ mt: 1 }}>
						<TextField
							label="Fecha de la Sesión"
							type="date"
							fullWidth
							value={newSessionDate}
							onChange={(e) => setNewSessionDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							label="Hora de la Sesión"
							type="time"
							fullWidth
							value={newSessionTime}
							onChange={(e) => setNewSessionTime(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 2.5 }}>
					<Button
						onClick={() => setNewSessionDialogOpen(false)}
						color="inherit"
						disabled={creatingSession}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleCreateNewSession}
						variant="contained"
						sx={{ borderRadius: 2 }}
						disabled={creatingSession}
					>
						{creatingSession ? (
							<>
								<CircularProgress size={20} sx={{ mr: 1 }} />
								Creando...
							</>
						) : (
							"Confirmar e Iniciar"
						)}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Actions Menu */}
			<Menu
				anchorEl={anchorEl}
				open={Boolean(anchorEl)}
				onClose={handleMenuClose}
				onClick={(e) => e.stopPropagation()}
			>
				<MenuItem onClick={handleEdit}>
					<ListItemIcon>
						<EditIcon fontSize="small" />
					</ListItemIcon>
					<ListItemText>Editar</ListItemText>
				</MenuItem>
				<MenuItem onClick={confirmDelete} sx={{ color: "error.main" }}>
					<ListItemIcon>
						<DeleteIcon fontSize="small" color="error" />
					</ListItemIcon>
					<ListItemText>Eliminar</ListItemText>
				</MenuItem>
			</Menu>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
			>
				<DialogTitle>¿Eliminar Sesión?</DialogTitle>
				<DialogContent>
					<Typography variant="body2">
						¿Estás seguro de que deseas eliminar la{" "}
						<strong>Sesión #{selectedActionSession?.session_number}</strong>?
						Esta acción no se puede deshacer y reordenará las sesiones
						restantes.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)} color="inherit">
						Cancelar
					</Button>
					<Button onClick={handleDelete} color="error" variant="contained">
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			<AlertModal
				open={alertModal.open}
				onClose={() => setAlertModal({ ...alertModal, open: false })}
				title={alertModal.title}
				message={alertModal.message}
				severity={alertModal.severity}
			/>

			{planData && userId && (
				<UpgradeToProModal
					open={upgradeModalOpen}
					onClose={() => {
						setUpgradeModalOpen(false);
						refreshPlan();
					}}
					userId={userId}
					userEmail={planData.email || ""}
					usedTranscriptions={3} // On the free plan, if they are here, they've used 3
					monthYear={new Date().toISOString().slice(0, 7)}
				/>
			)}
		</Box>
	);
};
