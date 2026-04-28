import nodemailer from 'nodemailer';
import prisma from '../db';
import { buildResultEmail } from './resultTemplate';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendResultEmail(studentId: number): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      exam: true,
      gradedAnswers: { include: { question: true } },
    },
  });

  if (!student) throw new Error('Student not found');
  if (student.gradedAnswers.length === 0) throw new Error('No grades found for this student');

  const totalMarks = student.gradedAnswers.reduce((sum: number, g: { finalMarks: number }) => sum + g.finalMarks, 0);

  const html = buildResultEmail({
    studentName: student.name,
    examTitle: student.exam.title,
    subject: student.exam.subject ?? undefined,
    totalMarks,
    maxMarks: student.exam.totalMarks,
    grades: student.gradedAnswers.map((g: { question: { questionNumber: string; correctAnswer: string; maxMarks: number }; studentAnswer: string | null; finalMarks: number; aiFeedback: string | null }) => ({
      questionNumber: g.question.questionNumber,
      studentAnswer: g.studentAnswer ?? undefined,
      correctAnswer: g.question.correctAnswer,
      finalMarks: g.finalMarks,
      maxMarks: g.question.maxMarks,
      aiFeedback: g.aiFeedback ?? undefined,
    })),
  });

  await transporter.sendMail({
    from: `"${process.env.APP_NAME || 'NovaEvaluate'}" <${process.env.GMAIL_USER}>`,
    to: student.email,
    subject: `Your Result — ${student.exam.title}`,
    html,
  });

  await prisma.student.update({
    where: { id: studentId },
    data: { resultSent: true },
  });
}
