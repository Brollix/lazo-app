# 💰 Costos y Precios - Lazo App (Estrategia Rentable)

Estructura optimizada para maximizar margen en volumen alto (100 sesiones/mes).

---

## 🏷️ Precios de Suscripción

| Plan      | Precio (ARS) | Motor de Inteligencia       | Propuesta de Valor                                                                      |
| :-------- | :----------- | :-------------------------- | :-------------------------------------------------------------------------------------- |
| **Free**  | **$0**       | Llama 3.3 (Groq)            | Prueba de concepto.                                                                     |
| **Pro**   | **$19.500**  | **Llama 3.3 70B (Groq)**    | **"El Secretario"**: Transcripción rápida + Notas SOAP estándar. Ideal para burocracia. |
| **Ultra** | **$48.500**  | **Claude 3.5 Sonnet (AWS)** | **"El Supervisor"**: Análisis profundo + Memoria Histórica + Diarización + Reportes OS. |

---

## 📉 Análisis de Rentabilidad (Por Usuario/Mes)

Calculado sobre un uso intensivo de **100 sesiones mensuales**.

> **Nota sobre conversión de moneda**: Los cálculos en USD están basados en el **dólar tarjeta a ~$1.900 ARS/USD** (tipo de cambio para servicios digitales internacionales). Este es el tipo de cambio relevante ya que los costos operativos (AWS, Groq, Deepgram) se facturan en dólares.

### 1. Plan Pro (La Vaca Lechera 🐮)

_El objetivo de este plan es volumen y margen puro._

- **Ingreso**: $10.26 USD / **$19.500 ARS** (cobro en pesos)
- **Tecnología**: Full Groq Stack (Whisper + Llama).
- **Costo Operativo**:
  - 100 Audios x $0.003 = $0.30 USD ($570 ARS)
  - 100 Resúmenes Llama x $0.006 = $0.60 USD ($1.140 ARS)
- **Costo Total**: $0.90 USD / **$1.710 ARS**
- **Ganancia Neta**: $9.36 USD / **$17.790 ARS por usuario** (Margen 91%) 🚀

### 2. Plan Ultra (El Producto Estrella ⭐)

_El objetivo de este plan es prestigio, retención y datos._

- **Ingreso**: $25.53 USD / **$48.500 ARS** (cobro en pesos)
- **Tecnología**: Híbrida (Groq para transcribir bases, Bedrock/Deepgram para features premium).
- **Feature Exclusiva**: **Memoria a Largo Plazo** (Costo de tokens extra incluido en el precio).
- **Costo Operativo (Mix de uso)**:
  - 100 Sesiones Standard (Llama/Groq): $0.90 USD ($1.710 ARS)
  - 20 Sesiones Premium (Claude/Deepgram): $7.00 USD ($13.300 ARS) - Incluye input tokens de memoria
- **Costo Total**: $7.90 USD / **$15.010 ARS**
- **Ganancia Neta**: $17.63 USD / **$33.490 ARS por usuario** (Margen 69%) 💎

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
