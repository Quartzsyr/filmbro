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
 * 确保返回纯净的 base64 字符串，不含 data:image/xxx;base64, 前缀
 */
const prepareImageData = (imageData: string) => {
  if (!imageData) throw new Error("Image data is empty");
  if (imageData.includes('base64,')) {
    return imageData.split('base64,')[1];
  }
  return imageData;
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
      // 修正：直接传递内容对象而非数组
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: prepareImageData(base64Image)
            }
          },
          { text: "请识别这张照片中的胶卷品牌、型号名称（如 Gold, Portra, Tri-X）以及 ISO 值。" }
        ]
      },
      config: {
        systemInstruction: "你是一个专业的胶片摄影专家。你的任务是识别照片中的胶卷包装或底片边缘。请严谨识别，并以 JSON 格式返回 brand, name, iso, type 字段。若无法确定，请返回最可能的估算值。",
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

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const result = JSON.parse(text.trim());
    return { ...fallbackData, ...result };
  } catch (error) {
    console.error("AI识别失败，使用默认值:", error);
    return fallbackData;
  }
};

/**
 * AI 验片：分析照片构图与氛围
 */
export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  const fallbackData: PhotoAnalysisResult = {
    composition: "由于网络或格式原因，AI 暂时无法解析构图细节。",
    mood: "光影间流露出的韵味难以言表。",
    tags: ["Film", "Photography"],
    rating: 7.5
  };

  try {
    let base64Data = "";

    // 判断是 URL 还是 Base64
    if (photoUrl.startsWith('data:')) {
      base64Data = prepareImageData(photoUrl);
    } else if (photoUrl.startsWith('http')) {
      // 网络图片需要先 fetch
      try {
        const fetchRes = await fetch(photoUrl);
        const blob = await fetchRes.blob();
        const converted = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        base64Data = prepareImageData(converted);
      } catch (e) {
        console.warn("无法获取远程图片进行分析:", e);
        return fallbackData;
      }
    } else {
      // 假设是纯 base64
      base64Data = photoUrl;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          { text: "请作为一名摄影评论家，对这张照片进行专业的中文艺术分析。" }
        ]
      },
      config: {
        systemInstruction: "分析照片的构图(composition)、氛围(mood)，给出英文标签(tags)和 1-10 的艺术评分(rating)。请务必只返回 JSON 格式数据。",
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

    const text = response.text;
    if (!text) throw new Error("Empty analysis result");
    
    const result = JSON.parse(text.trim());
    return { ...fallbackData, ...result };
  } catch (error) {
    console.error("AI分析失败:", error);
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
        systemInstruction: "你是一位暗房大师。请生成底片冲洗 JSON 配方。duration 为秒数，color 为 Tailwind 颜色类名。",
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
    
    const text = response.text;
    return text ? JSON.parse(text.trim()) : null;
  } catch (error) {
    console.error("生成配方失败:", error);
    return null;
  }
};