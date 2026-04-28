import { NextRequest } from 'next/server';
import { gradeStudent } from '@/lib/grading';

// POST /api/grade — grade one student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, examId } = body;

    if (!studentId || !examId) {
      return Response.json({ error: 'studentId and examId are required' }, { status: 400 });
    }

    const result = await gradeStudent(Number(studentId), Number(examId));
    return Response.json(result);
  } catch (error: unknown) {
    console.error('[POST /api/grade]', error);
    const message = error instanceof Error ? error.message : 'Grading failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
