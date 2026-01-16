import { useState, useEffect, createContext, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box, GlobalStyles } from "@mui/material";
import { createAppTheme } from "./theme";
import { Login } from "./components/Login";
import { Dashboard, ClinicalSession } from "./components/Dashboard";
import { PatientsList, Patient } from "./components/PatientsList";
import { SessionsList } from "./components/SessionsList";
import { AdminDashboard } from "./components/AdminDashboard";
import { supabase } from "./supabaseClient";

// Admin UUID - Only this user has access to admin panel
const ADMIN_UUID = "91501b61-418d-4767-9c8f-e85b3ab58432";

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
		"login" | "list" | "sessions" | "dashboard" | "admin"
	>("login");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [selectedSession, setSelectedSession] =
		useState<ClinicalSession | null>(null);
	const [selectedDate, setSelectedDate] = useState<string | undefined>(
		undefined
	);
	const [selectedTime, setSelectedTime] = useState<string | undefined>(
		undefined
	);
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		const savedMode = localStorage.getItem("themeMode");
		return savedMode === "dark" || savedMode === "light" ? savedMode : "light";
	});
	const [userId, setUserId] = useState<string | undefined>(undefined);

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
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			console.log(
				"App: onAuthStateChange event:",
				event,
				"session user:",
				session?.user?.id
			);

			if (!isMounted) return;

			if (session) {
				console.log("App: Session found, user ID:", session.user.id);
				setUserId(session.user.id);

				// Check if password is available for encryption
				// If session was restored but password is not in sessionStorage, redirect to login
				const { EncryptionService } = await import("./services/encryptionService");
				if (!EncryptionService.isSetup() && event === "INITIAL_SESSION") {
					console.log("App: Session restored but password not available, redirecting to login");
					// Clear session to force re-login
					await supabase.auth.signOut();
					setUserId(undefined);
					setCurrentView("login");
					setSelectedPatient(null);
					return;
				}

				// Check if user is admin
				if (session.user.id === ADMIN_UUID) {
					console.log("App: Admin user detected, redirecting to admin panel");
					setCurrentView("admin");
				} else {
					console.log("App: Regular user, switching to list view");
					setCurrentView("list");
				}
			} else {
				console.log("App: No session, showing login");
				setUserId(undefined);
				setCurrentView("login");
				setSelectedPatient(null);
			}
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
		setCurrentView("login");
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
								themeMode === "light"
									? "rgba(61, 64, 91, 0.2)"
									: "rgba(255, 255, 255, 0.1)",
							"--color-terracotta-hover":
								themeMode === "light"
									? "rgba(224, 122, 95, 0.6)"
									: "rgba(214, 104, 78, 0.6)",
						},
					}}
				/>
				<Box
					sx={{
						display: "flex",
						flexDirection: "column",
						height: "100vh",
						overflow: "hidden",
					}}
				>
					<Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
						{currentView === "login" && <Login onLogin={handleLogin} />}
						{currentView === "list" && (
							<PatientsList
								onSelectPatient={handleSelectPatient}
								onLogout={handleLogout}
								onNavigateToAdmin={() => setCurrentView("admin")}
								userId={userId}
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
					</Box>
				</Box>
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}

export default App;
