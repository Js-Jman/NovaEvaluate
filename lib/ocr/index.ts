import { ocrWithGeminiVision } from './geminiVision';
import { ocrWithGroqVision } from './groqVision';
import { ocrWithOpenRouterVision } from './openrouterVision';
import { extractFromPDF } from './pdfExtract';
import prisma from '../db';
import path from 'path';

const OCR_PROVIDERS: Record<string, (filePath: string, fileType: string) => Promise<string>> = {
  'gemini-vision': ocrWithGeminiVision,
  'groq-vision': ocrWithGroqVision,
  'openrouter-vision': ocrWithOpenRouterVision,
};

// Default AI-only chain
const DEFAULT_OCR_CHAIN = ['gemini-vision', 'groq-vision', 'openrouter-vision'];

/**
 * Parse the ocrStrategy from DB — handles both legacy string and new JSON array formats.
 */
function parseOcrChain(raw: string | string[] | undefined): string[] {
  if (!raw) return DEFAULT_OCR_CHAIN;

  // Already an array (from JSON column)
  if (Array.isArray(raw)) return raw;

  // Try parsing as JSON array
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch { /* not JSON */ }

  // Legacy single-string value like "gemini-vision"
  const chain = [raw];
  for (const provider of DEFAULT_OCR_CHAIN) {
    if (!chain.includes(provider)) chain.push(provider);
  }
  return chain;
}

export async function runOCR(fileUrl: string, fileType: string, forceModel?: string): Promise<{ text: string, modelUsed: string }> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  let chain = parseOcrChain(settings?.ocrStrategy);
  if (forceModel) chain = [forceModel];
  const fullPath = path.join(process.cwd(), 'public', fileUrl);

  // Excel / CSV — handled separately via parseSpreadsheet(), not OCR
  if (['excel', 'csv', 'xlsx'].includes(fileType)) {
    throw new Error(
      'Spreadsheet files (Excel/CSV) should be parsed directly with parseSpreadsheet(), not OCR.'
    );
  }

  // Typed PDFs — extract text directly, no AI needed
  if (fileType === 'pdf') {
    const text = await extractFromPDF(fullPath);
    if (text.trim().length > 50) return { text, modelUsed: 'pdf-extract' };
    // Otherwise it's a scanned PDF — fall through to vision chain
  }

  // Run through the OCR fallback chain
  const errors: string[] = [];

  for (const providerId of chain) {
    const providerFn = OCR_PROVIDERS[providerId];
    if (!providerFn) {
      console.warn(`[OCR] Unknown provider "${providerId}", skipping`);
      continue;
    }

    try {
      console.log(`[OCR] Trying provider: ${providerId}`);
      const result = await providerFn(fullPath, fileType);
      console.log(`[OCR] Success with provider: ${providerId}`);
      return { text: result, modelUsed: providerId };
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      console.error(`[OCR] Provider "${providerId}" failed: ${msg}`);
      errors.push(`${providerId}: ${msg}`);
    }
  }

  // All providers failed
  throw new Error(
    forceModel ? errors[0]?.split(': ').slice(1).join(': ') || 'Model failed' : `All OCR providers failed.\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
  );
}
