import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";

let db: Database.Database | null = null;

export function initDatabase() {
	const userDataPath = app.getPath("userData");
	const dbPath = path.join(userDataPath, "lazo.db");

	db = new Database(dbPath);

	// Create tables if not exist
	db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      audio_path TEXT,
      transcript TEXT,
      soap_notes TEXT,
      FOREIGN KEY(patient_id) REFERENCES patients(id)
    );
    
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'new', -- new, processed, archived
      duration INTEGER DEFAULT 0
    );
  `);

	console.log("Database initialized at", dbPath);
	return db;
}

export function getDb() {
	if (!db) {
		throw new Error("Database not initialized");
	}
	return db;
}

export function addRecording(filePath: string) {
	if (!db) return;
	const filename = path.basename(filePath);
	try {
		const stmt = db.prepare(
			"INSERT INTO recordings (file_path, filename) VALUES (?, ?)"
		);
		stmt.run(filePath, filename);
		console.log(`Recording added to DB: ${filename}`);
	} catch (error: any) {
		if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
			console.log(`Recording already exists in DB: ${filename}`);
		} else {
			console.error("Error adding recording to DB:", error);
		}
	}
}

export function getRecordings() {
	if (!db) return [];
	try {
		const stmt = db.prepare(
			"SELECT * FROM recordings ORDER BY detected_at DESC"
		);
		return stmt.all();
	} catch (error) {
		console.error("Error fetching recordings:", error);
		return [];
	}
}
