import { GoogleGenAI } from "@google/genai";

// Ensure API Key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Using the 'Nano Banana' model equivalent: gemini-2.5-flash-image
const MODEL_NAME = 'gemini-2.5-flash-image';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImagePrompt = async (
  base64Image: string,
  instructions?: string
): Promise<string> => {
  let retries = 0;
  const maxRetries = 3;

  while (true) {
    try {
      // Strip the data:image/png;base64, prefix if present
      const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
      const mimeType = base64Image.match(/^data:image\/(png|jpeg|jpg|webp);base64,/)?.[1] || 'jpeg';

      const systemPrompt = `你是一位专业的电影摄影师和AI提示词工程师。
      你的任务是分析提供的画面，生成一段用于 AI 绘画（如 Midjourney 或 Stable Diffusion）的详细提示词。
      
      请按以下结构输出（仅输出中文）：
      1. **画面描述**: 描述画面中的主体、动作、环境。
      2. **摄影风格**: 描述镜头角度（如广角、特写）、光影（如侧光、赛博朋克霓虹）、色调。
      3. **艺术风格**: 描述画面质感（如写实、动漫、油画）。
      
      ${instructions ? `额外要求: ${instructions}` : ''}
      
      请直接输出提示词内容，不要添加多余的寒暄。`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              text: systemPrompt,
            },
            {
              inlineData: {
                mimeType: `image/${mimeType}`,
                data: cleanBase64,
              },
            },
          ],
        },
      });

      return response.text || "无法生成描述";
    } catch (error: any) {
      // Handle Rate Limits (429)
      if (
        (error.message?.includes('429') || error.status === 429 || error.toString().includes('429')) && 
        retries < maxRetries
      ) {
        retries++;
        // Exponential backoff: 2s, 4s, 8s...
        const waitTime = Math.pow(2, retries) * 1000; 
        console.warn(`Rate limit exceeded (429). Retrying in ${waitTime/1000}s... (Attempt ${retries}/${maxRetries})`);
        await delay(waitTime);
        continue;
      }

      console.error("Gemini Analysis Error:", error);
      throw new Error(error.message || "AI 分析失败，请检查 API Key 或网络连接。");
    }
  }
};