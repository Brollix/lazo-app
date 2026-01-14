import CryptoJS from "crypto-js";

const SALT_STORAGE_NAME = "lazo_encryption_salt";

/**
 * EncryptionService with Dynamic Key Generation
 *
 * Security Model:
 * - Encryption key = SHA256(userId + userSalt)
 * - Salt is stored in localStorage (persistent across sessions)
 * - Each user has a unique encryption key based on their ID + salt
 * - No static keys - everything is user-specific
 */
export const EncryptionService = {
	/**
	 * Sets the user's encryption salt (stored in localStorage)
	 */
	setSalt: (salt: string): void => {
		localStorage.setItem(SALT_STORAGE_NAME, salt);
	},

	/**
	 * Gets the user's encryption salt from localStorage
	 */
	getSalt: (): string | null => {
		return localStorage.getItem(SALT_STORAGE_NAME);
	},

	/**
	 * Clears the encryption salt (logout)
	 */
	clearSalt: (): void => {
		localStorage.removeItem(SALT_STORAGE_NAME);
	},

	/**
	 * Generates a dynamic encryption key from userId + salt
	 */
	generateKey: (userId: string): string => {
		const salt = EncryptionService.getSalt();
		if (!salt) {
			throw new Error(
				"Encryption salt not set. Please set up encryption first."
			);
		}
		// Generate key: SHA256(userId + salt)
		return CryptoJS.SHA256(userId + salt).toString();
	},

	/**
	 * Encrypts data using dynamic key (userId-based)
	 */
	encryptData: (data: any, userId: string): string => {
		// Auto-generate salt if not set (first-time use)
		if (!EncryptionService.getSalt()) {
			const newSalt = EncryptionService.generateRandomSalt();
			EncryptionService.setSalt(newSalt);
			console.log(
				"🔐 Encryption salt auto-generated and saved to localStorage"
			);
		}

		const key = EncryptionService.generateKey(userId);
		const jsonString = JSON.stringify(data);
		return CryptoJS.AES.encrypt(jsonString, key).toString();
	},

	/**
	 * Decrypts data using dynamic key (userId-based)
	 */
	decryptData: (cipherText: string, userId: string): any => {
		const key = EncryptionService.generateKey(userId);
		const bytes = CryptoJS.AES.decrypt(cipherText, key);
		const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
		return JSON.parse(decryptedString);
	},

	/**
	 * Generates a random salt for new users
	 */
	generateRandomSalt: (): string => {
		return CryptoJS.lib.WordArray.random(32).toString();
	},

	/**
	 * Checks if encryption is set up (salt exists)
	 */
	isSetup: (): boolean => {
		return !!EncryptionService.getSalt();
	},

	// Legacy methods for backward compatibility (deprecated)
	setKey: (key: string) => {
		console.warn(
			"EncryptionService.setKey is deprecated. Use setSalt instead."
		);
		sessionStorage.setItem("lazo_encryption_key", key);
	},

	getKey: (): string | null => {
		console.warn(
			"EncryptionService.getKey is deprecated. Use generateKey instead."
		);
		return sessionStorage.getItem("lazo_encryption_key");
	},

	clearKey: () => {
		console.warn(
			"EncryptionService.clearKey is deprecated. Use clearSalt instead."
		);
		sessionStorage.removeItem("lazo_encryption_key");
	},
};
