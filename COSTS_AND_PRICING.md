# Costos y Precios - Lazo App (Estrategia Rentable)

Estructura optimizada para maximizar margen en volumen alto (100 sesiones/mes).

---

## Resumen del Modelo de Negocio

La escalera de valor de Lazo está diseñada para guiar al usuario desde la prueba inicial hasta el análisis clínico profesional:

### **FREE** (3 Créditos)

**Objetivo:** Que prueben la "magia" de que un audio se convierta en texto clínico.

- 3 créditos para experimentar la transcripción y análisis básico
- Sin compromiso, sin tarjeta de crédito

### **PRO** ($19.500/mes) - "El Asistente de Redacción"

**Foco:** Dictado de resúmenes (el terapeuta graba al terminar) o sesiones simples.

- **Tecnología:** Whisper simple + Llama 3.3 (Groq)
- **Ventajas:** Rápido, económico, ideal para documentación administrativa
- **Caso de uso:** Grabar un resumen post-sesión de 5-10 minutos

### **ULTRA** ($48.500/mes) - "El Analista Clínico"

**Foco:** Grabación de sesiones completas con pacientes.

- **Diferencial clave:**
  - **Diarización:** Identifica quién habla (terapeuta vs. paciente)
  - **Memoria histórica:** Contexto de sesiones anteriores
  - **Análisis psicológico profundo:** Powered by Claude 3.5 Sonnet
- **Caso de uso:** Grabar la sesión completa de 45-60 minutos

---

## Precios de Suscripción

| Plan      | Precio (ARS) | Motor de Inteligencia       | Propuesta de Valor                                                                     |
| :-------- | :----------- | :-------------------------- | :------------------------------------------------------------------------------------- |
| **Free**  | **$0**       | Llama 3.3 (Groq)            | **3 créditos** para probar la magia de audio → texto clínico                           |
| **Pro**   | **$19.500**  | **Llama 3.3 70B (Groq)**    | **"Asistente de Redacción"**: Dictado rápido de resúmenes post-sesión                  |
| **Ultra** | **$48.500**  | **Claude 3.5 Sonnet (AWS)** | **"Analista Clínico"**: Sesiones completas + Diarización + Memoria + Análisis profundo |

---

## Comisiones de Pago (MercadoPago)

MercadoPago cobra una comisión sobre cada transacción:

- **Comisión base:** 5% - 7% del monto
- **IVA sobre la comisión:** 21% adicional sobre la comisión

**Cálculo de comisión efectiva:**

- Comisión promedio: 6% (tomamos el punto medio)
- IVA sobre comisión: 6% × 21% = 1.26%
- **Comisión total efectiva: 7.26%**

### Impacto por Plan

| Plan      | Precio (ARS) | Comisión MP (7.26%) | Ingreso Neto después de MP |
| :-------- | :----------- | :------------------ | :------------------------- |
| **Pro**   | $19.500      | $1.416              | **$18.084**                |
| **Ultra** | $48.500      | $3.521              | **$44.979**                |

---

## Análisis de Rentabilidad (Por Usuario/Mes)

Calculado sobre un uso intensivo de **100 sesiones mensuales**.

> **Nota sobre conversión de moneda**: Los cálculos en USD están basados en el **dólar tarjeta a ~$1.900 ARS/USD** (tipo de cambio para servicios digitales internacionales). Este es el tipo de cambio relevante ya que los costos operativos (AWS, Groq, Deepgram) se facturan en dólares.

### 1. Plan Pro - "El Asistente de Redacción"

_El objetivo de este plan es volumen y margen puro._

**Caso de uso:** Terapeuta graba resúmenes de 5-10 minutos al finalizar cada sesión.

- **Ingreso bruto**: $19.500 ARS
- **Comisión MercadoPago (7.26%)**: -$1.416 ARS
- **Ingreso neto**: $18.084 ARS ($9.52 USD)
- **Tecnología**: Full Groq Stack (Whisper + Llama)
- **Costo Operativo**:
  - 100 Audios × $0.003 = $0.30 USD ($570 ARS)
  - 100 Resúmenes Llama × $0.006 = $0.60 USD ($1.140 ARS)
- **Costo Total**: $0.90 USD / **$1.710 ARS**
- **Ganancia Neta**: $8.62 USD / **$16.374 ARS por usuario**
- **Margen Neto Real: 90.5%** (después de comisiones)

### 2. Plan Ultra - "El Analista Clínico"

_El objetivo de este plan es prestigio, retención y datos._

