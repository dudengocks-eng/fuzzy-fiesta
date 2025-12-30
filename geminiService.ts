
import { GoogleGenAI, Type } from "@google/genai";

// Utility to clean potential markdown from JSON responses
const cleanJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const generateMarketingPack = async (product: any): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-flash-preview for general marketing text tasks as per guidelines
  const model = 'gemini-3-flash-preview';

  const systemInstruction = `
    당신은 대한민국 최고의 트렌드 마케터 '오케팅 AI'입니다. 
    사용자의 제품을 기반으로 [인스타, X, 블로그, 숏폼] 콘텐츠를 '각 채널별 5개씩' 생성하세요.
    단순 나열이 아닌, 각 플랫폼에서 조회수가 터지는 힙하고 트렌디한 문체를 사용하세요.
    반드시 JSON 형식으로 응답하세요.
  `;

  // Define schema for structured marketing pack generation
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      instagram: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["type", "content"]
        }
      },
      xPosts: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      blogs: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            content: { type: Type.STRING },
            faq: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  q: { type: Type.STRING },
                  a: { type: Type.STRING }
                }
              }
            },
            cta: { type: Type.STRING }
          }
        }
      },
      hashtags: {
        type: Type.OBJECT,
        properties: {
          instagram: { type: Type.ARRAY, items: { type: Type.STRING } },
          x: { type: Type.ARRAY, items: { type: Type.STRING } },
          blog: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      },
      shortForms: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            script: { type: Type.STRING },
            srt: { type: Type.STRING }
          }
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `제품명: ${product.name}, 설명: ${product.description}`,
      config: { 
        systemInstruction, 
        responseMimeType: "application/json",
        responseSchema
      }
    });

    // Access .text property directly as per guidelines
    const pack = JSON.parse(response.text || "{}");
    
    // Return structured object containing both content and token usage metadata
    return {
      pack: {
        ...pack,
        productId: product.id,
        createdAt: Date.now()
      },
      tokens: response.usageMetadata?.totalTokenCount || 0
    };
  } catch (error) {
    console.error("생성 오류:", error);
    throw error;
  }
};

export const generateMoreContent = async (product: any, channel: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';

  const systemInstruction = `[${channel}]용 마케팅 콘텐츠 5개를 추가로 더 만드세요. 더 파격적이고 트렌디하게 작성하세요. JSON 배열 형식으로 응답하세요.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `제품: ${product.name}`,
      config: { systemInstruction, responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonResponse(response.text || "[]"));
  } catch (error) {
    throw error;
  }
};

// Fix: Added the missing exported function enhanceProductImage
export const enhanceProductImage = async (base64Image: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Parse mimeType and base64 data from data URL
  const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid image format");
  const mimeType = matches[1];
  const data = matches[2];

  // Using gemini-2.5-flash-image for image editing tasks
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: data,
            mimeType: mimeType,
          },
        },
        {
          text: "이 제품 이미지의 조명과 선명도를 전문 쇼핑몰 수준으로 보정해 주세요. 배경을 정리하고 제품이 돋보이도록 개선해 주세요. 보정된 이미지를 응답으로 보내주세요.",
        },
      ],
    },
  });

  // Iterate through parts to find the generated image as per guidelines
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  // Return original image if enhancement failed or no image was returned
  return base64Image;
};
