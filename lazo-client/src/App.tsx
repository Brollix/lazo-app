import { useState, useEffect, createContext, useMemo } from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { createAppTheme } from "./theme";
import TitleBar from "./components/TitleBar";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { RecordingsHistory } from "./components/RecordingsHistory";
import { PatientsList, Patient } from "./components/PatientsList";

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
		"login" | "list" | "dashboard" | "recordings"
	>("login");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
	const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
		const savedMode = localStorage.getItem("themeMode");
		return savedMode === "dark" || savedMode === "light" ? savedMode : "light";
	});

	const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

	const toggleTheme = () => {
		setThemeMode((prevMode) => {
			const newMode = prevMode === "light" ? "dark" : "light";
			localStorage.setItem("themeMode", newMode);
			return newMode;
		});
	};

	useEffect(() => {
		const handleFileDetected = (_event: unknown, filePath: string) => {
			console.log("New file detected:", filePath);
			if (Notification.permission === "granted") {
				new Notification("Nueva grabación detectada", {
					body: `Lazo procesará: ${filePath.split(/[\\/]/).pop()}`,
				});
			} else if (Notification.permission !== "denied") {
				Notification.requestPermission().then((permission) => {
					if (permission === "granted") {
						new Notification("Nueva grabación detectada", {
							body: `Lazo procesará: ${filePath.split(/[\\/]/).pop()}`,
						});
					}
				});
			}
		};

		window.ipcRenderer?.on("file-detected", handleFileDetected);

		return () => {
			window.ipcRenderer?.off("file-detected", handleFileDetected);
		};
	}, []);

	const handleLogin = () => {
		setCurrentView("list");
	};

	const handleLogout = () => {
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
					<TitleBar />
					<Box sx={{ flex: 1, overflow: "auto", position: "relative" }}>
						{currentView === "login" && <Login onLogin={handleLogin} />}
						{currentView === "list" && (
							<PatientsList
								onSelectPatient={handleSelectPatient}
								onLogout={handleLogout}
								onOpenHistory={() => setCurrentView("recordings")}
							/>
						)}
						{currentView === "recordings" && (
							<RecordingsHistory onBack={() => setCurrentView("list")} />
						)}
						{currentView === "dashboard" && (
							<Dashboard
								onLogout={handleLogout}
								patient={selectedPatient}
								onBack={handleBackToList}
							/>
						)}
					</Box>
				</Box>
			</ThemeProvider>
		</ThemeContext.Provider>
	);
}

export default App;
