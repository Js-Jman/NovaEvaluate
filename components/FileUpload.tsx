'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NovaLoader from './NovaLoader';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  uploading?: boolean;
}

export default function FileUpload({
  onFileSelect,
  accept = '.pdf,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt',
  label = 'Drop your file here or click to browse',
  uploading = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    onFileSelect(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) return '🖼️';
    if (ext === 'pdf') return '📄';
    if (ext === 'xlsx') return '📊';
    if (ext === 'csv') return '📋';
    return '📁';
  };

  return (
    <div className="w-full">
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-[#8b5cf6] bg-[#f5f3ff]'
            : selectedFile
              ? 'border-[#e2ddf0] bg-white'
              : 'border-[#e2ddf0] bg-[#f9f7ff] hover:border-[#8b5cf6]/50 hover:bg-white'
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />

        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <NovaLoader size="lg" text="Processing file..." />
            </motion.div>
          ) : selectedFile ? (
            <motion.div key="selected" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              {preview ? (
                <motion.img src={preview} alt="Preview" className="h-24 w-auto rounded-lg object-cover" initial={{ scale: 0.8 }} animate={{ scale: 1 }} />
              ) : (
                <span className="text-4xl">{getFileIcon(selectedFile.name)}</span>
              )}
              <div>
                <p className="text-sm font-semibold text-[#1a1033]">{selectedFile.name}</p>
                <p className="text-xs text-[#8b7faa]">{formatSize(selectedFile.size)}</p>
              </div>
              <p className="text-xs text-[#8b5cf6]">Click to change file</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
              <motion.div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ecfa] text-2xl"
                animate={{ y: isDragging ? -4 : 0 }}
              >
                📎
              </motion.div>
              <div>
                <p className="text-sm font-medium text-[#4a3d6e]">{label}</p>
                <p className="mt-1 text-xs text-[#8b7faa]">PDF, Images, Excel, CSV, TXT — Max 20MB</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
