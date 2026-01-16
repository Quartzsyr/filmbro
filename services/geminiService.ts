
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

export const getApiKey = () => {
  const manualKey = localStorage.getItem('GEMINI_API_KEY');
  if (manualKey && manualKey.trim() !== '') {
    return manualKey.trim();
  }
  return process.env.API_KEY || "";
};

const getAIInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "Identify the film stock package in this image. Return ONLY JSON." }
      ]
    },
    config: {
      systemInstruction: "Identify the film brand, name, ISO, and type. Respond in JSON.",
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
  return JSON.parse(response.text || "{}");
};

export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  const ai = getAIInstance();
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
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Data) } },
          { text: "分析这张照片的构图与意境（中文）。" }
        ]
      },
      config: {
        systemInstruction: "Analyze composition, mood, tags, rating. JSON output only.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { throw error; }
};

export const getDailyInsight = async (): Promise<string> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "为胶片摄影师写一句简短、充满艺术感的每日箴言（中文，20字以内）。",
      config: { temperature: 0.9 }
    });
    return response.text?.trim() || "光影是时间的琥珀。";
  } catch (e) {
    return "按下快门，与此刻握手言和。";
  }
};

export const recommendFilm = async (weather: string, stock: any[]): Promise<string> => {
  const ai = getAIInstance();
  const stockInfo = stock.map(f => `${f.brand} ${f.name} (ISO ${f.iso})`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `天气是：${weather}。库存有：${stockInfo}。推荐一款并说明原因（中文，50字以内）。`
  });
  return response.text || "建议带上 ISO 400 的胶卷。";
};

export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate darkroom steps for: ${prompt}. JSON only.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "null");
  } catch (error) { return null; }
};
