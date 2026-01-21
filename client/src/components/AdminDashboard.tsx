import React, { useState, useEffect, useContext } from "react";
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
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import {
	People as PeopleIcon,
	AttachMoney as MoneyIcon,
	Assessment as AssessmentIcon,
	SwapHoriz as SwapIcon,
	Logout as LogoutIcon,
	TrendingUp as TrendingUpIcon,
	Speed as SpeedIcon,
	NotificationsActive as NotifyIcon,
	Add as AddIcon,
	CheckCircle as SuccessIcon,
	History as HistoryIcon,
	HealthAndSafety as HealthIcon,
	CloudQueue as CloudIcon,
	Delete as DeleteIcon,
	Visibility as ViewIcon,
	ArrowBack as ArrowBackIcon,
	Subscriptions as SubscriptionsIcon,
	Edit as EditIcon,
} from "@mui/icons-material";
import {
	getGradients,
	getBackgrounds,
	borderRadius as br,
	spacing,
	typographyExtended,
	getColors,
} from "../styles.theme";
import { AlertModal } from "./AlertModal";
import { PromoCodesManager } from "./PromoCodesManager";
import { ThemeContext } from "../App";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { AdminTable } from "./AdminTable";
import { FiscalHealthWidget } from "./FiscalHealthWidget";

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
	dailyStats: { date: string; count: number }[];
	breakdown: {
		proUsers: number;
		ultraUsers: number;
	};
	fiscalHealth: {
		grossRevenue30d: number;
		monthlyLimit: number;
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
	const { mode, toggleTheme } = useContext(ThemeContext);
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
	const [alertModal, setAlertModal] = useState<{
		open: boolean;
		title?: string;
		message: string;
		severity?: "success" | "error" | "warning" | "info";
	}>({
		open: false,
		message: "",
		severity: "error",
	});

	const [editModalOpen, setEditModalOpen] = useState(false);
	const [planModalOpen, setPlanModalOpen] = useState(false);
	const [notifyModalOpen, setNotifyModalOpen] = useState(false);
	const [announcementMsg, setAnnouncementMsg] = useState("");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [isPremium, setIsPremium] = useState(false);
	const [creditsToAdd, setCreditsToAdd] = useState(1);
	const [newPlan, setNewPlan] = useState<string>("free");
	const [updating, setUpdating] = useState(false);

	// Plans state
	const [plans, setPlans] = useState<any[]>([]);
	const [loadingPlans, setLoadingPlans] = useState(false);
	const [editPlanModalOpen, setEditPlanModalOpen] = useState(false);
	const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
	const [overviewView, setOverviewView] = useState<
		"grid" | "mrr" | "users" | "burn_rate" | "conversion"
	>("grid");

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
			fetchPlans();
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
				`${API_URL}/api/admin/announcements?userId=${userId}`,
			);
			if (res.ok) {
				const data = await res.json();
				setAnnouncements(data.announcements);
			}
		} catch (e) {
			console.error("Error fetching announcements:", e);
		}
	};

	const fetchPlans = async () => {
		setLoadingPlans(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/plans?userId=${userId}`);
			if (res.ok) {
				const data = await res.json();
				setPlans(data.plans);
			}
		} catch (e) {
			console.error("Error fetching plans:", e);
		} finally {
			setLoadingPlans(false);
		}
	};

	const fetchUserSessions = async (targetUserId: string) => {
		setLoadingSessions(true);
		try {
			const res = await fetch(
				`${API_URL}/api/admin/user-sessions/${targetUserId}?userId=${userId}`,
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
			`lazo_users_${new Date().toISOString().split("T")[0]}.csv`,
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
			setAlertModal({
				open: true,
				message: err.message,
				severity: "error",
			});
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
			setAlertModal({
				open: true,
				message: err.message,
				severity: "error",
			});
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
			setAlertModal({
				open: true,
				message: err.message,
				severity: "error",
			});
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
				},
			);
			if (res.ok) fetchAnnouncements();
		} catch (e) {
			console.error("Error deleting announcement:", e);
		}
	};

	const handleUpdatePlanDetails = async () => {
		if (!selectedPlan) return;
		setUpdating(true);
		try {
			const res = await fetch(`${API_URL}/api/admin/plans/${selectedPlan.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					userId,
					...selectedPlan,
				}),
			});
			if (!res.ok) throw new Error("Error updating plan");
			await fetchPlans();
			setEditPlanModalOpen(false);
			setSelectedPlan(null);
		} catch (err: any) {
			setAlertModal({
				open: true,
				message: err.message,
				severity: "error",
			});
		} finally {
			setUpdating(false);
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
			field: "email",
			headerName: "Email",
			flex: 1.5,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) => (
				<Typography variant="body2" fontWeight="medium">
					{params.value}
				</Typography>
			),
		},
		{
			field: "plan_type",
			headerName: "Plan",
			flex: 0.6,
			align: "center",
			headerAlign: "center",
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
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) => (
				<Stack
					direction="row"
					spacing={1}
					alignItems="center"
					justifyContent="center"
					width="100%"
				>
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
			flex: 0.7,
			align: "center",
			headerAlign: "center",
		},
		{
			field: "last_activity",
			headerName: "Última Actividad",
			flex: 1,
			align: "center",
			headerAlign: "center",
			valueFormatter: (value) => (value ? formatDate(value) : "-"),
		},
		{
			field: "actions",
			headerName: "Acciones",
			flex: 8,
			align: "center",
			headerAlign: "center",
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<Stack direction="row" spacing={1} justifyContent="center" width="100%">
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

	const announcementColumns: GridColDef[] = [
		{
			field: "created_at",
			headerName: "Fecha",
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			valueFormatter: (value) => formatDate(value),
		},
		{
			field: "message",
			headerName: "Mensaje",
			flex: 3,
			align: "center",
			headerAlign: "center",
		},
		{
			field: "active",
			headerName: "Activo",
			flex: 0.5,
			align: "center",
			headerAlign: "center",
			renderCell: (params: GridRenderCellParams) => (
				<Switch
					checked={params.value}
					onChange={(e) =>
						handleToggleAnnouncement(params.row.id, e.target.checked)
					}
				/>
			),
		},
		{
			field: "actions",
			headerName: "Acciones",
			flex: 0.5,
			align: "center",
			headerAlign: "center",
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<IconButton
					color="error"
					size="small"
					onClick={() => handleDeleteAnnouncement(params.row.id)}
				>
					<DeleteIcon fontSize="small" />
				</IconButton>
			),
		},
	];

	const planColumns: GridColDef[] = [
		{
			field: "name",
			headerName: "Plan",
			flex: 1,
			align: "center",
			headerAlign: "center",
		},
		{
			field: "price_ars",
			headerName: "Precio",
			flex: 0.8,
			align: "center",
			headerAlign: "center",
			valueFormatter: (value) => (value ? formatCurrency(value) : "-"),
		},
		{
			field: "credits_monthly",
			headerName: "Créditos Mensuales",
			flex: 1,
			align: "center",
			headerAlign: "center",
		},
		{
			field: "is_active",
			headerName: "Activo",
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
			field: "actions",
			headerName: "Acciones",
			flex: 0.6,
			align: "center",
			headerAlign: "center",
			sortable: false,
			renderCell: (params: GridRenderCellParams) => (
				<IconButton
					color="primary"
					size="small"
					onClick={() => {
						setSelectedPlan(params.row);
						setEditPlanModalOpen(true);
					}}
				>
					<EditIcon fontSize="small" />
				</IconButton>
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
				<Stack direction="row" spacing={spacing.md} alignItems="center">
					{stats?.fiscalHealth && (
						<FiscalHealthWidget
							grossRevenue30d={stats.fiscalHealth.grossRevenue30d || 0}
							monthlyLimit={stats.fiscalHealth.monthlyLimit || 850000}
						/>
					)}
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
					<Tooltip title={mode === "light" ? "Modo Oscuro" : "Modo Claro"}>
						<IconButton
							onClick={toggleTheme}
							sx={{
								borderRadius: br.lg,
								border: "1px solid",
								borderColor: (theme) => alpha(theme.palette.divider, 0.1),
								bgcolor: (theme) => alpha(theme.palette.background.paper, 0.4),
								"&:hover": {
									bgcolor: (theme) =>
										alpha(theme.palette.background.paper, 0.6),
								},
							}}
						>
							{mode === "light" ?
								<DarkModeIcon />
							:	<LightModeIcon />}
						</IconButton>
					</Tooltip>
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
				<Tab icon={<SubscriptionsIcon />} iconPosition="start" label="Planes" />
				<Tab icon={<MoneyIcon />} iconPosition="start" label="Códigos Promo" />
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
				<Box>
					{overviewView === "grid" ?
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
												viewMode: "mrr",
											},
											{
												title: "Usuarios Activos (7d)",
												value: `${stats.activeUsers7d} / ${stats.totalUsers}`,
												progress:
													(stats.activeUsers7d / stats.totalUsers) * 100,
												icon: <PeopleIcon />,
												color: "info",
												viewMode: "users",
											},
											{
												title: "Conversión",
												value: `${stats.conversionRate}%`,
												subtitle: "Pago / Total",
												icon: <TrendingUpIcon />,
												color: "warning",
												viewMode: "conversion",
											},
											{
												title: "AI Burn Rate (Est.)",
												value: `${stats.aiBurnRate} USD`,
												subtitle: "Mes actual acumulado",
												icon: <SpeedIcon />,
												color: "error",
												viewMode: "burn_rate",
											},
										].map((kpi, index) => (
											<Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
												<Card
													elevation={0}
													onClick={() => setOverviewView(kpi.viewMode as any)}
													sx={{
														height: "100%",
														borderRadius: br.xl,
														position: "relative",
														overflow: "hidden",
														cursor: "pointer",
														transition: "all 0.2s ease-in-out",
														background: (theme) =>
															getBackgrounds(theme.palette.mode).glass.panel,
														backdropFilter: "blur(20px)",
														border: "1px solid",
														borderColor: (theme) =>
															alpha(
																(theme.palette as any)[kpi.color].main,
																0.2,
															),
														"&:hover": {
															transform: "translateY(-4px)",
															boxShadow: (theme) =>
																`0 12px 20px ${alpha(
																	(theme.palette as any)[kpi.color].main,
																	0.15,
																)}`,
															borderColor: (theme) =>
																alpha(
																	(theme.palette as any)[kpi.color].main,
																	0.4,
																),
														},
														"&:active": {
															transform: "translateY(0)",
														},
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
																		fontWeight:
																			typographyExtended.fontWeights.bold,
																	}}
																>
																	{kpi.title}
																</Typography>
																<Typography
																	variant="h4"
																	fontWeight={
																		typographyExtended.fontWeights.black
																	}
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
																			0.1,
																		),
																	color: `${kpi.color}.main`,
																}}
															>
																{kpi.icon}
															</Box>
														</Stack>
														{kpi.progress !== undefined ?
															<Box sx={{ mt: spacing.md }}>
																<Box
																	sx={{
																		height: 6,
																		bgcolor: (theme) =>
																			alpha(
																				(theme.palette as any)[kpi.color].main,
																				0.1,
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
														:	<Typography
																variant="caption"
																color="text.secondary"
																sx={{ mt: spacing.md, display: "block" }}
															>
																{kpi.subtitle}
															</Typography>
														}
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
									}}
								>
									<Typography variant="h6" fontWeight="bold">
										Resumen Diario
									</Typography>
									<Box
										sx={{
											height: 200,
											display: "flex",
											alignItems: "flex-end",
											gap: 1.5,
											mt: 3,
											px: 1,
										}}
									>
										{stats ?
											stats.dailyStats.map((day, idx) => {
												const maxCount = Math.max(
													...stats.dailyStats.map((d) => d.count),
													1,
												);
												const heightPct = (day.count / maxCount) * 100;
												const isLatest = idx === stats.dailyStats.length - 1;

												return (
													<Tooltip
														key={day.date}
														title={`${day.date}: ${day.count} sesiones`}
														arrow
													>
														<Box
															sx={{
																flex: 1,
																display: "flex",
																flexDirection: "column",
																alignItems: "center",
																gap: 1,
															}}
														>
															<Box
																sx={{
																	width: "100%",
																	height: `${heightPct}%`,
																	minHeight: day.count > 0 ? 4 : 0,
																	background: (theme) =>
																		isLatest ?
																			theme.palette.primary.main
																		:	alpha(theme.palette.primary.main, 0.4),
																	borderRadius: "4px 4px 0 0",
																	transition:
																		"height 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
																	"&:hover": {
																		background: (theme) =>
																			theme.palette.primary.main,
																		transform: "scaleX(1.1)",
																	},
																}}
															/>
															<Typography
																variant="caption"
																sx={{
																	fontSize: "0.65rem",
																	opacity: 0.7,
																	whiteSpace: "nowrap",
																	transform: "rotate(-45deg)",
																	mt: 1,
																	mb: 1,
																}}
															>
																{day.date.split("-").slice(1).join("/")}
															</Typography>
														</Box>
													</Tooltip>
												);
											})
										:	<Box
												sx={{
													width: "100%",
													height: "100%",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<CircularProgress size={24} />
											</Box>
										}
									</Box>
									<Typography
										variant="caption"
										display="block"
										textAlign="center"
										sx={{ mt: 4, opacity: 0.6 }}
									>
										Sesiones iniciadas por día (Últimos 7 días)
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
																		fontWeight:
																			typographyExtended.fontWeights.bold,
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
																	item.status === "completed" ?
																		"success"
																	:	"error"
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
					:	<Box sx={{ mb: 4 }}>
							<Button
								startIcon={<ArrowBackIcon />}
								onClick={() => setOverviewView("grid")}
								sx={{ mb: 3, borderRadius: br.lg }}
							>
								Volver a Vista General
							</Button>

							{overviewView === "mrr" && (
								<RevenueDetail stats={stats} spacing={spacing} br={br} />
							)}
							{overviewView === "users" && (
								<UserAnalyticsDetail stats={stats} spacing={spacing} br={br} />
							)}
							{overviewView === "burn_rate" && (
								<BurnRateDetail stats={stats} spacing={spacing} br={br} />
							)}
							{overviewView === "conversion" && (
								<ConversionDetail stats={stats} spacing={spacing} br={br} />
							)}
						</Box>
					}
				</Box>
			)}

			{/* Users Tab */}
			{activeTab === 1 && (
				<AdminTable
					rows={users}
					columns={userColumns}
					loading={loading}
					title={`Gestión de Usuarios (${users.length})`}
					onExport={exportToCSV}
				/>
			)}

			{activeTab === 2 && (
				<Box sx={{ display: "flex", justifyContent: "center" }}>
					<Box sx={{ width: "100%", maxWidth: 1200 }}>
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
								size="small"
								onClick={fetchHealth}
								disabled={checkingHealth}
								sx={{ borderRadius: br.lg }}
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
									icon: <SuccessIcon fontSize="small" />,
								},
								{
									name: "Groq (AI Standard)",
									status: health?.groq.status,
									info:
										health?.groq.code ?
											`HTTP ${health.groq.code}`
										:	health?.groq.error,
									icon: <CloudIcon fontSize="small" />,
								},
								{
									name: "Deepgram (High Precision)",
									status: health?.deepgram.status,
									info:
										health?.deepgram.code ?
											`HTTP ${health.deepgram.code}`
										:	health?.deepgram.error,
									icon: <SpeedIcon fontSize="small" />,
								},
								{
									name: "AWS Bedrock (Complex Analysis)",
									status: health?.bedrock.status,
									info: health?.bedrock.region,
									icon: <HealthIcon fontSize="small" />,
								},
							].map((svc, i) => (
								<Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
									<Card
										sx={{
											borderRadius: br.lg,
											border: "1px solid",
											background: (theme) =>
												getBackgrounds(theme.palette.mode).glass.panel,
											backdropFilter: "blur(20px)",
											borderColor: (theme) =>
												getColors(theme.palette.mode).glassBorder,
										}}
									>
										<CardContent sx={{ textAlign: "center", p: spacing.md }}>
											<Box
												sx={{
													p: 1.5,
													borderRadius: "50%",
													bgcolor: (theme) =>
														alpha(
															(
																svc.status === "healthy" ||
																	svc.status === "configured"
															) ?
																theme.palette.success.main
															:	theme.palette.error.main,
															0.1,
														),
													color:
														(
															svc.status === "healthy" ||
															svc.status === "configured"
														) ?
															"success.main"
														:	"error.main",
													mb: 1.5,
													display: "inline-flex",
												}}
											>
												{svc.icon}
											</Box>
											<Typography
												variant="subtitle2"
												fontWeight="bold"
												sx={{ mb: 0.5 }}
											>
												{svc.name}
											</Typography>
											<Chip
												label={svc.status?.toUpperCase() || "PENDIENTE"}
												color={
													(
														svc.status === "healthy" ||
														svc.status === "configured"
													) ?
														"success"
													:	"error"
												}
												size="small"
												sx={{ mb: 1 }}
											/>
											<Typography
												variant="caption"
												display="block"
												color="text.secondary"
												sx={{ fontSize: "0.7rem", opacity: 0.8 }}
											>
												{svc.info || "Sin detalles"}
											</Typography>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					</Box>
				</Box>
			)}

			{activeTab === 3 && (
				<AdminTable
					rows={announcements}
					columns={announcementColumns}
					loading={false}
					title="Gestión de Anuncios"
					maxWidth={1200}
					actionButton={
						<Button
							startIcon={<AddIcon />}
							variant="contained"
							onClick={() => setNotifyModalOpen(true)}
						>
							Nuevo Anuncio
						</Button>
					}
				/>
			)}

			{activeTab === 4 && (
				<AdminTable
					rows={plans}
					columns={planColumns}
					loading={loadingPlans}
					title="Gestión de Planes"
					maxWidth={1200}
				/>
			)}

			{/* Notify Modal */}
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
						{updating ?
							<CircularProgress size={24} />
						:	"Enviar a todos"}
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
					{loadingSessions ?
						<Box sx={{ p: 4, textAlign: "center" }}>
							<CircularProgress />
						</Box>
					:	<Box>
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
					}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetailsModalOpen(false)}>Cerrar</Button>
				</DialogActions>
			</Dialog>

			{/* Edit Plan Modal */}
			<Dialog
				open={editPlanModalOpen}
				onClose={() => setEditPlanModalOpen(false)}
				fullWidth
				maxWidth="sm"
			>
				<DialogTitle>Editar Plan: {selectedPlan?.name}</DialogTitle>
				<DialogContent>
					<Box
						sx={{
							pt: spacing.sm,
							display: "flex",
							flexDirection: "column",
							gap: 2,
						}}
					>
						<TextField
							fullWidth
							label="Nombre"
							value={selectedPlan?.name || ""}
							onChange={(e) =>
								setSelectedPlan({ ...selectedPlan, name: e.target.value })
							}
						/>
						<TextField
							fullWidth
							label="Descripción"
							value={selectedPlan?.description || ""}
							onChange={(e) =>
								setSelectedPlan({
									...selectedPlan,
									description: e.target.value,
								})
							}
						/>
						<TextField
							fullWidth
							type="number"
							label="Precio USD"
							value={selectedPlan?.price_usd || 0}
							onChange={(e) =>
								setSelectedPlan({
									...selectedPlan,
									price_usd: parseFloat(e.target.value) || 0,
								})
							}
						/>
						<TextField
							fullWidth
							type="number"
							label="Precio ARS (opcional, se calcula automáticamente si está vacío)"
							value={selectedPlan?.price_ars || ""}
							onChange={(e) =>
								setSelectedPlan({
									...selectedPlan,
									price_ars: e.target.value ? parseFloat(e.target.value) : null,
								})
							}
						/>
						<TextField
							fullWidth
							type="number"
							label="Créditos Iniciales"
							value={selectedPlan?.credits_initial || 0}
							onChange={(e) =>
								setSelectedPlan({
									...selectedPlan,
									credits_initial: parseInt(e.target.value) || 0,
								})
							}
						/>
						<TextField
							fullWidth
							type="number"
							label="Créditos Mensuales"
							value={selectedPlan?.credits_monthly || 0}
							onChange={(e) =>
								setSelectedPlan({
									...selectedPlan,
									credits_monthly: parseInt(e.target.value) || 0,
								})
							}
						/>
						<Stack direction="row" alignItems="center" spacing={2}>
							<Typography>Plan Activo:</Typography>
							<Switch
								checked={selectedPlan?.is_active || false}
								onChange={(e) =>
									setSelectedPlan({
										...selectedPlan,
										is_active: e.target.checked,
									})
								}
							/>
						</Stack>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setEditPlanModalOpen(false)}>Cancelar</Button>
					<Button
						variant="contained"
						onClick={handleUpdatePlanDetails}
						disabled={updating}
					>
						{updating ?
							<CircularProgress size={24} />
						:	"Guardar Cambios"}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Tab 5: Promo Codes */}
			{activeTab === 5 && (
				<Box>
					<PromoCodesManager userId={userId || ""} />
				</Box>
			)}

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

