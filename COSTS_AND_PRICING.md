# 💰 Costos y Precios - Lazo App (Estrategia Rentable)

Estructura optimizada para maximizar margen en volumen alto (100 sesiones/mes).

---

## 🏷️ Precios de Suscripción

| Plan | Precio (ARS) | Motor de Inteligencia | Propuesta de Valor |
| :--- | :--- | :--- | :--- |
| **Free** | **$0** | Llama 3.3 (Groq) | Prueba de concepto. |
| **Pro** | **$19.500** | **Llama 3.3 70B (Groq)** | **"El Secretario"**: Transcripción rápida + Notas SOAP estándar. Ideal para burocracia. |
| **Ultra** | **$48.500** | **Claude 3.5 Sonnet (AWS)** | **"El Supervisor"**: Análisis profundo + Memoria Histórica + Diarización + Reportes OS. |

---

## 📉 Análisis de Rentabilidad (Por Usuario/Mes)

Calculado sobre un uso intensivo de **100 sesiones mensuales**.

### 1. Plan Pro (La Vaca Lechera 🐮)
*El objetivo de este plan es volumen y margen puro.*

- **Ingreso**: ~$16.25 USD ($19.500 ARS)
- **Tecnología**: Full Groq Stack (Whisper + Llama).
- **Costo Operativo**:
  - 100 Audios x $0.003 = $0.30
  - 100 Resúmenes Llama x $0.006 = $0.60
- **Costo Total**: **~$0.90 USD**
- **Ganancia Neta**: **$15.35 USD / usuario** (Margen 94%) 🚀

### 2. Plan Ultra (El Producto Estrella ⭐)
*El objetivo de este plan es prestigio, retención y datos.*

- **Ingreso**: ~$40.40 USD ($48.500 ARS)
- **Tecnología**: Híbrida (Groq para transcribir bases, Bedrock/Deepgram para features premium).
- **Feature Exclusiva**: **Memoria a Largo Plazo** (Costo de tokens extra incluido en el precio).
- **Costo Operativo (Mix de uso)**:
  - 80 Sesiones Standard (Llama/Groq): $0.72 USD
  - 20 Sesiones Premium (Claude/Deepgram): $7.00 USD (Incluye input tokens de memoria)
- **Costo Total**: **~$7.72 USD**
- **Ganancia Neta**: **$32.68 USD / usuario** (Margen 80%) 💎

---

## ⚙️ Diferencias Técnicas (Pipeline)

### 🔵 Pipeline PRO
1. **Audio:** `Groq Whisper-v3` (Sin diarización).
2. **Prompt:** "Actúa como un asistente administrativo. Genera una nota SOAP objetiva basada en la transcripción."
3. **Contexto:** Solo la sesión actual.

### 🟢 Pipeline ULTRA
1. **Audio:** `Deepgram Nova-2 Medical` (Con diarización y detección de hablantes).
2. **Prompt:** "Actúa como un supervisor clínico senior. Analiza la transferencia, patrones latentes y compara con el historial."
3. **Contexto (RAG):** Se inyectan los resúmenes de las últimas 5 sesiones del paciente (`patient_summaries`).