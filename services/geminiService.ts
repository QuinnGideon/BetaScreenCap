import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: "Extract all visible text from this image. Return only the text, maintaining layout where possible. Do not include markdown formatting like ```." }
        ]
      }
    });
    return response.text || "No text detected.";
  } catch (error) {
    console.error("OCR Error:", error);
    return "Error extracting text.";
  }
};

export const describeImage = async (base64Image: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: "Describe what is in this screenshot in detail, as if describing it to someone who cannot see it." }
        ]
      }
    });
    return response.text || "No description available.";
  } catch (error) {
    console.error("Describe Error:", error);
    return "Error describing image.";
  }
};
