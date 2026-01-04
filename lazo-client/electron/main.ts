import { app, BrowserWindow, ipcMain, dialog } from "electron";
import Store from "electron-store";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

// const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define global __dirname and __filename for dependencies that might expect them
(globalThis as any).__dirname = __dirname;
(globalThis as any).__filename = __filename;

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.cjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, "public")
	: RENDERER_DIST;

import { initDatabase, addRecording, getRecordings } from "./database";

import { startWatcher, setOnFileDetected } from "./watcher";

const store = new Store();

let win: BrowserWindow | null;

// Initialize DB
try {
	initDatabase();
} catch (e) {
	console.error("Failed to init database", e);
}

function createWindow() {
	win = new BrowserWindow({
		title: "lazo",
		width: 1200,
		height: 800,
		minWidth: 800,
		minHeight: 600,
		frame: false, // Custom title bar
		autoHideMenuBar: true,
		backgroundColor: "#F4F1DE", // Match theme background
		// 	icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
		webPreferences: {
			preload: path.join(__dirname, "preload.cjs"),
			// sandbox: false, // needed for some node integrations if we use them in preload, though contextIsolation is true by default
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	// Set up watcher callback
	setOnFileDetected((filePath) => {
		console.log("New file detected in main:", filePath);
		addRecording(filePath);
		win?.webContents.send("file-detected", filePath);
	});

	// Init watcher with saved path or default
	const savedPath = store.get("watchPath") as string;
	const defaultPath = path.join(app.getPath("documents"), "Zoom");
	const watchPath = savedPath || defaultPath;

	try {
		console.log("Starting watcher on:", watchPath);
		startWatcher(watchPath);
	} catch (e) {
		console.error("Failed to init watcher", e);
	}

	win.webContents.on("did-finish-load", () => {
		// Window loaded
	});

	if (VITE_DEV_SERVER_URL) {
		win.loadURL(VITE_DEV_SERVER_URL);
	} else {
		// win.loadFile('dist/index.html')
		win.loadFile(path.join(RENDERER_DIST, "index.html"));
	}
}

// IPC Handlers for Custom Title Bar
ipcMain.on("window-minimize", () => win?.minimize());
ipcMain.on("window-maximize", () => {
	if (win?.isMaximized()) {
		win.unmaximize();
	} else {
		win?.maximize();
	}
});
ipcMain.on("window-close", () => win?.close());

// Watcher IPC
ipcMain.handle("select-folder", async () => {
	if (!win) return null;
	const result = await dialog.showOpenDialog(win, {
		properties: ["openDirectory"],
	});
	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}
	const selectedPath = result.filePaths[0];
	store.set("watchPath", selectedPath);
	startWatcher(selectedPath);
	return selectedPath;
});

ipcMain.handle("get-watch-path", () => {
	return store.get("watchPath") || path.join(app.getPath("documents"), "Zoom");
});

ipcMain.handle("get-recordings", () => {
	return getRecordings();
});

ipcMain.handle("get-audio-duration", async (_event, filePath) => {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filePath, (err, metadata) => {
			if (err) return reject(err);
			resolve(metadata.format.duration);
		});
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.whenReady().then(createWindow);
