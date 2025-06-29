import { initializeOpenAI } from '../../../../lib/openai.js';
import { SUPPORTED_MODELS } from '../../../../lib/constants.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
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
            res.status(200).json(response);
        }
        
    } catch (error) {
        console.error('API 错误:', error);
        
        // 处理 OpenAI 错误格式
        if (error.error) {
            return res.status(error.status || 500).json({
                error: error.error
            });
        }
        
        return res.status(500).json({
            error: {
                message: error.message || '内部服务器错误',
                type: 'server_error'
            }
        });
    }
} 