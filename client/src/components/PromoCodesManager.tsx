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
	Tooltip,
	InputAdornment,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
} from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
	Add as AddIcon,
	Edit as EditIcon,
	Delete as DeleteIcon,
	Visibility as ViewIcon,
	ContentCopy as CopyIcon,
	Shuffle as ShuffleIcon,
	AllInclusive as InfiniteIcon,
} from "@mui/icons-material";

import { AdminTable } from "./AdminTable";

interface PromoCode {
	id: string;
	code: string;
	discount_percentage: number;
	duration_months: number;
	is_active: boolean;
	max_uses: number | null;
	current_uses: number;
	expires_at: string | null;
	applicable_plan: string | null;
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
		null,
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
		is_unlimited: false,
		applicable_plan: null as string | null,
	});

	const generateRandomCode = () => {
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		let code = "";
		for (let i = 0; i < 4; i++) {
			code += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return code;
	};

	const handleGenerateCode = () => {
		setFormData({ ...formData, code: generateRandomCode() });
	};

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

	useEffect(() => {
		fetchPromoCodes();
	}, []);

	const fetchPromoCodes = async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`${API_URL}/api/admin/promo-codes?userId=${userId}`,
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
				},
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
				`Código ${!isActive ? "activado" : "desactivado"} exitosamente`,
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
				},
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
			is_unlimited: false,
			applicable_plan: null,
		});
	};

	const openEditModal = (promoCode: PromoCode) => {
		setSelectedPromoCode(promoCode);
		const isUnlimited = promoCode.duration_months >= 999;
		setFormData({
			code: promoCode.code,
			discount_percentage: promoCode.discount_percentage,
			duration_months: isUnlimited ? 999 : promoCode.duration_months,
			max_uses: promoCode.max_uses,
			expires_at: promoCode.expires_at,
			is_active: promoCode.is_active,
			is_unlimited: isUnlimited,
			applicable_plan: promoCode.applicable_plan,
		});
		setEditModalOpen(true);
	};

	const columns: GridColDef[] = [
		{
			field: "code",
			headerName: "Código",
			flex: 1,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) => (
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 1,
						width: "100%",
					}}
				>
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
			flex: 0.8,
			align: "center",
			headerAlign: "center",
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
			flex: 1,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant="body2">
					{params.value >= 999 ?
						"Infinito"
					:	`${params.value} ${params.value === 1 ? "mes" : "meses"}`}
				</Typography>
			),
		},
		{
			field: "applicable_plan",
			headerName: "Plan",
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) =>
				params.value ?
					<Chip
						label={params.value.toUpperCase()}
						size="small"
						color={params.value === "ultra" ? "secondary" : "primary"}
					/>
				:	"Cualquiera",
		},
		{
			field: "usage",
			headerName: "Usos",
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			valueGetter: (params: any) => {
				// valueGetter is simpler for sorting, but renderCell does the display
				// Actually DataGrid v6+ valueGetter signature is (value, row).
				// Let's stick to renderCell but ensure alignment.
				return `${params.row.current_uses} / ${params.row.max_uses || "∞"}`;
			},
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
			flex: 0.6,
			align: "center",
			headerAlign: "center",
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
			flex: 1,
			align: "center",
			headerAlign: "center",
			valueFormatter: (value) =>
				value ? new Date(value).toLocaleDateString("es-AR") : "Nunca",
		},
		{
			field: "actions",
			headerName: "Acciones",
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction="row" spacing={1} justifyContent="center" width="100%">
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

			<AdminTable
				title="Códigos Promocionales"
				rows={promoCodes}
				columns={columns}
				loading={loading}
				maxWidth={1200}
				actionButton={
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
				}
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
							InputProps={{
								endAdornment: (
									<InputAdornment position="end">
										<Tooltip title="Generar código aleatorio">
											<IconButton onClick={handleGenerateCode} edge="end">
												<ShuffleIcon />
											</IconButton>
										</Tooltip>
									</InputAdornment>
								),
							}}
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

						<Box>
							<FormControlLabel
								control={
									<Switch
										checked={formData.is_unlimited}
										onChange={(e) => {
											const checked = e.target.checked;
											setFormData({
												...formData,
												is_unlimited: checked,
												duration_months: checked ? 999 : 3,
											});
										}}
										color="primary"
									/>
								}
								label={
									<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										<InfiniteIcon color="primary" fontSize="small" />
										Gratis de por vida (Duración infinita)
									</Box>
								}
							/>
						</Box>

						{!formData.is_unlimited && (
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
						)}

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

						<Box>
							<FormControlLabel
								control={
									<Switch
										checked={formData.is_unlimited}
										onChange={(e) => {
											const checked = e.target.checked;
											setFormData({
												...formData,
												is_unlimited: checked,
												duration_months: checked ? 999 : 3,
											});
										}}
										color="primary"
									/>
								}
								label={
									<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										<InfiniteIcon color="primary" fontSize="small" />
										Gratis de por vida (Duración infinita)
									</Box>
								}
							/>
						</Box>

						{!formData.is_unlimited && (
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
						)}

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

						<FormControl fullWidth>
							<InputLabel>Plan Aplicable (opcional)</InputLabel>
							<Select
								value={formData.applicable_plan || ""}
								label="Plan Aplicable (opcional)"
								onChange={(e) =>
									setFormData({
										...formData,
										applicable_plan: e.target.value || null,
									})
								}
							>
								<MenuItem value="">Todos los planes</MenuItem>
								<MenuItem value="pro">Pro</MenuItem>
								<MenuItem value="ultra">Ultra</MenuItem>
							</Select>
						</FormControl>

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
