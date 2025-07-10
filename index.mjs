'use strict';

import OpenAI from 'openai';

// 支持的 Gemini 模型列表
const SUPPORTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro', 
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

// 验证并获取 API Key
function getApiKey(headers) {
  // 优先从 Authorization header 获取 API Key
  const authorization = headers?.Authorization || headers?.authorization;
  
  if (authorization) {
    // 检查 Bearer token 格式
    const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch) {
      const token = bearerMatch[1];
      console.log(`[INFO] 从 Authorization header 获取到 API Key`);
      return token;
    }
  }
  
  // 如果没有从 header 获取到，尝试从环境变量获取（兼容性）
  const envApiKey = process.env.GEMINI_API_KEY;
  if (envApiKey) {
    console.log(`[INFO] 从环境变量获取到 API Key`);
    return envApiKey;
  }
  
  console.log(`[ERROR] 未找到有效的 API Key`);
  return null;
}

// 格式化 SSE 数据
function formatSSEData(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// 调用 Gemini API（支持流式响应）
async function callGeminiAPI(apiKey, model, messages, temperature = 0.7, maxTokens = 8000, stream = false) {
  console.log(`[DEBUG] callGeminiAPI 参数:`);
  console.log(`  - 模型: ${model}`);
  console.log(`  - 消息数量: ${messages.length}`);
  console.log(`  - 温度: ${temperature}`);
  console.log(`  - 最大令牌: ${maxTokens}`);
  console.log(`  - 流模式: ${stream}`);
  console.log(`  - API Key 存在: ${!!apiKey}`);
  
  if (!apiKey) {
    console.error(`[ERROR] 未提供 GEMINI_API_KEY`);
    throw new Error('请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY');
  }

  try {
    // 创建 OpenAI 客户端，使用 Google 的 OpenAI 兼容端点
    const baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
    
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL
    });

    console.log(`[INFO] 调用 Gemini API，模型: ${model}, 消息数量: ${messages.length}, 流模式: ${stream}`);
    console.log(`[DEBUG] 发送的消息:`, JSON.stringify(messages, null, 2));

    // 使用 OpenAI 客户端调用 Gemini API
    const requestParams = {
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream
    };
    
    const startTime = Date.now();
    
    if (stream) {
      console.log(`[INFO] 开始流式调用 Gemini API`);
      const streamResponse = await openai.chat.completions.create(requestParams);
      console.log(`[INFO] 流式调用创建成功`);
      return streamResponse;
    } else {
      const completion = await openai.chat.completions.create(requestParams);
      const endTime = Date.now();
      console.log(`[INFO] Gemini API 调用成功，耗时: ${endTime - startTime}ms`);
      console.log(`[DEBUG] API 响应:`, JSON.stringify(completion, null, 2));
      return completion;
    }
    
  } catch (error) {
    console.error(`[ERROR] 调用 Gemini API 失败:`, error);
    console.error(`[ERROR] 错误详情:`);
    console.error(`  - 错误消息: ${error.message}`);
    console.error(`  - 错误状态: ${error.status}`);
    console.error(`  - 错误代码: ${error.code}`);
    console.error(`  - 错误类型: ${error.type}`);
    
    // 处理特定的错误类型
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('无法连接到 Gemini API 服务器');
    } else if (error.status === 401) {
      throw new Error('Gemini API Key 无效或已过期');
    } else if (error.status === 403) {
      throw new Error('Gemini API 访问被拒绝，请检查 API Key 权限');
    } else if (error.status === 429) {
      throw new Error('Gemini API 请求频率超限，请稍后重试');
    } else if (error.status >= 500) {
      throw new Error('Gemini API 服务器错误，请稍后重试');
    } else {
      throw new Error(`Gemini API 错误: ${error.message}`);
    }
  }
}

