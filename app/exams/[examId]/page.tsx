'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import StatusPill from '@/components/StatusPill';
import FileUpload from '@/components/FileUpload';
import NovaLoader from '@/components/NovaLoader';
import { useToast } from '@/components/ToastProvider';
import PageTransition, { AnimatedItem } from '@/components/PageTransition';

interface Question { id: number; questionNumber: string; questionText: string | null; correctAnswer: string; maxMarks: number }
interface Student { id: number; name: string; email: string; rollNumber: string | null; ocrStatus: string; _count: { gradedAnswers: number }; totalMarks: number | null }
interface ExamData { id: number; title: string; subject: string | null; totalMarks: number; status: string; questions: Question[]; students: Student[] }

export default function ExamDetailPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const { toast } = useToast();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'questions' | 'students'>('students');
  const [showUpload, setShowUpload] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [uploading, setUploading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishingStudent, setPublishingStudent] = useState<number | null>(null);
  const [activeModel, setActiveModel] = useState<string>('AI');

  const fetchExam = useCallback(async () => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      const data = await res.json();
      if (res.ok) setExam(data);
      else toast.error('Failed to load exam');
    } catch { toast.error('Network error'); }
    finally { setLoading(false); }
  }, [examId, toast]);

  useEffect(() => { 
    fetchExam();
    // Fetch active model for the UI toast
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.activeModel) setActiveModel(d.activeModel);
    }).catch(() => {});
  }, [fetchExam]);

  // Poll OCR status for processing students
  useEffect(() => {
    if (!exam) return;
    const processing = exam.students.filter((s) => s.ocrStatus === 'processing');
    if (processing.length === 0) return;

    const interval = setInterval(async () => {
      let changed = false;
      for (const s of processing) {
        const res = await fetch(`/api/ocr/status/${s.id}`);
        const data = await res.json();
        if (data.ocrStatus !== 'processing') {
          changed = true;
          if (data.ocrStatus === 'done') toast.success(`OCR complete for ${s.name}`);
          if (data.ocrStatus === 'failed') toast.error(`OCR failed for ${s.name}`);
        }
      }
      if (changed) fetchExam();
    }, 3000);

    return () => clearInterval(interval);
  }, [exam, fetchExam, toast]);

  const handleStudentUpload = async (file: File) => {
    if (!studentName || !studentEmail) { toast.error('Name and email are required'); return; }
    setUploading(true);
    toast.info('Uploading student sheet...');
    try {
      const formData = new FormData();
      formData.append('examId', examId);
      formData.append('name', studentName);
      formData.append('email', studentEmail);
      formData.append('rollNumber', studentRoll);
      formData.append('file', file);

      const res = await fetch('/api/upload/student', { method: 'POST', body: formData });
      if (res.ok) {
        toast.success('Student uploaded! OCR processing...');
        setStudentName(''); setStudentEmail(''); setStudentRoll('');
        setShowUpload(false);
        fetchExam();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Upload failed');
      }
    } catch { toast.error('Network error'); }
    finally { setUploading(false); }
  };

  const handleGradeAll = async () => {
    setGrading(true);
    toast.info(`Evaluating all students using model ${activeModel}...`);
    try {
      const res = await fetch('/api/grade/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: Number(examId) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Graded ${data.processed} student${data.processed !== 1 ? 's' : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
        fetchExam();
      } else toast.error(data.error);
    } catch { toast.error('Grading failed'); }
    finally { setGrading(false); }
  };

  const handleGradeOne = async (studentId: number, name: string) => {
    setGradingStudent(studentId);
    toast.info(`Evaluating ${name} using model ${activeModel}...`);
    try {
      const res = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, examId: Number(examId) }),
      });
      const data = await res.json();
      if (res.ok) { 
        toast.success(`${name} graded successfully!`); 
        fetchExam(); 
      }
      else toast.error(data.error);
    } catch { toast.error('Grading failed'); }
    finally { setGradingStudent(null); }
  };

  const handlePublishOne = async (studentId: number, name: string) => {
    setPublishingStudent(studentId);
    toast.info(`Sending result to ${name}...`);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.sent) { toast.success(`Result sent to ${name}!`); fetchExam(); }
      else toast.error(data.error || 'Email failed');
    } catch { toast.error('Email failed'); }
    finally { setPublishingStudent(null); }
  };

  const handlePublishAll = async () => {
    if (!exam) return;
    setPublishing(true);
    toast.info('Publishing results to all students...');
    let sent = 0;
    const gradedStudents = exam.students.filter((s) => s._count.gradedAnswers > 0);
    for (const s of gradedStudents) {
      try {
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: s.id }),
        });
        sent++;
      } catch { /* continue */ }
    }
    toast.success(`${sent} result${sent !== 1 ? 's' : ''} published!`);
    setPublishing(false);
    fetchExam();
  };

  if (loading) return <div className="flex flex-1 items-center justify-center"><NovaLoader size="xl" text="Loading exam..." /></div>;
  if (!exam) return <div className="flex flex-1 items-center justify-center text-[#8b7faa]">Exam not found</div>;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <AnimatedItem>
          <div className="flex items-center gap-3 mb-2 text-sm text-[#8b7faa]">
            <Link href="/" className="hover:text-[#5b21b6] transition-colors">← Back to Exams</Link>
          </div>
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1033]">{exam.title}</h1>
              {exam.subject && <p className="text-sm text-[#8b7faa] mt-1">{exam.subject}</p>}
              <div className="flex items-center gap-3 mt-2">
                <StatusPill status={exam.status} />
                <span className="text-sm text-[#4a3d6e]">{exam.totalMarks} marks</span>
                <span className="text-sm text-[#4a3d6e]">{exam.questions.length} questions</span>
              </div>
            </div>
          </div>
        </AnimatedItem>

        {/* Tabs */}
        <AnimatedItem>
          <div className="flex gap-1 mb-6 border-b border-[#e2ddf0]">
            {(['questions', 'students'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-[#1a1033]' : 'text-[#8b7faa] hover:text-[#5b21b6]'}`}>
                {t === 'questions' ? `Questions (${exam.questions.length})` : `Students (${exam.students.length})`}
                {tab === t && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]" />}
              </button>
            ))}
          </div>
        </AnimatedItem>

        <AnimatePresence mode="wait">
          {tab === 'questions' ? (
            <motion.div key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="nova-card overflow-hidden">
                <table className="nova-table">
                  <thead><tr><th>Q No.</th><th>Question</th><th>Answer</th><th>Marks</th></tr></thead>
                  <tbody>
                    {exam.questions.map((q, i) => (
                      <motion.tr key={q.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                        <td className="font-semibold text-[#5b21b6]">{q.questionNumber}</td>
                        <td className="text-[#4a3d6e] text-sm">{q.questionText || '—'}</td>
                        <td className="text-[#1a1033] text-sm max-w-xs truncate">{q.correctAnswer}</td>
                        <td className="text-[#8b5cf6] font-semibold">{q.maxMarks}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowUpload(!showUpload)} className="nova-btn-secondary text-sm">
                  {showUpload ? '✕ Close' : '+ Upload Student'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGradeAll} disabled={grading}
                  className="nova-btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                  {grading ? <NovaLoader size="sm" /> : null}
                  {grading ? 'Grading...' : 'Grade All Students'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePublishAll} disabled={publishing}
                  className="nova-btn-secondary text-sm flex items-center gap-2 disabled:opacity-50">
                  {publishing ? <NovaLoader size="sm" /> : <span>📧</span>}
                  {publishing ? 'Publishing...' : 'Publish All'}
                </motion.button>
              </div>

              <AnimatePresence>
                {showUpload && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden nova-card p-6">
                    <h3 className="text-sm font-semibold text-[#1a1033] mb-4">Upload Student Answer Sheet</h3>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student Name *" className="nova-input" />
                      <input value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="Email *" className="nova-input" />
                      <input value={studentRoll} onChange={(e) => setStudentRoll(e.target.value)} placeholder="Roll No." className="nova-input" />
                    </div>
                    <FileUpload onFileSelect={handleStudentUpload} accept=".pdf,.jpg,.jpeg,.png,.webp" label="Drop student answer sheet" uploading={uploading} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="nova-card overflow-hidden">
                {exam.students.length === 0 ? (
                  <div className="py-12 text-center text-[#8b7faa]">No students uploaded yet</div>
                ) : (
                  <table className="nova-table">
                    <thead><tr><th>Name</th><th>Roll No.</th><th>Email</th><th>OCR</th><th>Grade</th><th>Score</th><th>Actions</th></tr></thead>
                    <tbody>
                      {exam.students.map((s, i) => (
                        <motion.tr key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                          <td className="font-medium text-[#1a1033]">{s.name}</td>
                          <td>{s.rollNumber || '—'}</td>
                          <td className="text-xs">{s.email}</td>
                          <td><StatusPill status={s.ocrStatus} /></td>
                          <td><StatusPill status={s._count.gradedAnswers > 0 ? 'graded' : 'not graded'} /></td>
                          <td className="font-semibold text-[#5b21b6]">{s.totalMarks !== null ? `${s.totalMarks}/${exam.totalMarks}` : '—'}</td>
                          <td>
                            <div className="flex gap-1.5">
                              {s.ocrStatus === 'done' && s._count.gradedAnswers === 0 && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => handleGradeOne(s.id, s.name)}
                                  disabled={gradingStudent === s.id}
                                  className="rounded-lg bg-[#f5f3ff] border border-[#e2ddf0] px-2 py-1 text-xs text-[#5b21b6] hover:border-[#8b5cf6] transition-colors disabled:opacity-50"
                                  title="Grade this student">
                                  {gradingStudent === s.id ? '...' : 'Grade'}
                                </motion.button>
                              )}
                              {s._count.gradedAnswers > 0 && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => handleGradeOne(s.id, s.name)}
                                  disabled={gradingStudent === s.id}
                                  className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-2 py-1 text-xs text-[#ef4444] hover:border-[#ef4444] transition-colors disabled:opacity-50"
                                  title="Regrade with active model">
                                  {gradingStudent === s.id ? '...' : '🔄 Regrade'}
                                </motion.button>
                              )}
                              {s._count.gradedAnswers > 0 && (
                                <Link href={`/exams/${examId}/results/${s.id}`}>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    className="rounded-lg bg-[#f0fdf4] border border-[#bbf7d0] px-2 py-1 text-xs text-[#16a34a] hover:border-[#16a34a] transition-colors"
                                    title="View results">
                                    👁 View
                                  </motion.button>
                                </Link>
                              )}
                              {s._count.gradedAnswers > 0 && (
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                  onClick={() => handlePublishOne(s.id, s.name)}
                                  disabled={publishingStudent === s.id}
                                  className="rounded-lg bg-[#eff6ff] border border-[#bfdbfe] px-2 py-1 text-xs text-[#2563eb] hover:border-[#2563eb] transition-colors disabled:opacity-50"
                                  title="Send result email">
                                  {publishingStudent === s.id ? '...' : '📧'}
                                </motion.button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
