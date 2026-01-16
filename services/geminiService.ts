import { GoogleGenAI, Type } from "@google/genai";

export interface IdentificationResult {
  brand: string;
  name: string;
  iso: number;
  type: string; // Color Negative, B&W, Slide
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
 * 助手函数：清理并验证 Base64 图片数据
 * 移除 Data URL 前缀并去除多余空白，确保纯净的 Base64 传输
 */
const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("Image data is missing");
  const base64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  return base64.trim();
};

/**
 * 识别胶卷型号
 */
export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const fallbackData: IdentificationResult = {
    brand: "Kodak",
    name: "Gold 200",
    iso: 200,
    type: "Color Negative"
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // 修复：使用标准的 contents 对象结构而非数组嵌套
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: prepareImageData(base64Image)
            }
          },
          { text: "请识别这张照片中的胶片品牌、型号和 ISO。" }
        ]
      },
      config: {
        systemInstruction: "你是一个专业的胶片摄影专家。你的任务是识别照片中的胶卷包装或底片边缘信息，并以 JSON 格式返回。字段：brand (品牌), name (型号), iso (数字), type (类型: Color Negative, B&W, 或 Slide)。不要返回 Markdown 代码块。",
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

    const result = JSON.parse(response.text || "{}");
    return { ...fallbackData, ...result };
  } catch (error) {
    console.error("Film Identification Error:", error);
    return fallbackData;
  }
};

/**
 * AI 验片：分析照片构图与氛围
 */
export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  const fallbackData: PhotoAnalysisResult = {
    composition: "由于网络或解析限制，暂无法提供深度分析。",
    mood: "光影间流露出的经典胶片韵味。",
    tags: ["Photography", "Film"],
    rating: 8.0
  };

  try {
    let base64Data = photoUrl;
    
    // 如果是网络图片，尝试转换。在手机端，CORS 限制较严，捕获失败则返回默认。
    if (photoUrl.startsWith('http') && !photoUrl.includes('base64')) {
      try {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn("External fetch failed, might be CORS.");
        return fallbackData;
      }
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: prepareImageData(base64Data)
            }
          },
          { text: "请对这张照片进行艺术分析。" }
        ]
      },
      config: {
        systemInstruction: "你是一位资深的画廊策展人和摄影评论家。请用中文分析照片的构图(composition)、氛围与影调(mood)，提供 5-8 个英文标签(tags)，并给出 1-10 的艺术评分(rating)。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            composition: { type: Type.STRING },
            mood: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            rating: { type: Type.NUMBER }
          },
          required: ["composition", "mood", "tags", "rating"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return { ...fallbackData, ...result };
  } catch (error) {
    console.error("Photo Analysis Error:", error);
    return fallbackData;
  }
};

/**
 * 生成冲洗配方
 */
export const getDevelopmentRecipe = async (userPrompt: string): Promise<DevelopmentRecipe | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: userPrompt }] },
      config: {
        systemInstruction: "你是一位资深的暗房技师。请根据用户需求生成详细的底片冲洗步骤 JSON。时间单位为秒，颜色必须是 Tailwind CSS 的颜色类名。",
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
    
    return JSON.parse(response.text || "null");
  } catch (error) {
    console.error("Recipe Generation Error:", error);
    return null;
  }
};