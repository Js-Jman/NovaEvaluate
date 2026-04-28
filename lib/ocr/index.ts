import { ocrWithGeminiVision } from './geminiVision';
import { ocrWithGroqVision } from './groqVision';
import { ocrWithTesseract } from './tesseractLocal';
import { extractFromPDF } from './pdfExtract';
import prisma from '../db';
import path from 'path';

const OCR_PROVIDERS: Record<string, (filePath: string, fileType: string) => Promise<string>> = {
  'gemini-vision': ocrWithGeminiVision,
  'groq-vision': ocrWithGroqVision,
  'tesseract': ocrWithTesseract,
};

const DEFAULT_OCR_CHAIN = ['gemini-vision', 'groq-vision', 'tesseract'];

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

  // Legacy single-string value like "gemini-vision" or "tesseract"
  // Wrap it in an array and append the rest as fallbacks
  const chain = [raw];
  for (const provider of DEFAULT_OCR_CHAIN) {
    if (!chain.includes(provider)) chain.push(provider);
  }
  return chain;
}

export async function runOCR(fileUrl: string, fileType: string): Promise<string> {
  const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
  const chain = parseOcrChain(settings?.ocrStrategy);
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
    // If pdf-parse returns substantial text, use it
    if (text.trim().length > 50) return text;
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
      return result;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[OCR] Provider "${providerId}" failed: ${msg}`);
      errors.push(`${providerId}: ${msg}`);
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(
    `All OCR providers failed.\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
  );
}
