import { NextRequest } from 'next/server';
import prisma from '@/lib/db';

// PUT /api/results/[resultId] — override a grade
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    const id = Number(resultId);
    const body = await request.json();
    const { finalMarks } = body;

    if (finalMarks === undefined || finalMarks === null) {
      return Response.json({ error: 'finalMarks is required' }, { status: 400 });
    }

    // Get current grade for audit log
    const current = await prisma.gradedAnswer.findUnique({ where: { id } });
    if (!current) {
      return Response.json({ error: 'Grade not found' }, { status: 404 });
    }

    // Update grade and create audit log in transaction
    await prisma.$transaction([
      prisma.gradedAnswer.update({
        where: { id },
        data: {
          finalMarks: Number(finalMarks),
          isOverridden: true,
        },
      }),
      prisma.gradeAuditLog.create({
        data: {
          gradeId: id,
          oldMarks: current.finalMarks,
          newMarks: Number(finalMarks),
          changedBy: 'controller',
        },
      }),
    ]);

    // Recalculate student total
    const allGrades = await prisma.gradedAnswer.findMany({
      where: { studentId: current.studentId },
    });
    const newTotal = allGrades.reduce((sum: number, g: { finalMarks: number }) => sum + g.finalMarks, 0);
    await prisma.student.update({
      where: { id: current.studentId },
      data: { totalMarks: newTotal },
    });

    return Response.json({ updated: true });
  } catch (error) {
    console.error('[PUT /api/results/[resultId]]', error);
    return Response.json({ error: 'Failed to override grade' }, { status: 500 });
  }
}
