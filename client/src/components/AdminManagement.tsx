import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Button,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Chip,
	Alert,
	CircularProgress,
	Stack,
} from "@mui/material";
import {
	Add,
	Delete,
	AdminPanelSettings,
	SupervisorAccount,
	Visibility,
} from "@mui/icons-material";

interface Admin {
	id: string;
	user_id: string;
	role: "super_admin" | "admin" | "moderator";
	created_at: string;
	created_by: string | null;
	profiles: {
		email: string;
		full_name: string | null;
	};
}

interface AdminManagementProps {
	userId: string;
}

export const AdminManagement: React.FC<AdminManagementProps> = ({ userId }) => {
	const [admins, setAdmins] = useState<Admin[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
	const [newAdminEmail, setNewAdminEmail] = useState("");
	const [newAdminRole, setNewAdminRole] = useState<
		"super_admin" | "admin" | "moderator"
	>("admin");
	const [submitting, setSubmitting] = useState(false);

	const apiUrl = (import.meta.env.VITE_API_URL || "").trim();

	// Fetch admins list
	const fetchAdmins = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(
				`${apiUrl}/api/admin/admins?userId=${userId}`
			);
			if (!response.ok) {
				throw new Error("Error al cargar administradores");
			}
			const data = await response.json();
			setAdmins(data.admins || []);
		} catch (err: any) {
			console.error("Error fetching admins:", err);
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAdmins();
	}, [userId]);

	// Add new admin
	const handleAddAdmin = async () => {
		if (!newAdminEmail.trim()) {
			setError("El email es requerido");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			const response = await fetch(`${apiUrl}/api/admin/admins`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					email: newAdminEmail.trim(),
					role: newAdminRole,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al agregar administrador");
			}

			setShowAddDialog(false);
			setNewAdminEmail("");
			setNewAdminRole("admin");
			await fetchAdmins();
		} catch (err: any) {
			console.error("Error adding admin:", err);
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	// Remove admin
	const handleRemoveAdmin = async () => {
		if (!selectedAdmin) return;

		setSubmitting(true);
		setError(null);
		try {
			const response = await fetch(
				`${apiUrl}/api/admin/admins/${selectedAdmin.user_id}`,
				{
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId }),
				}
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al remover administrador");
			}

			setShowDeleteDialog(false);
			setSelectedAdmin(null);
			await fetchAdmins();
		} catch (err: any) {
			console.error("Error removing admin:", err);
			setError(err.message);
		} finally {
			setSubmitting(false);
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "super_admin":
				return <SupervisorAccount fontSize="small" />;
			case "admin":
				return <AdminPanelSettings fontSize="small" />;
			case "moderator":
				return <Visibility fontSize="small" />;
			default:
				return undefined;
		}
	};

	const getRoleLabel = (role: string) => {
		switch (role) {
			case "super_admin":
				return "Super Admin";
			case "admin":
				return "Admin";
			case "moderator":
				return "Moderador";
			default:
				return role;
		}
	};

	const getRoleColor = (role: string) => {
		switch (role) {
			case "super_admin":
				return "error";
			case "admin":
				return "primary";
			case "moderator":
				return "info";
			default:
				return "default";
		}
	};

	return (
		<Box sx={{ p: 3 }}>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				sx={{ mb: 3 }}
			>
				<Typography variant="h5" fontWeight="bold">
					Gestión de Administradores
				</Typography>
				<Button
					variant="contained"
					startIcon={<Add />}
					onClick={() => setShowAddDialog(true)}
					sx={{ borderRadius: 2 }}
				>
					Agregar Admin
				</Button>
			</Stack>

			{error && (
				<Alert
					severity="error"
					sx={{ mb: 2, borderRadius: 2 }}
					onClose={() => setError(null)}
				>
					{error}
				</Alert>
			)}

			{loading ?
				<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
					<CircularProgress />
				</Box>
			:	<TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
					<Table>
						<TableHead>
							<TableRow sx={{ bgcolor: "action.hover" }}>
								<TableCell sx={{ fontWeight: "bold" }}>Usuario</TableCell>
								<TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
								<TableCell sx={{ fontWeight: "bold" }}>Rol</TableCell>
								<TableCell sx={{ fontWeight: "bold" }}>Agregado</TableCell>
								<TableCell sx={{ fontWeight: "bold" }} align="right">
									Acciones
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{admins.map((admin) => (
								<TableRow key={admin.id} hover>
									<TableCell>
										{admin.profiles?.full_name || "Sin nombre"}
									</TableCell>
									<TableCell>{admin.profiles?.email}</TableCell>
									<TableCell>
										<Chip
											icon={getRoleIcon(admin.role)}
											label={getRoleLabel(admin.role)}
											color={getRoleColor(admin.role) as any}
											size="small"
											sx={{ fontWeight: "bold" }}
										/>
									</TableCell>
									<TableCell>
										{new Date(admin.created_at).toLocaleDateString("es-AR")}
									</TableCell>
									<TableCell align="right">
										<IconButton
											size="small"
											color="error"
											onClick={() => {
												setSelectedAdmin(admin);
												setShowDeleteDialog(true);
											}}
											disabled={admin.user_id === userId}
										>
											<Delete fontSize="small" />
										</IconButton>
									</TableCell>
								</TableRow>
							))}
							{admins.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} align="center" sx={{ py: 4 }}>
										<Typography color="text.secondary">
											No hay administradores registrados
										</Typography>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</TableContainer>
			}

			{/* Add Admin Dialog */}
			<Dialog
				open={showAddDialog}
				onClose={() => !submitting && setShowAddDialog(false)}
				maxWidth="sm"
				fullWidth
				PaperProps={{ sx: { borderRadius: 3 } }}
			>
				<DialogTitle sx={{ fontWeight: "bold" }}>
					Agregar Administrador
				</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 2 }}>
						<TextField
							fullWidth
							label="Email del usuario"
							type="email"
							value={newAdminEmail}
							onChange={(e) => setNewAdminEmail(e.target.value)}
							disabled={submitting}
							sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
						/>
						<FormControl fullWidth>
							<InputLabel>Rol</InputLabel>
							<Select
								value={newAdminRole}
								label="Rol"
								onChange={(e) =>
									setNewAdminRole(
										e.target.value as "super_admin" | "admin" | "moderator"
									)
								}
								disabled={submitting}
								sx={{ borderRadius: 2 }}
							>
								<MenuItem value="super_admin">
									<Stack direction="row" spacing={1} alignItems="center">
										<SupervisorAccount fontSize="small" />
										<span>Super Admin (Acceso completo)</span>
									</Stack>
								</MenuItem>
								<MenuItem value="admin">
									<Stack direction="row" spacing={1} alignItems="center">
										<AdminPanelSettings fontSize="small" />
										<span>Admin (Dashboard + Gestión)</span>
									</Stack>
								</MenuItem>
								<MenuItem value="moderator">
									<Stack direction="row" spacing={1} alignItems="center">
										<Visibility fontSize="small" />
										<span>Moderador (Solo lectura)</span>
									</Stack>
								</MenuItem>
							</Select>
						</FormControl>
					</Stack>
				</DialogContent>
				<DialogActions sx={{ p: 3 }}>
					<Button
						onClick={() => setShowAddDialog(false)}
						disabled={submitting}
						sx={{ borderRadius: 2 }}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleAddAdmin}
						variant="contained"
						disabled={submitting}
						sx={{ borderRadius: 2 }}
					>
						{submitting ? "Agregando..." : "Agregar"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={showDeleteDialog}
				onClose={() => !submitting && setShowDeleteDialog(false)}
				maxWidth="xs"
				fullWidth
				PaperProps={{ sx: { borderRadius: 3 } }}
			>
				<DialogTitle sx={{ fontWeight: "bold" }}>
					Remover Administrador
				</DialogTitle>
				<DialogContent>
					<Typography>
						¿Estás seguro que deseas remover el acceso de administrador a{" "}
						<strong>{selectedAdmin?.profiles?.email}</strong>?
					</Typography>
					<Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
						Esta acción no se puede deshacer. El usuario perderá acceso al panel
						de administración inmediatamente.
					</Alert>
				</DialogContent>
				<DialogActions sx={{ p: 3 }}>
					<Button
						onClick={() => setShowDeleteDialog(false)}
						disabled={submitting}
						sx={{ borderRadius: 2 }}
					>
						Cancelar
					</Button>
					<Button
						onClick={handleRemoveAdmin}
						variant="contained"
						color="error"
						disabled={submitting}
						sx={{ borderRadius: 2 }}
					>
						{submitting ? "Removiendo..." : "Remover"}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};
