import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { saveUploadedFile } from '@/lib/utils/fileHandler';
import { validateFile, getFileExtension, getFileType } from '@/lib/utils/validators';
import { runOCR } from '@/lib/ocr';

// POST /api/upload/student
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const examId = formData.get('examId') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const rollNumber = formData.get('rollNumber') as string | null;
    const file = formData.get('file') as File;

    if (!examId || !name || !email || !file) {
      return Response.json(
        { error: 'examId, name, email, and file are required' },
        { status: 400 }
      );
    }

    const validation = validateFile(file.name, file.size);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const ext = getFileExtension(file.name);
    const fileType = getFileType(ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create student record first to get ID
    const student = await prisma.student.create({
      data: {
        examId: Number(examId),
        name,
        email,
        rollNumber: rollNumber || null,
        fileUrl: '', // will update after saving file
        fileType,
        ocrStatus: 'processing',
      },
    });

    const fileUrl = saveUploadedFile(
      buffer,
      `students/${examId}/${student.id}`,
      `sheet.${ext}`
    );

    await prisma.student.update({
      where: { id: student.id },
      data: { fileUrl },
    });

    return Response.json(
      { studentId: student.id, fileUrl, ocrStatus: 'processing' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/upload/student]', error);
    return Response.json({ error: 'Failed to upload student sheet' }, { status: 500 });
  }
}
