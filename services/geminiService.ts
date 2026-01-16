
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
 */
const getApiKey = () => {
  return localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY || "";
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  const stockInfo = stock.map(f => `${f.brand} ${f.name} (ISO ${f.iso})`).join(', ');

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `当前天气：${weather}。我的胶卷库存有：${stockInfo}。请根据天气推荐最适合今天带出门的一款胶卷，并简述原因（中文，50字以内）。`
  });

  return response.text || "建议带上全能的 ISO 400 胶卷。";
};

/**
 * 识别胶片型号
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "Identify this film stock. Respond ONLY with JSON format." }
      ]
    },
    config: {
      systemInstruction: "You are a professional film photography expert. Analyze the package and return: brand, name, iso (integer), type (Color Negative, B&W, Slide). No markdown.",
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
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
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
        systemInstruction: "Analyze composition, mood, tags, and rating (1-10). JSON only.",
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
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate development steps for: ${prompt}`,
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