**Caso de uso:** Terapeuta graba sesiones completas de 45-60 minutos con pacientes.

- **Ingreso bruto**: $48.500 ARS
- **Comisión MercadoPago (7.26%)**: -$3.521 ARS
- **Ingreso neto**: $44.979 ARS ($23.67 USD)
- **Tecnología**: Híbrida (Groq para transcribir bases, Bedrock/Deepgram para features premium)
- **Feature Exclusiva**: **Diarización + Memoria a Largo Plazo + Análisis Profundo**
- **Costo Operativo (Mix de uso)**:
  - 100 Sesiones Standard (Llama/Groq): $0.90 USD ($1.710 ARS)
  - 20 Sesiones Premium (Claude/Deepgram con diarización): $7.00 USD ($13.300 ARS) - Incluye input tokens de memoria
- **Costo Total**: $7.90 USD / **$15.010 ARS**
- **Ganancia Neta**: $15.77 USD / **$29.969 ARS por usuario**
- **Margen Neto Real: 66.6%** (después de comisiones)

---

## Diferencias Técnicas (Pipeline)

### Pipeline PRO - "Asistente de Redacción"

**Caso de uso:** Dictado rápido de resúmenes post-sesión (5-10 minutos).

1. **Audio:** `Groq Whisper-v3` (Sin diarización - no es necesario, solo habla el terapeuta).
2. **Modelo:** `Llama 3.3 70B` (Groq) - Rápido y económico.
3. **Prompt:** "Actúa como un asistente administrativo. Genera una nota clínica objetiva basada en el dictado del terapeuta."
4. **Contexto:** Solo la sesión actual (el terapeuta ya sintetizó mentalmente).
5. **Velocidad:** ~30 segundos de procesamiento total.

### Pipeline ULTRA - "Analista Clínico"

**Caso de uso:** Grabación completa de sesión terapéutica (45-60 minutos).

1. **Audio:** `Deepgram Nova-2 Medical` (Con diarización - identifica terapeuta vs. paciente).
2. **Modelo:** `Claude 3.5 Sonnet` (AWS Bedrock) - Análisis psicológico profundo.
3. **Prompt:** "Actúa como un supervisor clínico senior. Analiza la dinámica terapéutica, patrones de transferencia/contratransferencia, y compara con el historial del paciente."
4. **Contexto (RAG):** Se inyectan los resúmenes de las últimas 5 sesiones del paciente (`patient_summaries`).
5. **Outputs adicionales:**
   - Identificación de quién dijo qué (Speaker 1 vs. Speaker 2)
   - Análisis de patrones longitudinales
   - Sugerencias de intervenciones basadas en evidencia

---

## Impacto de Costos: Transcripción en Vivo

### Transcripción en Vivo (Todos los Planes)

**Tecnología:** Groq Whisper-v3 (procesamiento por chunks de 3-5 segundos)

- **Costo por sesión de 60 minutos:**
  - Audio total: ~60 minutos = ~3.6 MB (formato comprimido)
  - Costo Groq Whisper: $0.003 USD por sesión (mismo que transcripción estándar)
  - **No hay costo adicional** vs. subir el archivo completo al final

**Conclusión:** La transcripción en vivo NO aumenta los costos operativos. El costo es el mismo que procesar el archivo completo.

### Análisis Psicológico en Vivo (Ultra - Opcional)

**Tecnología:** Claude 3.5 Sonnet (AWS Bedrock)

- **Escenario:** Usuario activa análisis en vivo 2 veces durante una sesión de 60 minutos
- **Input por análisis:** ~2,500 tokens (transcripción acumulada de ~10-15 minutos)
- **Output por análisis:** ~500 tokens (insights psicológicos preliminares)
- **Costo por análisis:**
  - Input: 2,500 tokens × $0.003/1K = $0.0075 USD
  - Output: 500 tokens × $0.015/1K = $0.0075 USD
  - **Total por análisis:** $0.015 USD
- **Costo por sesión (2 análisis):** $0.03 USD (~$57 ARS)

**Impacto en Plan Ultra:**

- Costo base (100 sesiones): $7.90 USD
- Con análisis en vivo (20 sesiones × 2 análisis): +$0.60 USD
- **Nuevo costo total:** $8.50 USD / **$16.150 ARS**
- **Nueva ganancia neta:** $17.03 USD / **$32.350 ARS** (Margen 67%)

**Conclusión:** El análisis psicológico en vivo tiene un impacto mínimo en los costos (~$0.60 USD/mes) y mantiene un margen saludable del 67%.
