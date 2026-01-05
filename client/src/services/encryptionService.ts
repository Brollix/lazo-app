import CryptoJS from "crypto-js";

const KEY_STORAGE_NAME = "lazo_encryption_key";

export const EncryptionService = {
	// Encrypts data using AES
	encryptData: (data: any, key: string): string => {
		const jsonString = JSON.stringify(data);
		return CryptoJS.AES.encrypt(jsonString, key).toString();
	},

	// Decrypts data using AES
	decryptData: (cipherText: string, key: string): any => {
		const bytes = CryptoJS.AES.decrypt(cipherText, key);
		const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
		return JSON.parse(decryptedString);
	},

	// Temporarily stores the key in sessionStorage
	setKey: (key: string) => {
		sessionStorage.setItem(KEY_STORAGE_NAME, key);
	},

	// Retrieves the key from sessionStorage
	getKey: (): string | null => {
		return sessionStorage.getItem(KEY_STORAGE_NAME);
	},

	// Clears the key
	clearKey: () => {
		sessionStorage.removeItem(KEY_STORAGE_NAME);
	},
};
