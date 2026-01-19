/**
 * Recovery Phrase Utilities
 *
 * Implements BIP39-style recovery phrase generation for encryption key backup
 * Uses Spanish wordlist for better UX in Latin America
 */

// Spanish BIP39 wordlist (2048 words)
// Simplified version - in production use full BIP39 Spanish wordlist
const WORDLIST_ES = [
	"ábaco",
	"abdomen",
	"abeja",
	"abierto",
	"abogado",
	"abono",
	"aborto",
	"abrazo",
	"abrir",
	"abuelo",
	"abuso",
	"acabar",
	"academia",
	"acceso",
	"acción",
	"aceite",
	"acelga",
	"acento",
	"aceptar",
	"ácido",
	"aclarar",
	"acné",
	"acoger",
	"acoso",
	"activo",
	"acto",
	"actriz",
	"actuar",
	"acudir",
	"acuerdo",
	// ... Add full 2048 words in production
	"casa",
	"perro",
	"gato",
	"sol",
	"luna",
	"mar",
	"montaña",
	"río",
	"árbol",
	"flor",
	"cielo",
	"tierra",
	// Placeholder - replace with full wordlist
];

/**
 * Generates a 12-word recovery phrase
 * Each word is randomly selected from the Spanish BIP39 wordlist
 */
export const generateRecoveryPhrase = (): string[] => {
	const words: string[] = [];
	const randomBytes = new Uint8Array(16); // 128 bits of entropy

	// Generate cryptographically secure random bytes
	crypto.getRandomValues(randomBytes);

	// Convert bytes to word indices
	for (let i = 0; i < 12; i++) {
		// Use 11 bits per word (2^11 = 2048 possible words)
		const byteIndex = Math.floor((i * 11) / 8);
		const bitOffset = (i * 11) % 8;

		let wordIndex = 0;
		if (bitOffset <= 5) {
			// Word fits in current and next byte
			wordIndex =
				((randomBytes[byteIndex] << 8) | randomBytes[byteIndex + 1]) >>
				(5 - bitOffset);
		} else {
			// Word spans three bytes
			wordIndex =
				((randomBytes[byteIndex] << 16) |
					(randomBytes[byteIndex + 1] << 8) |
					randomBytes[byteIndex + 2]) >>
				(13 - bitOffset);
		}

		wordIndex = wordIndex & 0x7ff; // Mask to 11 bits (0-2047)
		words.push(WORDLIST_ES[wordIndex % WORDLIST_ES.length]);
	}

	return words;
};

/**
 * Converts recovery phrase to a deterministic salt
 * This salt is used to derive the master encryption key
 */
export const phraseToSalt = (phrase: string[]): string => {
	const joined = phrase.join(" ");
	const encoder = new TextEncoder();
	const bytes = encoder.encode(joined);

	// Convert to Base64 for storage
	return btoa(String.fromCharCode(...bytes));
};

/**
 * Converts salt back to recovery phrase
 */
export const saltToPhrase = (salt: string): string[] => {
	const bytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
	const decoder = new TextDecoder();
	const joined = decoder.decode(bytes);
	return joined.split(" ");
};

/**
 * Validates that a recovery phrase is correct
 */
export const validatePhrase = (phrase: string[]): boolean => {
	if (phrase.length !== 12) return false;

	// Check all words exist in wordlist
	return phrase.every((word) => WORDLIST_ES.includes(word.toLowerCase()));
};

/**
 * Downloads recovery phrase as a text file
 */
export const downloadRecoveryPhrase = (phrase: string[], email: string) => {
	const date = new Date().toLocaleDateString("es-AR");
	const content = `
╔═══════════════════════════════════════════════════════════╗
║         FRASE DE RECUPERACIÓN - LAZO APP                  ║
╚═══════════════════════════════════════════════════════════╝

Usuario: ${email}
Fecha de generación: ${date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  ADVERTENCIA DE SEGURIDAD CRÍTICA

Esta frase de 12 palabras es la ÚNICA forma de recuperar tus datos
si olvidas tu contraseña. Guárdala con el mismo cuidado que guardarías
las llaves de tu consultorio.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TU FRASE DE RECUPERACIÓN (12 PALABRAS):

${phrase.map((word, i) => `  ${String(i + 1).padStart(2, " ")}. ${word}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INSTRUCCIONES DE SEGURIDAD:

✓ Guarda este archivo en un lugar seguro (USB cifrado, caja fuerte)
✓ Considera imprimirlo y guardarlo físicamente
✓ NUNCA lo compartas con nadie, ni siquiera con soporte técnico
✓ NUNCA lo guardes en la nube sin cifrar
✓ Si sospechas que fue comprometido, regenera una nueva frase

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 ¿QUÉ PROTEGE ESTA FRASE?

Esta frase protege TODOS tus datos médicos cifrados:
- Transcripciones de sesiones
- Análisis clínicos
- Resúmenes de pacientes
- Notas SOAP/DAP/BIRP

Sin esta frase Y sin tu contraseña, tus datos están completamente
inaccesibles, incluso para nosotros. Esto garantiza tu privacidad
total (Zero-Knowledge).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 ¿NECESITAS AYUDA?

Si tienes dudas sobre cómo guardar esta frase de forma segura,
consulta nuestra guía de seguridad en:
https://lazo.app/seguridad

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generado por Lazo App - Cifrado de Grado Médico
${new Date().toISOString()}
`;

	const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `lazo-recovery-phrase-${email.split("@")[0]}-${Date.now()}.txt`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Formats phrase for display (with word numbers)
 */
export const formatPhraseForDisplay = (phrase: string[]): string => {
	return phrase.map((word, i) => `${i + 1}. ${word}`).join("\n");
};

/**
 * Generates a master encryption key (256 bits)
 * This key is used to encrypt all user data
 */
export const generateMasterKey = (): Uint8Array => {
	const key = new Uint8Array(32); // 256 bits
	crypto.getRandomValues(key);
	return key;
};

/**
 * Converts master key to Base64 for storage
 */
export const masterKeyToBase64 = (key: Uint8Array): string => {
	return btoa(String.fromCharCode(...key));
};

/**
 * Converts Base64 back to master key
 */
export const base64ToMasterKey = (base64: string): Uint8Array => {
	return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};
