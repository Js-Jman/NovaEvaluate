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
  isRegrade?: boolean;
}): string {
  const percentage = Math.round((data.totalMarks / data.maxMarks) * 100);
  const passed = percentage >= 40;

  const gradeRows = data.grades.map(g => {
    const isCorrect = g.finalMarks === g.maxMarks;
    const isPartial = g.finalMarks > 0 && g.finalMarks < g.maxMarks;
    const markColor = isCorrect ? '#059669' : isPartial ? '#d97706' : '#dc2626';
    const markBg = isCorrect ? '#d1fae5' : isPartial ? '#fef3c7' : '#fee2e2';

    return `
    <tr>
      <td style="padding: 24px 0; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0">
          <tr>
            <td width="36" style="vertical-align: top;">
              <table width="32" height="32" border="0" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 50%;">
                <tr>
                  <td style="color: #4b5563; font-size: 13px; font-weight: 700; text-align: center; vertical-align: middle;">
                    ${g.questionNumber}
                  </td>
                </tr>
              </table>
            </td>
            <td style="padding-left: 16px; vertical-align: top;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <p style="margin: 0 0 4px; font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Your Answer</p>
                    <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6;">${g.studentAnswer || '<span style="color:#9ca3af;font-style:italic;">No answer provided</span>'}</p>
                  </td>
                </tr>
                ${!isCorrect ? `
                <tr>
                  <td style="padding-bottom: 16px;">
                    <div style="border-left: 3px solid #10b981; padding-left: 12px;">
                      <p style="margin: 0 0 4px; font-size: 11px; color: #059669; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Correct Answer</p>
                      <p style="margin: 0; font-size: 14px; color: #064e3b; line-height: 1.6;">${g.correctAnswer}</p>
                    </div>
                  </td>
                </tr>
                ` : ''}
                ${g.aiFeedback ? `
                <tr>
                  <td>
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px;">
                      <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;"><strong style="color: #6366f1;">AI Feedback:</strong> ${g.aiFeedback}</p>
                    </div>
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
            <td width="80" style="vertical-align: top; text-align: right; padding-left: 16px;">
              <div style="background-color: ${markBg}; color: ${markColor}; padding: 6px 10px; border-radius: 6px; font-size: 14px; font-weight: 700; display: inline-block; white-space: nowrap;">
                ${g.finalMarks} / ${g.maxMarks}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exam Results — ${data.examTitle}</title>
</head>
<body style="margin: 0; padding: 40px 0; background-color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'; -webkit-font-smoothing: antialiased;">
  <center>
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px -10px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr>
        <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 48px 40px; text-align: center;">
          <p style="margin: 0 0 12px; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">NovaEvaluate</p>
          <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">${data.examTitle}</h1>
          ${data.subject ? `<p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">${data.subject}</p>` : ''}
        </td>
      </tr>
      
      <!-- Greeting & Score Summary -->
      <tr>
        <td style="padding: 48px 40px 32px;">
          <p style="margin: 0 0 8px; font-size: 20px; color: #111827; font-weight: 700;">Hello ${data.studentName},</p>
          ${data.isRegrade ? 
            `<p style="margin: 0 0 32px; font-size: 15px; color: #b45309; background-color: #fffbeb; padding: 12px; border-radius: 8px; border: 1px solid #fef3c7; line-height: 1.6;"><strong>Note:</strong> Your exam has been <strong>regraded</strong>. Below is your updated performance breakdown.</p>` 
            : 
            `<p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; line-height: 1.6;">Your exam has been successfully evaluated. Here is your detailed performance breakdown.</p>`
          }
          
          <!-- Score Card -->
          <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px;">
            <tr>
              <td width="50%" style="padding: 32px; text-align: center; border-right: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Total Score</p>
                <p style="margin: 12px 0 0; font-size: 48px; font-weight: 800; color: #0f172a; line-height: 1;">${data.totalMarks}<span style="font-size: 20px; color: #94a3b8; font-weight: 600;">/${data.maxMarks}</span></p>
              </td>
              <td width="50%" style="padding: 32px; text-align: center;">
                <p style="margin: 0 0 16px; font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Status</p>
                <div>
                  <span style="display: inline-block; padding: 6px 20px; background-color: ${passed ? '#ecfdf5' : '#fef2f2'}; color: ${passed ? '#059669' : '#dc2626'}; border-radius: 9999px; font-size: 14px; font-weight: 800; border: 1px solid ${passed ? '#a7f3d0' : '#fecaca'}; box-shadow: 0 2px 10px ${passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'};">${passed ? 'PASSED' : 'FAILED'}</span>
                </div>
                <p style="margin: 12px 0 0; font-size: 15px; color: ${passed ? '#059669' : '#dc2626'}; font-weight: 700;">${percentage}%</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Overall Feedback -->
      ${data.overallFeedback ? `
      <tr>
        <td style="padding: 0 40px 40px;">
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
            <p style="margin: 0 0 8px; font-size: 12px; color: #b45309; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Overall Feedback</p>
            <p style="margin: 0; font-size: 15px; color: #92400e; line-height: 1.6;">${data.overallFeedback}</p>
          </div>
        </td>
      </tr>
      ` : ''}

      <!-- Detailed Breakdown -->
      <tr>
        <td style="padding: 0 40px 48px;">
          <h2 style="margin: 0 0 24px; font-size: 20px; color: #111827; font-weight: 800; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px;">Question Breakdown</h2>
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            ${gradeRows}
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f9fafb; padding: 32px 40px; text-align: center; border-top: 1px solid #f3f4f6;">
          <p style="margin: 0; font-size: 14px; color: #9ca3af;">Evaluated by <strong style="color: #6366f1;">NovaEvaluate AI</strong></p>
          <p style="margin: 8px 0 0; font-size: 12px; color: #d1d5db;">Please contact your instructor if you have any questions.</p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}
