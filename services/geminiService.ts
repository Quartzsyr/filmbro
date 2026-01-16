
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
 * 获取当前的有效 API Key
 * 优先级：localStorage (用户手动设置) > process.env.API_KEY (系统/平台注入)
 */
export const getApiKey = () => {
  const manualKey = localStorage.getItem('GEMINI_API_KEY');
  if (manualKey && manualKey.trim() !== '') {
    return manualKey.trim();
  }
  return process.env.API_KEY || "";
};

/**
 * 助手函数：初始化 GoogleGenAI 实例
 * 每次调用都重新初始化以确保使用最新的 API Key
 */
const getAIInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

/**
 * 助手函数：清理 Base64 数据
 */
const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

/**
 * 根据天气和库存推荐胶卷
 */
export const recommendFilm = async (weather: string, stock: any[]): Promise<string> => {
  const ai = getAIInstance();
  const stockInfo = stock.map(f => `${f.brand} ${f.name} (ISO ${f.iso})`).join(', ');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `当前天气：${weather}。我的胶卷库存有：${stockInfo}。请根据天气推荐最适合今天带出门的一款胶卷，并简述原因（中文，50字以内）。`
  });

  return response.text || "建议带上全能的 ISO 400 胶卷。";
};

/**
 * 识别胶片型号
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const ai = getAIInstance();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "Identify this film stock package. Respond ONLY with JSON format." }
      ]
    },
    config: {
      systemInstruction: "You are a professional film photography expert. Analyze the package and return: brand, name, iso (integer), type (Color Negative, B&W, Slide). No markdown, just raw JSON.",
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
 * 分析照片
 */
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
          { text: "Analyze this photo as a professional curator. Provide constructive feedback in Chinese. Respond ONLY with JSON." }
        ]
      },
      config: {
        systemInstruction: "Analyze composition, mood, tags, and rating (1-10). Use professional photography terminology in Chinese. JSON output only.",
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}") as PhotoAnalysisResult;
  } catch (error) {
    console.error("AI 分析失败:", error);
    throw error;
  }
};

/**
 * 获取冲洗配方
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate professional darkroom development steps for: ${prompt}. Steps should be in Chinese.`,
      config: {
        systemInstruction: "You are an expert darkroom technician. Provide chemical steps in JSON. Colors for steps must be Tailwind text-color classes (e.g., text-red-500). JSON only.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Recipe Generation Error:", error);
    return null;
  }
};
