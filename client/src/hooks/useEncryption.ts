/**
 * useEncryption Hook
 *
 * Provides secure client-side encryption using Web Crypto API
 * - PBKDF2 key derivation with 100,000 iterations
 * - AES-256-GCM authenticated encryption
 * - Random 16-byte salt per user
 * - Password stored in sessionStorage (cleared on logout)
 */

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
	 * Decrypt data using AES-256-GCM
	 * @param ciphertext - Base64-encoded ciphertext
	 * @param saltBase64 - User's salt from database
	 * @returns Decrypted data (parsed from JSON)
	 */
	const decrypt = async (
		ciphertext: string,
		saltBase64: string,
	): Promise<any> => {
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

			// Extract IV (first 12 bytes) and encrypted data
			const iv = combinedArray.slice(0, 12);
			const encryptedData = combinedArray.slice(12);

			// Decrypt
			const decryptedBuffer = await crypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: iv,
				},
				key,
				encryptedData,
			);

			// Parse JSON
			const decoder = new TextDecoder();
			const decryptedString = decoder.decode(decryptedBuffer);
			return JSON.parse(decryptedString);
		} catch (error: any) {
			console.error("Decryption error:", error);
			throw new Error(
				"Error al desencriptar los datos. La contraseña puede ser incorrecta o los datos están corruptos.",
			);
		}
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
	 * Check if encryption is set up (password exists)
	 */
	const isSetup = (): boolean => {
		return !!sessionStorage.getItem(PASSWORD_STORAGE_KEY);
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
	 * This is the new standard
	 */
	const encryptWithMasterKey = async (
		data: any,
		masterKey: string,
	): Promise<string> => {
		// Import master key
		const encoder = new TextEncoder();
		const keyMaterial = await crypto.subtle.importKey(
			"raw",
			Buffer.from(masterKey, "base64"),
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
				Buffer.from(masterKey, "base64"),
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
			console.error("Master key decryption error:", error);
			throw new Error("Failed to decrypt data with master key");
		}
	};

	return {
		generateSalt,
		deriveKey,
		encrypt,
		decrypt,
		setPassword,
		getPassword,
		clearPassword,
		setMasterKey,
		getMasterKey,
		encryptWithMasterKey,
		decryptWithMasterKey,
		isSetup,
	};
};
