
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

// Added missing interfaces for DevelopmentTimer
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
 * 必须移除 data:image/jpeg;base64, 等前缀
 */
const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is empty");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

/**
 * 识别胶卷型号 - 使用 gemini-3-flash-preview 以获得最快响应
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const fallback: IdentificationResult = { brand: "Kodak", name: "Gold 200", iso: 200, type: "Color Negative" };
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
          { text: "识别照片中的胶卷包装品牌、型号和ISO。请只返回 JSON 格式数据。" }
        ]
      },
      config: {
        systemInstruction: "你是一个专业的胶片摄影器材专家。分析图片并返回 JSON。字段: brand, name, iso (整数), type (类型: Color Negative, B&W, Slide)。不要包含任何 Markdown 说明。",
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

    const text = response.text || "{}";
    return JSON.parse(text) as IdentificationResult;
  } catch (error) {
    console.error("AI 识别失败:", error);
    return fallback;
  }
};

/**
 * AI 分析照片
 */
export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  const fallback: PhotoAnalysisResult = { 
    composition: "经典的胶片构图，展现了独特的叙事感。", 
    mood: "温润的影调，具有强烈的叙事氛围。", 
    tags: ["Film", "Classic"], 
    rating: 8.5 
  };

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

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Data) } },
          { text: "作为策展人分析这张照片。请只返回 JSON。" }
        ]
      },
      config: {
        systemInstruction: "分析照片的构图(composition)、氛围(mood)，给出英文标签(tags)和 1-10 的艺术评分(rating)。",
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || "{}") as PhotoAnalysisResult;
  } catch (error) {
    console.error("AI 分析失败:", error);
    return fallback;
  }
};

/**
 * AI 生成冲洗配方 - 使用 gemini-3-flash-preview 处理 Q&A 任务
 */
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `为以下要求生成胶片冲洗配方: ${prompt}`,
      config: {
        systemInstruction: "你是一个专业的暗房技师。根据用户要求提供详细的冲洗步骤。id 随机。color 字段请从以下 Tailwind CSS 类中选择：text-red-500, text-blue-500, text-green-500, text-purple-500, text-yellow-500, text-pink-500, text-orange-500。duration 以秒为单位。直接返回 JSON，不要包含 markdown。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            temp: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  color: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["name", "duration", "color", "description"]
              }
            }
          },
          required: ["id", "name", "temp", "steps"]
        }
      }
    });

    const text = response.text || "null";
    return JSON.parse(text) as DevelopmentRecipe;
  } catch (error) {
    console.error("AI 配方生成失败:", error);
    return null;
  }
};
