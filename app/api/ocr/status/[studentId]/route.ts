import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

// GET /api/ocr/status/[studentId] — poll OCR status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const student = await prisma.student.findUnique({
      where: { id: Number(studentId) },
      select: { ocrStatus: true, ocrText: true },
    });

    if (!student) {
      return Response.json({ error: 'Student not found' }, { status: 404 });
    }

    return Response.json({
      ocrStatus: student.ocrStatus,
      ocrText: student.ocrStatus === 'done' ? student.ocrText : undefined,
    });
  } catch (error) {
    console.error('[GET /api/ocr/status]', error);
    return Response.json({ error: 'Failed to fetch OCR status' }, { status: 500 });
  }
}
