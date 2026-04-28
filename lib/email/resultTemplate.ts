export function buildResultEmail(data: {
  studentName: string;
  examTitle: string;
  subject?: string;
  totalMarks: number;
  maxMarks: number;
  grades: Array<{
    questionNumber: string;
    studentAnswer?: string;
    correctAnswer: string;
    finalMarks: number;
    maxMarks: number;
    aiFeedback?: string;
  }>;
  overallFeedback?: string;
}): string {
  const percentage = Math.round((data.totalMarks / data.maxMarks) * 100);
  const passed = percentage >= 40;

  const gradeRows = data.grades.map(g => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1538;font-weight:600;color:#e0d4f5">${g.questionNumber}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1538;color:#a89bc2;font-size:13px">${g.studentAnswer ?? '—'}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1538;color:#c4b5fd;font-size:13px">${g.correctAnswer.substring(0, 80)}${g.correctAnswer.length > 80 ? '...' : ''}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1538;text-align:center;font-weight:700;color:${g.finalMarks === g.maxMarks ? '#34d399' : g.finalMarks === 0 ? '#f87171' : '#fbbf24'}">${g.finalMarks}/${g.maxMarks}</td>
      <td style="padding:12px 16px;border-bottom:1px solid #1e1538;color:#a89bc2;font-size:12px">${g.aiFeedback ?? ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Result — ${data.examTitle}</title></head>
<body style="margin:0;padding:0;background:#0a0612;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:640px;margin:32px auto;background:#110d1f;border-radius:16px;overflow:hidden;border:1px solid #2d2450;box-shadow:0 8px 40px rgba(139,92,246,0.2)">
    <div style="background:linear-gradient(135deg,#ec4899,#8b5cf6,#3b82f6);padding:36px 40px">
      <div style="color:rgba(255,255,255,0.7);font-size:13px;text-transform:uppercase;letter-spacing:2px;font-weight:600">NovaEvaluate</div>
      <div style="color:#ffffff;font-size:26px;font-weight:700;margin-top:8px">${data.examTitle}</div>
      ${data.subject ? `<div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:4px">${data.subject}</div>` : ''}
    </div>
    <div style="padding:32px 40px;border-bottom:1px solid #1e1538">
      <table style="width:100%"><tr>
        <td style="text-align:center;min-width:100px;vertical-align:top">
          <div style="font-size:52px;font-weight:800;background:linear-gradient(135deg,${passed ? '#34d399,#3b82f6' : '#f87171,#fbbf24'});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${percentage}%</div>
          <div style="background:${passed ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'};color:${passed ? '#34d399' : '#f87171'};padding:6px 20px;border-radius:999px;font-size:13px;font-weight:600;display:inline-block;margin-top:6px;border:1px solid ${passed ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}">${passed ? 'PASS ✓' : 'FAIL ✗'}</div>
        </td>
        <td style="padding-left:24px;vertical-align:top">
          <div style="font-size:18px;font-weight:600;color:#f8f5ff">Hello, ${data.studentName}</div>
          <div style="color:#a89bc2;margin-top:6px">Your result for this exam:</div>
          <div style="font-size:32px;font-weight:700;color:#e0d4f5;margin-top:6px">${data.totalMarks} <span style="font-size:16px;color:#6b5a85">/ ${data.maxMarks} marks</span></div>
        </td>
      </tr></table>
    </div>
    <div style="padding:32px 40px">
      <div style="font-size:16px;font-weight:600;color:#c4b5fd;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px;font-size:12px">Question-wise Breakdown</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#160f2a">
            <th style="padding:12px 16px;text-align:left;color:#6b5a85;font-weight:600;border-bottom:2px solid #2d2450;font-size:11px;text-transform:uppercase;letter-spacing:1px">Q No.</th>
            <th style="padding:12px 16px;text-align:left;color:#6b5a85;font-weight:600;border-bottom:2px solid #2d2450;font-size:11px;text-transform:uppercase;letter-spacing:1px">Your Answer</th>
            <th style="padding:12px 16px;text-align:left;color:#6b5a85;font-weight:600;border-bottom:2px solid #2d2450;font-size:11px;text-transform:uppercase;letter-spacing:1px">Correct</th>
            <th style="padding:12px 16px;text-align:center;color:#6b5a85;font-weight:600;border-bottom:2px solid #2d2450;font-size:11px;text-transform:uppercase;letter-spacing:1px">Marks</th>
            <th style="padding:12px 16px;text-align:left;color:#6b5a85;font-weight:600;border-bottom:2px solid #2d2450;font-size:11px;text-transform:uppercase;letter-spacing:1px">Feedback</th>
          </tr>
        </thead>
        <tbody>${gradeRows}</tbody>
      </table>
    </div>
    ${data.overallFeedback ? `
    <div style="padding:0 40px 32px">
      <div style="background:#160f2a;border-left:4px solid #8b5cf6;padding:16px 20px;border-radius:0 12px 12px 0">
        <div style="font-size:12px;font-weight:600;color:#8b5cf6;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Overall Feedback</div>
        <div style="color:#c4b5fd;font-size:14px;line-height:1.5">${data.overallFeedback}</div>
      </div>
    </div>` : ''}
    <div style="background:#0d0919;padding:24px 40px;text-align:center;color:#4a3d6e;font-size:12px;border-top:1px solid #1e1538">
      Generated by <strong style="color:#8b5cf6">NovaEvaluate</strong> — AI-Powered Worksheet Grader<br>
      For queries, contact your instructor.
    </div>
  </div>
</body>
</html>`;
}
