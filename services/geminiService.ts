
import { GoogleGenAI, Type } from "@google/genai";

export interface IdentificationResult {
  brand: string;
  name: string;
  iso: number;
  type: string; 
}

export interface PhotoAnalysisResult {
  composition: string;
  mood: string;
  tags: string[];
  rating: number;
}

export interface DevelopmentStep {
  name: string;
  duration: number; // seconds
  color: string;
  description: string;
}

export interface DevelopmentRecipe {
  id: string;
  name: string;
  temp: string;
  steps: DevelopmentStep[];
}

/**
 * 助手函数：清理 Base64 数据
 */
const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

/**
 * 识别胶片型号
 * 
 * Create a new GoogleGenAI instance right before use to ensure the latest API key is used.
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  // Use process.env.API_KEY directly as per @google/genai guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
          { text: "Identify the film brand, name, and ISO from this image. Respond ONLY with JSON." }
        ]
      },
      config: {
        systemInstruction: "You are a professional film photography expert. Return a JSON object with: brand, name, iso (integer), type (Color Negative, B&W, Slide). No markdown.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            name: { type: Type.STRING },
            iso: { type: Type.INTEGER },
            type: { type: Type.STRING }
          },
          required: ["brand", "name", "iso", "type"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as IdentificationResult;
  } catch (error: any) {
    console.error("AI 识别失败:", error);
    throw error;
  }
};

/**
 * 分析照片
 * 
 * Create a new GoogleGenAI instance right before use to ensure the latest API key is used.
 */
export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  // Use process.env.API_KEY directly as per @google/genai guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    let base64Data = photoUrl;
    if (photoUrl.startsWith('http')) {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Data) } },
          { text: "Analyze this photo as a curator. Respond ONLY with JSON." }
        ]
      },
      config: {
        systemInstruction: "Analyze composition, mood, provide tags, and a rating (1-10). Response must be JSON.",
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}") as PhotoAnalysisResult;
  } catch (error) {
    console.error("AI 分析失败:", error);
    return { composition: "分析受限", mood: "经典影调", tags: ["Film"], rating: 8 };
  }
};

/**
 * 获取冲洗配方
 * 
 * Create a new GoogleGenAI instance right before use to ensure the latest API key is used.
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  // Use process.env.API_KEY directly as per @google/genai guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate recipe for: ${prompt}`,
      config: {
        systemInstruction: "Expert darkroom technician. Provide steps in JSON. Colors must be Tailwind classes.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
