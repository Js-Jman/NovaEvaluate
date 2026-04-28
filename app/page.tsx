'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ExamCard from '@/components/ExamCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import NovaLoader from '@/components/NovaLoader';
import { useToast } from '@/components/ToastProvider';
import PageTransition, { AnimatedItem } from '@/components/PageTransition';

interface Exam {
  id: number;
  title: string;
  subject?: string | null;
  totalMarks: number;
  status: string;
  createdAt: string;
  _count: { students: number };
}

export default function HomePage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    toast.info('Loading exams...');
    fetch('/api/exams')
      .then((r) => r.json())
      .then((data) => {
        setExams(data);
        setLoading(false);
        toast.success(`${data.length} exam${data.length !== 1 ? 's' : ''} loaded`);
      })
      .catch(() => {
        setLoading(false);
        toast.error('Failed to load exams');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    toast.info('Deleting exam...');
    try {
      const res = await fetch(`/api/exams/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setExams((prev) => prev.filter((e) => e.id !== deleteId));
        toast.success('Exam deleted successfully');
      } else {
        toast.error('Failed to delete exam');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <NovaLoader size="xl" text="Loading NovaEvaluate..." />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <AnimatedItem>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Your Exams</h1>
              <p className="mt-1 text-sm text-[#94a3b8]">
                {exams.length} exam{exams.length !== 1 ? 's' : ''} created
              </p>
            </div>
            <Link href="/exams/create">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(139,92,246,0.25)' }}
                whileTap={{ scale: 0.98 }}
                className="nova-btn-primary flex items-center gap-2"
              >
                <span className="text-lg">+</span>
                Create New Exam
              </motion.button>
            </Link>
          </div>
        </AnimatedItem>

        {exams.length === 0 ? (
          <AnimatedItem>
            <motion.div
              className="flex flex-col items-center justify-center rounded-3xl glass-panel py-24 text-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📝
              </motion.div>
              <h2 className="text-xl font-semibold text-[#1a1033]">No exams yet</h2>
              <p className="mt-2 text-sm text-[#94a3b8] max-w-sm">
                Create your first exam to start grading worksheets with AI
              </p>
              <Link href="/exams/create">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="nova-btn-primary mt-6"
                >
                  + Create First Exam
                </motion.button>
              </Link>
            </motion.div>
          </AnimatedItem>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {exams.map((exam, idx) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  index={idx}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Exam"
        message="This will permanently delete the exam, all uploaded student sheets, and grades. This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageTransition>
  );
}
