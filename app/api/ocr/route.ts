import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { runOCR } from '@/lib/ocr';

// POST /api/ocr — run OCR on a file
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetType, targetId, fileUrl, fileType } = body;

    if (!targetType || targetId == null || !fileUrl || !fileType) {
      return Response.json(
        { error: 'targetType, targetId, fileUrl, and fileType are required' },
        { status: 400 }
      );
    }

    const ocrText = await runOCR(fileUrl, fileType);

    // Only persist to DB if a real record ID was provided (not 0)
    if (targetType === 'student' && Number(targetId) > 0) {
      await prisma.student.update({
        where: { id: Number(targetId) },
        data: { ocrText, ocrStatus: 'done' },
      });
    } else if (targetType === 'answer_key' && Number(targetId) > 0) {
      await prisma.exam.update({
        where: { id: Number(targetId) },
        data: { extractedText: ocrText },
      });
    }

    return Response.json({ ocrText, status: 'done' });
  } catch (error: unknown) {
    console.error('[POST /api/ocr]', error);
    const message = error instanceof Error ? error.message : 'OCR failed';

    // If this was for a student, mark as failed
    try {
      const body = await request.clone().json();
      if (body.targetType === 'student' && body.targetId) {
        await prisma.student.update({
          where: { id: Number(body.targetId) },
          data: { ocrStatus: 'failed' },
        });
      }
    } catch { /* ignore */ }

    return Response.json({ error: message, status: 'failed' }, { status: 500 });
  }
}
