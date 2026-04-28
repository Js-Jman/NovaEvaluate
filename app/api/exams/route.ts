import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

// GET /api/exams — list all exams with student count
export async function GET() {
  try {
    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { students: true } },
      },
    });
    return Response.json(exams);
  } catch (error) {
    console.error('[GET /api/exams]', error);
    return Response.json({ error: 'Failed to fetch exams' }, { status: 500 });
  }
}

// POST /api/exams — create exam with questions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subject, totalMarks, fileUrl, fileType, questions } = body;

    if (!title || !totalMarks || !questions?.length) {
      return Response.json(
        { error: 'Title, totalMarks, and at least one question are required' },
        { status: 400 }
      );
    }

    const calculatedTotal = questions.reduce((sum: number, q: { maxMarks: string | number }) => sum + Number(q.maxMarks), 0);
    if (calculatedTotal !== Number(totalMarks)) {
      return Response.json(
        { error: `Validation Failed: Total marks for the exam (${totalMarks}) does not match the sum of marks from all questions (${calculatedTotal}).` },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        subject: subject || null,
        totalMarks: Number(totalMarks),
        fileUrl: fileUrl || '',
        fileType: fileType || 'text',
        status: 'active',
        questions: {
          create: questions.map((q: { questionNumber: string; questionText?: string; correctAnswer: string; maxMarks: number }) => ({
            questionNumber: q.questionNumber,
            questionText: q.questionText || null,
            correctAnswer: q.correctAnswer,
            maxMarks: Number(q.maxMarks),
          })),
        },
      },
    });

    return Response.json({ id: exam.id }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/exams]', error);
    return Response.json({ error: 'Failed to create exam' }, { status: 500 });
  }
}
