// src/app/api/genkit/[...flow]/route.ts

import * as genkitNext from '@genkit-ai/next';

// Importamos el archivo de configuración para que Genkit sepa dónde están los flujos.
import '@/ai/dev';

export const { GET, POST } = genkitNext.createApiHandler({
  // Aquí indicamos que use la variable de entorno para la clave API
  // Aunque ya la configuraste en Vercel, es bueno que el manejador sepa usarla.
  // Si ya está configurado en tu genkit.ts, esto sirve como respaldo.
});
