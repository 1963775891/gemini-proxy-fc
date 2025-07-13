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

// 支持的图片生成模型
const IMAGE_GENERATION_MODELS = [
  'imagen-3.0-generate-001',
  'imagen-3.0-fast-generate-001',
  'imagen-2.0-generate-001'
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

// 转换 OpenAI 格式的消息为 Gemini 格式（处理图片）
function convertMessagesToGeminiFormat(messages) {
  return messages.map(message => {
    // 如果是文本消息，直接返回
    if (typeof message.content === 'string') {
      return message;
    }
    
    // 如果是数组格式（包含图片和文本）
    if (Array.isArray(message.content)) {
      // 检查是否包含图片
      const hasImage = message.content.some(item => item.type === 'image_url');
      
      if (hasImage) {
        console.log(`[WARN] 检测到图片内容，Gemini OpenAI兼容接口对图片支持有限`);
        console.log(`[INFO] 建议使用原生Gemini API或等待OpenAI兼容性完善`);
        
        // 提取文本部分
        const textParts = message.content.filter(item => item.type === 'text');
        const textContent = textParts.map(part => part.text).join('\n');
        
        // 如果没有文本，提供默认提示
        const finalContent = textContent || '用户发送了一张图片，但当前代理不支持图片处理。请告诉用户：当前使用的Gemini代理暂不支持图片分析功能。';
        
        return {
          ...message,
          content: finalContent
        };
      }
      
      // 如果没有图片，正常处理多部分文本内容
      const textContent = message.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n');
      
      return {
        ...message,
        content: textContent
      };
    }
    
    return message;
  });
}

// 调用 Gemini API（支持流式响应和函数调用）
async function callGeminiAPI(apiKey, model, messages, temperature = 0.7, maxTokens = 8000, stream = false, tools = null) {
  console.log(`[DEBUG] callGeminiAPI 参数:`);
  console.log(`  - 模型: ${model}`);
  console.log(`  - 消息数量: ${messages.length}`);
  console.log(`  - 温度: ${temperature}`);
  console.log(`  - 最大令牌: ${maxTokens}`);
  console.log(`  - 流模式: ${stream}`);
  console.log(`  - 工具函数: ${tools ? tools.length : 0}`);
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
    
    // 添加工具函数支持
    if (tools && tools.length > 0) {
      requestParams.tools = tools;
      console.log(`[INFO] 添加了 ${tools.length} 个工具函数`);
    }
    
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

// 调用图片生成API
async function callImageGenerationAPI(apiKey, model, prompt, aspectRatio = 'square', numberOfImages = 1) {
  console.log(`[INFO] 调用图片生成API，模型: ${model}, 提示词长度: ${prompt.length}`);
  
  if (!apiKey) {
    throw new Error('请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage?key=${apiKey}`;
    
    const requestBody = {
      prompt: {
        text: prompt
      },
      generationConfig: {
        aspectRatio: aspectRatio,
        numberOfImages: numberOfImages
      }
    };

    console.log(`[DEBUG] 图片生成请求:`, JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] 图片生成API调用失败: ${response.status} ${response.statusText}`);
      console.error(`[ERROR] 错误详情: ${errorText}`);
      throw new Error(`图片生成失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[INFO] 图片生成成功`);
    return result;

  } catch (error) {
    console.error(`[ERROR] 调用图片生成API失败:`, error);
    throw new Error(`图片生成错误: ${error.message}`);
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
      stream = false,
      tools = null
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

    // 转换消息格式以支持图片
    const convertedMessages = convertMessagesToGeminiFormat(messages);
    console.log(`[DEBUG] 转换后的消息:`, JSON.stringify(convertedMessages, null, 2));

    const result = await callGeminiAPI(apiKey, model, convertedMessages, temperature, max_tokens, stream, tools);
    
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

// 处理图片生成请求
async function handleImageGeneration(headers, body) {
  console.log(`[INFO] 开始处理图片生成请求`);
  
  try {
    if (!body || body.trim() === '') {
      throw new Error('请求体为空');
    }
    
    const requestData = JSON.parse(body);
    
    const {
      model = 'imagen-3.0-generate-001',
      prompt,
      size = '1024x1024',
      n = 1
    } = requestData;

    // 验证模型是否支持
    if (!IMAGE_GENERATION_MODELS.includes(model)) {
      console.error(`[ERROR] 不支持的图片生成模型: ${model}, 支持的模型: ${IMAGE_GENERATION_MODELS.join(', ')}`);
      throw new Error(`不支持的图片生成模型: ${model}`);
    }

    // 验证提示词
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      throw new Error('prompt 参数必须是非空字符串');
    }

    // 获取 API Key
    const apiKey = getApiKey(headers);
    if (!apiKey) {
      throw new Error('请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY');
    }

    // 转换size参数为aspectRatio
    let aspectRatio = 'square';
    if (size === '1024x1792' || size === '512x896') {
      aspectRatio = 'portrait';
    } else if (size === '1792x1024' || size === '896x512') {
      aspectRatio = 'landscape';
    }

    console.log(`[INFO] 处理图片生成请求，模型: ${model}, 提示词: ${prompt.substring(0, 100)}...`);

    const result = await callImageGenerationAPI(apiKey, model, prompt, aspectRatio, n);
    
    // 转换为OpenAI兼容格式
    const openaiResponse = {
      created: Math.floor(Date.now() / 1000),
      data: []
    };

    if (result.generatedImages) {
      result.generatedImages.forEach((image, index) => {
        openaiResponse.data.push({
          url: `data:image/jpeg;base64,${image.bytesBase64Encoded}`,
          revised_prompt: prompt
        });
      });
    }

    const response = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify(openaiResponse)
    };
    
    console.log(`[INFO] 图片生成请求处理成功，生成了 ${openaiResponse.data.length} 张图片`);
    return response;
    
  } catch (error) {
    console.error(`[ERROR] 处理图片生成请求失败:`, error);
    
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
          code: 'image_generation_error'
        }
      })
    };
    
    return errorResponse;
  }
}

// 处理模型列表请求
function handleModels() {
  console.log(`[INFO] 处理模型列表请求`);
  
  const chatModels = SUPPORTED_MODELS.map(model => ({
    id: model,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'google',
    permission: [],
    root: model,
    parent: null
  }));

  const imageModels = IMAGE_GENERATION_MODELS.map(model => ({
    id: model,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'google',
    permission: [],
    root: model,
    parent: null
  }));

  const allModels = [...chatModels, ...imageModels];

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
      data: allModels
    })
  };
  
  console.log(`[INFO] 模型列表请求处理成功，返回 ${allModels.length} 个模型`);
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
      models: SUPPORTED_MODELS.length + IMAGE_GENERATION_MODELS.length,
      usage: '请在 Authorization header 中提供 Gemini API Key: Bearer YOUR_API_KEY',
      features: {
        streaming: true,
        cors: true,
        flexible_auth: true,
        function_calling: true,
        image_generation: true
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
    const isImageGenerationPath = (path === '/v1/images/generations' || path === '/images/generations') && method === 'POST';
    
    if (isChatCompletionsPath) {
      console.log(`[INFO] 路由匹配: 聊天完成接口 (${path})`);
      response = await handleChatCompletions(headers, body);
    } else if (isImageGenerationPath) {
      console.log(`[INFO] 路由匹配: 图片生成接口 (${path})`);
      response = await handleImageGeneration(headers, body);
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
