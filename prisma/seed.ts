import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      activeModel: 'gemini-1.5-flash',
      ocrStrategy: 'gemini-vision',
      fallbackChain: ['gemini-1.5-flash', 'llama-3.3-70b', 'openrouter-auto'],
      apiKeys: {
        gemini: '',
        groq: '',
        openrouter: '',
        cohere: '',
        mistral: '',
      },
    },
  });

  console.log('✅ Seeded AppSettings (id=1)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
