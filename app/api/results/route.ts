import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

// GET /api/results?examId=X&studentId=Y
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const examId = searchParams.get('examId');
    const studentId = searchParams.get('studentId');

    if (!examId || !studentId) {
      return Response.json({ error: 'examId and studentId are required' }, { status: 400 });
    }

    const grades = await prisma.gradedAnswer.findMany({
      where: {
        studentId: Number(studentId),
        question: { examId: Number(examId) },
      },
      include: {
        question: {
          select: {
            questionNumber: true,
            questionText: true,
            correctAnswer: true,
            maxMarks: true,
          },
        },
      },
      orderBy: { question: { id: 'asc' } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = grades.map((g: any) => ({
      id: g.id,
      questionId: g.questionId,
      questionNumber: g.question.questionNumber,
      questionText: g.question.questionText,
      correctAnswer: g.question.correctAnswer,
      maxMarks: g.question.maxMarks,
      studentAnswer: g.studentAnswer,
      aiMarks: g.aiMarks,
      finalMarks: g.finalMarks,
      aiFeedback: g.aiFeedback,
      aiConfidence: g.aiConfidence,
      isOverridden: g.isOverridden,
      gradingModel: g.gradingModel,
    }));

    return Response.json(result);
  } catch (error) {
    console.error('[GET /api/results]', error);
    return Response.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
