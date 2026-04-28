const { PrismaClient } = require('@prisma/client');
const { ocrWithGeminiVision } = require('./lib/ocr/geminiVision.ts');

async function test() {
  const p = new PrismaClient();
  try {
    const res = await ocrWithGeminiVision('public/uploads/students/3/7/sheet.png', 'png');
    console.log('Gemini Result:', res);
  } catch (err) {
    console.log('Gemini Error:', err.message);
  }
  p.$disconnect();
}
test();
