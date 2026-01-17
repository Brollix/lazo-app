import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Stack,
	Chip,
	IconButton,
	Alert,
	Slider,
	Switch,
	FormControlLabel,
	CircularProgress,
	Tooltip,
} from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
	Add as AddIcon,
	Edit as EditIcon,
	Delete as DeleteIcon,
	Visibility as ViewIcon,
	ContentCopy as CopyIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

interface PromoCode {
	id: string;
	code: string;
	discount_percentage: number;
	duration_months: number;
	is_active: boolean;
	max_uses: number | null;
	current_uses: number;
	expires_at: string | null;
	created_at: string;
}

interface PromoCodesManagerProps {
	userId: string;
}

export const PromoCodesManager: React.FC<PromoCodesManagerProps> = ({
	userId,
}) => {
	const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
	const [loading, setLoading] = useState(true);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [selectedPromoCode, setSelectedPromoCode] = useState<PromoCode | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Form state
	const [formData, setFormData] = useState({
		code: "",
		discount_percentage: 50,
		duration_months: 3,
		max_uses: null as number | null,
		expires_at: null as string | null,
		is_active: true,
	});

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

	useEffect(() => {
		fetchPromoCodes();
	}, []);

	const fetchPromoCodes = async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`${API_URL}/api/admin/promo-codes?userId=${userId}`
			);
			if (!res.ok) throw new Error("Error fetching promo codes");
			const data = await res.json();
			setPromoCodes(data.promoCodes);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleCreate = async () => {
		try {
			const res = await fetch(`${API_URL}/api/admin/promo-codes`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, ...formData }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Error creating promo code");
			}

			setSuccess("Código promocional creado exitosamente");
			setCreateModalOpen(false);
			resetForm();
			fetchPromoCodes();
		} catch (err: any) {
			setError(err.message);
		}
	};

	const handleUpdate = async () => {
		if (!selectedPromoCode) return;

		try {
			const res = await fetch(
				`${API_URL}/api/admin/promo-codes/${selectedPromoCode.id}`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId, ...formData }),
				}
			);

			if (!res.ok) throw new Error("Error updating promo code");

			setSuccess("Código promocional actualizado exitosamente");
			setEditModalOpen(false);
			setSelectedPromoCode(null);
			resetForm();
			fetchPromoCodes();
		} catch (err: any) {
			setError(err.message);
		}
	};

	const handleToggleActive = async (id: string, isActive: boolean) => {
		try {
			const res = await fetch(`${API_URL}/api/admin/promo-codes/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, is_active: !isActive }),
			});

			if (!res.ok) throw new Error("Error toggling promo code status");

			setSuccess(
				`Código ${!isActive ? "activado" : "desactivado"} exitosamente`
			);
			fetchPromoCodes();
		} catch (err: any) {
			setError(err.message);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("¿Estás seguro de desactivar este código promocional?"))
			return;

		try {
			const res = await fetch(
				`${API_URL}/api/admin/promo-codes/${id}?userId=${userId}`,
				{
					method: "DELETE",
				}
			);

			if (!res.ok) throw new Error("Error deleting promo code");

			setSuccess("Código promocional desactivado exitosamente");
			fetchPromoCodes();
		} catch (err: any) {
			setError(err.message);
		}
	};

	const resetForm = () => {
		setFormData({
			code: "",
			discount_percentage: 50,
			duration_months: 3,
			max_uses: null,
			expires_at: null,
			is_active: true,
		});
	};

	const openEditModal = (promoCode: PromoCode) => {
		setSelectedPromoCode(promoCode);
		setFormData({
			code: promoCode.code,
			discount_percentage: promoCode.discount_percentage,
			duration_months: promoCode.duration_months,
			max_uses: promoCode.max_uses,
			expires_at: promoCode.expires_at,
			is_active: promoCode.is_active,
		});
		setEditModalOpen(true);
	};

	const columns: GridColDef[] = [
		{
			field: "code",
			headerName: "Código",
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<Typography variant="body2" fontWeight="bold">
						{params.value}
					</Typography>
					<IconButton
						size="small"
						onClick={() => {
							navigator.clipboard.writeText(params.value);
							setSuccess("Código copiado al portapapeles");
						}}
					>
						<CopyIcon fontSize="inherit" />
					</IconButton>
				</Box>
			),
		},
		{
			field: "discount_percentage",
			headerName: "Descuento",
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={`${params.value}%`}
					color="primary"
					size="small"
					variant="outlined"
				/>
			),
		},
		{
			field: "duration_months",
			headerName: "Duración",
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant="body2">
					{params.value} {params.value === 1 ? "mes" : "meses"}
				</Typography>
			),
		},
		{
			field: "usage",
			headerName: "Usos",
			width: 150,
			renderCell: (params: GridRenderCellParams) => {
				const maxUses = params.row.max_uses;
				const currentUses = params.row.current_uses;
				return (
					<Typography variant="body2">
						{currentUses} / {maxUses || "∞"}
					</Typography>
				);
			},
		},
		{
			field: "is_active",
			headerName: "Estado",
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={params.value ? "Activo" : "Inactivo"}
					color={params.value ? "success" : "default"}
					size="small"
				/>
			),
		},
		{
			field: "expires_at",
			headerName: "Expira",
			width: 150,
			valueFormatter: (value) =>
				value ? new Date(value).toLocaleDateString("es-AR") : "Nunca",
		},
		{
			field: "actions",
			headerName: "Acciones",
			width: 150,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction="row" spacing={1}>
					<Tooltip title="Editar">
						<IconButton
							size="small"
							color="primary"
							onClick={() => openEditModal(params.row)}
						>
							<EditIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title={params.row.is_active ? "Desactivar" : "Activar"}>
						<IconButton
							size="small"
							color="secondary"
							onClick={() =>
								handleToggleActive(params.row.id, params.row.is_active)
							}
						>
							<ViewIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Eliminar">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.id)}
						>
							<DeleteIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	];

	return (
		<Box>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mb: 3,
				}}
			>
				<Typography variant="h5" fontWeight="bold">
					Códigos Promocionales
				</Typography>
				<Button
					variant="contained"
					startIcon={<AddIcon />}
					onClick={() => {
						resetForm();
						setCreateModalOpen(true);
					}}
				>
					Crear Código
				</Button>
			</Box>

			{error && (
				<Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
					{error}
				</Alert>
			)}

			{success && (
				<Alert
					severity="success"
					sx={{ mb: 2 }}
					onClose={() => setSuccess(null)}
				>
					{success}
				</Alert>
			)}

			<DataGrid
				rows={promoCodes}
				columns={columns}
				loading={loading}
				autoHeight
				pageSizeOptions={[10, 25, 50]}
				initialState={{
					pagination: { paginationModel: { pageSize: 10 } },
				}}
				sx={{
					"& .MuiDataGrid-cell": {
						borderBottom: `1px solid ${alpha("#000", 0.1)}`,
					},
				}}
			/>

			{/* Create Modal */}
			<Dialog
				open={createModalOpen}
				onClose={() => setCreateModalOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Crear Código Promocional</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 2 }}>
						<TextField
							label="Código (4 letras mayúsculas)"
							value={formData.code}
							onChange={(e) =>
								setFormData({
									...formData,
									code: e.target.value.toUpperCase().slice(0, 4),
								})
							}
							inputProps={{
								maxLength: 4,
								style: { textTransform: "uppercase" },
							}}
							fullWidth
							required
							helperText="Ejemplo: PROMO, DESC, 2024"
						/>

						<Box>
							<Typography gutterBottom>
								Descuento: {formData.discount_percentage}%
							</Typography>
							<Slider
								value={formData.discount_percentage}
								onChange={(_, value) =>
									setFormData({
										...formData,
										discount_percentage: value as number,
									})
								}
								min={1}
								max={100}
								marks={[
									{ value: 10, label: "10%" },
									{ value: 50, label: "50%" },
									{ value: 100, label: "100%" },
								]}
								valueLabelDisplay="auto"
							/>
						</Box>

						<TextField
							label="Duración (meses)"
							type="number"
							value={formData.duration_months}
							onChange={(e) =>
								setFormData({
									...formData,
									duration_months: parseInt(e.target.value) || 1,
								})
							}
							inputProps={{ min: 1 }}
							fullWidth
							required
						/>

						<TextField
							label="Máximo de usos (opcional)"
							type="number"
							value={formData.max_uses || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									max_uses: e.target.value ? parseInt(e.target.value) : null,
								})
							}
							inputProps={{ min: 1 }}
							fullWidth
							helperText="Dejar vacío para usos ilimitados"
						/>

						<TextField
							label="Fecha de expiración (opcional)"
							type="date"
							value={formData.expires_at || ""}
							onChange={(e) =>
								setFormData({ ...formData, expires_at: e.target.value || null })
							}
							InputLabelProps={{ shrink: true }}
							fullWidth
						/>

						<FormControlLabel
							control={
								<Switch
									checked={formData.is_active}
									onChange={(e) =>
										setFormData({ ...formData, is_active: e.target.checked })
									}
								/>
							}
							label="Activo"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
					<Button
						onClick={handleCreate}
						variant="contained"
						disabled={formData.code.length !== 4}
					>
						Crear
					</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Modal */}
			<Dialog
				open={editModalOpen}
				onClose={() => setEditModalOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Editar Código Promocional</DialogTitle>
				<DialogContent>
					<Stack spacing={3} sx={{ mt: 2 }}>
						<TextField
							label="Código"
							value={formData.code}
							disabled
							fullWidth
							helperText="El código no se puede modificar"
						/>

						<Box>
							<Typography gutterBottom>
								Descuento: {formData.discount_percentage}%
							</Typography>
							<Slider
								value={formData.discount_percentage}
								onChange={(_, value) =>
									setFormData({
										...formData,
										discount_percentage: value as number,
									})
								}
								min={1}
								max={100}
								marks={[
									{ value: 10, label: "10%" },
									{ value: 50, label: "50%" },
									{ value: 100, label: "100%" },
								]}
								valueLabelDisplay="auto"
							/>
						</Box>

						<TextField
							label="Duración (meses)"
							type="number"
							value={formData.duration_months}
							onChange={(e) =>
								setFormData({
									...formData,
									duration_months: parseInt(e.target.value) || 1,
								})
							}
							inputProps={{ min: 1 }}
							fullWidth
							required
						/>

						<TextField
							label="Máximo de usos (opcional)"
							type="number"
							value={formData.max_uses || ""}
							onChange={(e) =>
								setFormData({
									...formData,
									max_uses: e.target.value ? parseInt(e.target.value) : null,
								})
							}
							inputProps={{ min: 1 }}
							fullWidth
						/>

						<TextField
							label="Fecha de expiración (opcional)"
							type="date"
							value={formData.expires_at || ""}
							onChange={(e) =>
								setFormData({ ...formData, expires_at: e.target.value || null })
							}
							InputLabelProps={{ shrink: true }}
							fullWidth
						/>

						<FormControlLabel
							control={
								<Switch
									checked={formData.is_active}
									onChange={(e) =>
										setFormData({ ...formData, is_active: e.target.checked })
									}
								/>
							}
							label="Activo"
						/>
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
					<Button onClick={handleUpdate} variant="contained">
						Actualizar
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};
