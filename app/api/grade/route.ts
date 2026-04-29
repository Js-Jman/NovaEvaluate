import { NextRequest } from 'next/server';
import { gradeStudent } from '@/lib/grading';
import prisma from '@/lib/db';

// POST /api/grade — grade one student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, examId, modelId } = body;

    if (!studentId || !examId) {
      return Response.json({ error: 'studentId and examId are required' }, { status: 400 });
    }
    // Check if it's a regrade
    const existingGrades = await prisma.gradedAnswer.count({
      where: { studentId: Number(studentId) }
    });
    const isRegrade = existingGrades > 0;

    const result = await gradeStudent(Number(studentId), Number(examId), modelId);

    // Auto-publish if enabled
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    if ((settings as any)?.autoPublish) {
      try {
        const { sendResultEmail } = await import('@/lib/email/sendResult');
        await sendResultEmail(Number(studentId), isRegrade);
      } catch (err) {
        console.error('[AutoPublish] Failed to send email:', err);
      }
    }

    return Response.json(result);
  } catch (error: unknown) {
    console.error('[POST /api/grade]', error);
    const message = error instanceof Error ? error.message : 'Grading failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
