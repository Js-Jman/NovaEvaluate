'use client';

import { useState, useEffect, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ModelBadge from '@/components/ModelBadge';
import NovaLoader from '@/components/NovaLoader';
import { useToast } from '@/components/ToastProvider';
import PageTransition, { AnimatedItem } from '@/components/PageTransition';

interface Grade {
  id: number; questionId: number; questionNumber: string; questionText: string | null;
  correctAnswer: string; maxMarks: number; studentAnswer: string | null;
  aiMarks: number; finalMarks: number; aiFeedback: string | null;
  aiConfidence: number | null; isOverridden: boolean; gradingModel: string | null;
}
interface StudentInfo { id: number; name: string; email: string; totalMarks: number | null; resultSent: boolean }

export default function StudentResultPage({ params }: { params: Promise<{ examId: string; studentId: string }> }) {
  const { examId, studentId } = use(params);
  const { toast } = useToast();
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examTotal, setExamTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        // Load exam info
        const examRes = await fetch(`/api/exams/${examId}`);
        const examData = await examRes.json();
        setExamTitle(examData.title);
        setExamTotal(examData.totalMarks);

        // Find student
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = examData.students.find((st: any) => st.id === Number(studentId));
        if (s) setStudent(s);

        // Load grades
        const gradesRes = await fetch(`/api/results?examId=${examId}&studentId=${studentId}`);
        const gradesData = await gradesRes.json();
        setGrades(gradesData);
        toast.success('Results loaded');
      } catch {
        toast.error('Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalScore = grades.reduce((sum, g) => sum + (overrides[g.id] ?? g.finalMarks), 0);
  const percentage = examTotal > 0 ? Math.round((totalScore / examTotal) * 100) : 0;
  const passed = examTotal > 0 && totalScore / examTotal >= 0.4;

  const handleSaveOverrides = async () => {
    if (Object.keys(overrides).length === 0) { toast.info('No changes to save'); return; }
    setSaving(true);
    toast.info('Saving overrides...');
    try {
      for (const [id, marks] of Object.entries(overrides)) {
        await fetch(`/api/results/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finalMarks: marks }),
        });
      }
      toast.success('Overrides saved!');
      setOverrides({});
      // Reload grades
      const res = await fetch(`/api/results?examId=${examId}&studentId=${studentId}`);
      setGrades(await res.json());
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleSendEmail = async () => {
    if (!student) return;
    toast.info('Sending email...');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id }),
      });
      const data = await res.json();
      if (data.sent) toast.success('Result email sent!');
      else toast.error(data.error || 'Email failed');
    } catch { toast.error('Email failed'); }
  };

  if (loading) return <div className="flex flex-1 items-center justify-center"><NovaLoader size="xl" text="Loading results..." /></div>;
  if (!student) return <div className="flex flex-1 items-center justify-center text-[#8b7faa]">Student not found</div>;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <AnimatedItem>
          <Link href={`/exams/${examId}`} className="text-sm text-[#9189a8] hover:text-[#5b21b6] transition-colors">← Back to Exam</Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1033]">{student.name}</h1>
              <p className="text-sm text-[#8b7faa] mt-0.5">{examTitle} • {student.email}</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Score */}
              <div className="text-right">
                <div className="text-3xl font-bold gradient-text">{totalScore}<span className="text-lg text-[#9189a8]">/{examTotal}</span></div>
                <div className={`text-xs font-semibold ${passed ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>
                  {percentage}% — {passed ? 'PASS' : 'FAIL'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSendEmail}
                  className="nova-btn-secondary text-sm">📧 Send Email</motion.button>
              </div>
            </div>
          </div>
        </AnimatedItem>

        {/* Grade Cards */}
        <div className="space-y-4">
          <AnimatePresence>
            {grades.map((g, i) => {
              const isExpanded = expandedCard === g.id;
              const hasOverride = overrides[g.id] !== undefined;
              const currentMarks = overrides[g.id] ?? g.finalMarks;

              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`nova-card overflow-hidden transition-all ${
                    g.isOverridden || hasOverride ? 'ring-2 ring-[#fbbf24]/30' : ''
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 cursor-pointer hover:bg-[#faf8ff] transition-colors"
                    onClick={() => setExpandedCard(isExpanded ? null : g.id)}
                  >
                    {/* Q Number Badge */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] text-white text-sm font-bold shrink-0 shadow-sm">
                      {g.questionNumber}
                    </div>

                    {/* Marks Display */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#0f172a]">
                          AI: {g.aiMarks}/{g.maxMarks}
                        </span>
                        {g.aiConfidence !== null && g.aiConfidence < 60 && (
                          <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-[#fbbf24] text-sm" title={`Confidence: ${g.aiConfidence}%`}>⚠️</motion.span>
                        )}
                      </div>
                      {g.gradingModel && <div className="mt-0.5"><ModelBadge model={g.gradingModel} /></div>}
                    </div>

                    {/* Final Marks Input */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider hidden sm:block">Marks:</label>
                      <input type="number" min={0} max={g.maxMarks} step={0.5}
                        value={currentMarks}
                        onChange={(e) => setOverrides((prev) => ({ ...prev, [g.id]: Number(e.target.value) }))}
                        className={`nova-input w-24 py-1.5 px-2 text-center text-sm font-bold ${hasOverride ? 'border-[#fbbf24] bg-[#fef9e7]' : ''}`}
                      />
                    </div>

                    {/* Expand Arrow */}
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} className="text-[#94a3b8] shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </motion.div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-5 pt-1 space-y-4 border-t border-black/[0.04]">
                          {/* Student Answer */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] mb-2 ml-1">
                              <svg className="w-3.5 h-3.5 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              Student Answer
                            </label>
                            <div className={`text-sm px-4 py-3 rounded-xl border-l-[3px] ${
                              g.studentAnswer
                                ? 'border-[#8b5cf6] bg-[#faf8ff] text-[#1e293b]'
                                : 'border-[#ef4444] bg-[#fef2f2] text-[#ef4444] italic'
                            }`}>
                              {g.studentAnswer || '[No answer found]'}
                            </div>
                          </div>

                          {/* Correct Answer */}
                          <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981] mb-2 ml-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Correct Answer
                            </label>
                            <div className="text-sm px-4 py-3 rounded-xl border-l-[3px] border-[#10b981] bg-[#f0fdf4] text-[#1e293b]">
                              {g.correctAnswer}
                            </div>
                          </div>

                          {/* AI Feedback */}
                          {g.aiFeedback && (
                            <div>
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b] mb-2 ml-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                AI Feedback
                              </label>
                              <div className="text-sm px-4 py-3 rounded-xl bg-[#fffbeb] border border-[#fbbf24]/20 text-[#78350f]">
                                {g.aiFeedback}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Save Overrides (sticky bottom) */}
        {Object.keys(overrides).length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveOverrides}
              disabled={saving}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] text-white font-semibold text-sm shadow-xl shadow-violet-500/30 disabled:opacity-70"
            >
              {saving ? <NovaLoader size="sm" /> : <span>💾</span>}
              {saving ? 'Saving...' : `Save ${Object.keys(overrides).length} Override${Object.keys(overrides).length !== 1 ? 's' : ''}`}
            </motion.button>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
