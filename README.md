# Lazo App - AI Copilot for Psychotherapists

**Lazo** es una plataforma integral diseñada para optimizar el flujo de trabajo de psicólogos y terapeutas mediante el uso de Inteligencia Artificial. La aplicación permite gestionar pacientes de manera segura, grabar sesiones y transformar automáticamente el audio en notas clínicas estructuradas (SOAP, DAP) y análisis profundos, permitiendo a los profesionales enfocarse más en sus pacientes y menos en la carga administrativa.

---

## 🚀 Características Principales

### **Gestión de Pacientes y Sesiones**

- **Gestión Inteligente de Pacientes**: Administración segura de perfiles e historias clínicas con encriptación personalizada.
- **Reproductor de Audio Avanzado**: Visualización de ondas sonoras interactiva con **Wavesurfer.js**, permitiendo navegación precisa y marcadores temporales.
- **Organización de Sesiones**: Sistema completo de gestión de sesiones con historial y búsqueda avanzada.

### **Inteligencia Artificial**

- **Transcripción de Audio de Alta Fidelidad**:
  - **Whisper v3 (Groq)** para planes Free y Pro
  - **Nova-2 (Deepgram)** para plan Ultra con precisión máxima (99.9%)
- **Generación de Notas Clínicas con IA**: Análisis automático de sesiones con **Claude Sonnet 3.5** generando notas en formatos estandarizados (SOAP, DAP)
- **Análisis de Sentimiento y Riesgos**: Evaluación automática del tono emocional y detección temprana de indicadores de riesgo
- **Biometría de Voz**: Análisis de tiempo de habla por participante y detección de silencios
- **Diarización Avanzada**: Identificación de hablantes (Speaker ID) en plan Ultra

### **Sistema de Suscripciones**

- **Tres Planes Disponibles**:
  - **Free**: 3 créditos iniciales, ideal para probar la plataforma
  - **Pro**: Grabaciones ilimitadas, transcripción Whisper v3, análisis con Claude, asistente IA 24/7
  - **Ultra**: Todo lo de Pro + Deepgram Nova-2, precisión máxima, diarización avanzada (en desarrollo)
- **Integración con MercadoPago**: Gestión automatizada de pagos recurrentes y webhooks
- **Sistema de Créditos**: Control de uso mensual con límites configurables por plan
- **Límite de Transcripciones**: 3 transcripciones mensuales para usuarios gratuitos

### **Panel de Administración**

- **Dashboard Completo**: Métricas de negocio (MRR, conversión, usuarios activos)
- **Gestión de Usuarios**: Visualización, edición de créditos y cambio de planes
- **Gestión de Planes**: Edición dinámica de precios, características y créditos
- **Monitoreo de Salud**: Estado en tiempo real de servicios (Supabase, Groq, Deepgram, AWS Bedrock)
- **Sistema de Anuncios**: Comunicación con usuarios desde el panel
- **Exportación de Datos**: Descarga de información de usuarios en CSV
- **Feed de Actividad**: Monitoreo de sesiones procesadas y errores

### **Seguridad y Privacidad**

- **Encriptación de Grado Médico**: Almacenamiento encriptado con salt personalizado por usuario
- **Autenticación Robusta**: Sistema de autenticación con Supabase Auth
- **Row Level Security (RLS)**: Políticas de seguridad a nivel de base de datos
- **Gestión Segura de Archivos**: Almacenamiento en Supabase Storage con políticas de acceso

---

## 🛠️ Arquitectura y Stack Tecnológico

El proyecto es un **monorepo moderno** que separa una interfaz de usuario reactiva de un backend robusto y escalable.

### **Frontend (Cliente)**

Diseñado para una experiencia de usuario fluida y "app-like".

- **React 18 + Vite**: Rendimiento ultra-rápido con HMR (Hot Module Replacement)
- **TypeScript**: Tipado estático para código robusto y mantenible
- **Material UI (MUI) v7**: Sistema de diseño completo con tema personalizado
  - Glassmorphism y efectos visuales premium
  - Modo claro/oscuro con transiciones suaves
  - Componentes personalizados (TitleBar, ThemeCloud, etc.)
