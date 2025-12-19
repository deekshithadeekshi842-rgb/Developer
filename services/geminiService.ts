
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function simulateCellExecution(code: string, cellType: string): Promise<string> {
  if (cellType === 'markdown') return ''; // Markdown cells don't "execute" in this context

  const systemPrompt = `You are a Python kernel in a Jupyter notebook. 
  The user will provide code. You must simulate the output as it would appear in a terminal or notebook cell. 
  Include error messages if the code looks syntactically wrong. 
  If the code is a snippet (like model definition), confirm it and show some metadata or a summary.
  Keep output concise and technical. Avoid conversational filler.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Execute this code and provide the output:\n\n${code}`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    return response.text || "Execution finished with no output.";
  } catch (error) {
    console.error("Execution simulation failed:", error);
    return "Error: Could not simulate execution. Check your connectivity.";
  }
}

export async function getAiDeveloperAssistantResponse(query: string, context?: string): Promise<string> {
  const systemPrompt = `You are Aether Assistant, a world-class AI developer for machine learning and GPU cloud computing.
  Help users with code, model selection, dataset handling, and cloud architecture.
  Context: ${context || 'None'}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Assistant query failed:", error);
    return "The assistant is currently unavailable.";
  }
}
