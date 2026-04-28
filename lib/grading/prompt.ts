export function buildGradingPrompt(
  modelId: string,
  questions: Array<{
    questionNumber: string;
    questionText?: string | null;
    correctAnswer: string;
    maxMarks: number;
  }>,
  studentAnswers: Record<string, string>
): string {
  const items = questions.map((q) => {
    const qn = q.questionNumber;
    const plainNum = qn.replace(/^[Qq]\s*/, '');
    const studentAnswer = studentAnswers[qn] 
      || studentAnswers[`Q${plainNum}`] 
      || studentAnswers[plainNum] 
      || '[No answer found]';
    return {
      questionNumber: qn,
      questionText: q.questionText ?? null,
      correctAnswer: q.correctAnswer,
      maxMarks: q.maxMarks,
      studentAnswer,
    };
  });

  const id = modelId.toLowerCase();
  
  let customInstructions = '';
  if (id.includes('llama')) {
    customInstructions = '\nCRITICAL: You are a strict JSON engine. You must output ONLY raw, valid JSON. Do not include markdown formatting (like ```json), no preambles, and no trailing text. Failure to output pure JSON will break the system.';
  } else if (id.includes('mistral') || id.includes('mixtral')) {
    customInstructions = '\nCRITICAL: Respond exclusively with a valid JSON object. Do not include any explanations or conversational text before or after the JSON.';
  } else if (id.includes('gemini')) {
    customInstructions = '\nCRITICAL: Output only the raw JSON object. Do not wrap the JSON in markdown code blocks. Keep the feedback concise and professional.';
  } else if (id.includes('command') || id.includes('cohere')) {
    customInstructions = '\nCRITICAL: You must respond with a strictly valid JSON object. No conversational text, no preambles, no explanations. Just the JSON.';
  } else if (id.includes('gemma')) {
    customInstructions = '\nCRITICAL: Your output must be purely valid JSON. Do not output anything else. No formatting blocks, no conversational text.';
  } else if (id.includes('openrouter')) {
    customInstructions = '\nCRITICAL: You are acting as an API endpoint. Return ONLY a valid JSON object. Do not include markdown formatting or any other text.';
  }

  return `
You are a fair and consistent exam evaluator. Grade each student answer below.${customInstructions}

GRADING RULES:
1. Award marks from 0 to maxMarks (decimal allowed, e.g. 2.5)
2. For concept/theory questions: award partial marks for partially correct answers
3. For factual/calculation questions: full marks if correct, 0 if wrong
4. Do NOT penalise for grammar or spelling unless the question tests it
5. Rate your own confidence 0–100 for each grade (low if handwriting was unclear)

Return ONLY valid JSON (no markdown, no extra text):
{
  "grades": [
    {
      "questionNumber": "Q1",
      "studentAnswer": "reproduced from input for reference",
      "marksAwarded": 4.0,
      "maxMarks": 5,
      "feedback": "One-line feedback explaining the mark",
      "confidence": 88
    }
  ],
  "totalMarks": 34,
  "overallFeedback": "Brief summary of overall performance"
}

QUESTIONS AND STUDENT ANSWERS:
${JSON.stringify(items, null, 2)}
`;
}
