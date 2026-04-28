import { NextRequest } from 'next/server';
import { callAI } from '@/lib/ai/switchboard';
import { parseSpreadsheet } from '@/lib/ocr/parseSpreadsheet';

// POST /api/parse-key — LLM parses OCR text into structured Q&A, or parse spreadsheet directly
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { examId, ocrText, fileUrl, fileType } = body;

    // If it's a spreadsheet, parse directly without AI
    if (fileType === 'excel' || fileType === 'csv') {
      const questions = parseSpreadsheet(fileUrl, fileType);
      return Response.json({ questions, source: 'spreadsheet' });
    }

    if (!ocrText) {
      return Response.json({ error: 'ocrText is required for non-spreadsheet files' }, { status: 400 });
    }

    const prompt = `
You are parsing an exam answer key. Extract all questions and their correct answers from the following text.

Rules:
- Identify question numbers as written (Q1, 1, 1a, Part A, etc.)
- Extract the question text if visible (may not always be present)
- Extract the correct/model answer for each question
- Assign reasonable max marks if not explicitly stated (default: 5)

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "questionNumber": "Q1",
      "questionText": "What is Newton's second law?",
      "correctAnswer": "F = ma. Force equals mass times acceleration.",
      "maxMarks": 5
    }
  ]
}

ANSWER KEY TEXT:
${ocrText}
`;

    const { text } = await callAI({ prompt });

    // Parse the AI response
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();
    let parsed: { questions: Array<{ questionNumber: string; questionText: string; correctAnswer: string; maxMarks: number }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('AI response missing questions array');
    }

    return Response.json({ questions: parsed.questions, examId: Number(examId), source: 'ai' });
  } catch (error: unknown) {
    console.error('[POST /api/parse-key]', error);
    const message = error instanceof Error ? error.message : 'Failed to parse answer key';
    return Response.json({ error: message }, { status: 500 });
  }
}
