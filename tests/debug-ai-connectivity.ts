import { callAI } from '../lib/ai/switchboard';

/**
 * DEBUG: AI CONNECTIVITY & FALLBACK
 * Run this to test if your API keys are working and how the fallback chain behaves.
 */

async function debugAiConnectivity() {
  console.log("--- TESTING AI CONNECTIVITY ---");
  
  const testTask = {
    prompt: "Respond with the word 'READY' and nothing else."
  };

  try {
    console.log("Attempting AI call...");
    const result = await callAI(testTask);
    
    console.log("\n✅ SUCCESS!");
    console.log(`Model Used: ${result.modelUsed}`);
    console.log(`Response: ${result.text}`);
    
    if (result.fallbackErrors.length > 0) {
      console.log("\n⚠️ Note: Some models failed before success:");
      result.fallbackErrors.forEach(err => {
        console.log(`- ${err.modelId}: ${err.error}`);
      });
    }
  } catch (err: any) {
    console.log("\n❌ ALL MODELS FAILED!");
    console.log(`Final Error: ${err.message}`);
  }
}

debugAiConnectivity();
