export interface GradeItem {
  questionNumber: string;
  studentAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback: string;
  confidence: number;
}

export interface GradeResult {
  grades: GradeItem[];
  totalMarks: number;
  overallFeedback: string;
}

export function parseGradeResponse(raw: string): GradeResult {
  // Strip markdown fences — some models add ```json ... ```
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse grading response as JSON. Raw response: ' + raw.substring(0, 200));
    }
  }

  const result = parsed as Record<string, unknown>;

  // Validate shape
  if (!result.grades || !Array.isArray(result.grades)) {
    throw new Error('Invalid grade response: missing "grades" array');
  }

  // Ensure totalMarks is computed if missing
  if (typeof result.totalMarks !== 'number') {
    result.totalMarks = (result.grades as GradeItem[]).reduce(
      (sum: number, g: GradeItem) => sum + (g.marksAwarded || 0),
      0
    );
  }

  return result as unknown as GradeResult;
}
