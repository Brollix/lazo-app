import * as bip39 from "bip39";
import crypto from "crypto";

/**
 * RecoveryPhraseService
 *
 * Handles recovery phrase generation and master key encryption/decryption
 * Uses BIP39 standard for 12-word mnemonic phrases
 * Implements zero-knowledge architecture - server never sees plaintext keys
 */

export interface MasterKeyEncrypted {
	password: string; // Master key encrypted with password
	phrase: string; // Master key encrypted with recovery phrase
}

export class RecoveryPhraseService {
	/**
	 * Generate a 12-word BIP39 mnemonic phrase
	 * Uses 128 bits of entropy (12 words)
	 */
	static generateRecoveryPhrase(): string {
		const mnemonic = bip39.generateMnemonic(128); // 12 words
		return mnemonic;
	}

	/**
	 * Validate a BIP39 mnemonic phrase
	 */
	static validateRecoveryPhrase(phrase: string): boolean {
		return bip39.validateMnemonic(phrase);
	}

	/**
	 * Generate a random 256-bit master key
	 * This key will be used to encrypt all user data
	 */
	static generateMasterKey(): string {
		const masterKey = crypto.randomBytes(32); // 256 bits
		return masterKey.toString("base64");
	}

	/**
	 * Encrypt master key with password using PBKDF2 + AES-256-GCM
	 * @param masterKey - Base64-encoded master key
	 * @param password - User's password
	 * @param salt - Base64-encoded salt from user profile
	 */
	static encryptMasterKeyWithPassword(
		masterKey: string,
		password: string,
		salt: string,
	): string {
		// Derive key from password using PBKDF2
		const saltBuffer = Buffer.from(salt, "base64");
		const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, "sha256");

		// Generate random IV for AES-GCM
		const iv = crypto.randomBytes(12);

		// Encrypt master key
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
		const encrypted = Buffer.concat([
			cipher.update(masterKey, "utf8"),
			cipher.final(),
		]);

		// Get auth tag
		const authTag = cipher.getAuthTag();

		// Combine IV + encrypted + authTag
		const combined = Buffer.concat([iv, encrypted, authTag]);

		return combined.toString("base64");
	}

	/**
	 * Encrypt master key with recovery phrase using PBKDF2 + AES-256-GCM
	 * @param masterKey - Base64-encoded master key
	 * @param phrase - 12-word recovery phrase
	 */
	static encryptMasterKeyWithPhrase(masterKey: string, phrase: string): string {
		// Validate phrase first
		if (!this.validateRecoveryPhrase(phrase)) {
			throw new Error("Invalid recovery phrase");
		}

		// Derive key from phrase using PBKDF2
		// Use phrase itself as salt (deterministic)
		const key = crypto.pbkdf2Sync(phrase, phrase, 100000, 32, "sha256");

		// Generate random IV for AES-GCM
		const iv = crypto.randomBytes(12);

		// Encrypt master key
		const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
		const encrypted = Buffer.concat([
			cipher.update(masterKey, "utf8"),
			cipher.final(),
		]);

		// Get auth tag
		const authTag = cipher.getAuthTag();

		// Combine IV + encrypted + authTag
		const combined = Buffer.concat([iv, encrypted, authTag]);

		return combined.toString("base64");
	}

	/**
	 * Decrypt master key with password
	 * @param encrypted - Base64-encoded encrypted master key
	 * @param password - User's password
	 * @param salt - Base64-encoded salt from user profile
	 */
	static decryptMasterKeyWithPassword(
		encrypted: string,
		password: string,
		salt: string,
	): string {
		try {
			// Derive key from password
			const saltBuffer = Buffer.from(salt, "base64");
			const key = crypto.pbkdf2Sync(password, saltBuffer, 100000, 32, "sha256");

			// Decode encrypted data
			const combined = Buffer.from(encrypted, "base64");

			// Extract IV (12 bytes), encrypted data, and auth tag (16 bytes)
			const iv = combined.subarray(0, 12);
			const authTag = combined.subarray(combined.length - 16);
			const encryptedData = combined.subarray(12, combined.length - 16);

			// Decrypt
			const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
			decipher.setAuthTag(authTag);

			const decrypted = Buffer.concat([
				decipher.update(encryptedData),
				decipher.final(),
			]);

			return decrypted.toString("utf8");
		} catch (error) {
			throw new Error(
				"Failed to decrypt master key with password. Password may be incorrect.",
			);
		}
	}

	/**
	 * Decrypt master key with recovery phrase
	 * @param encrypted - Base64-encoded encrypted master key
	 * @param phrase - 12-word recovery phrase
	 */
	static decryptMasterKeyWithPhrase(encrypted: string, phrase: string): string {
		try {
			// Validate phrase first
			if (!this.validateRecoveryPhrase(phrase)) {
				throw new Error("Invalid recovery phrase format");
			}

			// Derive key from phrase
			const key = crypto.pbkdf2Sync(phrase, phrase, 100000, 32, "sha256");

			// Decode encrypted data
			const combined = Buffer.from(encrypted, "base64");

			// Extract IV (12 bytes), encrypted data, and auth tag (16 bytes)
			const iv = combined.subarray(0, 12);
			const authTag = combined.subarray(combined.length - 16);
			const encryptedData = combined.subarray(12, combined.length - 16);

			// Decrypt
			const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
			decipher.setAuthTag(authTag);

			const decrypted = Buffer.concat([
				decipher.update(encryptedData),
				decipher.final(),
			]);

			return decrypted.toString("utf8");
		} catch (error) {
			throw new Error(
				"Failed to decrypt master key with recovery phrase. Phrase may be incorrect.",
			);
		}
	}

	/**
	 * Hash recovery phrase for storage (SHA-256)
	 * We store the hash to verify phrases without storing the actual phrase
	 */
	static hashRecoveryPhrase(phrase: string): string {
		return crypto.createHash("sha256").update(phrase).digest("hex");
	}

	/**
	 * Verify recovery phrase against stored hash
	 */
	static verifyRecoveryPhrase(phrase: string, hash: string): boolean {
		const computedHash = this.hashRecoveryPhrase(phrase);
		return computedHash === hash;
	}

	/**
	 * Create complete master key encryption object
	 * Encrypts master key with both password and recovery phrase
	 */
	static createMasterKeyEncryption(
		masterKey: string,
		password: string,
		salt: string,
		recoveryPhrase: string,
	): MasterKeyEncrypted {
		return {
			password: this.encryptMasterKeyWithPassword(masterKey, password, salt),
			phrase: this.encryptMasterKeyWithPhrase(masterKey, recoveryPhrase),
		};
	}
}
