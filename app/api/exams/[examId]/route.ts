import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { deleteUploadFolder } from '@/lib/utils/fileHandler';

// GET /api/exams/[examId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const id = Number(examId);

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: 'asc' } },
        students: {
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { gradedAnswers: true } } },
        },
      },
    });

    if (!exam) {
      return Response.json({ error: 'Exam not found' }, { status: 404 });
    }

    return Response.json(exam);
  } catch (error) {
    console.error('[GET /api/exams/[examId]]', error);
    return Response.json({ error: 'Failed to fetch exam' }, { status: 500 });
  }
}

// PUT /api/exams/[examId]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const id = Number(examId);
    const body = await request.json();

    const exam = await prisma.exam.update({
      where: { id },
      data: {
        title: body.title,
        subject: body.subject,
        totalMarks: body.totalMarks ? Number(body.totalMarks) : undefined,
        status: body.status,
      },
    });

    return Response.json(exam);
  } catch (error) {
    console.error('[PUT /api/exams/[examId]]', error);
    return Response.json({ error: 'Failed to update exam' }, { status: 500 });
  }
}

// DELETE /api/exams/[examId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { examId } = await params;
    const id = Number(examId);

    await prisma.exam.delete({ where: { id } });
    deleteUploadFolder(`exams/${id}`);
    deleteUploadFolder(`students/${id}`);

    return Response.json({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/exams/[examId]]', error);
    return Response.json({ error: 'Failed to delete exam' }, { status: 500 });
  }
}
