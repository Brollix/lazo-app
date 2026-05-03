import React, { useState } from "react";
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
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	useTheme,
	CircularProgress,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Chip,
	Stack,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

import { Settings } from "./Settings";
import { AlertModal } from "./AlertModal";
import { getBackgrounds } from "../styles.theme";
import { supabase } from "../supabaseClient";
import { useEncryption } from "../hooks/useEncryption";
import { useUserPlan } from "../hooks/useUserPlan";

export type PatientStatus =
	| "active"
	| "inactive"
	| "discharged"
	| "dropout"
	| "referred"
	| "admission";

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
	active: "Activo",
	inactive: "Inactivo",
	discharged: "Alta",
	dropout: "Abandono",
	referred: "Derivado",
	admission: "Admisión",
};

export interface Patient {
	id: string;
	name: string;
	age: number;
	gender?: string;
	lastVisit: string;
	consultationReason?: string; // Motivo de consulta (encrypted)
	status?: PatientStatus;
	admissionDate?: string;
}

interface PatientsListProps {
	onSelectPatient: (patient: Patient) => void;
	onLogout: () => void;
	onNavigateToAdmin?: () => void;
	userId?: string;
	isAdmin?: boolean;
}

export const PatientsList: React.FC<PatientsListProps> = ({
	onSelectPatient,
	onLogout,
	onNavigateToAdmin,
	isAdmin,
	userId,
}) => {
	const theme = useTheme();
	const { planData } = useUserPlan(userId);
	const backgrounds = getBackgrounds(theme.palette.mode);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newPatientName, setNewPatientName] = useState("");
	const [newPatientAge, setNewPatientAge] = useState("");
	const [newPatientGender, setNewPatientGender] = useState("");
	const [newPatientConsultationReason, setNewPatientConsultationReason] =
		useState("");
	const [newPatientStatus, setNewPatientStatus] =
		useState<PatientStatus>("admission");
	const [newPatientAdmissionDate, setNewPatientAdmissionDate] = useState(
		new Date().toISOString().split("T")[0],
	);

	// Filters
	const [statusFilter, setStatusFilter] = useState<PatientStatus | "all">(
		"active",
	);
	const [sortBy, setSortBy] = useState<"name" | "lastVisit" | "admissionDate">(
		"lastVisit",
	);

	const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
	const [editName, setEditName] = useState("");
	const [editAge, setEditAge] = useState("");
	const [editGender, setEditGender] = useState("");
	const [editConsultationReason, setEditConsultationReason] = useState("");
	const [editStatus, setEditStatus] = useState<PatientStatus>("active");
	const [editAdmissionDate, setEditAdmissionDate] = useState("");
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

	// Fetch patients on mount
	React.useEffect(() => {
		fetchPatients();
	}, []);

	const fetchPatients = async () => {
		try {
			setLoading(true);

			// Get current user ID for encryption
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				console.error("User not authenticated");
				return;
			}

		// Verify encryption is set up before attempting to decrypt
		const hasPassword = encryption.getPassword();
		const hasMasterKey = encryption.getMasterKey();
		if (!hasPassword && !hasMasterKey) {
			console.error(
				"Encryption keys not available - cannot decrypt patients. Please log in again.",
			);
			setPatients([]);
			return;
		}

			// Fetch encryption salt for the user
			const { data: profile } = await supabase
				.from("profiles")
				.select("encryption_salt")
				.eq("id", user.id)
				.single();

			const salt = profile?.encryption_salt || "";

			const { data, error } = await supabase
				.from("patients")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;

			const decryptedPatients: Patient[] = await Promise.all(
				(data || []).map(async (row: any) => {
					try {
						// Use fallback decryption (Master Key -> PBKDF2 -> CryptoJS)
						const decryptedData = await encryption.decryptWithFallback(
							row.encrypted_data,
							salt,
							user.id,
						);
						return {
							id: row.id,
							...decryptedData,
						};
					} catch (e: any) {
						console.error("Failed to decrypt patient", row.id, "-", e.message);
						return null;
					}
				}),
			).then((results) => results.filter(Boolean) as Patient[]);

			setPatients(decryptedPatients);
		} catch (error) {
			console.error("Error fetching patients:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleCreatePatient = async () => {
		if (!newPatientName || !newPatientAge) return;

		try {
			// Get current user ID for encryption
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setAlertModal({
					open: true,
					message: "Error de seguridad: Usuario no autenticado.",
					severity: "error",
				});
				return;
			}

		// Verify encryption is set up
		const hasPassword = encryption.getPassword();
		const hasMasterKey = encryption.getMasterKey();
		if (!hasPassword && !hasMasterKey) {
			setAlertModal({
				open: true,
				message:
					"Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
				severity: "error",
			});
			return;
		}

		// Fetch salt
		const { data: profile } = await supabase
			.from("profiles")
			.select("encryption_salt")
			.eq("id", user.id)
			.single();

		const salt = profile?.encryption_salt || "";

		const patientData = {
			name: newPatientName,
			age: parseInt(newPatientAge) || 0,
			gender: newPatientGender,
			lastVisit: new Date().toISOString().split("T")[0],
			consultationReason: newPatientConsultationReason,
			status: newPatientStatus,
			admissionDate: newPatientAdmissionDate,
		};

		const encryptedData = await encryption.encryptWithCurrentStandard(
			patientData,
			salt,
		);

			const { error } = await supabase
				.from("patients")
				.insert([
					{
						encrypted_data: encryptedData,
						user_id: (await supabase.auth.getUser()).data.user?.id,
					},
				])
				.select();

			if (error) throw error;

			// Optimistic update or refetch
			// For now, let's just refetch to be safe with IDs
			fetchPatients();

			setOpen(false);
			setNewPatientName("");
			setNewPatientAge("");
			setNewPatientGender("");

			setNewPatientConsultationReason("");
			setNewPatientStatus("admission");
			setNewPatientAdmissionDate(new Date().toISOString().split("T")[0]);
		} catch (error) {
			console.error("Error creating patient:", error);
			setAlertModal({
				open: true,
				message: "Error al crear el paciente",
				severity: "error",
			});
		}
	};

	const handleEditPatient = async () => {
		if (!editingPatient || !editName || !editAge) return;

		try {
			// Get current user ID for encryption
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setAlertModal({
					open: true,
					message: "Error de seguridad: Usuario no autenticado.",
					severity: "error",
				});
				return;
			}

		// Verify encryption is set up
		const hasPassword = encryption.getPassword();
		const hasMasterKey = encryption.getMasterKey();
		if (!hasPassword && !hasMasterKey) {
			setAlertModal({
				open: true,
				message:
					"Error: La contraseña de encriptación no está disponible. Por favor, cierra sesión e inicia sesión nuevamente.",
				severity: "error",
			});
			return;
		}

		// Fetch salt
		const { data: profile } = await supabase
			.from("profiles")
			.select("encryption_salt")
			.eq("id", user.id)
			.single();

		const salt = profile?.encryption_salt || "";

		const patientData = {
			name: editName,
			age: parseInt(editAge) || 0,
			gender: editGender,
			lastVisit: editingPatient.lastVisit,

			consultationReason: editConsultationReason,
			status: editStatus,
			admissionDate: editAdmissionDate,
		};

		const encryptedData = await encryption.encryptWithCurrentStandard(
			patientData,
			salt,
		);

			const { error } = await supabase
				.from("patients")
				.update({
					encrypted_data: encryptedData,
					updated_at: new Date().toISOString(),
				})
				.eq("id", editingPatient.id);

			if (error) throw error;

			fetchPatients();
			setEditOpen(false);
			setEditingPatient(null);
			setEditName("");
			setEditAge("");
			setEditGender("");

			setEditConsultationReason("");
			setEditStatus("active");
			setEditAdmissionDate("");
		} catch (error) {
			console.error("Error updating patient:", error);
			setAlertModal({
				open: true,
				message: "Error al actualizar el paciente",
				severity: "error",
			});
		}
	};

	const handleExportHistory = async (patient: Patient) => {
		if (planData?.plan_type !== "ultra") {
			setAlertModal({
				open: true,
				message:
					"La exportación de historia clínica es exclusiva del Plan Ultra.",
				severity: "warning",
			});
			return;
		}

		try {
			setLoading(true);
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("No autenticado");
			if (!encryption.isSetup())
				throw new Error("No hay claves de encriptación");

			const { data: profile } = await supabase
				.from("profiles")
				.select("encryption_salt")
				.eq("id", user.id)
				.single();

			const salt = profile?.encryption_salt || "";

			const { data: sessions, error } = await supabase
				.from("sessions")
				.select("session_number, session_date, encrypted_data")
				.eq("patient_id", patient.id)
				.order("session_number", { ascending: true });

			if (error) throw error;

			let reportContent = `# HISTORIA CLÍNICA - ${patient.name.toUpperCase()}\n`;
			reportContent += `Generado el: ${new Date().toLocaleDateString()}\n\n`;
			reportContent += `**Paciente**: ${patient.name}\n`;
			reportContent += `**Edad**: ${patient.age}\n`;
			reportContent += `**Fecha de Admisión**: ${patient.admissionDate || "No registrada"}\n`;
			reportContent += `**Estado Actual**: ${patient.status ? PATIENT_STATUS_LABELS[patient.status] : "Activo"}\n\n`;
			reportContent += `---\n\n`;

			if (!sessions || sessions.length === 0) {
				reportContent += "No hay sesiones registradas.\n";
			} else {
				for (const session of sessions) {
					try {
						const decryptedSession = await encryption.decryptWithFallback(
							session.encrypted_data,
							salt,
							user.id,
						);
						reportContent += `## Sesión #${session.session_number} (${session.session_date})\n\n`;
						reportContent += `### Nota Clínica:\n${decryptedSession.clinical_note || "Sin nota"}\n\n`;
						if (decryptedSession.summary) {
							reportContent += `### Resumen:\n${decryptedSession.summary}\n\n`;
						}
						reportContent += `---\n\n`;
					} catch (e) {
						reportContent += `## Sesión #${session.session_number} (Error de desencriptación)\n\n`;
					}
				}
			}

			const element = document.createElement("a");
			const file = new Blob([reportContent], { type: "text/plain" });
			element.href = URL.createObjectURL(file);
			element.download = `Historia_Clinica_${patient.name.replace(/\s+/g, "_")}.txt`;
			document.body.appendChild(element);
			element.click();
			document.body.removeChild(element);
		} catch (error: any) {
			console.error("Error exporting history:", error);
			setAlertModal({
				open: true,
				message: `Error al exportar: ${error.message}`,
				severity: "error",
			});
		} finally {
			setLoading(false);
		}
	};

	const openEditDialog = (patient: Patient) => {
		setEditingPatient(patient);
		setEditName(patient.name);
		setEditAge(patient.age.toString());
		setEditGender(patient.gender || "");
		setEditGender(patient.gender || "");
		setEditConsultationReason(patient.consultationReason || "");
		setEditStatus(patient.status || "active");
		setEditAdmissionDate(patient.admissionDate || "");
		setEditOpen(true);
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
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						mb: 3,
						flexDirection: { xs: "column", sm: "row" },
						gap: { xs: 2, sm: 0 },
						alignItems: { xs: "stretch", sm: "center" },
					}}
				>
					<Typography
						variant="h5"
						sx={{
							fontWeight: 600,
							fontSize: { xs: "1.25rem", sm: "1.5rem" },
						}}
					>
						Mis Pacientes
					</Typography>
					<Button
						variant="contained"
						startIcon={<AddIcon />}
						onClick={() => setOpen(true)}
					>
						Nuevo Paciente
					</Button>
				</Box>

				{/* Filters & Sorting */}
				<Paper
					elevation={0}
					sx={{
						p: 2,
						mb: 3,
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 4,
						display: "flex",
						gap: 2,
						bgcolor: backgrounds.glass.modal,
						flexWrap: "wrap",
					}}
				>
					<FormControl size="small" sx={{ minWidth: 150 }}>
						<InputLabel>Estado</InputLabel>
						<Select
							value={statusFilter}
							label="Estado"
							onChange={(e) =>
								setStatusFilter(e.target.value as PatientStatus | "all")
							}
						>
							<MenuItem value="all">Todos</MenuItem>
							{Object.entries(PATIENT_STATUS_LABELS).map(([key, label]) => (
								<MenuItem key={key} value={key}>
									{label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<FormControl size="small" sx={{ minWidth: 150 }}>
						<InputLabel>Ordenar por</InputLabel>
						<Select
							value={sortBy}
							label="Ordenar por"
							onChange={(e) =>
								setSortBy(
									e.target.value as "name" | "lastVisit" | "admissionDate",
								)
							}
						>
							<MenuItem value="lastVisit">Última Consulta</MenuItem>
							<MenuItem value="admissionDate">Fecha de Admisión</MenuItem>
							<MenuItem value="name">Nombre</MenuItem>
						</Select>
					</FormControl>
				</Paper>

				<Paper
					elevation={0}
					sx={{
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 4,
						overflow: "hidden",
					}}
				>
					{loading ?
						<Box sx={{ p: 4, textAlign: "center" }}>
							<CircularProgress />
						</Box>
					:	<List sx={{ p: 0 }}>
							{patients
								.filter((p) => {
									if (statusFilter === "all") return true;
									// Default to 'admission' or 'active' if undefined?
									// Better to treat undefined as 'active' for legacy
									return (p.status || "active") === statusFilter;
								})
								.sort((a, b) => {
									if (sortBy === "name") return a.name.localeCompare(b.name);
									if (sortBy === "admissionDate") {
										return (
											new Date(b.admissionDate || 0).getTime() -
											new Date(a.admissionDate || 0).getTime()
										);
									}
									return (
										new Date(b.lastVisit || 0).getTime() -
										new Date(a.lastVisit || 0).getTime()
									);
								})
								.map((patient, index) => (
									<React.Fragment key={patient.id}>
										<ListItem disablePadding>
											<ListItemButton
												onClick={() => onSelectPatient(patient)}
												sx={{
													py: 2,
													"&:hover": { bgcolor: "action.hover" },
												}}
											>
												<ListItemAvatar>
													<Avatar sx={{ bgcolor: "primary.light" }}>
														<PersonIcon />
													</Avatar>
												</ListItemAvatar>
												<ListItemText
													primary={
														<Box
															sx={{
																display: "flex",
																alignItems: "center",
																gap: 1,
															}}
														>
															<Typography variant="subtitle1" fontWeight={500}>
																{patient.name}
															</Typography>
															{patient.status && (
																<Chip
																	label={PATIENT_STATUS_LABELS[patient.status]}
																	size="small"
																	color={
																		patient.status === "active" ? "success"
																		: patient.status === "admission" ?
																			"info"
																		: patient.status === "inactive" ?
																			"default"
																		:	"warning"
																	}
																	variant="outlined"
																	sx={{ height: 20, fontSize: "0.7rem" }}
																/>
															)}
														</Box>
													}
													secondary={`Edad: ${patient.age} • Última consulta: ${patient.lastVisit}`}
												/>
												<IconButton
													edge="end"
													aria-label="export"
													onClick={(e) => {
														e.stopPropagation();
														handleExportHistory(patient);
													}}
													sx={{ mr: 1 }}
													title="Exportar Historia Clínica"
												>
													<FileDownloadIcon />
												</IconButton>
												<IconButton
													edge="end"
													aria-label="edit"
													onClick={(e) => {
														e.stopPropagation();
														openEditDialog(patient);
													}}
													sx={{ mr: 1 }}
												>
													<EditIcon />
												</IconButton>
											</ListItemButton>
										</ListItem>
										{index < patients.length - 1 && (
											<Box
												component="li"
												sx={{
													borderBottom: "1px solid",
													borderColor: "divider",
												}}
											/>
										)}
									</React.Fragment>
								))}
						</List>
					}
				</Paper>
			</Container>

			<Dialog open={open} onClose={() => setOpen(false)}>
				<DialogTitle>Nuevo Paciente</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Nombre"
						fullWidth
						variant="outlined"
						value={newPatientName}
						onChange={(e) => setNewPatientName(e.target.value)}
					/>
					<TextField
						margin="dense"
						label="Edad"
						type="number"
						fullWidth
						variant="outlined"
						value={newPatientAge}
						onChange={(e) => setNewPatientAge(e.target.value)}
					/>
					<Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
						<TextField
							margin="dense"
							label="Fecha de Admisión"
							type="date"
							fullWidth
							variant="outlined"
							value={newPatientAdmissionDate}
							onChange={(e) => setNewPatientAdmissionDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<FormControl fullWidth margin="dense">
							<InputLabel>Estado</InputLabel>
							<Select
								value={newPatientStatus}
								label="Estado"
								onChange={(e) =>
									setNewPatientStatus(e.target.value as PatientStatus)
								}
							>
								{Object.entries(PATIENT_STATUS_LABELS).map(([key, label]) => (
									<MenuItem key={key} value={key}>
										{label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>
					<FormControl fullWidth margin="dense">
						<InputLabel>Género</InputLabel>
						<Select
							value={newPatientGender}
							label="Género"
							onChange={(e) => setNewPatientGender(e.target.value)}
						>
							<MenuItem value="Masculino">Masculino</MenuItem>
							<MenuItem value="Femenino">Femenino</MenuItem>
							<MenuItem value="No Binario">No Binario</MenuItem>
							<MenuItem value="Otro">Otro</MenuItem>
						</Select>
					</FormControl>
					<TextField
						margin="dense"
						label="Motivo de Consulta"
						fullWidth
						multiline
						rows={3}
						variant="outlined"
						value={newPatientConsultationReason}
						onChange={(e) => setNewPatientConsultationReason(e.target.value)}
						placeholder="Ej: Ansiedad, depresión, terapia de pareja..."
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancelar</Button>
					<Button onClick={handleCreatePatient} variant="contained">
						Crear
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Patient Dialog */}
			<Dialog open={editOpen} onClose={() => setEditOpen(false)}>
				<DialogTitle>Editar Paciente</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Nombre"
						fullWidth
						variant="outlined"
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
					/>
					<TextField
						margin="dense"
						label="Edad"
						type="number"
						fullWidth
						variant="outlined"
						value={editAge}
						onChange={(e) => setEditAge(e.target.value)}
					/>
					<Stack direction="row" spacing={2} sx={{ mt: 1, mb: 0.5 }}>
						<TextField
							margin="dense"
							label="Fecha de Admisión"
							type="date"
							fullWidth
							variant="outlined"
							value={editAdmissionDate}
							onChange={(e) => setEditAdmissionDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
						<FormControl fullWidth margin="dense">
							<InputLabel>Estado</InputLabel>
							<Select
								value={editStatus}
								label="Estado"
								onChange={(e) => setEditStatus(e.target.value as PatientStatus)}
							>
								{Object.entries(PATIENT_STATUS_LABELS).map(([key, label]) => (
									<MenuItem key={key} value={key}>
										{label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>
					<FormControl fullWidth margin="dense">
						<InputLabel>Género</InputLabel>
						<Select
							value={editGender}
							label="Género"
							onChange={(e) => setEditGender(e.target.value)}
						>
							<MenuItem value="Masculino">Masculino</MenuItem>
							<MenuItem value="Femenino">Femenino</MenuItem>
							<MenuItem value="No Binario">No Binario</MenuItem>
							<MenuItem value="Otro">Otro</MenuItem>
						</Select>
					</FormControl>
					<TextField
						margin="dense"
						label="Motivo de Consulta"
						fullWidth
						multiline
						rows={3}
						variant="outlined"
						value={editConsultationReason}
						onChange={(e) => setEditConsultationReason(e.target.value)}
						placeholder="Ej: Ansiedad, depresión, terapia de pareja..."
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditOpen(false)}>Cancelar</Button>
					<Button onClick={handleEditPatient} variant="contained">
						Guardar
					</Button>
				</DialogActions>
			</Dialog>
			<Settings
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				onLogout={onLogout}
			/>
			<AlertModal
				open={alertModal.open}
				onClose={() => setAlertModal({ ...alertModal, open: false })}
				title={alertModal.title}
				message={alertModal.message}
				severity={alertModal.severity}
			/>
		</Box>
	);
};