// --- Detailed Sub-sections for Overview ---

const RevenueDetail = ({ stats, spacing, br }: any) => {
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			minimumFractionDigits: 0,
		}).format(amount);
	};

	return (
		<Grid container spacing={3}>
			<Grid size={{ xs: 12, md: 8 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						minHeight: 400,
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Desglose de Ingresos Proyectados (MRR)
					</Typography>
					<Stack spacing={4} sx={{ mt: 4 }}>
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={1}>
								<Typography variant="body2" fontWeight="medium">
									Plan Pro ({stats.breakdown.proUsers} usuarios)
								</Typography>
								<Typography variant="body1" fontWeight="bold">
									{formatCurrency(stats.breakdown.proUsers * 19500)}
								</Typography>
							</Stack>
							<Box
								sx={{
									height: 12,
									bgcolor: "primary.main",
									borderRadius: br.lg,
									opacity: 0.8,
								}}
							/>
						</Box>
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={1}>
								<Typography variant="body2" fontWeight="medium">
									Plan Ultra ({stats.breakdown.ultraUsers} usuarios)
								</Typography>
								<Typography variant="body1" fontWeight="bold">
									{formatCurrency(stats.breakdown.ultraUsers * 45000)}
								</Typography>
							</Stack>
							<Box
								sx={{
									height: 12,
									bgcolor: "success.main",
									borderRadius: br.lg,
									opacity: 0.8,
								}}
							/>
						</Box>
					</Stack>

					<Box
						sx={{
							mt: 6,
							p: spacing.lg,
							bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.05),
							borderRadius: br.lg,
							border: "1px dashed",
							borderColor: "primary.main",
						}}
					>
						<Stack direction="row" spacing={1} alignItems="center" mb={1}>
							<TrendingUpIcon color="primary" fontSize="small" />
							<Typography variant="subtitle2" color="primary" fontWeight="bold">
								Potencial de Crecimiento
							</Typography>
						</Stack>
						<Typography
							variant="body2"
							color="text.secondary"
							sx={{ opacity: 0.9 }}
						>
							Si conviertes el 5% de tus usuarios activos actuales (
							{Math.round(stats.totalUsers * 0.05)} usuarios) al Plan Pro, tus
							ingresos mensuales aumentarían en aproximadamente{" "}
							<strong>{formatCurrency(stats.totalUsers * 0.05 * 19500)}</strong>
							.
						</Typography>
					</Box>
				</Paper>
			</Grid>
			<Grid size={{ xs: 12, md: 4 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						height: "100%",
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Métricas Clave
					</Typography>
					<Stack spacing={3} sx={{ mt: 3 }}>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								ARPU (Promedio por Usuario Pago)
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								{formatCurrency(
									stats.mrr /
										(stats.breakdown.proUsers + stats.breakdown.ultraUsers ||
											1),
								)}
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								LTV Estimado (12 meses)
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								{formatCurrency(
									(stats.mrr /
										(stats.breakdown.proUsers + stats.breakdown.ultraUsers ||
											1)) *
										12,
								)}
							</Typography>
						</Box>
					</Stack>
				</Paper>
			</Grid>
		</Grid>
	);
};

const UserAnalyticsDetail = ({ stats, spacing, br }: any) => {
	return (
		<Grid container spacing={3}>
			<Grid size={{ xs: 12, md: 8 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						minHeight: 400,
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Actividad de Usuarios (Últimos 7 días)
					</Typography>
					<Box
						sx={{
							mt: 4,
							height: 200,
							display: "flex",
							alignItems: "flex-end",
							gap: 2,
						}}
					>
						{[65, 80, 45, 90, 70, 85, 100].map((val, i) => (
							<Box
								key={i}
								sx={{
									flex: 1,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 1,
								}}
							>
								<Box
									sx={{
										width: "100%",
										height: `${val}%`,
										bgcolor: i === 6 ? "info.main" : "info.light",
										borderRadius: `${br.md} ${br.md} 0 0`,
										opacity: i === 6 ? 1 : 0.6,
										transition: "height 1s ease-out",
									}}
								/>
								<Typography variant="caption" color="text.secondary">
									Día {i + 1}
								</Typography>
							</Box>
						))}
					</Box>
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mt: 3, textAlign: "center" }}
					>
						El pico de actividad se registra hoy con{" "}
						<strong>{stats.sessionsToday} sesiones</strong> iniciadas.
					</Typography>
				</Paper>
			</Grid>
			<Grid size={{ xs: 12, md: 4 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						height: "100%",
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Retención y Uso
					</Typography>
					<Stack spacing={3} sx={{ mt: 3 }}>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Total de Usuarios
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								{stats.totalUsers}
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Activos Semanales (WAU)
							</Typography>
							<Typography variant="h5" fontWeight="bold" color="info.main">
								{stats.activeUsers7d}
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								% de Actividad
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								{Math.round((stats.activeUsers7d / stats.totalUsers) * 100)}%
							</Typography>
						</Box>
					</Stack>
				</Paper>
			</Grid>
		</Grid>
	);
};

const BurnRateDetail = ({ stats, spacing, br }: any) => {
	return (
		<Grid container spacing={3}>
			<Grid size={{ xs: 12, md: 8 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						minHeight: 400,
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Consumo Estimado de APIs (Mes Actual)
					</Typography>
					<Stack spacing={3} sx={{ mt: 4 }}>
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={1}>
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<CloudIcon color="info" sx={{ mr: 1, fontSize: 18 }} />
									<Typography variant="body2">Groq (Standard)</Typography>
								</Box>
								<Typography variant="body2" fontWeight="bold">
									~ {stats.aiBurnRate * 0.1} USD
								</Typography>
							</Stack>
							<Box
								sx={{
									height: 8,
									bgcolor: "info.main",
									borderRadius: br.lg,
									opacity: 0.8,
								}}
							/>
						</Box>
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={1}>
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<SpeedIcon color="error" sx={{ mr: 1, fontSize: 18 }} />
									<Typography variant="body2">
										Deepgram (High Precision)
									</Typography>
								</Box>
								<Typography variant="body2" fontWeight="bold">
									~ {stats.aiBurnRate * 0.8} USD
								</Typography>
							</Stack>
							<Box
								sx={{
									height: 8,
									bgcolor: "error.main",
									borderRadius: br.lg,
									opacity: 0.8,
								}}
							/>
						</Box>
						<Box>
							<Stack direction="row" justifyContent="space-between" mb={1}>
								<Box sx={{ display: "flex", alignItems: "center" }}>
									<HealthIcon color="warning" sx={{ mr: 1, fontSize: 18 }} />
									<Typography variant="body2">AWS Bedrock (Complex)</Typography>
								</Box>
								<Typography variant="body2" fontWeight="bold">
									~ {stats.aiBurnRate * 0.1} USD
								</Typography>
							</Stack>
							<Box
								sx={{
									height: 8,
									bgcolor: "warning.main",
									borderRadius: br.lg,
									opacity: 0.8,
								}}
							/>
						</Box>
					</Stack>

					<Alert severity="info" sx={{ mt: 5, borderRadius: br.lg }}>
						Los costos son estimativos basados en el modelo de precios actual de
						los proveedores y el volumen de sesiones.
					</Alert>
				</Paper>
			</Grid>
			<Grid size={{ xs: 12, md: 4 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						height: "100%",
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Eficiencia de Costos
					</Typography>
					<Stack spacing={3} sx={{ mt: 3 }}>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Gasto Total Acumulado
							</Typography>
							<Typography variant="h5" fontWeight="bold" color="error.main">
								{stats.aiBurnRate} USD
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Costo Promedio por Sesión
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								~ 0.15 USD
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								ROI (MRR / Burn Rate)
							</Typography>
							<Typography variant="h5" fontWeight="bold" color="success.main">
								{Math.round(stats.mrr / 1000 / stats.aiBurnRate)}x
							</Typography>
						</Box>
					</Stack>
				</Paper>
			</Grid>
		</Grid>
	);
};

const ConversionDetail = ({ stats, spacing, br }: any) => {
	const freeUsers =
		stats.totalUsers - stats.breakdown.proUsers - stats.breakdown.ultraUsers;

	return (
		<Grid container spacing={3}>
			<Grid size={{ xs: 12, md: 8 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						minHeight: 400,
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Embudo de Conversión (Funnel)
					</Typography>
					<Box
						sx={{
							mt: 4,
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 1,
						}}
					>
						<Box
							sx={{
								width: "80%",
								height: 60,
								bgcolor: (theme: any) => alpha(theme.palette.divider, 0.05),
								borderRadius: br.md,
								border: "1px solid",
								borderColor: "divider",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Typography variant="subtitle2">
								Total Usuarios de Lazo: {stats.totalUsers}
							</Typography>
						</Box>
						<Box
							sx={{
								width: "0",
								height: "0",
								borderLeft: "20px solid transparent",
								borderRight: "20px solid transparent",
								borderTop: "10px solid rgba(0,0,0,0.1)",
							}}
						/>
						<Box
							sx={{
								width: "60%",
								height: 60,
								bgcolor: (theme: any) =>
									alpha(theme.palette.secondary.main, 0.1),
								borderRadius: br.md,
								border: "1px solid",
								borderColor: (theme: any) =>
									alpha(theme.palette.secondary.main, 0.3),
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Typography variant="subtitle2" color="secondary.main">
								Premium (Pro/Ultra):{" "}
								{stats.breakdown.proUsers + stats.breakdown.ultraUsers}
							</Typography>
						</Box>
					</Box>

					<Grid container spacing={2} sx={{ mt: 5 }}>
						<Grid size={{ xs: 4 }}>
							<Box
								sx={{
									textAlign: "center",
									p: 2,
									borderRadius: br.lg,
									bgcolor: (theme: any) =>
										alpha(theme.palette.text.primary, 0.02),
								}}
							>
								<Typography variant="h5" fontWeight="bold">
									{freeUsers}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Free
								</Typography>
							</Box>
						</Grid>
						<Grid size={{ xs: 4 }}>
							<Box
								sx={{
									textAlign: "center",
									p: 2,
									borderRadius: br.lg,
									bgcolor: (theme: any) =>
										alpha(theme.palette.primary.main, 0.05),
								}}
							>
								<Typography variant="h5" fontWeight="bold" color="primary">
									{stats.breakdown.proUsers}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Pro
								</Typography>
							</Box>
						</Grid>
						<Grid size={{ xs: 4 }}>
							<Box
								sx={{
									textAlign: "center",
									p: 2,
									borderRadius: br.lg,
									bgcolor: (theme: any) =>
										alpha(theme.palette.success.main, 0.05),
								}}
							>
								<Typography variant="h5" fontWeight="bold" color="success.main">
									{stats.breakdown.ultraUsers}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Ultra
								</Typography>
							</Box>
						</Grid>
					</Grid>
				</Paper>
			</Grid>
			<Grid size={{ xs: 12, md: 4 }}>
				<Paper
					elevation={0}
					sx={{
						p: spacing.lg,
						borderRadius: br.xl,
						background: (theme: any) =>
							getBackgrounds(theme.palette.mode).glass.panel,
						backdropFilter: "blur(20px)",
						border: "1px solid",
						borderColor: (theme: any) =>
							getColors(theme.palette.mode).glassBorder,
						height: "100%",
					}}
				>
					<Typography variant="h6" fontWeight="bold" gutterBottom>
						Eficiencia Conversion
					</Typography>
					<Stack spacing={3} sx={{ mt: 3 }}>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Tasa de Conversión Global
							</Typography>
							<Typography variant="h5" fontWeight="bold" color="warning.main">
								{stats.conversionRate}%
							</Typography>
						</Box>
						<Box>
							<Typography
								variant="caption"
								color="text.secondary"
								display="block"
							>
								Usuarios x Convertir
							</Typography>
							<Typography variant="h5" fontWeight="bold">
								{freeUsers}
							</Typography>
						</Box>
					</Stack>
				</Paper>
			</Grid>
		</Grid>
	);
};
