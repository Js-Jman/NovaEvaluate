import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  serverExternalPackages: ['tesseract.js', 'pdf-parse', 'formidable', 'nodemailer'],
};

export default nextConfig;
