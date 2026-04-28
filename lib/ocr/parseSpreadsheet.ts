import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

interface ParsedQuestion {
  questionNumber: string;
  questionText: string;
  correctAnswer: string;
  maxMarks: number;
}

/**
 * Parses Excel (.xlsx) or CSV (.csv) files directly into structured Q&A.
 * Expects columns: questionNumber, questionText (optional), correctAnswer, maxMarks
 * Column names are case-insensitive and flexible (e.g., "Question No.", "q_number", "Q#")
 */
export function parseSpreadsheet(filePath: string, fileType: string): ParsedQuestion[] {
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), 'public', filePath);

  if (fileType === 'excel' || filePath.endsWith('.xlsx')) {
    return parseExcel(fullPath);
  } else if (fileType === 'csv' || filePath.endsWith('.csv')) {
    return parseCsv(fullPath);
  }

  throw new Error(`Unsupported spreadsheet type: ${fileType}`);
}

function parseExcel(filePath: string): ParsedQuestion[] {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  return mapRowsToQuestions(rows);
}

function parseCsv(filePath: string): ParsedQuestion[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, unknown>[];
  return mapRowsToQuestions(rows);
}

function mapRowsToQuestions(rows: Record<string, unknown>[]): ParsedQuestion[] {
  if (!rows.length) {
    throw new Error('Spreadsheet is empty — no data rows found');
  }

  // Detect column names flexibly
  const firstRow = rows[0];
  const columns = Object.keys(firstRow);

  const qNumCol = findColumn(columns, ['questionnumber', 'questionno', 'qnumber', 'qno', 'q#', 'no', 'number', 'sno', 'slno', '#']);
  const qTextCol = findColumn(columns, ['questiontext', 'question', 'qtext', 'text', 'questiondescription']);
  const ansCol = findColumn(columns, ['correctanswer', 'answer', 'ans', 'correctans', 'modelanswer', 'key']);
  const marksCol = findColumn(columns, ['maxmarks', 'marks', 'totalmarks', 'max', 'points', 'score']);

  if (!ansCol) {
    throw new Error('Could not find an "Answer" or "Correct Answer" column in the spreadsheet');
  }

  return rows.map((row, idx) => {
    const questionNumber = qNumCol
      ? String(row[qNumCol] ?? `Q${idx + 1}`)
      : `Q${idx + 1}`;

    const questionText = qTextCol ? String(row[qTextCol] ?? '') : '';
    const correctAnswer = String(row[ansCol] ?? '');
    const maxMarks = marksCol ? Number(row[marksCol]) || 1 : 1;

    if (!correctAnswer.trim()) {
      throw new Error(`Row ${idx + 1}: Correct answer is empty for ${questionNumber}`);
    }

    return { questionNumber, questionText, correctAnswer, maxMarks };
  });
}

function findColumn(columns: string[], patterns: string[]): string | null {
  for (const col of columns) {
    const normalized = col.toLowerCase().replace(/[^a-z0-9#]/g, '');
    if (patterns.includes(normalized)) {
      return col;
    }
  }
  return null;
}
