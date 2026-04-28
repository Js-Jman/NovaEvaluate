type AITask = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function callOpenRouter(
  modelId: string,
  task: AITask,
  apiKey: string
): Promise<string> {
  // OpenRouter uses a unified OpenAI-compatible API
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

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      'X-Title': 'NovaEvaluate',
    },
    body: JSON.stringify({
      model: modelId === 'openrouter-auto' ? 'openrouter/auto' : modelId,
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errObj = new Error(`OpenRouter error: ${(err as Record<string, unknown>)?.error || response.statusText}`);
    (errObj as unknown as Record<string, unknown>).status = response.status;
    throw errObj;
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenRouter returned empty response');
  }

  return text;
}
