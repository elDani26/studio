import { ai } from '@/ai/genkit';
import { createApiHandler } from '@genkit-ai/next';

export const { POST } = createApiHandler(ai);
