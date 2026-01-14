import React, { useState, useEffect } from "react";
import {
	Box,
	Typography,
	Paper,
	Grid,
	Card,
	CardContent,
	TextField,
	Button,
	Chip,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Stack,
	alpha,
	Tabs,
	Tab,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Switch,
	Tooltip,
	CircularProgress,
	ToggleButtonGroup,
	ToggleButton,
	Alert,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridToolbar,
	GridRenderCellParams,
} from "@mui/x-data-grid";
import {
	People as PeopleIcon,
	AttachMoney as MoneyIcon,
	Assessment as AssessmentIcon,
	SwapHoriz as SwapIcon,
	Logout as LogoutIcon,
	ContentCopy as CopyIcon,
	Timeline as TimelineIcon,
	TrendingUp as TrendingUpIcon,
	Speed as SpeedIcon,
	NotificationsActive as NotifyIcon,
	Add as AddIcon,
	CheckCircle as SuccessIcon,
	History as HistoryIcon,
	HealthAndSafety as HealthIcon,
	CloudQueue as CloudIcon,
	GetApp as DownloadIcon,
	Delete as DeleteIcon,
	Visibility as ViewIcon,
	ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import {
	getGradients,
	getBackgrounds,
	borderRadius as br,
	spacing,
	typographyExtended,
	getColors,
} from "../styles.theme";

interface AdminDashboardProps {
	onLogout: () => void;
	userId?: string;
	onBack?: () => void;
}

interface Stats {
	totalUsers: number;
	activeUsers7d: number;
	conversionRate: number;
	mrr: number;
	aiBurnRate: number;
	sessionsToday: number;
	breakdown: {
		proUsers: number;
		ultraUsers: number;
	};
}

interface User {
	id: string;
	email: string;
	full_name?: string;
	plan_type: "free" | "pro" | "ultra";
	credits_remaining: number;
	premium_credits_remaining: number;
	subscription_id?: string;
	subscription_status?: string;
	created_at: string;
	last_credit_renewal?: string;
	next_billing_date?: string;
	usage_last_month: number;
	last_activity?: string;
}

interface ActivityItem {
	id: string;
	created_at: string;
	status: string;
	mode: string;
	error?: string;
	duration: string | number;
}

interface HealthStatus {
	supabase: { status: string; error?: string };
	groq: { status: string; code?: number; error?: string };
	deepgram: { status: string; code?: number; error?: string };
	bedrock: { status: string; region: string };
}

interface Announcement {
	id: string;
	message: string;
	active: boolean;
	created_at: string;
	created_by: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
	onLogout,
	userId,
	onBack,
}) => {
	const [stats, setStats] = useState<Stats | null>(null);
	const [users, setUsers] = useState<User[]>([]);
	const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Modals state
	const [activeTab, setActiveTab] = useState(0);
	const [health, setHealth] = useState<HealthStatus | null>(null);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [checkingHealth, setCheckingHealth] = useState(false);
	const [userSessions, setUserSessions] = useState<ActivityItem[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [detailsModalOpen, setDetailsModalOpen] = useState(false);

	const [editModalOpen, setEditModalOpen] = useState(false);
	const [planModalOpen, setPlanModalOpen] = useState(false);
	const [notifyModalOpen, setNotifyModalOpen] = useState(false);
	const [announcementMsg, setAnnouncementMsg] = useState("");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isPremium, setIsPremium] = useState(false);
	const [creditsToAdd, setCreditsToAdd] = useState(1);
	const [newPlan, setNewPlan] = useState<string>("free");
	const [updating, setUpdating] = useState(false);

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

	useEffect(() => {
		fetchData();
	}, []);

	const fetchData = async () => {
		setLoading(true);
		setError(null);

		try {
			const [statsRes, usersRes, feedRes] = await Promise.all([
				fetch(`${API_URL}/api/admin/stats?userId=${userId}`),
				fetch(`${API_URL}/api/admin/users?userId=${userId}`),
				fetch(`${API_URL}/api/admin/activity-feed?userId=${userId}`),
			]);

			if (!statsRes.ok || !usersRes.ok || !feedRes.ok) {
				throw new Error("Error fetching admin data");
			}

			const [statsData, usersData, feedData] = await Promise.all([
				statsRes.json(),
				usersRes.json(),
				feedRes.json(),
			]);

			setStats(statsData);
			setUsers(usersData.users);
			setActivityFeed(feedData.feed);

			// Initial background loads
			fetchAnnouncements();
			fetchHealth();
		} catch (err: any) {
			console.error("Error fetching admin data:", err);
			setError(err.message || "Error al cargar datos");
		} finally {
			setLoading(false);
		}
	};

	const fetchHealth = async () => {
		setCheckingHealth(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/health?userId=${userId}`);
			if (res.ok) {
				const data = await res.json();
				setHealth(data);
			}
		} catch (e) {
			console.error("Error checking health:", e);
		} finally {
			setCheckingHealth(false);
		}
	};

	const fetchAnnouncements = async () => {
		try {
			const res = await fetch(
				`${API_URL}/api/admin/announcements?userId=${userId}`
			);
			if (res.ok) {
				const data = await res.json();
				setAnnouncements(data.announcements);
			}
		} catch (e) {
			console.error("Error fetching announcements:", e);
		}
	};

	const fetchUserSessions = async (targetUserId: string) => {
		setLoadingSessions(true);
		try {
			const res = await fetch(
				`${API_URL}/api/admin/user-sessions/${targetUserId}?userId=${userId}`
			);
			if (res.ok) {
				const data = await res.json();
				setUserSessions(data.sessions);
			}
		} catch (e) {
			console.error("Error fetching user sessions:", e);
		} finally {
			setLoadingSessions(false);
		}
	};

	const exportToCSV = () => {
		if (users.length === 0) return;

		const headers = [
			"Email",
			"Nombre",
			"Plan",
			"Créditos",
			"Créditos Premium",
			"Última Actividad",
			"Creado En",
		];
		const rows = users.map((u) => [
			u.email,
			u.full_name || "",
			u.plan_type,
			u.credits_remaining,
			u.premium_credits_remaining,
			u.last_activity || "",
			u.created_at,
		]);

		const csvContent = [
			headers.join(","),
			...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute(
			"download",
			`lazo_users_${new Date().toISOString().split("T")[0]}.csv`
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const handleUpdateCredits = async () => {
		if (!selectedUser) return;
		setUpdating(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/update-credits`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					targetUserId: selectedUser.id,
					creditsToAdd,
					isPremium,
				}),
			});
			if (!res.ok) throw new Error("Error updating credits");
			await fetchData();
			setEditModalOpen(false);
		} catch (err: any) {
			alert(err.message);
		} finally {
			setUpdating(false);
		}
	};

	const handleUpdatePlan = async () => {
		if (!selectedUser) return;
		setUpdating(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/update-plan`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					targetUserId: selectedUser.id,
					newPlan,
				}),
			});
			if (!res.ok) throw new Error("Error updating plan");
			await fetchData();
			setPlanModalOpen(false);
		} catch (err: any) {
			alert(err.message);
		} finally {
			setUpdating(false);
		}
	};

	const handleSendAnnouncement = async () => {
		if (!announcementMsg) return;
		setUpdating(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/announcement`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, message: announcementMsg }),
			});
			if (!res.ok) throw new Error("Error sending announcement");
			setNotifyModalOpen(false);
			setAnnouncementMsg("");
			fetchAnnouncements();
		} catch (err: any) {
			alert(err.message);
		} finally {
			setUpdating(false);
		}
	};

	const handleToggleAnnouncement = async (id: string, active: boolean) => {
		try {
			const res = await fetch(`${API_URL}/api/admin/announcements/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, active }),
			});
			if (res.ok) fetchAnnouncements();
		} catch (e) {
			console.error("Error toggling announcement:", e);
		}
	};

	const handleDeleteAnnouncement = async (id: string) => {
		if (!confirm("¿Estás seguro de eliminar este anuncio?")) return;
		try {
			const res = await fetch(
				`${API_URL}/api/admin/announcements/${id}?userId=${userId}`,
				{
					method: "DELETE",
				}
			);
			if (res.ok) fetchAnnouncements();
		} catch (e) {
			console.error("Error deleting announcement:", e);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "-";
		return new Date(dateString).toLocaleDateString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getPlanColor = (plan: string) => {
		switch (plan) {
			case "free":
				return "default";
			case "pro":
				return "primary";
			case "ultra":
				return "success";
			default:
				return "default";
		}
	};

	const userColumns: GridColDef[] = [
		{
			field: "email_name",
			headerName: "Usuario",
			width: 250,
			renderCell: (params: GridRenderCellParams) => (
				<Box>
					<Typography variant="body2" fontWeight="bold">
						{params.row.email}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						{params.row.full_name || "Sin nombre"}
					</Typography>
				</Box>
			),
		},
		{
			field: "plan_type",
			headerName: "Plan",
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={params.value.toUpperCase()}
					color={getPlanColor(params.value)}
					size="small"
					variant="outlined"
				/>
			),
		},
		{
			field: "credits_remaining",
			headerName: "Créditos",
			width: 130,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction="row" spacing={1} alignItems="center">
					<Typography variant="body2">
						{params.value === -1 ? "∞" : params.value}
						{params.row.plan_type === "ultra" &&
							` | P: ${params.row.premium_credits_remaining}`}
					</Typography>
					<IconButton
						size="small"
						color="primary"
						onClick={() => {
							setSelectedUser(params.row);
							setCreditsToAdd(1);
							setIsPremium(false);
							setEditModalOpen(true);
						}}
					>
						<AddIcon fontSize="small" />
					</IconButton>
				</Stack>
			),
		},
		{
			field: "usage_last_month",
			headerName: "Uso (30d)",
			width: 100,
			align: "center",
		},
		{
			field: "last_activity",
			headerName: "Última Actividad",
			width: 160,
			valueFormatter: (value) => (value ? formatDate(value) : "-"),
		},
		{
			field: "subscription_id",
			headerName: "MP ID",
			width: 150,
			renderCell: (params: GridRenderCellParams) =>
				params.value ? (
					<Box sx={{ display: "flex", alignItems: "center" }}>
						<Typography
							variant="caption"
							sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
						>
							{params.value}
						</Typography>
						<IconButton
							size="small"
							onClick={() => navigator.clipboard.writeText(params.value)}
						>
							<CopyIcon fontSize="inherit" />
						</IconButton>
					</Box>
				) : (
					"-"
				),
		},
		{
			field: "actions",
			headerName: "Acciones",
			width: 150,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction="row" spacing={1}>
					<Tooltip title="Ver Detalles">
						<IconButton
							size="small"
							color="info"
							onClick={() => {
								setSelectedUser(params.row);
								fetchUserSessions(params.row.id);
								setDetailsModalOpen(true);
							}}
						>
							<ViewIcon fontSize="small" />
						</IconButton>
					</Tooltip>
					<Tooltip title="Cambiar Plan">
						<IconButton
							size="small"
							color="secondary"
							onClick={() => {
								setSelectedUser(params.row);
								setNewPlan(params.row.plan_type);
								setPlanModalOpen(true);
							}}
						>
							<SwapIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Stack>
			),
		},
	];

	if (loading && !stats)
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<CircularProgress />
			</Box>
		);

	return (
		<Box
			sx={{ p: 3, backgroundColor: "background.default", minHeight: "100vh" }}
		>
			{/* Top Header */}
			<Paper
				elevation={0}
				sx={{
					p: spacing.lg,
					mb: spacing.md,
					borderRadius: br.xl,
					background: (theme) =>
						getBackgrounds(theme.palette.mode).glass.header,
					backdropFilter: "blur(20px)",
					border: "1px solid",
					borderColor: (theme) => getColors(theme.palette.mode).glassBorder,
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<Box>
					<Typography
						variant="h4"
						fontWeight={typographyExtended.fontWeights.black}
						sx={{
							background: (theme) => getGradients(theme.palette.mode).primary,
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}
					>
						Panel Soy Lazo Admin
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Gestión de negocio y monitoreo técnico
					</Typography>
				</Box>
				<Stack direction="row" spacing={spacing.md}>
					{onBack && (
						<Button
							variant="outlined"
							color="primary"
							startIcon={<ArrowBackIcon />}
							onClick={onBack}
							sx={{ borderRadius: br.lg, px: spacing.lg }}
						>
							Volver a Dashboard
						</Button>
					)}
					<Button
						variant="outlined"
						color="error"
						startIcon={<LogoutIcon />}
						onClick={onLogout}
						sx={{ borderRadius: br.lg, px: spacing.lg }}
					>
						Cerrar Sesión
					</Button>
				</Stack>
			</Paper>

			<Tabs
				value={activeTab}
				onChange={(_, v) => setActiveTab(v)}
				sx={{
					mb: spacing.lg,
					"& .MuiTabs-indicator": {
						height: 3,
						borderRadius: "3px 3px 0 0",
						background: (theme) => getGradients(theme.palette.mode).primary,
					},
				}}
			>
				<Tab icon={<AssessmentIcon />} iconPosition="start" label="Overview" />
				<Tab icon={<PeopleIcon />} iconPosition="start" label="Usuarios" />
				<Tab
					icon={<HealthIcon />}
					iconPosition="start"
					label="Salud del Sistema"
				/>
				<Tab icon={<NotifyIcon />} iconPosition="start" label="Anuncios" />
			</Tabs>

			{error && (
				<Alert
					severity="error"
					sx={{
						mb: spacing.lg,
						borderRadius: br.lg,
						border: (theme) =>
							`1px solid ${alpha(theme.palette.error.main, 0.2)}`,
					}}
				>
					{error}
				</Alert>
			)}

			{activeTab === 0 && (
				<Grid container spacing={4}>
					{/* KPI Section directly here for Overview */}
					<Grid size={{ xs: 12 }}>
						{stats && (
							<Grid container spacing={3} sx={{ mb: 2 }}>
								{[
									{
										title: "Ingresos (MRR)",
										value: formatCurrency(stats.mrr),
										subtitle: `P: ${stats.breakdown.proUsers} | U: ${stats.breakdown.ultraUsers}`,
										icon: <MoneyIcon />,
										color: "primary",
									},
									{
										title: "Usuarios Activos (7d)",
										value: `${stats.activeUsers7d} / ${stats.totalUsers}`,
										progress: (stats.activeUsers7d / stats.totalUsers) * 100,
										icon: <PeopleIcon />,
										color: "info",
									},
									{
										title: "Conversión",
										value: `${stats.conversionRate}%`,
										subtitle: "Pago / Total",
										icon: <TrendingUpIcon />,
										color: "warning",
									},
									{
										title: "AI Burn Rate (Est.)",
										value: `${stats.aiBurnRate} USD`,
										subtitle: "Mes actual acumulado",
										icon: <SpeedIcon />,
										color: "error",
									},
								].map((kpi, index) => (
									<Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
										<Card
											elevation={0}
											sx={{
												height: "100%",
												borderRadius: br.xl,
												position: "relative",
												overflow: "hidden",
												background: (theme) =>
													getBackgrounds(theme.palette.mode).glass.panel,
												backdropFilter: "blur(20px)",
												border: "1px solid",
												borderColor: (theme) =>
													alpha((theme.palette as any)[kpi.color].main, 0.2),
											}}
										>
											<Box
												sx={{
													position: "absolute",
													top: 0,
													left: 0,
													width: 4,
													height: "100%",
													bgcolor: `${kpi.color}.main`,
												}}
											/>
											<CardContent sx={{ p: spacing.lg }}>
												<Stack
													direction="row"
													justifyContent="space-between"
													alignItems="flex-start"
												>
													<Box>
														<Typography
															variant="caption"
															color="text.secondary"
															sx={{
																textTransform: "uppercase",
																fontWeight: typographyExtended.fontWeights.bold,
															}}
														>
															{kpi.title}
														</Typography>
														<Typography
															variant="h4"
															fontWeight={typographyExtended.fontWeights.black}
															sx={{ mt: spacing.xs }}
														>
															{kpi.value}
														</Typography>
													</Box>
													<Box
														sx={{
															p: spacing.sm,
															borderRadius: br.md,
															bgcolor: (theme) =>
																alpha(
																	(theme.palette as any)[kpi.color].main,
																	0.1
																),
															color: `${kpi.color}.main`,
														}}
													>
														{kpi.icon}
													</Box>
												</Stack>
												{kpi.progress !== undefined ? (
													<Box sx={{ mt: spacing.md }}>
														<Box
															sx={{
																height: 6,
																bgcolor: (theme) =>
																	alpha(
																		(theme.palette as any)[kpi.color].main,
																		0.1
																	),
																borderRadius: br.lg,
																overflow: "hidden",
															}}
														>
															<Box
																sx={{
																	width: `${kpi.progress}%`,
																	height: "100%",
																	bgcolor: `${kpi.color}.main`,
																	borderRadius: br.lg,
																}}
															/>
														</Box>
													</Box>
												) : (
													<Typography
														variant="caption"
														color="text.secondary"
														sx={{ mt: spacing.md, display: "block" }}
													>
														{kpi.subtitle}
													</Typography>
												)}
											</CardContent>
										</Card>
									</Grid>
								))}
							</Grid>
						)}
					</Grid>

					<Grid size={{ xs: 12, lg: 8 }}>
						<Paper
							elevation={0}
							sx={{
								p: spacing.lg,
								borderRadius: br.xl,
								background: (theme) =>
									getBackgrounds(theme.palette.mode).glass.panel,
								backdropFilter: "blur(20px)",
								border: "1px solid",
								borderColor: (theme) =>
									getColors(theme.palette.mode).glassBorder,
								height: 600,
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
								alignItems: "center",
								textAlign: "center",
							}}
						>
							<TimelineIcon
								sx={{
									fontSize: 64,
									color: "primary.main",
									mb: 2,
									opacity: 0.5,
								}}
							/>
							<Typography variant="h5" fontWeight="bold">
								Resumen Diario
							</Typography>
							<Typography color="text.secondary">
								Estadística visual próximamente disponible
							</Typography>
						</Paper>
					</Grid>

					<Grid size={{ xs: 12, lg: 4 }}>
						<Paper
							elevation={0}
							sx={{
								p: spacing.lg,
								maxHeight: 600,
								display: "flex",
								flexDirection: "column",
								borderRadius: br.xl,
								background: (theme) =>
									getBackgrounds(theme.palette.mode).glass.panel,
								backdropFilter: "blur(20px)",
								border: "1px solid",
								borderColor: (theme) =>
									getColors(theme.palette.mode).glassBorder,
							}}
						>
							<Stack
								direction="row"
								justifyContent="space-between"
								alignItems="center"
								sx={{ mb: spacing.lg }}
							>
								<Typography
									variant="h6"
									sx={{
										display: "flex",
										alignItems: "center",
										fontWeight: typographyExtended.fontWeights.extrabold,
									}}
								>
									<HistoryIcon
										sx={{ mr: spacing.sm, color: "secondary.main" }}
									/>{" "}
									Live Feed
								</Typography>
								<Tooltip title="Actualizar">
									<IconButton size="small" onClick={fetchData}>
										<HistoryIcon fontSize="small" />
									</IconButton>
								</Tooltip>
							</Stack>

							<Box sx={{ flexGrow: 1, overflow: "auto", pr: spacing.xs }}>
								<Stack spacing={spacing.md}>
									{activityFeed.map((item) => (
										<Card
											key={item.id}
											elevation={0}
											sx={{
												borderRadius: br.lg,
												border: "1px solid",
												borderColor: (theme) =>
													getColors(theme.palette.mode).glassBorder,
												bgcolor: (theme) =>
													alpha(theme.palette.background.default, 0.4),
											}}
										>
											<CardContent sx={{ p: spacing.md }}>
												<Stack
													direction="row"
													justifyContent="space-between"
													alignItems="start"
												>
													<Box>
														<Typography
															variant="caption"
															color="text.secondary"
															fontWeight={
																typographyExtended.fontWeights.semibold
															}
														>
															{formatDate(item.created_at)}
														</Typography>
														<Typography
															variant="body2"
															sx={{
																fontWeight: typographyExtended.fontWeights.bold,
																mt: spacing.xs,
															}}
														>
															ID: {item.id.substring(0, 8)}
														</Typography>
													</Box>
													<Chip
														size="small"
														label={item.status}
														color={
															item.status === "completed" ? "success" : "error"
														}
														variant="outlined"
													/>
												</Stack>
											</CardContent>
										</Card>
									))}
								</Stack>
							</Box>
						</Paper>
					</Grid>
				</Grid>
			)}

			{activeTab === 1 && (
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme) => getColors(theme.palette.mode).glassBorder,
					}}
				>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ mb: spacing.lg }}
					>
						<Typography variant="h6" fontWeight="bold">
							Gestión de Usuarios ({users.length})
						</Typography>
						<Button
							startIcon={<DownloadIcon />}
							variant="outlined"
							size="small"
							onClick={exportToCSV}
						>
							Exportar CSV
						</Button>
					</Stack>
					<Box
						sx={{
							height: 600,
							width: "100%",
							"& .MuiDataGrid-root": { border: "none" },
						}}
					>
						<DataGrid
							rows={users}
							columns={userColumns}
							loading={loading}
							slots={{ toolbar: GridToolbar }}
							slotProps={{ toolbar: { showQuickFilter: true } }}
							pageSizeOptions={[10, 25, 50]}
							initialState={{
								pagination: { paginationModel: { pageSize: 10 } },
							}}
						/>
					</Box>
				</Paper>
			)}

			{activeTab === 2 && (
				<Box>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ mb: spacing.lg }}
					>
						<Typography variant="h5" fontWeight="bold">
							Salud del Sistema
						</Typography>
						<Button
							startIcon={<HistoryIcon />}
							variant="contained"
							onClick={fetchHealth}
							disabled={checkingHealth}
						>
							{checkingHealth ? "Verificando..." : "Verificar Ahora"}
						</Button>
					</Stack>

					<Grid container spacing={3}>
						{[
							{
								name: "Supabase DB",
								status: health?.supabase.status,
								info: health?.supabase.error,
								icon: <SuccessIcon />,
							},
							{
								name: "Groq (AI Standard)",
								status: health?.groq.status,
								info: health?.groq.code
									? `HTTP ${health.groq.code}`
									: health?.groq.error,
								icon: <CloudIcon />,
							},
							{
								name: "Deepgram (High Precision)",
								status: health?.deepgram.status,
								info: health?.deepgram.code
									? `HTTP ${health.deepgram.code}`
									: health?.deepgram.error,
								icon: <SpeedIcon />,
							},
							{
								name: "AWS Bedrock (Complex Analysis)",
								status: health?.bedrock.status,
								info: health?.bedrock.region,
								icon: <HealthIcon />,
							},
						].map((svc, i) => (
							<Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
								<Card
									sx={{
										borderRadius: br.lg,
										border: "1px solid",
										borderColor: (theme) =>
											getColors(theme.palette.mode).glassBorder,
									}}
								>
									<CardContent sx={{ textAlign: "center" }}>
										<Box
											sx={{
												p: 2,
												borderRadius: "50%",
												bgcolor: (theme) =>
													alpha(
														svc.status === "healthy" ||
															svc.status === "configured"
															? theme.palette.success.main
															: theme.palette.error.main,
														0.1
													),
												color:
													svc.status === "healthy" ||
													svc.status === "configured"
														? "success.main"
														: "error.main",
												mb: 2,
												display: "inline-flex",
											}}
										>
											{svc.icon}
										</Box>
										<Typography variant="h6" fontWeight="bold">
											{svc.name}
										</Typography>
										<Chip
											label={svc.status?.toUpperCase() || "PENDIENTE"}
											color={
												svc.status === "healthy" || svc.status === "configured"
													? "success"
													: "error"
											}
											size="small"
											sx={{ my: 1 }}
										/>
										<Typography
											variant="caption"
											display="block"
											color="text.secondary"
										>
											{svc.info || "Sin detalles"}
										</Typography>
									</CardContent>
								</Card>
							</Grid>
						))}
					</Grid>
				</Box>
			)}

			{activeTab === 3 && (
				<Box>
					<Stack
						direction="row"
						justifyContent="space-between"
						alignItems="center"
						sx={{ mb: spacing.lg }}
					>
						<Typography variant="h5" fontWeight="bold">
							Gestión de Anuncios
						</Typography>
						<Button
							startIcon={<AddIcon />}
							variant="contained"
							onClick={() => setNotifyModalOpen(true)}
						>
							Nuevo Anuncio
						</Button>
					</Stack>

					<TableContainer component={Paper} sx={{ borderRadius: br.lg }}>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Fecha</TableCell>
									<TableCell>Mensaje</TableCell>
									<TableCell align="center">Activo</TableCell>
									<TableCell align="right">Acciones</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{announcements.map((a) => (
									<TableRow key={a.id}>
										<TableCell>{formatDate(a.created_at)}</TableCell>
										<TableCell sx={{ maxWidth: 400 }}>{a.message}</TableCell>
										<TableCell align="center">
											<Switch
												checked={a.active}
												onChange={(e) =>
													handleToggleAnnouncement(a.id, e.target.checked)
												}
											/>
										</TableCell>
										<TableCell align="right">
											<IconButton
												color="error"
												onClick={() => handleDeleteAnnouncement(a.id)}
											>
												<DeleteIcon />
											</IconButton>
										</TableCell>
									</TableRow>
								))}
								{announcements.length === 0 && (
									<TableRow>
										<TableCell colSpan={4} align="center">
											No hay anuncios registrados
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			{/* Global Notification Modal */}
			<Dialog
				open={notifyModalOpen}
				onClose={() => setNotifyModalOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Enviar Notificación Global</DialogTitle>
				<DialogContent>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mb: spacing.md }}
					>
						Este mensaje se mostrará en el dashboard principal de todos los
						psicólogos activos.
					</Typography>
					<TextField
						fullWidth
						multiline
						rows={4}
						placeholder="Ej: Mantenimiento programado hoy a las 23hs. La plataforma estará fuera de línea por 15 min."
						value={announcementMsg}
						onChange={(e) => setAnnouncementMsg(e.target.value)}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setNotifyModalOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						disabled={!announcementMsg || updating}
						onClick={handleSendAnnouncement}
					>
						{updating ? <CircularProgress size={24} /> : "Enviar a todos"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Modals for Credit and Plan (kept from original for logic consistency) */}
			<Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
				<DialogTitle>Ajuste de Créditos</DialogTitle>
				<DialogContent>
					<Box sx={{ pt: spacing.sm }}>
						<Typography variant="subtitle2">{selectedUser?.email}</Typography>
						<ToggleButtonGroup
							sx={{ mt: spacing.md, mb: spacing.md }}
							value={isPremium ? "premium" : "regular"}
							exclusive
							onChange={(_, v) => v && setIsPremium(v === "premium")}
							fullWidth
						>
							<ToggleButton value="regular">Regular</ToggleButton>
							<ToggleButton value="premium">Premium</ToggleButton>
						</ToggleButtonGroup>
						<TextField
							fullWidth
							type="number"
							label="Créditos a sumar/restar"
							value={creditsToAdd}
							onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditModalOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleUpdateCredits}
						disabled={updating}
					>
						Aplicar
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={planModalOpen} onClose={() => setPlanModalOpen(false)}>
				<DialogTitle>Modificar Plan</DialogTitle>
				<DialogContent>
					<ToggleButtonGroup
						sx={{ mt: spacing.sm }}
						orientation="vertical"
						value={newPlan}
						exclusive
						onChange={(_, v) => v && setNewPlan(v)}
						fullWidth
					>
						<ToggleButton value="free">FREE</ToggleButton>
						<ToggleButton value="pro">PRO</ToggleButton>
						<ToggleButton value="ultra">ULTRA</ToggleButton>
					</ToggleButtonGroup>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setPlanModalOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleUpdatePlan}
						disabled={updating}
					>
						Cambiar Plan
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog
				open={detailsModalOpen}
				onClose={() => setDetailsModalOpen(false)}
				fullWidth
				maxWidth="md"
			>
				<DialogTitle>Detalles del Usuario: {selectedUser?.email}</DialogTitle>
				<DialogContent dividers>
					{loadingSessions ? (
						<Box sx={{ p: 4, textAlign: "center" }}>
							<CircularProgress />
						</Box>
					) : (
						<Box>
							<Typography variant="h6" sx={{ mb: 2 }}>
								Historial de Sesiones (Últimos 50)
							</Typography>
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Fecha</TableCell>
											<TableCell>ID Sesión</TableCell>
											<TableCell>Modo</TableCell>
											<TableCell>Estado</TableCell>
											<TableCell>Duración</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{userSessions.map((s) => (
											<TableRow key={s.id}>
												<TableCell>{formatDate(s.created_at)}</TableCell>
												<TableCell sx={{ fontSize: "0.75rem" }}>
													{s.id}
												</TableCell>
												<TableCell>
													<Chip
														label={s.mode}
														size="small"
														variant="outlined"
													/>
												</TableCell>
												<TableCell>
													<Chip
														label={s.status}
														size="small"
														color={
															s.status === "completed" ? "success" : "error"
														}
													/>
												</TableCell>
												<TableCell>{s.duration}s</TableCell>
											</TableRow>
										))}
										{userSessions.length === 0 && (
											<TableRow>
												<TableCell colSpan={5} align="center">
													No hay sesiones para este usuario
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</TableContainer>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailsModalOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};
