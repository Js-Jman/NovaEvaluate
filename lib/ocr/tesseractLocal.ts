import Tesseract from 'tesseract.js';

export async function ocrWithTesseract(filePath: string): Promise<string> {
  const result = await Tesseract.recognize(filePath, 'eng', {
    logger: (info) => {
      if (info.status === 'recognizing text') {
        console.log(`[Tesseract] Progress: ${Math.round((info.progress || 0) * 100)}%`);
      }
    },
  });

  const text = result.data.text;

  if (!text || text.trim().length === 0) {
    throw new Error('Tesseract could not extract any text from the image');
  }

  return text.trim();
}
