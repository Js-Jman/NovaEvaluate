import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, key } = await req.json();

    if (!provider || !key) {
      return NextResponse.json({ success: false, error: 'Provider and key are required' }, { status: 400 });
    }

    let response;

    switch (provider) {
      case 'gemini':
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        break;

      case 'groq':
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
        });
        break;

      case 'openrouter':
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.0-flash-lite-preview-02-05:free', messages: [{ role: 'user', content: 'hi' }] })
        });
        break;

      case 'cohere':
        response = await fetch('https://api.cohere.com/v1/chat', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'hi', model: 'command-light' })
        });
        break;

      case 'mistral':
        response = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'mistral-small-latest', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
        });
        break;

      default:
        return NextResponse.json({ success: false, error: 'Unsupported provider' }, { status: 400 });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || errorData?.message || `Provider rejected with status ${response.status}`;
      return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error(`[API KEY TEST ERROR]`, error);
    return NextResponse.json({ success: false, error: error.message || 'Validation failed due to network error' }, { status: 500 });
  }
}
