import OpenAI from 'openai';

// 缓存的 OpenAI 客户端实例
let openai;

export function initializeOpenAI() {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        throw new Error('未设置 GEMINI_API_KEY 环境变量');
    }
    
    if (!openai) {
        openai = new OpenAI({
            apiKey: GEMINI_API_KEY,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
        });
    }
    
    return openai;
} 