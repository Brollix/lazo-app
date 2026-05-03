import { useMemo } from "react";
import { EncryptionService } from "../services/encryptionService";
import { supabase } from "../supabaseClient";

const PASSWORD_STORAGE_KEY = "lazo_encryption_password";
const MASTER_KEY_STORAGE_KEY = "lazo_master_key";

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
};

export const useEncryption = () => {
	/**
	 * Generate a random 16-byte salt for PBKDF2
	 * Returns Base64-encoded salt
	 */
	const generateSalt = (): string => {
		const saltBuffer = crypto.getRandomValues(new Uint8Array(16));
		return arrayBufferToBase64(saltBuffer.buffer);
	};

	/**
	 * Derive an AES-256 key from password and salt using PBKDF2
	 * @param password - User's password
	 * @param saltBase64 - Base64-encoded salt
	 * @returns CryptoKey for AES-256-GCM
	 */
	const deriveKey = async (
		password: string,
		saltBase64: string,
	): Promise<CryptoKey> => {
		const encoder = new TextEncoder();
		const passwordBuffer = encoder.encode(password);
		const saltBuffer = base64ToArrayBuffer(saltBase64);

		// Import password as key material
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			passwordBuffer,
			{ name: "PBKDF2" },
			false,
			["deriveBits", "deriveKey"],
		);

		// Derive AES-256 key using PBKDF2 with 100,000 iterations
		const key = await crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: saltBuffer,
				iterations: 100000,
				hash: "SHA-256",
			},
			keyMaterial,
			{ name: "AES-GCM", length: 256 },
			false,
			["encrypt", "decrypt"],
		);

		return key;
	};

	/**
	 * Encrypt data using AES-256-GCM
	 * @param data - Data to encrypt (will be JSON stringified)
	 * @param saltBase64 - User's salt from database
	 * @returns Base64-encoded ciphertext (IV + encrypted data + auth tag)
	 */
	const encrypt = async (data: any, saltBase64: string): Promise<string> => {
		const password = sessionStorage.getItem(PASSWORD_STORAGE_KEY);
		if (!password) {
			throw new Error(
				"Contraseña de encriptación no disponible. Por favor, inicia sesión nuevamente.",
			);
		}

		if (!saltBase64) {
			throw new Error("Salt de encriptación no disponible.");
		}

		// Derive encryption key
		const key = await deriveKey(password, saltBase64);

		// Generate random IV (12 bytes for GCM)
		const iv = crypto.getRandomValues(new Uint8Array(12));

		// Encrypt data
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(JSON.stringify(data));

		const encryptedBuffer = await crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			key,
			dataBuffer,
		);

		// Combine IV + encrypted data into single buffer
		const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(encryptedBuffer), iv.length);

		// Return as Base64
		return arrayBufferToBase64(combined.buffer);
	};

	/**
	 * Decrypt raw string using AES-256-GCM (for master key decryption)
	 * @param ciphertext - Base64-encoded ciphertext
	 * @param saltBase64 - User's salt from database
	 * @returns Decrypted string (NOT parsed as JSON)
	 */
	const decryptRaw = async (
		ciphertext: string,
		saltBase64: string,
	): Promise<string> => {
		const password = sessionStorage.getItem(PASSWORD_STORAGE_KEY);
		if (!password) {
			throw new Error(
				"Contraseña de encriptación no disponible. Por favor, inicia sesión nuevamente.",
			);
		}

		if (!saltBase64) {
			throw new Error("Salt de encriptación no disponible.");
		}

		if (!ciphertext || ciphertext.length === 0) {
			throw new Error("No hay datos para desencriptar.");
		}

		try {
			// Derive decryption key
			const key = await deriveKey(password, saltBase64);

			// Decode from Base64
			const combined = base64ToArrayBuffer(ciphertext);
			const combinedArray = new Uint8Array(combined);

			// Extract IV (first 12 bytes) and encrypted data (rest includes authTag)
			// AES-GCM authTag is automatically handled by the browser's crypto.subtle
			const iv = combinedArray.slice(0, 12);
			const encryptedData = combinedArray.slice(12);

			// Decrypt (authTag is automatically verified by AES-GCM)
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: iv,
				},
				key,
				encryptedData,
			);

			// Return as string (NO JSON parsing)
			const decoder = new TextDecoder();
			return decoder.decode(decryptedBuffer);
		} catch (error: any) {
			console.error("Raw decryption error:", error);
			throw new Error(
				"Error al desencriptar los datos. La contraseña puede ser incorrecta o los datos están corruptos.",
			);
		}
	};

	/**
	 * Decrypt data using AES-256-GCM
	 * @param ciphertext - Base64-encoded ciphertext
	 * @param saltBase64 - User's salt from database
	 * @returns Decrypted data (parsed from JSON)
	 */
	const decrypt = async (
		ciphertext: string,
		saltBase64: string,
	): Promise<any> => {
		const decryptedString = await decryptRaw(ciphertext, saltBase64);
		return JSON.parse(decryptedString);
	};

	/**
	 * Store password in sessionStorage
	 */
	const setPassword = (password: string): void => {
		sessionStorage.setItem(PASSWORD_STORAGE_KEY, password);
	};

	/**
	 * Get password from sessionStorage
	 */
	const getPassword = (): string | null => {
		return sessionStorage.getItem(PASSWORD_STORAGE_KEY);
	};

	/**
	 * Clear password from sessionStorage (on logout)
	 */
	const clearPassword = (): void => {
		sessionStorage.removeItem(PASSWORD_STORAGE_KEY);
		sessionStorage.removeItem(MASTER_KEY_STORAGE_KEY);
	};

	/**
	 * Check if encryption is set up (password or master key exists)
	 */
	const isSetup = (): boolean => {
		return !!(sessionStorage.getItem(PASSWORD_STORAGE_KEY) || sessionStorage.getItem(MASTER_KEY_STORAGE_KEY));
	};

	/**
	 * Set master key in sessionStorage
	 */
	const setMasterKey = (masterKey: string): void => {
		sessionStorage.setItem(MASTER_KEY_STORAGE_KEY, masterKey);
	};

	/**
	 * Get master key from sessionStorage
	 */
	const getMasterKey = (): string | null => {
		return sessionStorage.getItem(MASTER_KEY_STORAGE_KEY);
	};

	/**
	 * Encrypt data using AES-256-GCM with MASTER KEY
	 * This is the current standard
	 */
	const encryptWithMasterKey = async (
		data: any,
		masterKey: string,
	): Promise<string> => {
		// Import master key
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			base64ToArrayBuffer(masterKey),
			{ name: "AES-GCM" },
			false,
			["encrypt", "decrypt"],
		);

		// Generate random IV
		const iv = crypto.getRandomValues(new Uint8Array(12));

		// Encrypt
		const dataBuffer = encoder.encode(JSON.stringify(data));
		const encryptedBuffer = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv: iv },
			keyMaterial,
			dataBuffer,
		);

		// Combine IV + encrypted
		const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
		combined.set(iv, 0);
		combined.set(new Uint8Array(encryptedBuffer), iv.length);

		return arrayBufferToBase64(combined.buffer);
	};

	/**
	 * Decrypt data using AES-256-GCM with MASTER KEY
	 */
	const decryptWithMasterKey = async (
		ciphertext: string,
		masterKey: string,
	): Promise<any> => {
		if (!ciphertext) return null;

		try {
			// Import key
			const keyMaterial = await crypto.subtle.importKey(
				"raw",
				base64ToArrayBuffer(masterKey),
				{ name: "AES-GCM" },
				false,
				["encrypt", "decrypt"],
			);

			// Decode from Base64
			const combined = base64ToArrayBuffer(ciphertext);
			const combinedArray = new Uint8Array(combined);

			const iv = combinedArray.slice(0, 12);
			const encryptedData = combinedArray.slice(12);

			// Decrypt
			const decryptedBuffer = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv: iv },
				keyMaterial,
				encryptedData,
			);

			const decoder = new TextDecoder();
			return JSON.parse(decoder.decode(decryptedBuffer));
		} catch (error) {
			// Don't log error here as it might be an expected failure during fallback
			throw new Error("Failed to decrypt data with master key");
		}
	};

	/**
	 * Decrypt data using multiple fallback strategies
	 */
	const decryptWithFallback = async (
		ciphertext: string,
		saltBase64: string,
		userId: string,
	): Promise<any> => {
		if (!ciphertext) return null;

		const errors: string[] = [];

		// 1. Try Master Key (current standard)
		const masterKey = getMasterKey();
		if (masterKey) {
			try {
				const result = await decryptWithMasterKey(ciphertext, masterKey);
				console.log("✓ Decrypted with Master Key");
				return result;
			} catch (e: any) {
				errors.push(`Master Key: ${e.message}`);
			}
		}

		// 2. Try PBKDF2/AES-GCM (previous system)
		if (saltBase64) {
			try {
				const result = await decrypt(ciphertext, saltBase64);
				console.log("✓ Decrypted with PBKDF2");
				return result;
			} catch (e: any) {
				errors.push(`PBKDF2: ${e.message}`);
			}
		}

		// 3. Try CryptoJS (absolute legacy system)
		try {
			const result = EncryptionService.decryptData(ciphertext, userId);
			console.log("✓ Decrypted with CryptoJS");
			return result;
		} catch (e: any) {
			errors.push(`CryptoJS: ${e.message}`);
		}

		console.error("All decryption attempts failed:", errors);
		throw new Error("No se pudo desencriptar el registro con ningún método.");
	};

	/**
	 * Encrypt data using the currently active standard (Master Key preferred)
	 */
	const encryptWithCurrentStandard = async (
		data: any,
		saltBase64: string,
	): Promise<string> => {
		const masterKey = getMasterKey();
		if (masterKey) {
			return await encryptWithMasterKey(data, masterKey);
		}
		// Fallback to PBKDF2 if no master key (though it should be migration time)
		return await encrypt(data, saltBase64);
	};

	/**
	 * Bulk re-encryption of all user data
	 * Used during passphrase regeneration
	 */
	const reEncryptAllUserData = async (
		newMasterKey: string,
		saltBase64: string,
		userId: string,
		onProgress?: (current: number, total: number) => void,
	) => {
		// 1. Fetch all patients
		const { data: patients, error: pError } = await supabase
			.from("patients")
			.select("*")
			.eq("user_id", userId);

		if (pError) throw pError;

		// 2. Fetch all sessions
		const { data: sessions, error: sError } = await supabase
			.from("sessions")
			.select("*")
			.eq("user_id", userId);

		if (sError) throw sError;

		const total = (patients?.length || 0) + (sessions?.length || 0);
		let current = 0;

		// 3. Re-encrypt patients
		if (patients) {
			for (const p of patients) {
				try {
					const decrypted = await decryptWithFallback(
						p.encrypted_data,
						saltBase64,
						userId,
					);
					const reEncrypted = await encryptWithMasterKey(
						decrypted,
						newMasterKey,
					);
					await supabase
						.from("patients")
						.update({ encrypted_data: reEncrypted })
						.eq("id", p.id);
				} catch (e) {
					console.error(`Failed to re-encrypt patient ${p.id}:`, e);
				}
				current++;
				onProgress?.(current, total);
			}
		}

		// 4. Re-encrypt sessions
		if (sessions) {
			for (const s of sessions) {
				try {
					const decrypted = await decryptWithFallback(
						s.encrypted_data,
						saltBase64,
						userId,
					);
					const reEncrypted = await encryptWithMasterKey(
						decrypted,
						newMasterKey,
					);
					await supabase
						.from("sessions")
						.update({ encrypted_data: reEncrypted })
						.eq("id", s.id);
				} catch (e) {
					console.error(`Failed to re-encrypt session ${s.id}:`, e);
				}
				current++;
				onProgress?.(current, total);
			}
		}
	};

	return useMemo(
		() => ({
			generateSalt,
			deriveKey,
			encrypt,
			decrypt,
			decryptRaw,
			setPassword,
			getPassword,
			clearPassword,
			setMasterKey,
			getMasterKey,
			encryptWithMasterKey,
			decryptWithMasterKey,
			decryptWithFallback,
			encryptWithCurrentStandard,
			reEncryptAllUserData,
			isSetup,
		}),
		[],
	);
};
