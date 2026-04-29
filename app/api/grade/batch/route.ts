import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { gradeStudent } from '@/lib/grading';

// POST /api/grade/batch — grade all students in an exam
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return Response.json({ error: 'examId is required' }, { status: 400 });
    }

    // Find students with completed OCR and no grades yet
    const students = await prisma.student.findMany({
      where: {
        examId: Number(examId),
        ocrStatus: 'done',
        gradedAnswers: { none: {} },
      },
    });

    let processed = 0;
    let failed = 0;
    const failedStudents: string[] = [];

    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });

    // Process sequentially to avoid rate limits
    for (const student of students) {
      try {
        await gradeStudent(student.id, Number(examId));
        
        if ((settings as any)?.autoPublish) {
          try {
            const { sendResultEmail } = await import('@/lib/email/sendResult');
            await sendResultEmail(student.id, false);
          } catch (e) {
            console.error(`[AutoPublish] Email failed for ${student.name}:`, e);
          }
        }
        
        processed++;
      } catch (error: unknown) {
        failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        failedStudents.push(`${student.name}: ${message}`);
        console.error(`[batch-grade] Failed for ${student.name}:`, error);
      }
    }

    return Response.json({ processed, failed, failedStudents, total: students.length });
  } catch (error: unknown) {
    console.error('[POST /api/grade/batch]', error);
    const message = error instanceof Error ? error.message : 'Batch grading failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
