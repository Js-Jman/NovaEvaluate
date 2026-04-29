import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { runOCR } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const { studentId, modelId } = await request.json();

    if (!studentId || !modelId) {
      return Response.json({ error: 'studentId and modelId are required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: Number(studentId) } });
    if (!student || !student.fileUrl) {
      return Response.json({ error: 'Student or file not found' }, { status: 404 });
    }

    try {
      const result = await runOCR(student.fileUrl, student.fileType || '', modelId);
      
      await prisma.student.update({
        where: { id: student.id },
        data: { ocrText: result.text, ocrStatus: 'done' },
      });

      return Response.json({ success: true, modelUsed: result.modelUsed });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      
      await prisma.student.update({
        where: { id: student.id },
        data: { ocrStatus: 'failed' },
      });

      return Response.json({ error: message }, { status: 500 });
    }
  } catch (error) {
    console.error('[POST /api/ocr/run]', error);
    return Response.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
