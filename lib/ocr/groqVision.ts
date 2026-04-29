import prisma from '../db';
import { decryptKey } from '../utils/encrypt';
import fs from 'fs';
import sharp from 'sharp';

// Groq vision-capable models in priority order
const GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
];

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

async function resizeImageForGroq(filePath: string): Promise<{ base64: string; mimeType: string }> {
  // Resize to max 1000px wide, convert to JPEG (smaller than PNG) at 85% quality
  const resizedBuffer = await sharp(filePath)
    .resize({ width: 1600, withoutEnlargement: true }) // Increased for better text clarity
    .jpeg({ quality: 95 }) // Higher quality
    .toBuffer();

  return {
    base64: resizedBuffer.toString('base64'),
    mimeType: 'image/jpeg',
  };
}

export async function ocrWithGroqVision(
  filePath: string,
  fileType: string,
  apiKey?: string
): Promise<string> {
  // Resolve the API key
  let key = apiKey;
  if (!key) {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const rawKeys = (settings?.apiKeys as Record<string, string>) || {};
    if (rawKeys.groq) {
      try {
        key = decryptKey(rawKeys.groq);
      } catch {
        key = rawKeys.groq;
      }
    }
  }

  if (!key || key.startsWith('your_')) {
    key = process.env.GROQ_API_KEY;
  }

  if (!key) {
    throw new Error('Groq API key not configured. Go to Settings to add it.');
  }

  if (fileType === 'pdf') {
    throw new Error('Groq Vision does not support PDFs. Falling back to next provider.');
  }

  // Resize + compress image before sending to Groq (avoids base64 size issues)
  const { base64, mimeType } = await resizeImageForGroq(filePath);
  console.log(`[OCR] Groq: resized image to ${Math.round(base64.length / 1024)} KB base64`);

  const REFUSAL_PATTERNS = [
    /i('m| am) sorry/i,
    /don't see any text/i,
    /no (visible|text)/i,
    /completely black/i,
    /cannot extract/i,
    /unable to (see|read|transcribe|extract)/i,
    /provide a different image/i,
    /no handwritten text/i,
    /appears to be (blank|black|empty)/i,
  ];

  const errors: string[] = [];

  for (const model of GROQ_VISION_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
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
                    detail: 'high',
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
          temperature: 0.1,
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

      if (REFUSAL_PATTERNS.some(p => p.test(text))) {
        errors.push(`${model}: Model refused — "${text.slice(0, 100)}..."`);
        continue;
      }

      if (!text) {
        errors.push(`${model}: Empty response`);
        continue;
      }

      console.log(`[OCR] Groq Vision succeeded with model: ${model}`);
      return text;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg}`);
      continue;
    }
  }

  throw new Error(`Groq Vision failed:\n${errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`);
}
