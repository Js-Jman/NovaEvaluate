type AITask = {
  prompt: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function callCohere(
  modelId: string,
  task: AITask,
  apiKey: string
): Promise<string> {
  // Cohere doesn't support vision, so ignore image data
  const modelMap: Record<string, string> = {
    'command-r-plus': 'command-r-plus',
  };

  const model = modelMap[modelId] || 'command-r-plus';

  const response = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      message: task.prompt,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errObj = new Error(`Cohere error: ${(err as Record<string, unknown>)?.message || response.statusText}`);
    (errObj as unknown as Record<string, unknown>).status = response.status;
    throw errObj;
  }

  const data = await response.json() as { text: string };
  const text = data.text;

  if (!text) {
    throw new Error(`Cohere (${model}) returned empty response`);
  }

  return text;
}
