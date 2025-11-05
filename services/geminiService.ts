import { GoogleGenAI, Type } from "@google/genai";
import type { GeminiMode, ChatMessage, ScaffoldResponse } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelForMode = (mode: GeminiMode | 'chat' | 'scaffold') => {
    switch (mode) {
        case 'thinking':
        case 'scaffold':
            return 'gemini-2.5-pro';
        case 'low-latency':
            return 'gemini-2.5-flash-lite';
        case 'chat':
            return 'gemini-2.5-flash';
        default:
            return 'gemini-2.5-flash';
    }
};

export const analyzeWithGemini = async (
    prompt: string,
    content: string,
    mode: GeminiMode,
    image?: { data: string, mimeType: string }
): Promise<string> => {
    const modelName = getModelForMode(mode);
    const fullPrompt = `${prompt}\n\n---\n\nFile Content:\n\`\`\`\n${content}\n\`\`\``;

    const parts: any[] = [{ text: fullPrompt }];
    if (image) {
        parts.unshift({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            }
        });
    }

    const config = mode === 'thinking' ? { thinkingConfig: { thinkingBudget: 32768 } } : {};

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: parts },
            config: config
        });
        return response.text;
    } catch (e) {
        console.error(`Error calling Gemini model ${modelName}:`, e);
        throw new Error(`Failed to get response from Gemini. Please check the console for details.`);
    }
};

export const chatWithGemini = async (
    history: ChatMessage[],
    newMessage: string,
    image?: { data: string, mimeType: string }
): Promise<string> => {
    const modelName = getModelForMode('chat');
    
    const promptHistory = history.map(msg => `${msg.role}: ${msg.text}`).join('\n');
    const fullPrompt = `${promptHistory}\nuser: ${newMessage}`;

    const parts: any[] = [{ text: fullPrompt }];
    if (image) {
        parts.unshift({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            }
        });
    }
    
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: parts },
            config: {
                 systemInstruction: "You are a helpful coding assistant in the Vibe Code app. Be concise and helpful.",
            }
        });
        return response.text;
    } catch (e) {
        console.error(`Error calling Gemini chat model ${modelName}:`, e);
        throw new Error(`Failed to get chat response from Gemini. Please check the console for details.`);
    }
};

export const scaffoldWithGemini = async (prompt: string): Promise<string> => {
    const modelName = getModelForMode('scaffold');

    const scaffoldSchema = {
      type: Type.OBJECT,
      properties: {
        files: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              path: {
                type: Type.STRING,
                description: 'The full path of the file, including folders. e.g., "src/components/Button.tsx"',
              },
              content: {
                type: Type.STRING,
                description: 'The source code or content of the file.',
              },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['files'],
    };

    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                systemInstruction: "You are a project scaffolding assistant. Based on the user's prompt, generate a list of files with their full paths and content. Output should be a JSON object matching the provided schema. Do not include folders as separate entries in the files array.",
                responseMimeType: "application/json",
                responseSchema: scaffoldSchema,
            }
        });
        return response.text;
    } catch (e) {
        console.error(`Error calling Gemini scaffold model ${modelName}:`, e);
        throw new Error(`Failed to get scaffold response from Gemini. Please check the console for details.`);
    }
};
