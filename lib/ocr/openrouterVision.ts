import prisma from '../db';
import { decryptKey } from '../utils/encrypt';
import fs from 'fs';
import sharp from 'sharp';

const OCR_PROMPT = `You are an expert OCR assistant specializing in handwritten text extraction.

This image contains a handwritten student exam answer sheet.

Task: Carefully read and transcribe ALL visible handwritten text exactly as written.

Rules:
- Preserve all question numbers exactly as they appear (e.g., "1.", "2.", "3.")
- Include every line of each answer, even continuation lines
- If a word is unclear, write your best guess
- Do NOT skip any question
- Output raw plain text only — no JSON, no markdown, no explanations

Expected output format:
1. The full text of answer one here,
continuing on the next line if needed.
2. The full text of answer two here.
3. Answer three here.`;

async function prepareImage(filePath: string): Promise<{ base64: string; mimeType: string }> {
  // Resize to max 1200px wide, convert to JPEG to minimize base64 payload
  const resizedBuffer = await sharp(filePath)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();

  return {
    base64: resizedBuffer.toString('base64'),
    mimeType: 'image/jpeg',
  };
}

export async function ocrWithOpenRouterVision(
  filePath: string,
  fileType: string,
  apiKey?: string
): Promise<string> {
  let key = apiKey;
  if (!key) {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const rawKeys = (settings?.apiKeys as Record<string, string>) || {};
    if (rawKeys.openrouter) {
      try {
        key = decryptKey(rawKeys.openrouter);
      } catch {
        key = rawKeys.openrouter;
      }
    }
  }

  if (!key || key.startsWith('your_')) {
    key = process.env.OPENROUTER_API_KEY;
  }

  if (!key) {
    throw new Error('OpenRouter API key not configured. Go to Settings to add it.');
  }

  if (fileType === 'pdf') {
    throw new Error('OpenRouter Vision does not support PDFs directly.');
  }

  // Use multiple free vision models on OpenRouter as internal fallbacks
  const OPENROUTER_VISION_MODELS = [
    'google/gemini-flash-1.5-8b',
    'meta-llama/llama-3.2-11b-vision-instruct:free',
    'qwen/qwen2-vl-7b-instruct:free',
  ];

  const { base64, mimeType } = await prepareImage(filePath);
  console.log(`[OCR] OpenRouter: sending ${Math.round(base64.length / 1024)} KB base64`);

  const errors: string[] = [];
  const REFUSAL_PATTERNS = [
    /i('m| am) sorry/i,
    /don't see any text/i,
    /no (visible|text)/i,
    /completely black/i,
    /cannot (extract|see|read)/i,
    /unable to/i,
    /provide a different image/i,
    /appears to be (blank|black|empty)/i,
  ];

  for (const model of OPENROUTER_VISION_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nova-evaluate.app',
          'X-Title': 'NovaEvaluate',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: OCR_PROMPT },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`;
        errors.push(`${model}: ${msg}`);
        continue;
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';

      if (!text || REFUSAL_PATTERNS.some(p => p.test(text))) {
        errors.push(`${model}: Refused or empty — "${text.slice(0, 80)}"`);
        continue;
      }

      console.log(`[OCR] OpenRouter Vision succeeded with model: ${model}`);
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
      continue;
    }
  }

  throw new Error(`OpenRouter Vision failed all models:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`);
}
