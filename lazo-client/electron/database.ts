import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";

export function initDatabase() {
	const userDataPath = app.getPath("userData");
	const dbPath = path.join(userDataPath, "lazo.db");

	const db = new Database(dbPath);

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
  `);

	console.log("Database initialized at", dbPath);
	return db;
}
