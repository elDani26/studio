// src/app/api/genkit/[...flow]/route.ts

// --- CAMBIO CRÍTICO: Importar el paquete completo ---
import * as genkitNext from '@genkit-ai/next';

// Importamos el archivo de configuración para que Genkit sepa dónde están los flujos.
import '@/ai/dev';

// --- CAMBIO CRÍTICO: Llamar a la función desde la importación completa ---
export const { GET, POST } = genkitNext.createApiHandler({});
