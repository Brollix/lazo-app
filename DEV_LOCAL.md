# Desarrollo Local - Lazo App

## Script de Desarrollo Local

Para correr tanto el cliente como el servidor en modo desarrollo simultáneamente y que el cliente apunte al servidor local:

```bash
npm run dev
```

Este comando:

- ✅ Inicia el servidor en `http://localhost:3000`
- ✅ Inicia el cliente en `http://localhost:5173`
- ✅ Configura el cliente para que las peticiones `/api/*` se dirijan al servidor local en lugar del servidor de producción

## Scripts Disponibles

### Desarrollo

- `npm run dev` - Corre cliente y servidor simultáneamente (para testing local)
- `npm run dev:client` - Solo el cliente (apunta a producción por defecto)
- `npm run dev:client:local` - Solo el cliente (apunta a localhost:3000)
- `npm run dev:server` - Solo el servidor

### Producción

- `npm run build:client` - Construye el cliente para producción
- `npm run build:server` - Construye el servidor para producción

## Cómo Funciona

El script `npm run dev` usa:

- **concurrently**: Para ejecutar múltiples comandos en paralelo
- **cross-env**: Para configurar variables de entorno de forma compatible con Windows

La variable `API_PROXY_TARGET=http://localhost:3000` le indica a Vite (en `client/vite.config.ts`) que redirija todas las peticiones a `/api/*` al servidor local en lugar del servidor de producción.

## Notas

- El servidor debe estar corriendo en el puerto 3000 (configurado en `server/src/index.ts`)
- El cliente se abrirá automáticamente en `http://localhost:5173`
- Ambos servicios se recargarán automáticamente al detectar cambios en el código
