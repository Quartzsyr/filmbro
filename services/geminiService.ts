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

export const identifyFilmStock = async (base64Image: string): Promise<IdentificationResult> => {
  const fallbackData: IdentificationResult = {
    brand: "Kodak",
    name: "Gold 200",
    iso: 200,
    type: "Color Negative"
  };

  try {
    if (!process.env.API_KEY) {
      console.warn("No API_KEY found. Using mock data.");
      await new Promise(resolve => setTimeout(resolve, 1500));
      return fallbackData;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-3-flash-preview"; 
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] 
            }
          },
          {
            text: `Identify this film stock. Return ONLY valid JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            name: { type: Type.STRING },
            iso: { type: Type.INTEGER },
            type: { type: Type.STRING }
          },
          required: ["brand", "name", "iso"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    
    return JSON.parse(text) as IdentificationResult;
    
  } catch (error) {
    console.error("Gemini Analysis Failed (Using Fallback):", error);
    return fallbackData; 
  }
};

export const analyzePhoto = async (photoUrl: string): Promise<PhotoAnalysisResult> => {
  // 处理 Base64 或 Blob URL
  let base64Data = photoUrl;
  
  // 如果是普通 URL 且不是 base64，尝试获取并转换（本地 Base64 不需要此步）
  if (photoUrl.startsWith('http') && !photoUrl.includes('base64')) {
      try {
        const blob = await fetch(photoUrl).then(r => r.blob());
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error("Failed to fetch image", e);
      }
  }

  const fallbackData: PhotoAnalysisResult = {
    composition: "主体清晰，构图平衡，采用了三分法。",
    mood: "色调温暖，带有一种复古的怀旧感，光影对比柔和。",
    tags: ["Kodak", "StreetPhotography", "WarmTones", "Vintage", "AnalogVibes"],
    rating: 8.5
  };

  try {
    if (!process.env.API_KEY) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fallbackData;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.includes(',') ? base64Data.split(',')[1] : base64Data
            }
          },
          {
            text: `Analyze this film photography photo. Provide a critique in Chinese (中文).
            1. Describe the composition technique used.
            2. Describe the mood, lighting, and color palette.
            3. Suggest 5-8 relevant English hashtags.
            4. Give a rating out of 10 based on artistic merit.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            composition: { type: Type.STRING },
            mood: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            rating: { type: Type.NUMBER }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text) as PhotoAnalysisResult;

  } catch (error) {
    console.error("Analysis Error:", error);
    return fallbackData;
  }
};

export const getDevelopmentRecipe = async (userPrompt: string): Promise<DevelopmentRecipe | null> => {
  try {
     if (!process.env.API_KEY) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return null;
     }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert film development lab technician. 
      Generate a film development recipe based on this user request: "${userPrompt}".
      
      Return a valid JSON object.
      Schema:
      {
        "id": "unique-id",
        "name": "Short Name",
        "temp": "20°C",
        "steps": [
          {
            "name": "Step Name",
            "duration": 300,
            "color": "tailwind-text-class",
            "description": "Instruction"
          }
        ]
      }`,
      config: {
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
                }
              }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text) as DevelopmentRecipe;
  } catch (error) {
    return null;
  }
};