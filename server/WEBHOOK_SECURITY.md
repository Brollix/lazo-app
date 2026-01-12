# Configuración de Webhook Secret de Mercado Pago

## ¿Qué es la Clave Secreta?

La **clave secreta** (webhook secret) es una medida de seguridad que Mercado Pago proporciona para validar que los webhooks realmente provienen de ellos y no de un atacante.

## Cómo Funciona

1. **Mercado Pago envía el webhook** con headers especiales:

   - `x-signature`: Contiene un hash firmado
   - `x-request-id`: ID único de la solicitud

2. **Tu servidor valida la firma**:
   - Crea un "manifest" con los datos del webhook
   - Calcula un HMAC SHA256 usando la clave secreta
   - Compara el hash calculado con el recibido
   - Si coinciden ✅ el webhook es legítimo
   - Si NO coinciden ❌ rechaza el webhook (posible ataque)

## Configuración Realizada

### 1. Clave Secreta Agregada

**Archivo**: `server/.env`

```env
MP_WEBHOOK_SECRET=56cf281fd863a19e6a9249a5eaf29068bdc86cadbf106462a4d95f8df733d91a
```

### 2. Validación Implementada

**Archivo**: `server/src/index.ts`

El webhook ahora valida automáticamente todas las solicitudes:

```typescript
// Extrae headers de seguridad
const xSignature = req.headers["x-signature"];
const xRequestId = req.headers["x-request-id"];

// Valida la firma
const manifest = `id:${data.id};request-id:${xRequestId};ts:${ts};`;
const hmac = crypto
	.createHmac("sha256", MP_WEBHOOK_SECRET)
	.update(manifest)
	.digest("hex");

if (hmac !== hash) {
	return res.status(401).json({ error: "Invalid signature" });
}
```

## Beneficios de Seguridad

✅ **Previene ataques**: Nadie puede enviar webhooks falsos a tu servidor
✅ **Verifica origen**: Confirma que el webhook viene de Mercado Pago
✅ **Protege datos**: Evita manipulación de pagos y suscripciones
✅ **Cumple estándares**: Implementa mejores prácticas de seguridad

## Testing

La validación es **automática** y **transparente**:

- ✅ Webhooks legítimos de Mercado Pago → Procesados normalmente
- ❌ Webhooks falsos o manipulados → Rechazados con error 401

## Logs

Verás en los logs del servidor:

```
[Webhook] Signature validated successfully  ← Webhook legítimo
[Webhook] Invalid signature - potential security threat  ← Posible ataque
```

## ¡Listo!

Tu webhook ahora está **protegido** y solo procesará notificaciones legítimas de Mercado Pago. No necesitas hacer nada más, la validación es automática.
