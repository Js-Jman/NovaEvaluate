# NovaEvaluate: Industrialized AI Exam Grading Platform

NovaEvaluate is a state-of-the-art, AI-powered evaluation system designed to automate the grading of handwritten student exams. It transforms raw images of handwritten sheets into structured, graded data with unprecedented transparency and reliability through a multi-model fallback architecture.

---

## 1. Key Features

### 🚀 AI-Powered Handwriting Extraction (OCR)
- **Multi-Model Orchestration**: Leverages advanced vision models (Gemini, Groq, OpenRouter) to transcribe handwritten answers.
- **Live Fallback Chain**: If a primary AI model fails (due to quota or error), the system automatically attempts extraction with secondary models, showing the process live in the UI for total transparency.
- **High-Precision Pre-processing**: Automatically optimizes image resolution and clarity before extraction to ensure the highest accuracy for complex handwriting.

### 📊 Intelligent Automated Grading
- **Human-Like Evaluation**: Analyzes student answers against an answer key using LLMs to award marks based on semantic meaning rather than just keywords.
- **Grading Fallback Loop**: Uses a prioritized chain of AI models to ensure that even if one provider is down, the exam is graded by the next best available model.
- **Regrade Intelligence**: Automatically detects if a student is being regraded and adjusts internal records and communications accordingly.

### 📧 Automated Result Delivery
- **Auto-Publish System**: A user-controlled toggle that automatically dispatches professional email reports to students immediately after grading is complete.
- **Dynamic Email Templates**: Students receive beautiful, branded emails containing their scores. If it's a regrade, the email includes a prominent "Regraded" alert to keep them informed.

### ⚙️ Centralized AI Command Center
- **Encrypted API Management**: Securely store and manage keys for multiple AI providers (Gemini, Groq, Cohere, OpenRouter, Mistral).
- **Dynamic Strategy Configuration**: Drag-and-drop interface to prioritize which AI models should be used for OCR and Grading across the entire platform.

---

## 2. Architecture Overview

NovaEvaluate follows a **Resilient Switchboard Architecture**, designed to ensure that the grading pipeline never stops.

1.  **Ingestion Layer**: Handles high-resolution uploads of answer keys and student sheets.
2.  **OCR Switchboard**: A client-orchestrated loop that traverses a chain of Vision AI models until a successful transcription is achieved.
3.  **Grading Engine**: A semantic analysis core that compares extracted student text against the verified answer key.
4.  **Communication Bridge**: An automated mailer system that links grading events to student notifications.
5.  **Security Vault**: An encryption layer that protects sensitive AI credentials stored in the database.

---

## 3. Usage Instructions

### Creating an Exam
1.  **Details**: Enter the exam title, subject, and total marks.
2.  **Answer Key**: Upload an image or PDF of the correct answers. The system will run its OCR fallback chain to extract the questions.
3.  **Review**: Verify the extracted questions and marks. You can manually edit any row to ensure 100% accuracy.

### Grading Students
1.  **Upload**: Upload student answer sheets (Image/PDF) or a spreadsheet for batch processing.
2.  **OCR Extraction**: Click "Grade" to see the live OCR process. Watch as the system navigates through models to extract the handwriting.
3.  **Automatic Evaluation**: Once text is extracted, the system grades the answers instantly.
4.  **Review Results**: View detailed marks for each student in the dashboard.

### Result Delivery
-   **Manual**: Click the "Publish" button next to a student to send their result.
-   **Automatic**: Enable "Auto Publish" in Settings to have results sent the moment grading finishes.

---

## 4. Setup Steps

### Prerequisites
-   A database (MySQL/PostgreSQL) for storing exam records.
-   SMTP credentials (e.g., Gmail App Password) for sending results.
-   At least one AI API key (Gemini, Groq, or OpenRouter).

### Initial Configuration
1.  **Environment Setup**: Rename `.env.example` to `.env` and fill in your database and SMTP details.
2.  **Database Sync**: Run the database migration to create the necessary tables.
3.  **Initialization**: Run the seed script to set up the default AI fallback chains and system settings.
4.  **Launch**: Start the application and navigate to the **Settings** page.
5.  **AI Configuration**: Enter your API keys and select your "Active Model" to begin grading.

---
*Developed for industrial-grade AI evaluation by NovaEvaluate.*
