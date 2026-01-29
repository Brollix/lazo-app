# Transcripción en Vivo - Documentación de Implementación

## Descripción General

La funcionalidad de transcripción en vivo permite a los terapeutas capturar y transcribir audio del sistema en tiempo real utilizando un patrón Productor-Consumidor eficiente.

## Arquitectura

### Backend

#### Endpoints

1. **`POST /api/transcribe-chunk`** - Procesa chunks de audio individuales
   - **Parámetros:**
     - `audio` (File): Blob de audio (3-5 segundos)
     - `userId` (string): ID del usuario
     - `chunkIndex` (number): Índice del chunk para ordenamiento
   - **Respuesta:**
     ```json
     {
     	"success": true,
     	"chunkIndex": 0,
     	"transcript": "texto transcrito...",
     	"timestamp": 1706400000000
     }
     ```

2. **`POST /api/analyze-live`** (Ultra Plan) - Análisis psicológico en vivo
   - **Parámetros:**
     - `userId` (string): ID del usuario
     - `accumulatedTranscript` (string): Transcripción acumulada
     - `patientName` (string): Nombre del paciente
   - **Respuesta:**
     ```json
     {
     	"success": true,
     	"analysis": "análisis psicológico...",
     	"timestamp": 1706400000000
     }
     ```

### Frontend

#### Componente: `LiveTranscription.tsx`

**Props:**

- `onTranscriptUpdate: (text: string) => void` - Callback para actualizaciones de transcripción
- `onComplete: (fullTranscript: string) => void` - Callback cuando se detiene la grabación

**Uso:**

```tsx
import { LiveTranscription } from "./components/LiveTranscription";

function MyComponent() {
	const handleTranscriptUpdate = (text: string) => {
		console.log("Transcripción actualizada:", text);
	};

	const handleComplete = (fullTranscript: string) => {
		console.log("Transcripción completa:", fullTranscript);
	};

	return (
		<LiveTranscription
			onTranscriptUpdate={handleTranscriptUpdate}
			onComplete={handleComplete}
		/>
	);
}
```

## Flujo de Datos

```
[Sistema Audio]
    ↓
[MediaRecorder con timeslice=3000ms]
    ↓
[Cola en RAM (chunkQueue)]
    ↓
[Consumidor Asíncrono]
    ↓
[POST /api/transcribe-chunk]
    ↓
[Groq Whisper-v3]
    ↓
[Actualización UI en tiempo real]
```

## Optimizaciones

### Memoria

- Los blobs de audio se descartan inmediatamente después de ser procesados exitosamente
- La cola en RAM actúa como buffer temporal solo durante fluctuaciones de red

### Paralelismo

- **Productor (MediaRecorder):** Continúa grabando sin interrupciones
- **Consumidor (Worker):** Procesa chunks secuencialmente pero en paralelo a la grabación
- **Control de Estado:** Bandera `isProcessing` evita envíos simultáneos desordenados

## Distribución por Planes

| Funcionalidad                | Free            | Pro          | Ultra         |
| ---------------------------- | --------------- | ------------ | ------------- |
| Transcripción en Vivo        | ✅ (3 créditos) | ✅ Ilimitado | ✅ Ilimitado  |
| Análisis Psicológico en Vivo | ❌              | ❌           | ✅ (Opcional) |

## Costos

- **Transcripción en Vivo:** $0.003 USD por sesión (mismo costo que archivo completo)
- **Análisis Psicológico en Vivo:** ~$0.015 USD por análisis (Ultra Plan)

## Próximos Pasos

1. ✅ Backend endpoint creado
2. ✅ Componente frontend implementado
3. ⏳ Integración en Dashboard
4. ⏳ Testing de concurrencia
5. ⏳ Análisis psicológico en vivo (UI)

## Notas Técnicas

- **Formato de Audio:** WebM (compatible con MediaRecorder)
- **Tamaño de Chunk:** 3 segundos (configurable)
- **Proveedor de Transcripción:** Groq Whisper-v3 (rápido y económico)
- **Captura de Sistema:** Requiere `getDisplayMedia` con opción de audio del sistema
