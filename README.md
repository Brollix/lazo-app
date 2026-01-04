# Lazo App

Este es un repositorio privado para la aplicación **Lazo**.

## Descripción General

Lazo es una aplicación compuesta por un cliente de escritorio y un servidor backend. El proyecto está estructurado como un monorepo utilizando **npm workspaces**.

### Componentes

1.  **lazo-client**: Aplicación de escritorio construida con Electron, React y Vite.
2.  **lazo-server**: Servidor backend construido con Node.js y Express.

## Tecnologías Principales

**Cliente:**

- Electron
- React + Vite
- TypeScript
- Material UI
- Supabase Client
- Wavesurfer.js (Procesamiento de audio)
- SQLite (better-sqlite3)

**Servidor:**

- Node.js + Express
- TypeScript
- Supabase
- Anthropic AI SDK
- AWS SDK (Transcribe)

## Configuración e Instalación

1.  **Instalar dependencias:**
    Desde la raíz del proyecto, ejecuta:
    ```bash
    npm install
    ```
    Esto instalará las dependencias tanto para el cliente como para el servidor.

## Ejecución

El `package.json` raíz contiene scripts para facilitar la ejecución de ambos entornos.

- **Para correr el Cliente (Modo Desarrollo):**

  ```bash
  npm run dev:client
  ```

- **Para correr el Servidor (Modo Desarrollo):**
  ```bash
  npm run dev:server
  ```

## Estructura del Proyecto

```
lazo-app/
├── lazo-client/      # Código fuente de la aplicación Electron/React
├── lazo-server/      # Código fuente del servidor Express
├── package.json      # Configuración del workspace
└── README.md
```
