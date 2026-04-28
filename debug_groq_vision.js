const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

function decryptKey(encrypted) {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return encrypted;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

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

async function testGroqVision() {
  const p = new PrismaClient();
  const settings = await p.appSettings.findUnique({ where: { id: 1 } });
  p.$disconnect();
  const keys = settings.apiKeys || {};
  let key = process.env.GROQ_API_KEY;
  
  const imageBuffer = fs.readFileSync('public/uploads/students/3/7/sheet.png');
  const base64 = imageBuffer.toString('base64');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            { type: 'text', text: OCR_PROMPT },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
testGroqVision();
