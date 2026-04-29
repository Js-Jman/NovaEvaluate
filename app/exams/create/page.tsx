'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import NovaLoader from '@/components/NovaLoader';
import { useToast } from '@/components/ToastProvider';
import PageTransition, { AnimatedItem } from '@/components/PageTransition';

interface Question {
  questionNumber: string;
  questionText: string;
  correctAnswer: string;
  maxMarks: number;
}

const STEPS = ['Exam Details', 'Upload Answer Key', 'Review & Confirm'];

export default function CreateExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1 state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [totalMarks, setTotalMarks] = useState('');

  // Step 2 state
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [extractingStep, setExtractingStep] = useState('');

  // Step 3 state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ocrStrategy, setOcrStrategy] = useState<string[]>([]);

  // Fetch settings on load
  useState(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      if (d.ocrStrategy) setOcrStrategy(d.ocrStrategy);
    }).catch(() => {});
  });

  const handleStep1Next = () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!totalMarks || Number(totalMarks) <= 0) { toast.error('Total marks must be positive'); return; }
    toast.success('Details saved');
    setStep(1);
  };

  const handleFileSelected = async (file: File) => {
    setProcessing(true);
    try {
      // Step 1: Upload file
      setExtractingStep('Uploading file...');
      toast.info('Uploading answer key...');
      const formData = new FormData();
      formData.append('examId', 'temp');
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload/answer-key', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);
      setFileUrl(uploadData.fileUrl);
      setFileType(uploadData.fileType);
      toast.success('File uploaded');

      // If it's a spreadsheet, parse directly
      if (['excel', 'csv'].includes(uploadData.fileType)) {
        setExtractingStep('Parsing spreadsheet...');
        toast.info('Parsing spreadsheet...');
        const parseRes = await fetch('/api/parse-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: uploadData.fileUrl, fileType: uploadData.fileType }),
        });
        const parseData = await parseRes.json();
        if (!parseRes.ok) throw new Error(parseData.error);
        setQuestions(parseData.questions);
        toast.success(`${parseData.questions.length} questions extracted`);
        setStep(2);
        setProcessing(false);
        return;
      }

      // Step 2: OCR
      setExtractingStep('Extracting text (OCR)...');
      let ocrText = '';
      let ocrSuccess = false;

      for (let i = 0; i < ocrStrategy.length; i++) {
        const currentModel = ocrStrategy[i];
        setExtractingStep(`OCR using ${currentModel}...`);
        toast.info(`Running OCR with ${currentModel}...`);
        
        try {
          const ocrRes = await fetch('/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: 'answer_key',
              targetId: 0,
              fileUrl: uploadData.fileUrl,
              fileType: uploadData.fileType,
              modelId: currentModel,
            }),
          });
          const ocrData = await ocrRes.json();
          if (ocrRes.ok) {
            ocrText = ocrData.ocrText;
            ocrSuccess = true;
            toast.success(`Text extracted successfully using ${currentModel}!`);
            break;
          } else {
            toast.error(`OCR Model ${currentModel} failed: ${ocrData.error || 'Unknown error'}`);
            if (i < ocrStrategy.length - 1) {
              setExtractingStep(`Retrying OCR in 2s...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (err) {
          toast.error(`OCR Model ${currentModel} failed: Network error`);
          if (i < ocrStrategy.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!ocrSuccess) throw new Error('All OCR models in the fallback chain failed.');
      toast.success('Text extraction complete');

      // Step 3: Parse into questions
      setExtractingStep('AI parsing questions...');
      toast.info('AI is parsing questions...');
      const parseRes = await fetch('/api/parse-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: 0, ocrText: ocrText }),
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error);

      setQuestions(parseData.questions);
      toast.success(`${parseData.questions.length} questions parsed!`);
      setStep(2);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      toast.error(message);
    } finally {
      setProcessing(false);
      setExtractingStep('');
    }
  };

  const handleSaveExam = async () => {
    if (questions.length === 0) { toast.error('Add at least one question'); return; }
    setSaving(true);
    toast.info('Creating exam...');
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, subject, totalMarks: Number(totalMarks), fileUrl, fileType, questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Exam created successfully!');
      router.push(`/exams/${data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create exam';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (idx: number, field: keyof Question, value: string | number) => {
    setQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { questionNumber: `Q${prev.length + 1}`, questionText: '', correctAnswer: '', maxMarks: 5 }]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-12 py-8 sm:py-10">
        {/* Step Indicator */}
        <AnimatedItem>
          <div className="mb-10 flex items-center justify-center gap-0">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      backgroundColor: i <= step ? '#8b5cf6' : '#e2ddf0',
                      scale: i === step ? 1.1 : 1,
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
                  >
                    {i < step ? '✓' : i + 1}
                  </motion.div>
                  <span className={`mt-2 text-xs font-medium ${i <= step ? 'text-[#5b21b6]' : 'text-[#8b7faa]'}`}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <motion.div
                    className="mx-4 h-0.5 w-16"
                    animate={{ backgroundColor: i < step ? '#8b5cf6' : '#e2ddf0' }}
                  />
                )}
              </div>
            ))}
          </div>
        </AnimatedItem>

        <AnimatePresence mode="wait">
          {/* Step 1: Exam Details */}
          {step === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="nova-card p-6">
                <h2 className="text-xl font-semibold text-[#1a1033] mb-6">Exam Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#4a3d6e] mb-1.5">Exam Title *</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics Midterm" className="nova-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4a3d6e] mb-1.5">Subject (optional)</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="nova-input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#4a3d6e] mb-1.5">Total Marks *</label>
                    <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} placeholder="e.g. 100" className="nova-input w-40" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStep1Next} className="nova-btn-primary">
                    Next: Upload Answer Key →
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Upload */}
          {step === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="nova-card p-6">
                <h2 className="text-xl font-semibold text-[#1a1033] mb-2">Upload Answer Key</h2>
                <p className="text-sm text-[#8b7faa] mb-6">Upload your answer key as an image, PDF, or spreadsheet</p>
                {processing ? (
                  <div className="flex flex-col items-center py-12 gap-4">
                    <NovaLoader size="lg" />
                    <motion.p className="text-sm font-medium text-[#5b21b6]" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                      {extractingStep}
                    </motion.p>
                  </div>
                ) : (
                  <FileUpload onFileSelect={handleFileSelected} />
                )}
                <div className="mt-4 flex justify-start">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(0)} className="nova-btn-secondary">
                    ← Back
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="nova-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#1a1033]">Review Questions ({questions.length})</h2>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addQuestion} className="nova-btn-secondary text-sm">
                    + Add Row
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 sm:gap-6">
                  <AnimatePresence>
                    {questions.map((q, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.03 }}
                        className="nova-card p-0 overflow-hidden flex flex-col bg-white border border-black/[0.08] hover:border-[#8b5cf6]/40 transition-all group shadow-sm hover:shadow-md"
                      >
                        {/* Header Banner */}
                        <div className="bg-[#f8fafc] px-4 py-3.5 border-b border-black/[0.04] flex items-center justify-between">
                          <div className="flex items-center gap-3 sm:gap-4">
                            {/* Index Badge */}
                            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] text-white text-xs font-bold shadow-sm">
                              {idx + 1}
                            </div>
                            
                            {/* Q.No Input Group */}
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-black/[0.06] px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-[#8b5cf6]/20 transition-all">
                              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Q.No</span>
                              <input value={q.questionNumber} onChange={(e) => updateQuestion(idx, 'questionNumber', e.target.value)} className="w-10 sm:w-12 text-sm font-bold text-[#0f172a] bg-transparent outline-none text-center" placeholder="1a" />
                            </div>

                            {/* Marks Input Group */}
                            <div className="flex items-center gap-2 bg-white rounded-lg border border-black/[0.06] px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-[#8b5cf6]/20 transition-all">
                              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Marks</span>
                              <input type="number" value={q.maxMarks} onChange={(e) => updateQuestion(idx, 'maxMarks', Number(e.target.value))} className="w-10 sm:w-12 text-sm font-bold text-[#0f172a] bg-transparent outline-none text-center" />
                            </div>
                          </div>

                          {/* Delete Button (Icon only) */}
                          <button onClick={() => removeQuestion(idx)} className="text-[#94a3b8] hover:text-[#ef4444] transition-colors p-1.5 rounded-lg hover:bg-[#fef2f2]" title="Remove question">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 sm:p-5 space-y-5 flex-1 flex flex-col">
                          <div className="flex-1">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#475569] mb-2 ml-1">
                              <svg className="w-3.5 h-3.5 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                              Question Text <span className="font-normal text-[#94a3b8] text-[10px] uppercase tracking-wider">(Optional)</span>
                            </label>
                            <textarea rows={2} value={q.questionText} onChange={(e) => updateQuestion(idx, 'questionText', e.target.value)} className="w-full text-sm py-2.5 px-3 resize-none bg-transparent border-0 border-l-[3px] border-[#e2e8f0] focus:border-[#8b5cf6] focus:ring-0 transition-colors" placeholder="Type the exact question text here..." />
                          </div>
                          
                          <div className="flex-1">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#10b981] mb-2 ml-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Expected Answer
                            </label>
                            <textarea rows={3} value={q.correctAnswer} onChange={(e) => updateQuestion(idx, 'correctAnswer', e.target.value)} className="w-full text-sm py-2.5 px-3.5 resize-none bg-[#f0fdf4]/60 border border-[#10b981]/20 rounded-xl focus:border-[#10b981]/40 focus:ring-4 focus:ring-[#10b981]/10 transition-all shadow-inner" placeholder="Type the required correct answer..." />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(1)} className="nova-btn-secondary">
                    ← Back
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveExam}
                    disabled={saving}
                    className="nova-btn-primary flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <NovaLoader size="sm" /> : null}
                    {saving ? 'Saving...' : 'Save Exam ✓'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
