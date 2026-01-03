import { useState } from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { theme } from "./theme";
import TitleBar from "./components/TitleBar";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { PatientsList, Patient } from "./components/PatientsList";

function App() {
	const [currentView, setCurrentView] = useState<
		"login" | "list" | "dashboard"
	>("login");
	const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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
						/>
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
	);
}

export default App;
