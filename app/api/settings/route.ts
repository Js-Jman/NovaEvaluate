import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { encryptKey, decryptKey } from '@/lib/utils/encrypt';

// GET /api/settings — return settings with masked keys
export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      return Response.json({ error: 'Settings not configured' }, { status: 404 });
    }

    const rawKeys = settings.apiKeys as Record<string, string>;
    const providers: string[] = [];

    for (const [provider, encrypted] of Object.entries(rawKeys)) {
      if (encrypted) {
        try {
          const decrypted = decryptKey(encrypted);
          if (decrypted) providers.push(provider);
        } catch {
          if (encrypted.length > 0) providers.push(provider);
        }
      }
    }

    // Parse ocrStrategy — handle both legacy string and JSON array
    let ocrStrategy: string[];
    try {
      const parsed = JSON.parse(settings.ocrStrategy);
      ocrStrategy = Array.isArray(parsed) ? parsed : [settings.ocrStrategy];
    } catch {
      ocrStrategy = [settings.ocrStrategy];
    }

    return Response.json({
      activeModel: settings.activeModel,
      ocrStrategy,
      fallbackChain: settings.fallbackChain,
      providers,
      autoPublish: (settings as any).autoPublish,
    });
  } catch (error) {
    console.error('[GET /api/settings]', error);
    return Response.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/settings — update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.activeModel) updateData.activeModel = body.activeModel;
    if (body.ocrStrategy) {
      // Store as JSON string if array, or plain string
      updateData.ocrStrategy = Array.isArray(body.ocrStrategy)
        ? JSON.stringify(body.ocrStrategy)
        : body.ocrStrategy;
    }
    if (body.fallbackChain) updateData.fallbackChain = body.fallbackChain;
    if (typeof body.autoPublish === 'boolean') updateData.autoPublish = body.autoPublish;

    if (body.apiKeys) {
      // Get existing keys
      const current = await prisma.appSettings.findUnique({ where: { id: 1 } });
      const existingKeys = (current?.apiKeys as Record<string, string>) || {};

      // Merge and encrypt new keys
      const updatedKeys = { ...existingKeys };
      for (const [provider, key] of Object.entries(body.apiKeys as Record<string, string>)) {
        if (key) {
          updatedKeys[provider] = encryptKey(key);
        }
      }
      updateData.apiKeys = updatedKeys;
    }

    await prisma.appSettings.update({
      where: { id: 1 },
      data: updateData,
    });

    return Response.json({ updated: true });
  } catch (error) {
    console.error('[PUT /api/settings]', error);
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
