import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  /**
   * Generates energetic sensei-style encouragement in Chinese.
   * Uses 'gemini-3-flash-preview' for basic text tasks.
   */
  async getEncouragement(score: number): Promise<string> {
    try {
      // Correctly initializing GoogleGenAI within the method to ensure fresh instance
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I just played a fruit slashing game and got a score of ${score}. 
        Give me a very short, energetic, "Sensei-style" one-liner encouragement (under 15 words) in Chinese.`,
        config: {
          temperature: 0.8,
        }
      });
      // Correct usage: Accessing the .text property directly.
      return response.text || "切得好！继续努力！";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "手起刀落，气势如虹！";
    }
  }
}

export const geminiService = new GeminiService();