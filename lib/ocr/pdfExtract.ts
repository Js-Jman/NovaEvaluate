import fs from 'fs';

export async function extractFromPDF(filePath: string): Promise<string> {
  // Dynamic import to avoid Turbopack bundling issues
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
}
