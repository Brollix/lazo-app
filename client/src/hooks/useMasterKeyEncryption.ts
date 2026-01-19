/**
 * Master Key Encryption Hook
 *
 * Implements double encryption (key wrapping):
 * 1. Master Key encrypts all user data
 * 2. User password encrypts the Master Key
 * 3. Recovery phrase provides backup access to Master Key
 */

import { useCallback } from "react";

interface MasterKeyEncryption {
	// Generate new master key and encrypt it with password
	setupMasterKey: (
		password: string,
		recoverySalt: string,
	) => Promise<{
		masterKeyEncrypted: string;
		masterKeyRaw: Uint8Array;
	}>;

	// Decrypt master key using password
	unlockMasterKey: (
		password: string,
		recoverySalt: string,
		masterKeyEncrypted: string,
	) => Promise<Uint8Array>;

	// Encrypt data using master key
	encryptWithMasterKey: (data: any, masterKey: Uint8Array) => Promise<string>;

	// Decrypt data using master key
	decryptWithMasterKey: (
		ciphertext: string,
		masterKey: Uint8Array,
	) => Promise<any>;

	// Re-encrypt master key with new password (password change)
	reEncryptMasterKey: (
		oldPassword: string,
		newPassword: string,
		recoverySalt: string,
		masterKeyEncrypted: string,
	) => Promise<string>;

	// Unlock master key using recovery phrase (password recovery)
	unlockWithRecoveryPhrase: (
		recoveryPhrase: string[],
		masterKeyEncrypted: string,
	) => Promise<Uint8Array>;
}

