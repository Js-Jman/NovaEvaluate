import prisma from '../db';
import { callAI } from '../ai/switchboard';
import { buildGradingPrompt } from './prompt';
import { parseGradeResponse } from './parseResponse';

export async function gradeStudent(
  studentId: number,
  examId: number
): Promise<{ totalMarks: number; modelUsed: string }> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new Error(`Student ${studentId} not found`);
  if (student.ocrStatus !== 'done' || !student.ocrText) {
    throw new Error(`Student ${studentId} OCR not complete (status: ${student.ocrStatus})`);
  }

  const questions = await prisma.question.findMany({
    where: { examId },
    orderBy: { id: 'asc' },
  });
  if (questions.length === 0) throw new Error(`No questions found for exam ${examId}`);

  const studentAnswers = parseStudentOCR(student.ocrText);

  const taskPayload = (modelId: string) => ({
    prompt: buildGradingPrompt(
      modelId,
      questions.map((q: { questionNumber: string; questionText: string | null; correctAnswer: string; maxMarks: number }) => ({
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        maxMarks: q.maxMarks,
      })),
      studentAnswers
    )
  });

  const { text: aiResponse, modelUsed } = await callAI(taskPayload);
  const gradeResult = parseGradeResponse(aiResponse);

  await prisma.gradedAnswer.deleteMany({ where: { studentId } });

  for (const grade of gradeResult.grades) {
    const question = questions.find((q: { questionNumber: string; id: number }) => q.questionNumber === grade.questionNumber);
    if (!question) continue;

    await prisma.gradedAnswer.create({
      data: {
        studentId,
        questionId: question.id,
        studentAnswer: grade.studentAnswer || studentAnswers[grade.questionNumber] || null,
        aiMarks: grade.marksAwarded,
        finalMarks: grade.marksAwarded,
        aiFeedback: grade.feedback,
        aiConfidence: grade.confidence,
        gradingModel: modelUsed,
      },
    });
  }

  await prisma.student.update({
    where: { id: studentId },
    data: { totalMarks: gradeResult.totalMarks },
  });

  return { totalMarks: gradeResult.totalMarks, modelUsed };
}

function parseStudentOCR(ocrText: string): Record<string, string> {
  const answers: Record<string, string> = {};
  try {
    const cleaned = ocrText.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned) as { answers?: Array<{ questionNumber: string; answerText: string }> };
    if (parsed.answers && Array.isArray(parsed.answers)) {
      for (const ans of parsed.answers) {
        answers[ans.questionNumber] = ans.answerText;
        // Also store under normalized keys (with and without Q prefix)
        const num = ans.questionNumber.replace(/^[Qq]\s*/, '');
        answers[num] = ans.answerText;
        answers[`Q${num}`] = ans.answerText;
      }
      return answers;
    }
  } catch { /* not JSON, try plain text */ }

  // Plain text parsing — look for numbered answers
  const lines = ocrText.split('\n');
  let currentQ = '';
  let currentAnswer = '';
  for (const line of lines) {
    const match = line.match(/^[^a-zA-Z0-9]*(?:Q|q)?\s*(\d+[a-z]?)\s*[\.\)\:\-]\s*(.*)/);
    if (match) {
      if (currentQ) {
        const trimmed = currentAnswer.trim();
        answers[currentQ] = trimmed;
        answers[`Q${currentQ}`] = trimmed;
      }
      currentQ = match[1];
      currentAnswer = match[2] || '';
    } else if (currentQ) {
      currentAnswer += '\n' + line;
    }
  }
  if (currentQ) {
    const trimmed = currentAnswer.trim();
    answers[currentQ] = trimmed;
    answers[`Q${currentQ}`] = trimmed;
  }

  // Also look for "a." answer lines immediately after question lines
  // Pattern: "1. What is...?\n a. The answer is..."
  const answerMatch = ocrText.matchAll(/(?:^|\n)\s*(\d+[a-z]?)\.\s+[^\n]+\n\s*a\.\s+([^\n]+(?:\n(?!\s*\d+[a-z]?\.).*)*)/g);
  for (const m of answerMatch) {
    const num = m[1];
    const ansText = m[2].trim();
    if (ansText && !answers[num]) {
      answers[num] = ansText;
      answers[`Q${num}`] = ansText;
    }
  }

  return answers;
}
