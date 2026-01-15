#!/usr/bin/env node

/**
 * Script de prueba para verificar la configuración del modo MercadoPago
 *
 * Uso:
 *   node test-mp-mode.js
 *
 * Este script verifica:
 * - Que las variables de entorno estén configuradas correctamente
 * - Que el modo test/producción esté activo según MP_MODE
 * - Que los tokens tengan el formato correcto
 */

require("dotenv").config();

console.log("\n🔍 Verificando configuración de MercadoPago...\n");

// Variables de entorno
const mpMode = (process.env.MP_MODE || "production").toLowerCase();
const isTestMode = mpMode === "test";
const testToken = process.env.MP_ACCESS_TOKEN_TEST;
const prodToken = process.env.MP_ACCESS_TOKEN;

// Mostrar modo actual
console.log(`📋 Modo configurado: ${isTestMode ? "🧪 TEST" : "🚀 PRODUCCIÓN"}`);
console.log(
	`   Variable MP_MODE: "${
		process.env.MP_MODE || "no definida (default: production)"
	}"\n`
);

// Verificar tokens
console.log("🔑 Tokens configurados:");

if (testToken) {
	const isValidTestToken = testToken.startsWith("TEST-");
	console.log(`   ✅ MP_ACCESS_TOKEN_TEST: ${testToken.substring(0, 20)}...`);
	if (!isValidTestToken) {
		console.log(
			`   ⚠️  ADVERTENCIA: El token de prueba NO empieza con "TEST-"`
		);
		console.log(
			`      Esto puede causar problemas. Verifica que sea el token correcto.`
		);
	}
} else {
	console.log(`   ❌ MP_ACCESS_TOKEN_TEST: no configurado`);
}

if (prodToken) {
	const hasTestPrefix = prodToken.startsWith("TEST-");
	console.log(`   ✅ MP_ACCESS_TOKEN: ${prodToken.substring(0, 20)}...`);
	if (hasTestPrefix) {
		console.log(
			`   ⚠️  ADVERTENCIA: El token de producción empieza con "TEST-"`
		);
		console.log(
			`      Esto indica que estás usando un token de prueba en producción.`
		);
	}
} else {
	console.log(`   ❌ MP_ACCESS_TOKEN: no configurado`);
}

console.log("");

// Verificar configuración actual
console.log("🎯 Token que se usará:");
if (isTestMode) {
	if (testToken) {
		console.log(`   ✅ Se usará MP_ACCESS_TOKEN_TEST (modo test activo)`);
		if (!testToken.startsWith("TEST-")) {
			console.log(`   ⚠️  ADVERTENCIA: El token no parece ser de prueba`);
		}
	} else {
		console.log(
			`   ❌ ERROR: Modo test activo pero MP_ACCESS_TOKEN_TEST no está configurado`
		);
		console.log(`      Configura MP_ACCESS_TOKEN_TEST en el archivo .env`);
	}
} else {
	if (prodToken) {
		console.log(`   ✅ Se usará MP_ACCESS_TOKEN (modo producción activo)`);
		if (prodToken.startsWith("TEST-")) {
			console.log(
				`   ⚠️  ADVERTENCIA: Estás usando un token de prueba en producción`
			);
		}
	} else {
		console.log(
			`   ❌ ERROR: Modo producción activo pero MP_ACCESS_TOKEN no está configurado`
		);
		console.log(`      Configura MP_ACCESS_TOKEN en el archivo .env`);
	}
}

console.log("");

// Verificar otras configuraciones importantes
console.log("🌐 Otras configuraciones:");
console.log(
	`   BACKEND_URL: ${process.env.BACKEND_URL || "❌ no configurado"}`
);
console.log(
	`   FRONTEND_URL: ${process.env.FRONTEND_URL || "❌ no configurado"}`
);
console.log(
	`   MP_WEBHOOK_SECRET: ${
		process.env.MP_WEBHOOK_SECRET
			? "✅ configurado"
			: "⚠️  no configurado (opcional)"
	}`
);

console.log("");

// Resumen y recomendaciones
console.log("📝 Resumen:");
const hasErrors = (isTestMode && !testToken) || (!isTestMode && !prodToken);
const hasWarnings =
	(testToken && !testToken.startsWith("TEST-")) ||
	(prodToken && prodToken.startsWith("TEST-"));

if (!hasErrors && !hasWarnings) {
	console.log("   ✅ Todo configurado correctamente");
	console.log("   ✅ Puedes iniciar el servidor con: npm run dev");
} else if (hasErrors) {
	console.log("   ❌ Hay errores de configuración que deben corregirse");
	console.log(
		"   📖 Consulta server/MERCADOPAGO_TEST_SETUP.md para más información"
	);
} else if (hasWarnings) {
	console.log("   ⚠️  Hay advertencias que deberías revisar");
	console.log(
		"   📖 Consulta server/MERCADOPAGO_TEST_SETUP.md para más información"
	);
}

console.log("");

// Instrucciones para cambiar de modo
console.log("💡 Para cambiar de modo:");
if (isTestMode) {
	console.log("   Para usar PRODUCCIÓN, cambia en .env:");
	console.log("   MP_MODE=production");
} else {
	console.log("   Para usar TEST, cambia en .env:");
	console.log("   MP_MODE=test");
}

console.log("\n✨ Verificación completada\n");
