# Política de Privacidad - Lazo App

**Última actualización:** Enero 2026

Lazo es una herramienta diseñada para profesionales de la salud mental en Argentina, centrada en la eficiencia y la privacidad absoluta del paciente.

## 1. Compromiso de Confidencialidad y Secreto Profesional

Entendemos que los datos de salud mental son datos sensibles bajo la Ley 25.326 de Protección de Datos Personales (Argentina). Lazo actúa como un facilitador tecnológico que garantiza el secreto profesional mediante cifrado.

## 2. Arquitectura de Seguridad (Zero-Knowledge)

**Cifrado desde el Cliente:** Toda la información clínica (notas, transcripciones, análisis) se cifra en el navegador del profesional mediante algoritmos de derivación de llaves (PBKDF2) y cifrado AES-256.

**Acceso Restringido:** Solo el profesional posee la contraseña para derivar la llave de acceso. Ni Lazo, ni Supabase, ni los proveedores de IA pueden leer el contenido de la información almacenada.

**Protección contra pérdida:** Dado que es un sistema de conocimiento cero, si el profesional olvida su contraseña y no posee una copia de respaldo, la información cifrada será irrecuperable.

## 3. Procesamiento de Inteligencia Artificial (IA)

Para las funciones de asistencia clínica, Lazo utiliza infraestructura compatible con HIPAA bajo acuerdos de procesamiento de datos (BAA):

**Groq (Speech-to-Text):** Los audios se procesan bajo una política de Zero Data Retention (ZDR). El audio se procesa en memoria volátil y se elimina inmediatamente después de la transcripción.

**AWS Bedrock (Análisis):** El texto se analiza mediante modelos (Llama/Claude) protegidos por el AWS Business Associate Addendum (BAA). Los datos enviados no se utilizan para entrenar modelos de IA ni son persistidos por Amazon.

## 4. Transferencia Internacional de Datos

Al utilizar servicios de infraestructura global (AWS, Groq, Supabase), los datos cifrados pueden ser procesados en centros de datos fuera de Argentina. El uso de cifrado fuerte garantiza que dicha transferencia cumpla con los estándares de seguridad exigidos por la Agencia de Acceso a la Información Pública (AAIP).

## 5. Contacto

Para consultas sobre el tratamiento de datos o ejercicio de derechos de acceso, rectificación o supresión (Habeas Data), contactar a: brolloagus@gmail.com.
