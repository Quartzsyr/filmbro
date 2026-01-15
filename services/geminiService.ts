import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
// Note: Even if API_KEY is missing, we initialize, but catch errors later.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "dummy_key" });

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
  // Convert blob URL to base64 for the API (In a real app, you'd handle this more efficiently)
  // For this demo, we'll fetch the blob and convert.
  let base64Data = "";
  
  try {
    const blob = await fetch(photoUrl).then(r => r.blob());
    base64Data = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert image", e);
    // Mock return if fetch fails (e.g. cross origin issues with some placeholder images)
    return {
       composition: "Classic rule of thirds.",
       mood: "Nostalgic and warm.",
       tags: ["film", "analog"],
       rating: 8
    };
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data.split(',')[1]
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
        console.warn("No API Key, returning default recipe mock.");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            id: 'ai-mock-' + Date.now(),
            name: 'AI: ' + userPrompt,
            temp: '20°C',
            steps: [
                { name: 'Developer (Mock)', duration: 300, color: 'text-green-500', description: 'Mock AI developer step' },
                { name: 'Stop', duration: 60, color: 'text-yellow-500', description: 'Stop bath' },
                { name: 'Fixer', duration: 300, color: 'text-purple-500', description: 'Fixer' },
                { name: 'Wash', duration: 600, color: 'text-blue-500', description: 'Final wash' }
            ]
        };
     }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert film development lab technician. 
      Generate a film development recipe based on this user request: "${userPrompt}".
      
      If the user specifies a push/pull process, adjust times accordingly.
      If the developer is not specified, recommend a standard one like D-76 or ID-11 for B&W, or C-41 for color.
      
      Return a valid JSON object.
      The 'color' field must be one of these Tailwind CSS classes based on the chemical step:
      - Developer: 'text-green-500' (or red-500 for Color Dev)
      - Stop Bath: 'text-yellow-500'
      - Fixer / Blix: 'text-purple-500'
      - Wash: 'text-blue-500'
      - Stabilizer / Photo Flo: 'text-pink-500'
      
      Schema:
      {
        "id": "unique-id",
        "name": "Short Descriptive Name (e.g. HP5+ @ 1600 in DD-X)",
        "temp": "Temperature (e.g. 20°C or 38°C)",
        "steps": [
          {
            "name": "Step Name",
            "duration": 300, // in seconds
            "color": "tailwind-text-class",
            "description": "Short instruction (e.g. Agitate first 30s, then 5s every min)"
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
    if (!text) return null;
    return JSON.parse(text) as DevelopmentRecipe;

  } catch (error) {
    console.error("Recipe generation failed:", error);
    return null;
  }
};
