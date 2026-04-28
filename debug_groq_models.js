const fetch = require('node-fetch');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

function decryptKey(encrypted) {
  const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !authTagHex || !encryptedHex) return encrypted;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function checkModels() {
  const p = new PrismaClient();
  const settings = await p.appSettings.findUnique({ where: { id: 1 } });
  p.$disconnect();
  const keys = settings.apiKeys || {};
  let key = process.env.GROQ_API_KEY;
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log(data);
}
checkModels();
