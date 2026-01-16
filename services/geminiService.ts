
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
 * 核心：获取当前最有效的 API Key
 * 优先级：localStorage (用户手动设置) > process.env.API_KEY (系统默认)
 */
export const getApiKey = () => {
  const manualKey = localStorage.getItem('GEMINI_API_KEY');
  const envKey = process.env.API_KEY;
  return (manualKey && manualKey.trim() !== '') ? manualKey.trim() : (envKey || "");
};

/**
 * 助手函数：初始化 AI 实例
 */
const createAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("API_KEY_MISSING");
    return new GoogleGenAI({ apiKey: key });
};

/**
 * 助手函数：清理 Base64 数据
 */
const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

/**
 * AI 识别胶片型号
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const ai = createAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "Identify this film stock. Respond ONLY with JSON format." }
      ]
    },
    config: {
      systemInstruction: "You are a professional film photography expert. Analyze the film package and return: brand, name, iso (integer), type. Respond only in JSON.",
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
};

/**
 * AI 分析照片
 */
export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  const ai = createAI();
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
          { text: "Analyze this photo. Respond ONLY with JSON." }
        ]
      },
      config: {
        systemInstruction: "Analyze composition, mood, tags, and rating (1-10). Use Chinese for descriptions. JSON only.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "{}") as PhotoAnalysisResult;
  } catch (error) {
    throw error;
  }
};

/**
 * AI 天气拍摄建议
 */
export const recommendFilm = async (weather: string, stock: any[]): Promise<string> => {
  const ai = createAI();
  const stockInfo = stock.map(f => `${f.brand} ${f.name} (ISO ${f.iso})`).join(', ');
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `当前天气：${weather}。库存：${stockInfo}。推荐一款并说明原因（中文，简短）。`
  });
  return response.text || "建议使用 ISO 400 胶卷。";
};

/**
 * AI 生成冲洗配方
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const ai = createAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate development steps for: ${prompt}`,
      config: {
        systemInstruction: "Expert darkroom technician. Steps in JSON. Chinese descriptions. Tailwind colors.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
