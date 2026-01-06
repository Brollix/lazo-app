# Lazo App - AI Copilot for Psychotherapists

**Lazo** es una plataforma integral diseñada para optimizar el flujo de trabajo de psicólogos y terapeutas mediante el uso de Inteligencia Artificial. La aplicación permite gestionar pacientes de manera segura, grabar sesiones y transformar automáticamente el audio en notas clínicas estructuradas (SOAP, DAP) y análisis profundos, permitiendo a los profesionales enfocarse más en sus pacientes y menos en la carga administrativa.

---

## 🚀 Características Principales

- **Gestión Inteligente de Pacientes**: Administración segura de perfiles e historias clínicas.
- **Transcripción de Audio de Alta Fidelidad**: Integración con modelos **Whisper v3 (Groq)** y **Nova-2 (Deepgram)** para transcripciones precisas y veloces, optimizadas para el contexto terapéutico.
- **Generación de Notas Clínicas con IA**: Algoritmos que analizan la sesión y generan automáticamente notas en formatos estandarizados (SOAP, DAP), detectando intervenciones clave y progreso del paciente.
- **Análisis de Sentimiento y Riesgos**: Evaluación automática del tono emocional de la sesión y detección temprana de indicadores de riesgo.
- **Reproductor de Audio Avanzado**: Visualización de ondas sonoras interactive con **Wavesurfer.js**, permitiendo navegación precisa y marcadores temporales.
- **Sistema de Suscripciones**: Gestión automatizada de planes (Free, Pro, Ultra) y créditos integrando la pasarela de pagos de **Mercado Pago**.
- **Seguridad de Grado Médico**: Arquitectura diseñada con privacidad en mente, utilizando almacenamiento encriptado y autenticación robusta.

---

## 🛠️ Arquitectura y Stack Tecnológico

El proyecto es un monorepo moderno que separa una interfaz de usuario reactiva de un backend robusto y escalable.

### **Frontend (Cliente)**

Diseñado para una experiencia de usuario fluida y "app-like".

- **React + Vite**: Rendimiento ultra-rápido y modularidad.
- **TypeScript**: Tipado estático para código robusto y mantenible.
- **Material UI (MUI)**: Diseño limpio, accesible y consistente.
- **Wavesurfer.js**: Manipulación y visualización avanzada de audio en el navegador.

### **Backend (Servidor & Cloud)**

Una API RESTful orquestada para manejar procesamiento intensivo y lógica de negocio compleja.

- **Node.js + Express**: Servidor escalable y eficiente.
- **Supabase (BaaS)**: Manejo de base de datos PostgreSQL, autenticación segura y almacenamiento de archivos (S3 compatible).
- **Inteligencia Artificial (LLMs & ASR)**:
  - **Groq & Deepgram**: Motores de transcripción de última generación.
  - **AWS Bedrock / Anthropic**: Modelos de lenguaje para razonamiento clínico y generación de notas.
- **Infraestructura**: Despliegue en **AWS EC2** con **Nginx** como proxy inverso y **CloudFront** para distribución de contenido estático (CDN).

---

## 🎯 Propósito del Proyecto

Este proyecto demuestra la capacidad de integrar múltiples servicios de IA generativa en una aplicación de producción real, resolviendo un problema de negocio específico (la carga burocrática en salud mental) con una arquitectura escalable, segura y centrada en el usuario.
