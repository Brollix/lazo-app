# Cumplimiento Normativo - Lazo

**Última actualización:** Enero 2026

## Resumen Ejecutivo

Lazo cumple con los más altos estándares de seguridad y privacidad para datos de salud mental. Utilizamos infraestructura certificada bajo acuerdos de procesamiento de datos compatibles con HIPAA y políticas de retención cero.

---

## 🔒 Arquitectura de Seguridad Zero-Knowledge

**Tu contraseña = Tu única llave**

- Todos los datos clínicos se cifran en tu navegador antes de enviarse a nuestros servidores
- Utilizamos AES-256 con derivación de llaves PBKDF2
- Ni Lazo, ni nuestros proveedores de infraestructura pueden leer tus datos
- Si olvidas tu contraseña sin respaldo, los datos son irrecuperables (por diseño)

---

## ☁️ Procesamiento de IA con Protección HIPAA

### Groq - Transcripción de Audio

**Certificación:** Zero Data Retention (ZDR)

- Los audios se procesan en memoria volátil
- Se eliminan inmediatamente después de la transcripción
- No se almacenan, no se registran, no se utilizan para entrenamiento
- Compatible con Business Associate Agreement (BAA)

**Modelo:** Whisper-v3 Large

### AWS Bedrock - Análisis Clínico

**Certificación:** Business Associate Agreement (BAA)

- Infraestructura certificada HIPAA
- Los datos enviados NO se utilizan para entrenar modelos
- No hay persistencia de datos fuera de la sesión de procesamiento
- Cumple con estándares SOC 2, ISO 27001

**Modelos:** Llama 3.3 70B (Pro), Claude 3.5 Sonnet (Ultra)

---

## 🌍 Transferencia Internacional de Datos

Al utilizar servicios en la nube (AWS, Groq), los datos cifrados pueden procesarse en centros de datos fuera de Argentina.

**Garantías:**

- Cifrado AES-256 end-to-end antes de cualquier transferencia
- Cumplimiento con Ley 25.326 de Protección de Datos Personales (Argentina)
- Estándares de seguridad aprobados por AAIP (Agencia de Acceso a la Información Pública)
- Acuerdos de procesamiento de datos (DPA) con todos los proveedores

---

## 📋 Equivalencia HIPAA en Argentina

Aunque HIPAA es una regulación estadounidense, Lazo implementa controles equivalentes bajo la legislación argentina:

| Requisito HIPAA                 | Implementación Lazo            | Normativa Argentina   |
| ------------------------------- | ------------------------------ | --------------------- |
| Cifrado de datos en reposo      | AES-256                        | Ley 25.326 Art. 9     |
| Cifrado de datos en tránsito    | TLS 1.3                        | Ley 25.326 Art. 9     |
| Control de acceso               | Autenticación + Zero-Knowledge | Ley 25.326 Art. 14    |
| Auditoría de accesos            | Logs de actividad              | Ley 25.326 Art. 14    |
| Acuerdos de procesamiento       | BAA con AWS/Groq               | Ley 25.326 Art. 25    |
| Derecho de acceso/rectificación | API de exportación/eliminación | Ley 25.326 Art. 14-16 |

---

## 🛡️ Responsabilidades del Profesional

Como terapeuta, tú eres el **responsable del tratamiento** de los datos de tus pacientes. Lazo actúa como **procesador de datos**.

**Tus obligaciones:**

- Obtener consentimiento informado de tus pacientes para grabar sesiones
- Informar sobre el uso de herramientas de IA en tu práctica
- Mantener la confidencialidad de tu contraseña y frase de recuperación
- Cumplir con el secreto profesional establecido en tu código deontológico

---

## 📞 Contacto y Ejercicio de Derechos

Para consultas sobre tratamiento de datos o ejercicio de derechos (acceso, rectificación, supresión - Habeas Data):

**Email:** brolloagus@gmail.com

**Derechos disponibles:**

- Acceso a tus datos
- Rectificación de información incorrecta
- Supresión de tu cuenta y todos los datos asociados
- Portabilidad de datos (exportación)
