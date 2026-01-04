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
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import { Settings } from "./Settings";
import { getBackgrounds } from "../styles.theme";

export interface Patient {
	id: string;
	name: string;
	age: number;
	lastVisit: string;
}

const INITIAL_PATIENTS: Patient[] = [];

interface PatientsListProps {
	onSelectPatient: (patient: Patient) => void;
	onLogout: () => void;
	onOpenHistory: () => void;
}

export const PatientsList: React.FC<PatientsListProps> = ({
	onSelectPatient,
	onLogout,
	onOpenHistory,
}) => {
	const theme = useTheme();
	const backgrounds = getBackgrounds(theme.palette.mode);
	const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
	const [open, setOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [newPatientName, setNewPatientName] = useState("");
	const [newPatientAge, setNewPatientAge] = useState("");

	const handleCreatePatient = () => {
		if (!newPatientName || !newPatientAge) return;

		const newPatient: Patient = {
			id: Date.now().toString(),
			name: newPatientName,
			age: parseInt(newPatientAge) || 0,
			lastVisit: new Date().toISOString().split("T")[0],
		};

		setPatients([newPatient, ...patients]);
		setOpen(false);
		setNewPatientName("");
		setNewPatientAge("");
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
					height: 64,
					px: 3,
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
					}}
				>
					lazo
				</Typography>
				<Box>
					<IconButton onClick={onOpenHistory} color="default" sx={{ mr: 1 }}>
						<HistoryIcon />
					</IconButton>
					<IconButton
						onClick={() => setSettingsOpen(true)}
						color="default"
						sx={{ mr: 1 }}
					>
						<SettingsIcon />
					</IconButton>
					<IconButton onClick={onLogout} color="default">
						<LogoutIcon />
					</IconButton>
				</Box>
			</Paper>

			<Container maxWidth="md" sx={{ mt: 4, mb: 4, flex: 1, overflow: "auto" }}>
				<Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
					<Typography variant="h5" sx={{ fontWeight: 600 }}>
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
						borderRadius: 3,
						overflow: "hidden",
					}}
				>
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
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpen(false)}>Cancelar</Button>
					<Button onClick={handleCreatePatient} variant="contained">
						Crear
					</Button>
				</DialogActions>
			</Dialog>
			<Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
		</Box>
	);
};
