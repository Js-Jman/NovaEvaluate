import prisma from '../db';
import { decryptKey } from '../utils/encrypt';
import fs from 'fs';

const OCR_PROMPT = `
You are an expert OCR system for handwritten exam answer sheets.

Extract ALL text from this image exactly as written. Preserve all question numbers, bullet points, and structure. Do not format as JSON. Return pure text only.
`;

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
        key = rawKeys.groq; // fallback if not encrypted
      }
    }
  }
  
  if (!key || key.startsWith('your_')) {
    key = process.env.GROQ_API_KEY;
  }

  if (!key) {
    throw new Error('Groq API key not configured. Go to Settings to add it.');
  }

  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');

  const mimeType =
    fileType === 'pdf'
      ? 'application/pdf'
      : filePath.endsWith('.png')
        ? 'image/png'
        : filePath.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please extract all the text you see in this handwritten image. Provide only the extracted text.' },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: 'high'
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
    const msg = errorData?.error?.message || `Groq Vision rejected with status ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  const isFailure = !text || 
    text.length < 100 && (
      text.toLowerCase().includes("no text") || 
      text.toLowerCase().includes("don't see any text") || 
      text.toLowerCase().includes("completely black") ||
      text.toLowerCase().includes("cannot extract")
    );

  if (isFailure) {
    throw new Error('Groq Vision (Llama 4 Scout) failed to process the image (model bug).');
  }

  return text;
}
