// src/app/api/genkit/[...flow]/route.ts

// Importamos la función base de Genkit para manejar flujos desde una petición HTTP
import { runFlowFromHTTP } from 'genkit';

// Importamos el archivo que registra nuestros flujos de IA (como summarize-transactions)
import '@/ai/dev'; 

// Esta es la función que se ejecuta cuando alguien hace una petición POST a esta ruta.
export async function POST(request: Request) {
  try {
    // Usamos la función base de Genkit para procesar la petición
    const response = await runFlowFromHTTP(request);

    // Devolvemos la respuesta
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    // En caso de error (por ejemplo, timeout o error de Gemini)
    console.error('Genkit POST Error:', error);
    return new Response('Error interno del servidor Genkit', { status: 500 });
  }
}

// Le decimos a Next.js que las peticiones GET (si las hay) deben ser manejadas igual que POST
export const GET = POST;
