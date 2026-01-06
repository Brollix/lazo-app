import { useState, useEffect, createContext, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { createAppTheme } from "./theme";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { PatientsList, Patient } from "./components/PatientsList";
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
		"login" | "list" | "dashboard"
	>("login");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
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
		// Check active session
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				setCurrentView("list");
				setUserId(session.user.id);
			}
		});

		// Listen for auth changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (session) {
				setCurrentView("list");
				setUserId(session.user.id);
			} else {
				setCurrentView("login");
				setSelectedPatient(null);
				setUserId(undefined);
			}
		});

		return () => subscription.unsubscribe();
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
		setCurrentView("dashboard");
	};

	const handleBackToList = () => {
		setCurrentView("list");
		setSelectedPatient(null);
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
						{currentView === "dashboard" && (
							<Dashboard
								onLogout={handleLogout}
								patient={selectedPatient}
								onBack={handleBackToList}
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
