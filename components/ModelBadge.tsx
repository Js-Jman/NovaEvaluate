'use client';

import { motion } from 'framer-motion';

interface ModelBadgeProps {
  model: string;
  className?: string;
}

export default function ModelBadge({ model, className = '' }: ModelBadgeProps) {
  const displayName = model
    .replace('gemini-', 'Gemini ')
    .replace('llama-', 'Llama ')
    .replace('mixtral-', 'Mixtral ')
    .replace('openrouter-', 'OR:')
    .replace('command-', 'Command ')
    .replace('mistral-', 'Mistral ');

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase border border-[#e2ddf0] text-[#5b21b6] bg-[#f5f3ff] ${className}`}
    >
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#ec4899] to-[#8b5cf6]" />
      {displayName}
    </motion.span>
  );
}
