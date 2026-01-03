# 🗺️ Roadmap de Lazo App

## 1. 🔐 Inicio y Seguridad (La Puerta de Entrada)

**Login con Supabase**

- **Interfaz**: Pantalla limpia con logo de Lazo, campos de email y contraseña.
- **Objetivo**: Validar existencia del usuario y estado de suscripción.

**Validación de "Dueño" (Soft Lock)**

- Al iniciar sesión, se verifica la base de datos local (`lazo.db`).
- **Seguridad**: Si la DB pertenece a otro usuario, se bloquea el acceso para proteger la privacidad de los datos locales.

**Cerrar Sesión**

- Elimina el token de sesión pero **mantiene** la base de datos local.

---

## 2. ✨ El Flujo de Trabajo (La Magia)

**📂 Vigilante de Carpetas (Watcher)**

- Monitoreo automático de carpetas (ej. `Documentos/Zoom`).
- Detección automática de nuevos archivos `.mp4`.

**⚙️ Procesamiento**

1. **Conversión Local**: Extracción de audio usando `ffmpeg` en el dispositivo (evita subir videos pesados).
2. **Nube (Proxy)**: Envío del audio + Token al servidor.
3. **IA**: Gestión mediante AWS Transcribe + Claude Sonnet.
4. **Resultado**: Recepción de JSON con nota SOAP, transcripción y entidades.

---

## 3. 🖥️ El Dashboard (Interfaz Principal)

Diseño de 3 columnas de altura completa para máxima productividad.

| Sección                   | Descripción                                                                                              |
| :------------------------ | :------------------------------------------------------------------------------------------------------- |
| **📝 Editor (Izquierda)** | Muestra la **Nota SOAP** generada. Totalmente editable para correcciones manuales.                       |
| **🤖 Asistente (Centro)** | Chat interactivo con contexto. Permite interrogar la sesión (ej. _"¿Qué dijo sobre su medicación?"_).    |
| **🧠 Memoria (Derecha)**  | Lista de "Datos Duros" detectados automáticamente: Nombres, Fechas, Medicación. Botones de copia rápida. |

---

## 4. 🛡️ Almacenamiento y Privacidad

**Base de Datos Local (`lazo.db`)**

- **Tabla Pacientes**: Nombre, ID.
- **Tabla Sesiones**: Fecha, Audio (ruta local), Texto generado.
- **Privacidad Primero**: Cero datos clínicos en la nube. Toda la información sensible reside en el disco del usuario.

---

## 5. ⚙️ Configuración

- **Perfil**: Visualización de usuario logueado.
- **Rutas**: Selector de carpeta a vigilar personalizado.
