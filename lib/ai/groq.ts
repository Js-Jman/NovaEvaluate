import Groq from 'groq-sdk';

type AITask = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function callGroq(
  modelId: string,
  task: AITask,
  apiKey: string
): Promise<string> {
  const groq = new Groq({ apiKey });

  // Map our model IDs to Groq API model names
  const modelMap: Record<string, string> = {
    'llama-3.3-70b': 'llama-3.3-70b-versatile',
    'llama-3.2-vision': 'llama-3.2-90b-vision-preview',
    'mixtral-8x7b': 'mixtral-8x7b-32768',
    'gemma2-9b': 'gemma2-9b-it',
  };

  const modelName = modelMap[modelId] || modelId;

  // Build messages based on whether this is a vision task
  type MessageContent = string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

  const content: MessageContent = task.imageBase64 && task.mimeType
    ? [
        { type: 'text' as const, text: task.prompt },
        {
          type: 'image_url' as const,
          image_url: {
            url: `data:${task.mimeType};base64,${task.imageBase64}`,
          },
        },
      ]
    : task.prompt;

  const completion = await groq.chat.completions.create({
    model: modelName,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text) {
    throw new Error(`Groq (${modelName}) returned empty response`);
  }

  return text;
}
