import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import prisma from '../db';
import { decryptKey } from '../utils/encrypt';

const OCR_PROMPT = `
You are an expert OCR system for handwritten exam answer sheets.

Task: Extract ALL text from this image, preserving structure.

Rules:
- Identify and extract each question's answer separately
- Preserve question numbers exactly as written (Q1, 1a, Part A, i, etc.)
- If text is unclear, write your best guess followed by [?]
- Do NOT skip any text, even if illegible — mark it [illegible]

Return ONLY this JSON (no markdown, no explanation):
{
  "answers": [
    { "questionNumber": "Q1", "answerText": "student's answer here" },
    { "questionNumber": "Q2", "answerText": "..." }
  ],
  "rawText": "complete raw text as one string"
}
`;

export async function ocrWithGeminiVision(
  filePath: string,
  fileType: string,
  apiKey?: string
): Promise<string> {
  let key = apiKey || process.env.GEMINI_API_KEY;
  
  // Try fetching from DB if not provided
  if (!key || key === 'your_gemini_api_key_here') {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    const rawKeys = (settings?.apiKeys as Record<string, string>) || {};
    if (rawKeys.gemini) {
      try {
        key = decryptKey(rawKeys.gemini);
      } catch {
        key = rawKeys.gemini;
      }
    }
  }
  
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Go to Settings to add it.');
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

  const result = await model.generateContent([
    OCR_PROMPT,
    {
      inlineData: {
        data: base64,
        mimeType,
      },
    },
  ]);

  const response = result.response;
  const text = response.text();

  if (!text) {
    throw new Error('Gemini Vision returned empty response');
  }

  return text;
}