// 处理聊天完成请求（支持流式响应）
async function handleChatCompletions(headers, body) {
  console.log(`[DEBUG] handleChatCompletions 开始处理`);
  console.log(`[DEBUG] 请求体长度: ${body.length}`);
  
  try {
    if (!body || body.trim() === '') {
      throw new Error('请求体为空');
    }
    
    const requestData = JSON.parse(body);
    
    const {
      model = 'gemini-2.0-flash',
      messages = [],
      temperature = 0.7,
      max_tokens = 8000,
      stream = false
    } = requestData;

    // 验证模型是否支持
    if (!SUPPORTED_MODELS.includes(model)) {
      console.error(`[ERROR] 不支持的模型: ${model}, 支持的模型: ${SUPPORTED_MODELS.join(', ')}`);
      throw new Error(`不支持的模型: ${model}`);
    }

    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[ERROR] 无效的消息格式: ${typeof messages}, 长度: ${messages?.length}`);
      throw new Error('messages 参数必须是非空数组');
    }

    // 获取 API Key
    const apiKey = getApiKey(headers);
    if (!apiKey) {
      throw new Error('请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY');
    }

    console.log(`[INFO] 处理聊天完成请求，模型: ${model}, 消息数量: ${messages.length}, 流模式: ${stream}`);

    const result = await callGeminiAPI(apiKey, model, messages, temperature, max_tokens, stream);
    
    if (stream) {
      // 流式响应处理
      console.log(`[INFO] 开始处理流式响应`);
      
      let sseData = '';
      let chunkCount = 0;
      
      try {
        for await (const chunk of result) {
          chunkCount++;
          console.log(`[DEBUG] 收到流式数据块 ${chunkCount}:`, JSON.stringify(chunk, null, 2));
          
          // 格式化为 SSE 数据
          sseData += formatSSEData(chunk);
        }
        
        // 添加结束标记
        sseData += formatSSEData({ 
          choices: [{ 
            delta: {}, 
            finish_reason: 'stop' 
          }] 
        });
        sseData += 'data: [DONE]\n\n';
        
        console.log(`[INFO] 流式响应处理完成，共 ${chunkCount} 个数据块`);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          },
          body: sseData
        };
        
      } catch (streamError) {
        console.error(`[ERROR] 处理流式响应失败:`, streamError);
        throw streamError;
      }
      
    } else {
      // 非流式响应
      const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: JSON.stringify(result)
      };
      
      console.log(`[INFO] 聊天完成请求处理成功，响应状态: ${response.statusCode}`);
      return response;
    }
    
  } catch (error) {
    console.error(`[ERROR] 处理聊天完成请求失败:`, error);
    
    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          message: error.message,
          type: 'internal_error',
          code: 'gemini_proxy_error'
        }
      })
    };
    
    console.log(`[DEBUG] 错误响应:`, JSON.stringify(errorResponse, null, 2));
    return errorResponse;
  }
}

// 处理模型列表请求
function handleModels() {
  console.log(`[INFO] 处理模型列表请求`);
  
  const models = SUPPORTED_MODELS.map(model => ({
    id: model,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'google',
    permission: [],
    root: model,
    parent: null
  }));

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify({
      object: 'list',
      data: models
    })
  };
  
  console.log(`[INFO] 模型列表请求处理成功，返回 ${models.length} 个模型`);
  return response;
}

// 处理健康检查
function handleHealth() {
  console.log(`[INFO] 处理健康检查请求`);
  
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Gemini 代理运行正常',
      service: 'gemini-proxy',
      version: '1.0.0',
      models: SUPPORTED_MODELS.length,
      usage: '请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY',
      features: {
        streaming: true,
        cors: true,
        flexible_auth: true
      }
    })
  };
  
  console.log(`[INFO] 健康检查完成`);
  return response;
}

// 主处理函数
export const handler = async (event, context) => {
  const startTime = Date.now();
  const requestId = context.requestId || 'unknown';
  
  console.log(`[INFO] === 开始处理请求 ${requestId} ===`);
  
  try {
    // 处理阿里云函数计算的事件格式
    console.log(`[DEBUG] 事件类型: ${typeof event}, 是否为Buffer: ${Buffer.isBuffer(event)}`);
    
    let eventObj;
    if (Buffer.isBuffer(event)) {
      console.log(`[DEBUG] 解析 Buffer 事件`);
      eventObj = JSON.parse(event.toString());
    } else if (typeof event === 'string') {
      console.log(`[DEBUG] 解析字符串事件`);
      eventObj = JSON.parse(event);
    } else {
      console.log(`[DEBUG] 使用对象事件`);
      eventObj = event;
    }

    // 获取 HTTP 请求信息 - 适配阿里云函数计算格式
    const method = eventObj.requestContext?.http?.method || eventObj.httpMethod || 'GET';
    const path = eventObj.rawPath || eventObj.path || eventObj.requestContext?.http?.path || '/';
    const headers = eventObj.headers || {};
    let body = eventObj.body || '';

    console.log(`HTTP ${method} ${path}`);
    // 处理 Base64 编码的请求体
    if (eventObj.isBase64Encoded && body) {
      body = Buffer.from(body, 'base64').toString('utf-8');
      console.log(`[DEBUG] 请求体内容: ${body}`);
    }

    console.log(`[INFO] HTTP ${method} ${path}`);

    // 处理 CORS 预检请求
    if (method === 'OPTIONS') {
      console.log(`[INFO] 处理 CORS 预检请求`);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        },
        body: ''
      };
    }

    let response;
    // 支持带 /v1 前缀和不带前缀的路径，兼容 OpenAI 客户端
    const isModelsPath = (path === '/v1/models' || path === '/models') && method === 'GET';  
    const isChatCompletionsPath = (path === '/v1/chat/completions' || path === '/chat/completions') && method === 'POST';
    
    if (isChatCompletionsPath) {
      console.log(`[INFO] 路由匹配: 聊天完成接口 (${path})`);
      response = await handleChatCompletions(headers, body);
    } else if (isModelsPath) {
      console.log(`[INFO] 路由匹配: 模型列表接口 (${path})`);
      response = handleModels();
    } else if (path === '/health' && method === 'GET') {
      console.log(`[INFO] 路由匹配: 健康检查接口`);
      response = handleHealth();
    } else if (path === '/' && method === 'GET') {
      console.log(`[INFO] 路由匹配: 根路径，返回健康检查`);
      response = handleHealth();
    } else {
      console.log(`[WARN] 路由未匹配: ${method} ${path}`);
      response = {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: {
            message: `路径 ${path} 不存在`,
            type: 'not_found',
            code: 'path_not_found'
          }
        })
      };
    }
    
    const endTime = Date.now();
    console.log(`[INFO] 请求处理完成，耗时: ${endTime - startTime}ms, 状态码: ${response.statusCode}`);
    console.log(`[INFO] === 请求 ${requestId} 处理结束 ===`);
    
    return response;
    
  } catch (error) {
    const endTime = Date.now();
    console.error(`[ERROR] 处理请求失败，耗时: ${endTime - startTime}ms:`, error);

    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          message: '内部服务器错误',
          type: 'internal_error',
          code: 'server_error',
          requestId: requestId
        }
      })
    };
    
    console.log(`[INFO] === 请求 ${requestId} 异常结束 ===`);
    return errorResponse;
  }
};