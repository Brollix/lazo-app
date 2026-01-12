import { useState, useEffect, createContext, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { createAppTheme } from "./theme";
import { Login } from "./components/Login";
import { Dashboard, ClinicalSession } from "./components/Dashboard";
import { PatientsList, Patient } from "./components/PatientsList";
import { SessionsList } from "./components/SessionsList";
import { supabase } from "./supabaseClient";

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
		"login" | "list" | "sessions" | "dashboard"
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
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log(
				"App: onAuthStateChange event:",
				event,
				"session user:",
				session?.user?.id
			);

			if (!isMounted) return;

			if (session) {
				console.log("App: Session found, switching to list view");
				setUserId(session.user.id);
				setCurrentView("list");
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
							/>
						)}
						{currentView === "sessions" && selectedPatient && (
							<SessionsList
								patient={selectedPatient}
								onSelectSession={handleSelectSession}
								onNewSession={handleNewSession}
								onBack={handleBackToList}
								onLogout={handleLogout}
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
							/>
						)}
					</Box>
				</Box>
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}

export default App;
