// 此文件已迁移到 Next.js 框架
// 原有的 Express 应用现在已被 Next.js API Routes 替代
// 请使用 `pnpm dev` 启动开发服务器
// 或使用 `pnpm build && pnpm start` 启动生产服务器

import OpenAI from 'openai';
import express from 'express';
import cors from 'cors';

// 初始化 Express 应用
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 环境变量
const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 在函数计算环境中，延迟检查 API Key
let openai;

function initializeOpenAI() {
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

// 支持的 Gemini 模型列表（更新为最新模型）
const SUPPORTED_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-pro', 
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro-vision',
    'gemini-pro',
    'gemini-pro-vision'
];

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Gemini OpenAI Proxy is running',
        usingGoogleOfficialEndpoint: true
    });
});

// 模型列表端点
app.get('/v1/models', (req, res) => {
    const models = SUPPORTED_MODELS.map(model => ({
        id: model,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'google'
    }));
    
    res.json({
        object: 'list',
        data: models
    });
});

// Chat Completions 端点
app.post('/v1/chat/completions', async (req, res) => {
    try {
        const { model, messages, stream = false, temperature, max_tokens, top_p, ...otherParams } = req.body;
        
        // 验证必需参数
        if (!model || !messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: {
                    message: '缺少必需参数: model 和 messages',
                    type: 'invalid_request_error'
                }
            });
        }
        
        // 验证模型是否支持
        if (!SUPPORTED_MODELS.includes(model)) {
            return res.status(400).json({
                error: {
                    message: `不支持的模型: ${model}。支持的模型: ${SUPPORTED_MODELS.join(', ')}`,
                    type: 'invalid_request_error'
                }
            });
        }

        // 构建请求参数
        const requestParams = {
            model,
            messages,
            stream,
            ...otherParams
        };

        // 添加可选参数
        if (temperature !== undefined) requestParams.temperature = temperature;
        if (max_tokens !== undefined) requestParams.max_tokens = max_tokens;
        if (top_p !== undefined) requestParams.top_p = top_p;

        if (stream) {
            // 流式响应
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            try {
                const client = initializeOpenAI();
                const stream = await client.chat.completions.create(requestParams);
                
                for await (const chunk of stream) {
                    res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                }
                
                res.write('data: [DONE]\n\n');
                res.end();
            } catch (error) {
                console.error('流式响应错误:', error);
                res.write(`data: ${JSON.stringify({
                    error: {
                        message: error.message,
                        type: 'server_error'
                    }
                })}\n\n`);
                res.end();
            }
        } else {
            // 非流式响应
            const client = initializeOpenAI();
            const response = await client.chat.completions.create(requestParams);
            res.json(response);
        }
        
    } catch (error) {
        console.error('API 错误:', error);
        
        // 处理 OpenAI 错误格式
        if (error.error) {
            return res.status(error.status || 500).json({
                error: error.error
            });
        }
        
        res.status(500).json({
            error: {
                message: error.message || '内部服务器错误',
                type: 'server_error'
            }
        });
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('未处理的错误:', error);
    res.status(500).json({
        error: {
            message: '内部服务器错误',
            type: 'server_error'
        }
    });
});

// 导出用于阿里云函数计算
export const handler = async (req, res, context) => {
    try {
        // 确保 app 正确处理请求
        return new Promise((resolve, reject) => {
            // 重写 res.end 方法来处理响应完成
            const originalEnd = res.end;
            res.end = function(...args) {
                originalEnd.apply(this, args);
                resolve();
            };
            
            // 处理错误
            res.on('error', reject);
            
            // 调用 Express 应用
            app(req, res);
        });
    } catch (error) {
        console.error('Handler 错误:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: {
                    message: '函数执行错误',
                    type: 'server_error'
                }
            });
        }
    }
};

// 本地开发
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!GEMINI_API_KEY) {
        console.error('错误: 未设置 GEMINI_API_KEY 环境变量');
        console.error('请设置环境变量: export GEMINI_API_KEY="your_api_key"');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Gemini OpenAI 代理服务运行在端口 ${PORT}`);
        console.log(`💡 使用 Google 官方 OpenAI 兼容端点`);
        console.log(`💡 健康检查: http://localhost:${PORT}/health`);
        console.log(`📋 模型列表: http://localhost:${PORT}/v1/models`);
    });
} 