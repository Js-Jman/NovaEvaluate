import { NextRequest } from 'next/server';
import { sendResultEmail } from '@/lib/email/sendResult';

// POST /api/email — send result email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return Response.json({ error: 'studentId is required' }, { status: 400 });
    }

    await sendResultEmail(Number(studentId));
    return Response.json({ sent: true });
  } catch (error: unknown) {
    console.error('[POST /api/email]', error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return Response.json({ sent: false, error: message }, { status: 500 });
  }
}
