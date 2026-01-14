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
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { Settings } from "./Settings";
import { getBackgrounds } from "../styles.theme";
import { supabase } from "../supabaseClient";
import { EncryptionService } from "../services/encryptionService";

const ADMIN_UUID = "91501b61-418d-4767-9c8f-e85b3ab58432";

export interface Patient {
	id: string;
	name: string;
	age: number;
	gender?: string;
	lastVisit: string;
}

interface PatientsListProps {
	onSelectPatient: (patient: Patient) => void;
	onLogout: () => void;
	onNavigateToAdmin?: () => void;
	userId?: string;
}

export const PatientsList: React.FC<PatientsListProps> = ({
	onSelectPatient,
	onLogout,
	onNavigateToAdmin,
	userId,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const [patients, setPatients] = useState<Patient[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newPatientName, setNewPatientName] = useState("");
	const [newPatientAge, setNewPatientAge] = useState("");
	const [newPatientGender, setNewPatientGender] = useState("");
	const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
	const [editName, setEditName] = useState("");
	const [editAge, setEditAge] = useState("");
	const [editGender, setEditGender] = useState("");

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

			const { data, error } = await supabase
				.from("patients")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;

			const decryptedPatients: Patient[] = (data || [])
				.map((row: any) => {
					try {
						const decryptedData = EncryptionService.decryptData(
							row.encrypted_data,
							user.id
						);
						return {
							id: row.id,
							...decryptedData,
						};
					} catch (e) {
						console.error("Failed to decrypt patient", row.id, e);
						return null;
					}
				})
				.filter(Boolean) as Patient[];

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
				alert("Error de seguridad: Usuario no autenticado.");
				return;
			}

			const patientData = {
				name: newPatientName,
				age: parseInt(newPatientAge) || 0,
				gender: newPatientGender,
				lastVisit: new Date().toISOString().split("T")[0],
			};

			const encryptedData = EncryptionService.encryptData(patientData, user.id);

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
		} catch (error) {
			console.error("Error creating patient:", error);
			alert("Error al crear el paciente");
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
				alert("Error de seguridad: Usuario no autenticado.");
				return;
			}

			const patientData = {
				name: editName,
				age: parseInt(editAge) || 0,
				gender: editGender,
				lastVisit: editingPatient.lastVisit,
			};

			const encryptedData = EncryptionService.encryptData(patientData, user.id);

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
		} catch (error) {
			console.error("Error updating patient:", error);
			alert("Error al actualizar el paciente");
		}
	};

	const openEditDialog = (patient: Patient) => {
		setEditingPatient(patient);
		setEditName(patient.name);
		setEditAge(patient.age.toString());
		setEditGender(patient.gender || "");
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
					{userId === ADMIN_UUID && onNavigateToAdmin && (
						<IconButton
							onClick={onNavigateToAdmin}
							color="primary"
							size="small"
							title="Panel de Administración"
						>
							<AdminPanelSettingsIcon />
						</IconButton>
					)}
					<IconButton
						onClick={() => setSettingsOpen(true)}
						color="default"
						size="small"
					>
						<SettingsIcon />
					</IconButton>
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
				<Paper
					elevation={0}
					sx={{
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 4,
						overflow: "hidden",
					}}
				>
					{loading ? (
						<Box sx={{ p: 4, textAlign: "center" }}>
							<CircularProgress />
						</Box>
					) : (
						<List sx={{ p: 0 }}>
							{patients.map((patient, index) => (
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
													<Typography variant="subtitle1" fontWeight={500}>
														{patient.name}
													</Typography>
												}
												secondary={`Edad: ${patient.age} • Última consulta: ${patient.lastVisit}`}
											/>
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
											sx={{ borderBottom: "1px solid", borderColor: "divider" }}
										/>
									)}
								</React.Fragment>
							))}
						</List>
					)}
				</Paper>
			</Container>

			<Dialog open={open} onClose={() => setOpen(false)}>
				<DialogTitle>Nuevo Paciente</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Nombre Completo"
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
						label="Nombre Completo"
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
				onNavigateToAdmin={onNavigateToAdmin}
			/>
		</Box>
	);
};
