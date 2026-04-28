import fs from 'fs';
import path from 'path';

export function saveUploadedFile(
  buffer: Buffer,
  folder: string,     // "exams/{examId}" or "students/{examId}/{studentId}"
  filename: string    // "answer_key.pdf" or "sheet.jpg"
): string {
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${folder}/${filename}`; // public URL path
}

export function deleteUploadFolder(folder: string): void {
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