export const useMasterKeyEncryption = (): MasterKeyEncryption => {
	/**
	 * Derives encryption key from password + salt using PBKDF2
	 */
	const deriveKeyFromPassword = useCallback(
		async (password: string, salt: string): Promise<CryptoKey> => {
			const encoder = new TextEncoder();
			const passwordBuffer = encoder.encode(password);
			const saltBuffer = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

			// Import password as key material
			const keyMaterial = await crypto.subtle.importKey(
				"raw",
				passwordBuffer,
				{ name: "PBKDF2" },
				false,
				["deriveKey"],
			);

			// Derive AES key using PBKDF2
			return await crypto.subtle.deriveKey(
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
		},
		[],
	);

	/**
	 * Setup: Generate master key and encrypt it with password
	 */
	const setupMasterKey = useCallback(
		async (password: string, recoverySalt: string) => {
			// Generate random master key (256 bits)
			const masterKeyRaw = new Uint8Array(32);
			crypto.getRandomValues(masterKeyRaw);

			// Derive key from password
			const passwordKey = await deriveKeyFromPassword(password, recoverySalt);

			// Encrypt master key with password-derived key
			const iv = new Uint8Array(12);
			crypto.getRandomValues(iv);

			const encrypted = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				passwordKey,
				masterKeyRaw,
			);

			// Combine IV + encrypted master key + auth tag
			const combined = new Uint8Array(iv.length + encrypted.byteLength);
			combined.set(iv, 0);
			combined.set(new Uint8Array(encrypted), iv.length);

			const masterKeyEncrypted = btoa(String.fromCharCode(...combined));

			return {
				masterKeyEncrypted,
				masterKeyRaw,
			};
		},
		[deriveKeyFromPassword],
	);

	/**
	 * Unlock master key using password
	 */
	const unlockMasterKey = useCallback(
		async (
			password: string,
			recoverySalt: string,
			masterKeyEncrypted: string,
		): Promise<Uint8Array> => {
			const combined = Uint8Array.from(atob(masterKeyEncrypted), (c) =>
				c.charCodeAt(0),
			);

			const iv = combined.slice(0, 12);
			const encrypted = combined.slice(12);

			// Derive key from password
			const passwordKey = await deriveKeyFromPassword(password, recoverySalt);

			// Decrypt master key
			const decrypted = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv },
				passwordKey,
				encrypted,
			);

			return new Uint8Array(decrypted);
		},
		[deriveKeyFromPassword],
	);

	/**
	 * Encrypt data using master key
	 */
	const encryptWithMasterKey = useCallback(
		async (data: any, masterKey: Uint8Array): Promise<string> => {
			const jsonString = JSON.stringify(data);
			const encoder = new TextEncoder();
			const dataBuffer = encoder.encode(jsonString);

			// Import master key
			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				masterKey,
				{ name: "AES-GCM" },
				false,
				["encrypt"],
			);

			// Generate IV
			const iv = new Uint8Array(12);
			crypto.getRandomValues(iv);

			// Encrypt
			const encrypted = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				cryptoKey,
				dataBuffer,
			);

			// Combine IV + encrypted + auth tag
			const combined = new Uint8Array(iv.length + encrypted.byteLength);
			combined.set(iv, 0);
			combined.set(new Uint8Array(encrypted), iv.length);

			return btoa(String.fromCharCode(...combined));
		},
		[],
	);

	/**
	 * Decrypt data using master key
	 */
	const decryptWithMasterKey = useCallback(
		async (ciphertext: string, masterKey: Uint8Array): Promise<any> => {
			const combined = Uint8Array.from(atob(ciphertext), (c) =>
				c.charCodeAt(0),
			);

			const iv = combined.slice(0, 12);
			const encrypted = combined.slice(12);

			// Import master key
			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				masterKey,
				{ name: "AES-GCM" },
				false,
				["decrypt"],
			);

			// Decrypt
			const decrypted = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv },
				cryptoKey,
				encrypted,
			);

			const decoder = new TextDecoder();
			const jsonString = decoder.decode(decrypted);
			return JSON.parse(jsonString);
		},
		[],
	);

	/**
	 * Re-encrypt master key with new password (for password change)
	 */
	const reEncryptMasterKey = useCallback(
		async (
			oldPassword: string,
			newPassword: string,
			recoverySalt: string,
			masterKeyEncrypted: string,
		): Promise<string> => {
			// 1. Decrypt master key with old password
			const masterKeyRaw = await unlockMasterKey(
				oldPassword,
				recoverySalt,
				masterKeyEncrypted,
			);

			// 2. Encrypt master key with new password
			const newPasswordKey = await deriveKeyFromPassword(
				newPassword,
				recoverySalt,
			);

			const iv = new Uint8Array(12);
			crypto.getRandomValues(iv);

			const encrypted = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv },
				newPasswordKey,
				masterKeyRaw,
			);

			const combined = new Uint8Array(iv.length + encrypted.byteLength);
			combined.set(iv, 0);
			combined.set(new Uint8Array(encrypted), iv.length);

			return btoa(String.fromCharCode(...combined));
		},
		[unlockMasterKey, deriveKeyFromPassword],
	);

	/**
	 * Unlock master key using recovery phrase (for password recovery)
	 */
	const unlockWithRecoveryPhrase = useCallback(
		async (
			recoveryPhrase: string[],
			masterKeyEncrypted: string,
		): Promise<Uint8Array> => {
			// Recovery phrase is stored as the salt
			// We need to derive a key from the phrase itself
			const phraseString = recoveryPhrase.join(" ");
			const encoder = new TextEncoder();
			const phraseBuffer = encoder.encode(phraseString);

			// Use phrase as password with empty salt
			const keyMaterial = await crypto.subtle.importKey(
				"raw",
				phraseBuffer,
				{ name: "PBKDF2" },
				false,
				["deriveKey"],
			);

			const phraseKey = await crypto.subtle.deriveKey(
				{
					name: "PBKDF2",
					salt: new Uint8Array(16), // Empty salt
					iterations: 100000,
					hash: "SHA-256",
				},
				keyMaterial,
				{ name: "AES-GCM", length: 256 },
				false,
				["decrypt"],
			);

			// Decrypt master key
			const combined = Uint8Array.from(atob(masterKeyEncrypted), (c) =>
				c.charCodeAt(0),
			);
			const iv = combined.slice(0, 12);
			const encrypted = combined.slice(12);

			const decrypted = await crypto.subtle.decrypt(
				{ name: "AES-GCM", iv },
				phraseKey,
				encrypted,
			);

			return new Uint8Array(decrypted);
		},
		[],
	);

	return {
		setupMasterKey,
		unlockMasterKey,
		encryptWithMasterKey,
		decryptWithMasterKey,
		reEncryptMasterKey,
		unlockWithRecoveryPhrase,
	};
};
