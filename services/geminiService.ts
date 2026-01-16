
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
 * 优先级：localStorage (用户在“我的”页面手动设置) > process.env.API_KEY
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
 * 每次调用都会获取最新的 Key，确保修改后立即生效
 */
const getAIInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");
  return new GoogleGenAI({ apiKey });
};

const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

/**
 * 识别胶片型号 - 专门针对胶卷包装识别进行优化
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const ai = getAIInstance();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "Identify the film stock package in this image. Look for the brand (Kodak, Fuji, Ilford, etc.), the name (Gold, Portra, HP5, etc.), and ISO. Return ONLY JSON." }
      ]
    },
    config: {
      systemInstruction: "You are a professional film photography archivist. Analyze images of film boxes or canisters. Identify the brand, the product name, the ISO rating, and the film type (Color Negative, B&W, Slide). If parts are obscured, make an educated guess based on typical film branding. Respond only in JSON format.",
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

  if (!response.text) throw new Error("AI 返回结果为空");
  return JSON.parse(response.text) as IdentificationResult;
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
          { text: "作为专业摄影评论家，请分析这张照片的构图、氛围并给出建议（中文）。" }
        ]
      },
      config: {
        systemInstruction: "Analyze composition, mood, tags, and rating (1-10). Use professional Chinese photography terminology. JSON output only.",
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
 * 天气推荐
 */
export const recommendFilm = async (weather: string, stock: any[]): Promise<string> => {
  const ai = getAIInstance();
  const stockInfo = stock.map(f => `${f.brand} ${f.name} (ISO ${f.iso})`).join(', ');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `当前天气是：${weather}。我的胶卷冰箱里有：${stockInfo}。请推荐一款最适合今天带出门的胶卷并说明原因（中文，50字以内）。`
  });
  return response.text || "建议带上 ISO 400 的胶卷以应对多变环境。";
};

/**
 * 冲洗配方生成
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate professional darkroom steps for: ${prompt}. Language: Chinese.`,
      config: {
        systemInstruction: "You are an expert darkroom technician. Provide chemical development steps in JSON. Duration in seconds. Color should be a Tailwind text class. JSON only.",
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
