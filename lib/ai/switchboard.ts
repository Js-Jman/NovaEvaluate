import { callGemini } from './gemini';
import { callGroq } from './groq';
import { callOpenRouter } from './openrouter';
import { callCohere } from './cohere';
import prisma from '../db';
import { decryptKey } from '../utils/encrypt';

const RATE_LIMIT_CODES = [429, 503, 529];

function isRateLimit(err: unknown): boolean {
  const error = err as { status?: number; message?: string };
  return (
    RATE_LIMIT_CODES.includes(error?.status ?? 0) ||
    String(error?.message ?? '').toLowerCase().includes('rate limit') ||
    String(error?.message ?? '').toLowerCase().includes('quota')
  );
}

export type AITask = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

export type AITaskPayload = AITask | ((modelId: string) => AITask);

export async function callAI(taskPayload: AITaskPayload, forceModel?: string): Promise<{ text: string; modelUsed: string; fallbackErrors: { modelId: string, error: string }[] }> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error('AppSettings not configured. Run the seed script first.');

  const activeModel = settings.activeModel as string;
  const rawChain: string[] = Array.isArray(settings.fallbackChain) ? (settings.fallbackChain as string[]) : [];
  const rawKeys: Record<string, string> = settings.apiKeys as Record<string, string>;

  // Decrypt all keys and fallback to process.env
  const keys: Record<string, string> = {};
  for (const [provider, encrypted] of Object.entries(rawKeys)) {
    if (encrypted && !encrypted.startsWith('your_')) {
      try {
        keys[provider] = decryptKey(encrypted);
      } catch {
        keys[provider] = encrypted;
      }
    }
  }

  // Fallback to .env if missing in DB
  if (!keys.gemini) keys.gemini = process.env.GEMINI_API_KEY || '';
  if (!keys.groq) keys.groq = process.env.GROQ_API_KEY || '';
  if (!keys.cohere) keys.cohere = process.env.COHERE_API_KEY || '';
  if (!keys.openrouter) keys.openrouter = process.env.OPENROUTER_API_KEY || '';

  // Prioritize active model, then fallback chain, removing duplicates
  let modelsToTry = [activeModel];
  for (const model of rawChain) {
    if (!modelsToTry.includes(model)) {
      modelsToTry.push(model);
    }
  }
  
  if (forceModel) {
    modelsToTry = [forceModel];
  }

  const fallbackErrors: { modelId: string, error: string }[] = [];

  for (const modelId of modelsToTry) {
    const task = typeof taskPayload === 'function' ? taskPayload(modelId) : taskPayload;

    // Vision task — skip non-vision models
    if (task.imageBase64) {
      const supportsVision = [
        'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro',
        'llama-3.2-vision', 'openrouter-auto',
      ].includes(modelId);
      if (!supportsVision) continue;
    }

    const provider = getProvider(modelId);
    const apiKey = keys[provider];
    if (!apiKey) continue; // no key configured for this provider

    try {
      let text = '';
      if (provider === 'gemini') text = await callGemini(modelId, task, apiKey);
      else if (provider === 'groq') text = await callGroq(modelId, task, apiKey);
      else if (provider === 'openrouter') text = await callOpenRouter(modelId, task, apiKey);
      else if (provider === 'cohere') text = await callCohere(modelId, task, apiKey);
      else continue;

      return { text, modelUsed: modelId, fallbackErrors };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[switchboard] Model ${modelId} failed: ${msg}. Trying next...`);
      fallbackErrors.push({ modelId, error: msg });
      continue;
    }
  }

  throw new Error(forceModel ? fallbackErrors[0]?.error || 'Model failed' : `All AI models in fallback chain failed. Errors: ${JSON.stringify(fallbackErrors)}`);
}

function getProvider(modelId: string): string {
  if (modelId.startsWith('gemini')) return 'gemini';
  if (['llama-3.3-70b', 'llama-3.2-vision', 'mixtral-8x7b', 'gemma2-9b'].includes(modelId)) return 'groq';
  if (modelId.startsWith('openrouter')) return 'openrouter';
  if (modelId.startsWith('command')) return 'cohere';
  if (modelId.startsWith('mistral')) return 'mistral';
  return 'unknown';
}
