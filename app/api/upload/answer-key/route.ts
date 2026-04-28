import { NextRequest } from 'next/server';
import { saveUploadedFile } from '@/lib/utils/fileHandler';
import { validateFile, getFileExtension, getFileType } from '@/lib/utils/validators';

// POST /api/upload/answer-key
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const examId = formData.get('examId') as string;
    const file = formData.get('file') as File;

    if (!examId || !file) {
      return Response.json({ error: 'examId and file are required' }, { status: 400 });
    }

    const validation = validateFile(file.name, file.size);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const ext = getFileExtension(file.name);
    const fileType = getFileType(ext);
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = saveUploadedFile(buffer, `exams/${examId}`, `answer_key.${ext}`);

    return Response.json({ fileUrl, fileType });
  } catch (error) {
    console.error('[POST /api/upload/answer-key]', error);
    return Response.json({ error: 'Failed to upload answer key' }, { status: 500 });
  }
}
