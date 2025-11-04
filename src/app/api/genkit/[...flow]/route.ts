// src/app/api/genkit/[...flow]/route.ts

// Importamos la función base de Genkit para manejar flujos desde una petición HTTP
import { runFlowFromHTTP } from 'genkit';

// Importamos el archivo que registra nuestros flujos de IA (como summarize-transactions)
import '@/ai/dev'; 

// --- CAMBIO CRÍTICO: Llamar a la función desde la importación completa ---
export const { GET, POST } = genkitNext.createApiHandler({});
