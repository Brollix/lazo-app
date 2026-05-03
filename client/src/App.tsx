import { useState, useEffect, createContext, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box, GlobalStyles } from "@mui/material";
import { createAppTheme } from "./theme";
import { Login } from "./components/Login";
import { Dashboard, ClinicalSession } from "./components/Dashboard";
import { PatientsList, Patient } from "./components/PatientsList";
import { SessionsList } from "./components/SessionsList";
import { AdminDashboard } from "./components/AdminDashboard";
import { InfoPage } from "./components/InfoPage";
import { supabase } from "./supabaseClient";
import { SessionProcessingProvider } from "./contexts/SessionProcessingContext";
import { useUserPlan } from "./hooks/useUserPlan";

/**
 * Check if a user is an admin by querying the admin_roles table
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
	try {
		const { data, error } = await supabase
			.from("admin_roles")
			.select("role")
			.eq("user_id", userId)
			.maybeSingle();

		// If there's an error or no data, user is not an admin
		// This handles both RLS permission errors and cases where the user simply isn't an admin
		if (error) {
			console.log(
				"Admin check error (expected for non-admin users):",
				error.message,
			);
			return false;
		}

		return !!data;
	} catch (err) {
		console.error("Unexpected error checking admin status:", err);
		return false;
	}
}

type ThemeMode = "light" | "dark";

interface ThemeContextType {
	mode: ThemeMode;
	toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
	mode: "light",
	toggleTheme: () => {},
});

function App() {
	const [currentView, setCurrentView] = useState<
		"login" | "list" | "sessions" | "dashboard" | "admin" | "info"
	>("info");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [selectedSession, setSelectedSession] =
		useState<ClinicalSession | null>(null);
	const [selectedDate, setSelectedDate] = useState<string | undefined>(
		undefined,
	);
	const [selectedTime, setSelectedTime] = useState<string | undefined>(
		undefined,
	);
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		const savedMode = localStorage.getItem("themeMode");
		return savedMode === "dark" || savedMode === "light" ? savedMode : "light";
	});
	const [userId, setUserId] = useState<string | undefined>(undefined);
	const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
	const [userSalt, setUserSalt] = useState<string | null>(null);
	const { planData } = useUserPlan(userId);

	// Fetch encryption salt when userId changes
	useEffect(() => {
		if (userId) {
			supabase
				.from("profiles")
				.select("encryption_salt")
				.eq("id", userId)
				.single()
				.then(({ data, error }) => {
					if (!error && data?.encryption_salt) {
						setUserSalt(data.encryption_salt);
					}
				});
		} else {
			setUserSalt(null);
		}
	}, [userId]);

	const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

	const toggleTheme = () => {
		setThemeMode((prevMode) => {
			const newMode = prevMode === "light" ? "dark" : "light";
			localStorage.setItem("themeMode", newMode);
			return newMode;
		});
	};

	// File detection logic removed for web version
	useEffect(() => {
		let isMounted = true;

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log(
				"App: onAuthStateChange event:",
				event,
				"session user:",
				session?.user?.id,
			);

			if (!isMounted) return;

			// Use setTimeout to break out of the Supabase client's callback context
			// This prevents deadlock when making database queries
			setTimeout(async () => {
				if (!isMounted) return;

				if (session) {
					console.log("App: Session found, user ID:", session.user.id);
					setUserId(session.user.id);

					// Check if encryption keys are available
					const { EncryptionService } =
						await import("./services/encryptionService");
					let hasPassword = EncryptionService.isSetup();
					let hasMasterKey = !!EncryptionService.getMasterKey();

					// If session was restored but encryption is not set up, try to restore master key
					if (!hasPassword && !hasMasterKey && event === "INITIAL_SESSION") {
						console.log(
							"App: Session restored but encryption keys not available, attempting to restore master key",
						);
						
						try {
							// Fetch user profile to get encrypted master key
							const { data: profile } = await supabase
								.from("profiles")
								.select("encrypted_master_key_password, master_key_encrypted, encryption_salt")
								.eq("id", session.user.id)
								.single();

							if (!profile) {
								throw new Error("Profile not found");
							}

							// Check if user has a master key setup
							if ((profile.encrypted_master_key_password || profile.master_key_encrypted) && profile.encryption_salt) {
								console.log("App: Master key found in database, but cannot decrypt without password. Forcing re-login.");
								// We cannot decrypt the master key without the user's password
								// So we need to force a re-login
								await supabase.auth.signOut();
								setUserId(undefined);
								setIsAdminUser(false);
								setCurrentView("info");
								setSelectedPatient(null);
								return;
							} else {
								// Legacy user without master key - let them continue for now
								console.log("App: Legacy user without master key detected");
							}
						} catch (error) {
							console.error("App: Error checking for master key:", error);
							// On error, force re-login to be safe
							await supabase.auth.signOut();
							setUserId(undefined);
							setIsAdminUser(false);
							setCurrentView("info");
							setSelectedPatient(null);
							return;
						}
					}

					// Check if user is admin
					const isAdmin = await checkIsAdmin(session.user.id);
					setIsAdminUser(isAdmin);
					if (isAdmin) {
						console.log("App: Admin user detected, redirecting to admin panel");
						setCurrentView("admin");
					} else {
						console.log("App: Regular user, switching to list view");
						setCurrentView("list");
					}
				} else {
					console.log("App: No session, showing info page");
					setUserId(undefined);
					setIsAdminUser(false);
					setCurrentView("info");
					setSelectedPatient(null);
				}
			}, 0);
		});

		return () => {
			isMounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const handleLogin = () => {
		setCurrentView("list");
	};

	const handleLogout = async () => {
		// Clear encryption password on logout
		const { EncryptionService } = await import("./services/encryptionService");
		EncryptionService.clearPassword();

		await supabase.auth.signOut();
		setIsAdminUser(false);
		setUserId(undefined);
		setCurrentView("info");
		setSelectedPatient(null);
	};

	const handleSelectPatient = (patient: Patient) => {
		setSelectedPatient(patient);
		setSelectedSession(null);
		setCurrentView("sessions");
	};

	const handleSelectSession = (session: ClinicalSession) => {
		setSelectedSession(session);
		setCurrentView("dashboard");
	};

	const handleNewSession = (date: string, time: string) => {
		setSelectedSession(null);
		setSelectedDate(date);
		setSelectedTime(time);
		setCurrentView("dashboard");
	};

	const handleBackToList = () => {
		setCurrentView("list");
		setSelectedPatient(null);
		setSelectedSession(null);
	};

	const handleBackToSessions = () => {
		setCurrentView("sessions");
		setSelectedSession(null);
	};

	return (
		<ThemeContext.Provider value={{ mode: themeMode, toggleTheme }}>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<GlobalStyles
					styles={{
						":root": {
							"--color-terracotta": theme.palette.primary.main,
							"--color-dark-slate": theme.palette.secondary.main,
							"--color-cream": theme.palette.background.default,
							"--color-white": theme.palette.common.white,
							"--color-slate-hover":
								themeMode === "light" ?
									"rgba(61, 64, 91, 0.2)"
								:	"rgba(255, 255, 255, 0.1)",
							"--color-terracotta-hover":
								themeMode === "light" ?
									"rgba(224, 122, 95, 0.6)"
								:	"rgba(214, 104, 78, 0.6)",
						},
					}}
				/>
				<SessionProcessingProvider
					userId={userId}
					userSalt={userSalt}
					userPlan={planData?.plan_type}
				>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							height: "100vh",
							overflow: "hidden",
						}}
					>
						<Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
							{currentView === "login" && (
								<Login
									onLogin={handleLogin}
									onNavigateToInfo={() => setCurrentView("info")}
								/>
							)}
							{currentView === "list" && (
								<PatientsList
									onSelectPatient={handleSelectPatient}
									onLogout={handleLogout}
									onNavigateToAdmin={() => setCurrentView("admin")}
									userId={userId}
									isAdmin={isAdminUser}
								/>
							)}
							{currentView === "sessions" && selectedPatient && (
								<SessionsList
									patient={selectedPatient}
									onSelectSession={handleSelectSession}
									onNewSession={handleNewSession}
									onBack={handleBackToList}
									onLogout={handleLogout}
									onNavigateToAdmin={() => setCurrentView("admin")}
									userId={userId}
									isAdmin={isAdminUser}
								/>
							)}
							{currentView === "dashboard" && (
								<Dashboard
									onLogout={handleLogout}
									patient={selectedPatient}
									initialSession={selectedSession}
									initialDate={selectedDate}
									initialTime={selectedTime}
									onBack={handleBackToSessions}
									userId={userId}
									isAdmin={isAdminUser}
									onNavigateToAdmin={() => setCurrentView("admin")}
								/>
							)}
							{currentView === "admin" && (
								<AdminDashboard
									onLogout={handleLogout}
									userId={userId}
									onBack={() => setCurrentView("list")}
								/>
							)}
							{currentView === "info" && (
								<InfoPage onNavigateToLogin={() => setCurrentView("login")} />
							)}
						</Box>
					</Box>
				</SessionProcessingProvider>
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}

export default App;
