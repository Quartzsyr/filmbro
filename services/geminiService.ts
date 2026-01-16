
import { GoogleGenAI, Type } from "@google/genai";
import { StockFilm } from "../types";

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

export interface SceneAnalysisResult {
  lighting: string;
  contrast: string;
  recommendation: string;
  exposureTip: string;
}

// Added DevelopmentStep interface for DevelopmentTimer component
export interface DevelopmentStep {
  name: string;
  duration: number; // in seconds
  color: string;
  description: string;
}

// Added DevelopmentRecipe interface for DevelopmentTimer component
export interface DevelopmentRecipe {
  id: string;
  name: string;
  temp: string;
  steps: DevelopmentStep[];
}

/**
 * 初始化 GoogleGenAI 实例。
 * API Key 必须通过 process.env.API_KEY 获取。
 */
const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

const prepareImageData = (base64Image: string) => {
  if (!base64Image) throw new Error("图像数据为空");
  return base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
};

export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Image) } },
        { text: "识别这张图片中的胶卷包装。请仅以 JSON 格式返回结果。" }
      ]
    },
    config: {
      systemInstruction: "你是一个专业的胶片摄影助手。识别图片中的胶卷品牌、名称、ISO和类型。请务必使用中文回答品牌和类型名称。返回 JSON。",
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

export const analyzePhoto = async (base64Data: string): Promise<PhotoAnalysisResult> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Data) } },
        { text: "深度分析这张照片。使用中文。" }
      ]
    },
    config: {
      systemInstruction: "你是一个资深摄影评论家。用中文分析照片的构图建议、情绪意境（一段优美的话）、并给出1-10的评分及相关标签。必须返回 JSON。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          composition: { type: Type.STRING, description: "构图分析与建议" },
          mood: { type: Type.STRING, description: "影调与意境描述" },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          rating: { type: Type.NUMBER, description: "1到10的评分" }
        },
        required: ["composition", "mood", "tags", "rating"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeSceneForFilm = async (base64Data: string, stockNames: string[]): Promise<SceneAnalysisResult> => {
  const ai = getAIInstance();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: prepareImageData(base64Data) } },
        { text: `根据当前场景，从以下胶片中推荐：${stockNames.join(', ')}。` }
      ]
    },
    config: {
      systemInstruction: "你是一个专业的电影摄影师。用中文分析实时场景的光影特性、反差，并根据现有胶片库存推荐一款最合适的，给出具体的拍摄技巧。返回 JSON。",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lighting: { type: Type.STRING, description: "环境光线描述" },
          contrast: { type: Type.STRING, description: "场景反差分析" },
          recommendation: { type: Type.STRING, description: "推荐的胶片型号" },
          exposureTip: { type: Type.STRING, description: "针对该场景的曝光建议" }
        },
        required: ["lighting", "contrast", "recommendation", "exposureTip"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getDailyInsight = async (): Promise<string> => {
  try {
    const ai = getAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "为胶片摄影师写一句充满诗意的每日箴言。中文，20字以内。",
    });
    return response.text?.trim() || "光影是时间的琥珀。";
  } catch (e) {
    return "按下快门，是与瞬间的永恒告别。";
  }
};

export const recommendFilm = async (weather: string, stock: StockFilm[]): Promise<string> => {
  try {
    const ai = getAIInstance();
    const stockSummary = stock.map(s => `${s.brand} ${s.name}`).join(', ');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `天气：${weather}。库存：${stockSummary}。推荐一款今日用卷。`,
      config: {
        systemInstruction: "你是一个资深胶片摄影专家。用简洁优美的中文从库存中推荐一款最合适的胶卷。总字数控制在50字以内。",
      }
    });
    return response.text?.trim() || "建议根据当前光线强度选择 ISO 匹配的胶卷。";
  } catch (e) {
    return "胶片专家建议根据当前光线情况挑选合适的胶卷。";
  }
};

// Added missing getDevelopmentRecipe function for DevelopmentTimer component
export const getDevelopmentRecipe = async (prompt: string): Promise<DevelopmentRecipe | null> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `生成一个针对以下要求的胶片冲洗配方：${prompt}`,
      config: {
        systemInstruction: "你是一个专业的暗房技师。根据用户提供的胶片冲洗需求生成详细配方。必须返回 JSON 格式。步骤颜色 color 字段必须是 tailwind text- 颜色类名（如 text-green-500, text-red-500）。",
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
                  duration: { type: Type.INTEGER, description: "时长，单位秒" },
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
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Added missing analyzeStats function for StatsView component
export const analyzeStats = async (summary: string): Promise<string> => {
  const ai = getAIInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `基于以下摄影统计数据给出一段专业的导师建议和分析：${summary}`,
      config: {
        systemInstruction: "你是一个资深摄影导师。分析用户的拍摄数据（包括相机偏好、胶片品牌、ISO 分布等），指出他们的创作习惯，并给出针对性的进阶建议。使用中文，字数在150字以内。",
      }
    });
    return response.text?.trim() || "无法获取 AI 数据分析结果。";
  } catch (e) {
    console.error(e);
    return "AI 数据分析引擎繁忙，请稍后再试。";
  }
};
