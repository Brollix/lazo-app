import CryptoJS from "crypto-js";

const PASSWORD_STORAGE_NAME = "lazo_encryption_password";

/**
 * EncryptionService using User Password Directly
 *
 * Security Model:
 * - Encryption key = SHA256(userId + password)
 * - Password is stored in sessionStorage (cleared on logout/close)
 * - Each user has a unique encryption key based on their ID + password
 * - No salt - uses password directly
 */
export const EncryptionService = {
	/**
	 * Sets the user's password for encryption (stored in sessionStorage)
	 */
	setPassword: (password: string): void => {
		sessionStorage.setItem(PASSWORD_STORAGE_NAME, password);
	},

	/**
	 * Gets the user's password from sessionStorage
	 */
	getPassword: (): string | null => {
		return sessionStorage.getItem(PASSWORD_STORAGE_NAME);
	},

	/**
	 * Clears the password (logout)
	 */
	clearPassword: (): void => {
		sessionStorage.removeItem(PASSWORD_STORAGE_NAME);
	},

	/**
	 * Generates a dynamic encryption key from userId + password
	 */
	generateKey: (userId: string): string => {
		const password = EncryptionService.getPassword();
		if (!password) {
			throw new Error(
				"Encryption password not set. Please log in again."
			);
		}
		// Generate key: SHA256(userId + password)
		return CryptoJS.SHA256(userId + password).toString();
	},

	/**
	 * Encrypts data using dynamic key (userId + password)
	 */
	encryptData: (data: any, userId: string): string => {
		const password = EncryptionService.getPassword();
		if (!password) {
			throw new Error(
				"Encryption password not set. Please log in again."
			);
		}

		if (!userId) {
			throw new Error("User ID is required for encryption.");
		}

		const key = EncryptionService.generateKey(userId);
		const jsonString = JSON.stringify(data);
		
		if (!jsonString) {
			throw new Error("Cannot encrypt empty data.");
		}
		
		const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
		
		if (!encrypted) {
			throw new Error("Encryption failed - no data returned.");
		}
		
		return encrypted;
	},

	/**
	 * Decrypts data using dynamic key (userId + password)
	 */
	decryptData: (cipherText: string, userId: string): any => {
		const password = EncryptionService.getPassword();
		if (!password) {
			throw new Error(
				"Encryption password not set. Please log in again."
			);
		}

		if (!userId) {
			throw new Error("User ID is required for decryption.");
		}

		if (!cipherText || cipherText.length === 0) {
			throw new Error("Cannot decrypt empty cipher text.");
		}

		const key = EncryptionService.generateKey(userId);
		const bytes = CryptoJS.AES.decrypt(cipherText, key);
		const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
		
		if (!decryptedString || decryptedString.length === 0) {
			// This could mean:
			// 1. Wrong password
			// 2. Data was encrypted with old system (salt-based)
			// 3. Corrupted data
			throw new Error("Failed to decrypt data. Data may have been encrypted with a different key or password may be incorrect.");
		}
		
		try {
			const parsed = JSON.parse(decryptedString);
			if (!parsed || typeof parsed !== 'object') {
				throw new Error("Decrypted data is not a valid object.");
			}
			return parsed;
		} catch (parseError: any) {
			throw new Error(`Failed to parse decrypted data: ${parseError.message}. Data may be corrupted or encrypted with a different system.`);
		}
	},

	/**
	 * Checks if encryption is set up (password exists)
	 */
	isSetup: (): boolean => {
		return !!EncryptionService.getPassword();
	},

	// Legacy methods for backward compatibility
	setSalt: (salt: string): void => {
		console.warn(
			"EncryptionService.setSalt is deprecated. Use setPassword instead."
		);
		EncryptionService.setPassword(salt);
	},

	getSalt: (): string | null => {
		console.warn(
			"EncryptionService.getSalt is deprecated. Use getPassword instead."
		);
		return EncryptionService.getPassword();
	},

	clearSalt: (): void => {
		console.warn(
			"EncryptionService.clearSalt is deprecated. Use clearPassword instead."
		);
		EncryptionService.clearPassword();
	},

	setKey: (key: string) => {
		console.warn(
			"EncryptionService.setKey is deprecated. Use setPassword instead."
		);
		EncryptionService.setPassword(key);
	},

	getKey: (): string | null => {
		console.warn(
			"EncryptionService.getKey is deprecated. Use getPassword instead."
		);
		return EncryptionService.getPassword();
	},

	clearKey: () => {
		console.warn(
			"EncryptionService.clearKey is deprecated. Use clearPassword instead."
		);
		EncryptionService.clearPassword();
	},
};
