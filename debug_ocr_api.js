const fetch = require('node-fetch');

async function testOCR() {
  const res = await fetch('http://localhost:3000/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      targetType: 'student',
      targetId: 7, 
      fileUrl: '/uploads/students/3/7/sheet.png', 
      fileType: 'png' 
    })
  });
  const data = await res.json();
  console.log('Result:', data);
}
testOCR();
