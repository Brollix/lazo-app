# Lazo App

Este es un repositorio privado para la aplicación **Lazo**.

## Descripción General

Lazo es una aplicación web compuesta por un cliente (frontend) y un servidor backend. El proyecto está estructurado como un monorepo utilizando **npm workspaces**.

### Componentes

1.  **client**: Aplicación web construida con React y Vite.
2.  **server**: Servidor backend construido con Node.js y Express.

## Tecnologías Principales

**Cliente:**

- React + Vite
- TypeScript
- Material UI
- Supabase Client
- Wavesurfer.js (Procesamiento de audio)

**Servidor:**

- Node.js + Express
- TypeScript
- Supabase
- Anthropic AI SDK
- AWS SDK (Transcribe)
- Groq SDK (Whisper)

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
├── client/           # Código fuente del frontend React
├── server/           # Código fuente del servidor Express
├── package.json      # Configuración del workspace
└── README.md
```