- **MUI X Data Grid**: Tablas avanzadas para el panel de administración
- **Wavesurfer.js**: Visualización y manipulación de audio en el navegador
- **Framer Motion**: Animaciones fluidas y micro-interacciones
- **React Markdown**: Renderizado de contenido markdown
- **Axios**: Cliente HTTP para comunicación con el backend
- **Crypto-js**: Encriptación del lado del cliente

### **Backend (Servidor & Cloud)**

Una API RESTful orquestada para manejar procesamiento intensivo y lógica de negocio compleja.

- **Node.js + Express**: Servidor escalable y eficiente
- **TypeScript**: Tipado estático en el backend
- **Supabase (BaaS)**:
  - PostgreSQL con extensiones avanzadas
  - Autenticación y autorización
  - Almacenamiento de archivos (S3 compatible)
  - Row Level Security (RLS)
  - Funciones RPC personalizadas
- **Inteligencia Artificial**:
  - **Groq SDK**: Transcripción con Whisper v3 (ultra-rápida)
  - **Deepgram SDK**: Transcripción Nova-2 de alta precisión
  - **AWS Bedrock**: Acceso a modelos Claude de Anthropic
- **Pagos y Suscripciones**:
  - **MercadoPago SDK**: Gestión de suscripciones recurrentes
  - Sistema de webhooks para actualizaciones automáticas
- **Infraestructura**:
  - **AWS EC2**: Hosting del servidor Node.js
  - **Nginx**: Proxy inverso y balanceo de carga
  - **CloudFront**: CDN para distribución de contenido estático
  - **AWS S3**: Almacenamiento de archivos de audio
- **Utilidades**:
  - **Multer**: Manejo de uploads multipart/form-data
  - **node-cron**: Tareas programadas (renovación de créditos)
  - **CORS**: Configuración para CloudFront y múltiples orígenes

### **Base de Datos (Supabase PostgreSQL)**

- **Tablas Principales**:
  - `profiles`: Información de usuarios y créditos
  - `patients`: Gestión de pacientes
  - `sessions`: Sesiones de terapia procesadas
  - `processing_sessions`: Estado de procesamiento de audio
  - `subscription_plans`: Planes configurables dinámicamente
  - `subscriptions`: Suscripciones activas de usuarios
  - `announcements`: Sistema de comunicación con usuarios
  - `monthly_transcriptions`: Control de límites mensuales
- **Migraciones SQL**: Scripts organizados para setup inicial y actualizaciones
- **Funciones RPC**: Lógica de negocio en la base de datos (decremento de créditos, etc.)

---

## 📊 Sistema de Planes y Precios

Los planes se gestionan dinámicamente desde la tabla `subscription_plans`:

| Plan      | Precio        | Créditos Mensuales | Transcripción   | Análisis          |
| --------- | ------------- | ------------------ | --------------- | ----------------- |
| **Free**  | Gratis        | 3 iniciales        | Whisper v3      | Claude Sonnet 3.5 |
| **Pro**   | ARS $50\*     | Ilimitados         | Whisper v3      | Claude Sonnet 3.5 |
| **Ultra** | En desarrollo | 100 premium        | Deepgram Nova-2 | Claude Sonnet 3.5 |

\*Precio de prueba actual

---

## 🎯 Propósito del Proyecto

Este proyecto demuestra la capacidad de integrar múltiples servicios de IA generativa en una aplicación de producción real, resolviendo un problema de negocio específico (la carga burocrática en salud mental) con una arquitectura escalable, segura y centrada en el usuario.

### **Casos de Uso**

- **Psicólogos y Terapeutas**: Automatización de notas clínicas post-sesión
- **Clínicas de Salud Mental**: Gestión centralizada de pacientes y sesiones
- **Investigación**: Análisis de patrones en terapia mediante IA
- **Formación**: Revisión de sesiones con feedback automático

---

## 📝 Licencia

Este proyecto es **UNLICENSED** y de uso privado.

---

## 👨‍💻 Autor

**Lazo Team** - Plataforma de IA para profesionales de la salud mental

---

## 📚 Documentación Adicional

- [DEV_LOCAL.md](./DEV_LOCAL.md) - Guía detallada de desarrollo local
- [WEBHOOK_SECURITY.md](./server/WEBHOOK_SECURITY.md) - Seguridad de webhooks MercadoPago
- [cloudfront_config.md](./cloudfront_config.md) - Configuración de CloudFront CDN
