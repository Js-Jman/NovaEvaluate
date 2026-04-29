import { buildGradingPrompt } from '../lib/grading/prompt';

/**
 * DEBUG: GRADING PROMPT GENERATION
 * Use this script to see exactly what is being sent to the AI for evaluation.
 */

const SAMPLE_QUESTIONS = [
  { questionNumber: "1", questionText: "What is HTML?", correctAnswer: "HTML stands for Hypertext Markup Language. It is the standard markup language used for creating web pages.", maxMarks: 2 },
  { questionNumber: "2", questionText: "What are the basic building blocks of HTML?", correctAnswer: "The basic building blocks of HTML are tags, which are used to structure and define the content of a web page.", maxMarks: 2 },
  { questionNumber: "3", questionText: "What is the DOCTYPE declaration in HTML?", correctAnswer: "The DOCTYPE declaration is used to specify the version of HTML that the web page is written in. It helps the browser render the page correctly.", maxMarks: 2 },
  { questionNumber: "4", questionText: "What is the difference between HTML elements, tags, and attributes?", correctAnswer: "HTML elements are individual components... Tags mark start/end... Attributes provide additional info.", maxMarks: 1 },
];

const SAMPLE_STUDENT_ANSWERS = {
  "1": "It stands for HyperText Markup Language, It is standard markup language used for creating web pages.",
  "2": "The basic building blocks are style sheets and JavaScript files which make the page interactive.",
  "3": "It's a comment that the developer uses to tell other developers which version of HTML they are using.",
  "4": "Elements are the layout of the page. Tags are the text... Attributes provide additional info.",
};

async function debugPrompt() {
  console.log("--- DEBUGGING GRADING PROMPT (GEMINI) ---");
  const prompt = buildGradingPrompt("gemini-1.5-flash", SAMPLE_QUESTIONS, SAMPLE_STUDENT_ANSWERS);
  console.log(prompt);
  
  console.log("\n--- DEBUGGING GRADING PROMPT (LLAMA/GROQ) ---");
  const llamaPrompt = buildGradingPrompt("llama-3-70b", SAMPLE_QUESTIONS, SAMPLE_STUDENT_ANSWERS);
  console.log(llamaPrompt);
}

debugPrompt();
