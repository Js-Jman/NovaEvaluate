'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function NavHeader() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-[#e2ddf0] bg-white/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-sm font-bold text-white">N</span>
          </motion.div>
          <span className="text-lg font-bold gradient-text">NovaEvaluate</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === '/'
                  ? 'text-[#0f172a] bg-[#f1f5f9]'
                  : 'text-[#64748b] hover:text-[#334155]'
              }`}
            >
              Exams
            </motion.button>
          </Link>
          <Link href="/settings">
            <motion.button
              whileHover={{ scale: 1.05, rotate: 15 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-lg p-2 text-lg transition-colors ${
                pathname === '/settings'
                  ? 'text-[#8b5cf6]'
                  : 'text-[#64748b] hover:text-[#334155]'
              }`}
            >
              ⚙️
            </motion.button>
          </Link>
        </nav>
      </div>

      {/* Gradient accent line at bottom */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#8b5cf6]/30 to-transparent" />
    </motion.header>
  );
}
