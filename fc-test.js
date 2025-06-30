import fetch from 'node-fetch';
import OpenAI from 'openai';

// 测试配置
const CONFIG = {
  baseURL: 'https://xx.ap-southeast-1.fcapp.run',
  // 请替换为你的实际 AUTH_TOKEN
  authToken: process.env.AUTH_TOKEN || '',
  timeout: 30000 // 30秒超时
};

// 颜色输出工具
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// 通用请求函数
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 测试函数包装器
async function runTest(description, testFunction) {
  stats.total++;
  const startTime = Date.now();
  
  console.log(colors.blue(`\n🧪 ${description}`));
  console.log(colors.cyan('─'.repeat(60)));
  
  try {
    await testFunction();
    const duration = Date.now() - startTime;
    console.log(colors.green(`✅ 测试通过 (${duration}ms)`));
    stats.passed++;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(colors.red(`❌ 测试失败 (${duration}ms)`));
    console.log(colors.red(`错误: ${error.message}`));
    if (error.response) {
      console.log(colors.yellow(`响应状态: ${error.response.status}`));
      console.log(colors.yellow(`响应内容: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    stats.failed++;
  }
}

class GeminiProxyTester {
  
  // 1. 健康检查测试
  async testHealth() {
    const response = await makeRequest(`${CONFIG.baseURL}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(colors.cyan(`服务状态: ${data.status}`));
    console.log(colors.cyan(`服务版本: ${data.version}`));
    console.log(colors.cyan(`支持模型数量: ${data.models}`));
    console.log(colors.cyan(`认证启用: ${data.auth_enabled}`));
    console.log(colors.cyan(`功能特性: ${JSON.stringify(data.features)}`));
    
    if (data.status !== 'ok') {
      throw new Error('服务状态异常');
    }
  }

  // 2. 模型列表测试
  async testModels() {
    const response = await makeRequest(`${CONFIG.baseURL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.authToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(colors.cyan(`模型数量: ${data.data.length}`));
    console.log(colors.cyan(`支持的模型:`));
    data.data.forEach(model => {
      console.log(colors.cyan(`  - ${model.id} (${model.owned_by})`));
    });
    
    if (!data.data || data.data.length === 0) {
      throw new Error('没有可用的模型');
    }
  }

  // 3. 聊天完成测试（非流式）
  async testChatCompletions() {
    const requestBody = {
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'user', content: '你好！请简单介绍一下自己，用一句话即可。' }
      ],
      temperature: 0.7,
      max_tokens: 100,
      stream: false
    };
    
    console.log(colors.cyan(`请求参数: ${JSON.stringify(requestBody, null, 2)}`));
    
    const response = await makeRequest(`${CONFIG.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.authToken}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(colors.cyan(`响应 ID: ${data.id}`));
    console.log(colors.cyan(`使用模型: ${data.model}`));
    console.log(colors.cyan(`AI 回复: "${data.choices[0].message.content}"`));
    console.log(colors.cyan(`完成原因: ${data.choices[0].finish_reason}`));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('响应格式异常');
    }
  }

  // 4. 聊天完成测试（流式）
  async testChatCompletionsStream() {
    const requestBody = {
      model: 'gemini-2.0-flash',
      messages: [
        { role: 'user', content: '请写一首关于编程的四行小诗' }
      ],
      temperature: 0.8,
      max_tokens: 200,
      stream: true
    };
    
    console.log(colors.cyan(`请求参数: ${JSON.stringify(requestBody, null, 2)}`));
    
    const response = await makeRequest(`${CONFIG.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.authToken}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    console.log(colors.cyan('流式响应:'));
    process.stdout.write(colors.yellow('> '));
    
    // 使用 node-fetch 的方式处理流式数据
    const text = await response.text();
    const lines = text.split('\n');
    
    let fullContent = '';
    let chunkCount = 0;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          console.log(colors.green('\n流式响应完成'));
          break;
        }
        
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            process.stdout.write(colors.yellow(content));
            fullContent += content;
            chunkCount++;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    console.log(colors.cyan(`\n接收到 ${chunkCount} 个数据块`));
    console.log(colors.cyan(`完整内容长度: ${fullContent.length} 字符`));
    
    if (chunkCount === 0) {
      throw new Error('没有接收到流式数据');
    }
  }

  // 5. OpenAI 客户端测试
  async testOpenAIClient() {
    const openai = new OpenAI({
      apiKey: CONFIG.authToken,
      baseURL: CONFIG.baseURL
    });
    
    console.log(colors.cyan('使用 OpenAI 客户端测试...'));
    
    // 测试模型列表
    const models = await openai.models.list();
    console.log(colors.cyan(`客户端获取模型数量: ${models.data.length}`));
    
    // 测试聊天完成
    const response = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: '用一个词形容编程' }],
      max_tokens: 50
    });
    
    console.log(colors.cyan(`客户端 AI 回复: "${response.choices[0].message.content}"`));
    
    if (!response.choices[0].message.content) {
      throw new Error('客户端响应异常');
    }
  }

  // 6. OpenAI 客户端流式测试
  async testOpenAIClientStream() {
    const openai = new OpenAI({
      apiKey: CONFIG.authToken,
      baseURL: CONFIG.baseURL
    });
    
    console.log(colors.cyan('使用 OpenAI 客户端流式测试...'));
    
    const stream = await openai.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: '请说一个编程笑话' }],
      max_tokens: 150,
      stream: true
    });
    
    console.log(colors.cyan('客户端流式响应:'));
    process.stdout.write(colors.yellow('> '));
    
    let content = '';
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        process.stdout.write(colors.yellow(delta));
        content += delta;
        chunkCount++;
      }
    }
    
    console.log(colors.cyan(`\n客户端接收到 ${chunkCount} 个数据块`));
    console.log(colors.cyan(`完整内容长度: ${content.length} 字符`));
    
    if (chunkCount === 0) {
      throw new Error('客户端没有接收到流式数据');
    }
  }

  // 7. 错误处理测试 - 无效认证
  async testInvalidAuth() {
    const response = await makeRequest(`${CONFIG.baseURL}/v1/models`, {
      headers: {
        'Authorization': 'Bearer invalid_token',
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      throw new Error('应该返回认证错误，但请求成功了');
    }
    
    console.log(colors.cyan(`预期的错误状态码: ${response.status}`));
    
    const errorData = await response.json();
    console.log(colors.cyan(`错误信息: ${errorData.error.message}`));
    
    if (response.status !== 401) {
      throw new Error(`期望状态码 401，但得到 ${response.status}`);
    }
  }

  // 8. 错误处理测试 - 不支持的模型
  async testUnsupportedModel() {
    const requestBody = {
      model: 'gpt-4',  // 不支持的模型
      messages: [{ role: 'user', content: '测试' }]
    };
    
    const response = await makeRequest(`${CONFIG.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.authToken}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      throw new Error('应该返回模型不支持错误，但请求成功了');
    }
    
    console.log(colors.cyan(`预期的错误状态码: ${response.status}`));
    
    const errorData = await response.json();
    console.log(colors.cyan(`错误信息: ${errorData.error.message}`));
    
    if (response.status !== 500) {
      throw new Error(`期望状态码 500，但得到 ${response.status}`);
    }
  }

  // 9. CORS 预检测试
  async testCORS() {
    const response = await makeRequest(`${CONFIG.baseURL}/v1/chat/completions`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CORS 预检失败: ${response.status}`);
    }
    
    const headers = response.headers;
    console.log(colors.cyan(`CORS 允许的源: ${headers.get('access-control-allow-origin')}`));
    console.log(colors.cyan(`CORS 允许的方法: ${headers.get('access-control-allow-methods')}`));
    console.log(colors.cyan(`CORS 允许的头部: ${headers.get('access-control-allow-headers')}`));
    
    if (!headers.get('access-control-allow-origin')) {
      throw new Error('缺少 CORS 头部');
    }
  }

  // 10. 性能测试
  async testPerformance() {
    const concurrentRequests = 3;
    const promises = [];
    
    console.log(colors.cyan(`发起 ${concurrentRequests} 个并发请求...`));
    
    for (let i = 0; i < concurrentRequests; i++) {
      const promise = makeRequest(`${CONFIG.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.authToken}`
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [{ role: 'user', content: `这是第 ${i + 1} 个测试请求，请回复收到` }],
          max_tokens: 50
        })
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request ${i + 1} failed: ${response.status}`);
        }
        const data = await response.json();
        return { index: i + 1, response: data };
      });
      
      promises.push(promise);
    }
    
    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    console.log(colors.cyan(`并发请求完成，总耗时: ${endTime - startTime}ms`));
    console.log(colors.cyan(`平均响应时间: ${((endTime - startTime) / concurrentRequests).toFixed(1)}ms`));
    
    results.forEach(result => {
      console.log(colors.cyan(`请求 ${result.index}: "${result.response.choices[0].message.content}"`));
    });
    
    if (results.length !== concurrentRequests) {
      throw new Error(`期望 ${concurrentRequests} 个响应，但只收到 ${results.length} 个`);
    }
  }

  // 运行所有测试
  async runAllTests() {
    console.log(colors.bold(colors.blue('🚀 Gemini 代理服务测试开始')));
    console.log(colors.cyan(`测试目标: ${CONFIG.baseURL}`));
    console.log(colors.cyan(`认证令牌: ${CONFIG.authToken.substring(0, 8)}...`));
    console.log(colors.blue('='.repeat(60)));

    // 测试列表
    const tests = [
      { name: '健康检查测试', func: () => this.testHealth() },
      { name: '模型列表测试', func: () => this.testModels() },
      { name: '聊天完成测试 - 非流式', func: () => this.testChatCompletions() },
      { name: '聊天完成测试 - 流式', func: () => this.testChatCompletionsStream() },
      { name: 'OpenAI 客户端测试', func: () => this.testOpenAIClient() },
      { name: 'OpenAI 客户端流式测试', func: () => this.testOpenAIClientStream() },
      { name: '错误处理测试 - 无效认证', func: () => this.testInvalidAuth() },
      { name: '错误处理测试 - 不支持的模型', func: () => this.testUnsupportedModel() },
      { name: 'CORS 预检测试', func: () => this.testCORS() },
      { name: '性能测试', func: () => this.testPerformance() }
    ];

    // 运行每个测试
    for (const test of tests) {
      await runTest(test.name, test.func);
    }

    // 输出测试结果
    console.log(colors.blue('\n' + '='.repeat(60)));
    console.log(colors.bold(colors.blue('📊 测试结果统计')));
    console.log(colors.cyan(`总测试数: ${stats.total}`));
    console.log(colors.green(`通过: ${stats.passed}`));
    console.log(colors.red(`失败: ${stats.failed}`));
    console.log(colors.cyan(`成功率: ${((stats.passed / stats.total) * 100).toFixed(1)}%`));
    
    if (stats.failed === 0) {
      console.log(colors.green(colors.bold('\n🎉 所有测试通过！')));
    } else {
      console.log(colors.red(colors.bold('\n⚠️  部分测试失败，请检查上述错误信息')));
    }
    
    return stats.failed === 0;
  }
}

// 运行测试
async function main() {
  // 检查环境变量
  if (!process.env.AUTH_TOKEN) {
    console.log(colors.yellow('⚠️  未设置 AUTH_TOKEN 环境变量'));
    console.log(colors.yellow('请运行: export AUTH_TOKEN=your_actual_token'));
    console.log(colors.yellow('或者修改脚本中的 CONFIG.authToken'));
  }

  const tester = new GeminiProxyTester();
  const success = await tester.runAllTests();
  
  // 根据测试结果设置退出码
  process.exit(success ? 0 : 1);
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  console.error(colors.red('未处理的 Promise 拒绝:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(colors.red('未捕获的异常:'), error);
  process.exit(1);
});

// 启动测试
main().catch(error => {
  console.error(colors.red('测试执行失败:'), error);
  process.exit(1);
});