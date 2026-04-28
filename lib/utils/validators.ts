const ALLOWED_EXTENSIONS = [
  'pdf', 'xlsx', 'csv',
  'jpg', 'jpeg', 'png', 'webp',
  'txt',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function getFileType(extension: string): string {
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (extension === 'xlsx') return 'excel';
  if (extension === 'csv') return 'csv';
  if (extension === 'txt') return 'text';
  return 'unknown';
}

export function validateFileExtension(filename: string): { valid: boolean; error?: string } {
  const ext = getFileExtension(filename);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File type ".${ext}" is not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }
  return { valid: true };
}

export function validateFileSize(sizeBytes: number): { valid: boolean; error?: string } {
  if (sizeBytes > MAX_FILE_SIZE) {
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size ${sizeMB}MB exceeds the 20MB limit.`,
    };
  }
  return { valid: true };
}

export function validateFile(filename: string, sizeBytes: number): { valid: boolean; error?: string } {
  const extCheck = validateFileExtension(filename);
  if (!extCheck.valid) return extCheck;
  
  const sizeCheck = validateFileSize(sizeBytes);
  if (!sizeCheck.valid) return sizeCheck;
  
  return { valid: true };
}
