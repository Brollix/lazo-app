import { app, BrowserWindow, ipcMain } from "electron";
// import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

// const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

import { initDatabase } from "./database";

import { initWatcher } from "./watcher";

let win: BrowserWindow | null;
let watcher: any;

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
			sandbox: false, // needed for some node integrations if we use them in preload, though contextIsolation is true by default
		},
	});

	// Init watcher
	try {
		watcher = initWatcher();
		console.log("Watcher initialized:", watcher ? "Yes" : "No");
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
