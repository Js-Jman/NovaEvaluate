import { GoogleGenerativeAI } from '@google/generative-ai';

type AITask = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function callGemini(
  modelId: string,
  task: AITask,
  apiKey: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);

  // Map our model IDs to Gemini API model names
  const modelMap: Record<string, string> = {
    'gemini-1.5-flash': 'gemini-2.0-flash',
    'gemini-2.0-flash': 'gemini-2.0-flash',
    'gemini-1.5-pro': 'gemini-1.5-pro',
  };

  const modelName = modelMap[modelId] || modelId;
  const model = genAI.getGenerativeModel({ model: modelName });

  const parts: Array<string | { inlineData: { data: string; mimeType: string } }> = [task.prompt];

  if (task.imageBase64 && task.mimeType) {
    parts.push({
      inlineData: {
        data: task.imageBase64,
        mimeType: task.mimeType,
      },
    });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();

  if (!text) {
    throw new Error(`Gemini (${modelName}) returned empty response`);
  }

  return text;
}
