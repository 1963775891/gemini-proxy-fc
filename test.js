// 测试 Gemini 代理功能的脚本

// 模拟阿里云函数计算事件
const testEvents = {
  // 健康检查测试
  health: {
    httpMethod: 'GET',
    path: '/health',
    body: '',
    isBase64Encoded: false
  },
  
  // 模型列表测试
  models: {
    httpMethod: 'GET',
    path: '/v1/models',
    body: '',
    isBase64Encoded: false
  },
  
  // 阿里云函数计算格式的模型列表测试
  modelsFC: {
    version: "v1",
    rawPath: "/v1/models",
    headers: {
      "Accept": "application/json",
      "Host": "func-test.us-west-1.fcapp.run",
      "User-Agent": "Mozilla/5.0"
    },
    queryParameters: {},
    body: "",
    isBase64Encoded: false,
    requestContext: {
      accountId: "1234567890",
      domainName: "func-test.us-west-1.fcapp.run",
      requestId: "test-request-id",
      http: {
        method: "GET",
        path: "/v1/models",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1"
      }
    }
  },
  
  // 聊天完成测试
  chatCompletions: {
    httpMethod: 'POST',
    path: '/v1/chat/completions',
    body: JSON.stringify({
      model: 'gemini-1.5-flash',
      messages: [
        {
          role: 'user',
          content: '你好，请简单介绍一下自己'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    }),
    isBase64Encoded: false
  },
  
  // CORS 预检测试
  options: {
    httpMethod: 'OPTIONS',
    path: '/v1/chat/completions',
    body: '',
    isBase64Encoded: false
  },
  
  // 404 测试
  notFound: {
    httpMethod: 'GET',
    path: '/unknown/path',
    body: '',
    isBase64Encoded: false
  }
};

// 动态导入 handler 函数
async function runTests() {
  try {
    // 导入 handler 函数
    const { handler } = await import('./index.mjs');
    
    console.log('🚀 开始测试 Gemini 代理功能...\n');
    
    // 测试健康检查
    console.log('📋 测试 1: 健康检查');
    try {
      const result = await handler(testEvents.health);
      console.log('✅ 健康检查成功');
      console.log('响应状态:', result.statusCode);
      console.log('响应内容:', JSON.parse(result.body));
    } catch (error) {
      console.log('❌ 健康检查失败:', error.message);
    }
    console.log('');
    
    // 测试模型列表
    console.log('📋 测试 2: 模型列表');
    try {
      const result = await handler(testEvents.models);
      console.log('✅ 模型列表获取成功');
      console.log('响应状态:', result.statusCode);
      const body = JSON.parse(result.body);
      console.log('支持的模型数量:', body.data.length);
      console.log('模型列表:', body.data.map(m => m.id));
    } catch (error) {
      console.log('❌ 模型列表获取失败:', error.message);
    }
    console.log('');
    
    // 测试阿里云函数计算格式的模型列表
    console.log('📋 测试 2.1: 阿里云函数计算格式的模型列表');
    try {
      const result = await handler(testEvents.modelsFC);
      console.log('✅ 阿里云函数计算格式测试成功');
      console.log('响应状态:', result.statusCode);
      const body = JSON.parse(result.body);
      console.log('支持的模型数量:', body.data.length);
    } catch (error) {
      console.log('❌ 阿里云函数计算格式测试失败:', error.message);
    }
    console.log('');
    
    // 测试 CORS 预检
    console.log('📋 测试 3: CORS 预检请求');
    try {
      const result = await handler(testEvents.options);
      console.log('✅ CORS 预检成功');
      console.log('响应状态:', result.statusCode);
      console.log('CORS 头部:', result.headers);
    } catch (error) {
      console.log('❌ CORS 预检失败:', error.message);
    }
    console.log('');
    
    // 测试 404
    console.log('📋 测试 4: 404 错误处理');
    try {
      const result = await handler(testEvents.notFound);
      console.log('✅ 404 处理正确');
      console.log('响应状态:', result.statusCode);
      console.log('错误信息:', JSON.parse(result.body));
    } catch (error) {
      console.log('❌ 404 处理失败:', error.message);
    }
    console.log('');
    
    // 测试聊天完成（需要 API Key）
    console.log('📋 测试 5: 聊天完成（需要 GEMINI_API_KEY 环境变量）');
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('⏳ 正在调用 Gemini API，请稍等...');
        const result = await handler(testEvents.chatCompletions);
        console.log('✅ 聊天完成测试成功');
        console.log('响应状态:', result.statusCode);
        const body = JSON.parse(result.body);
        console.log('AI 回复:', body.choices[0].message.content);
      } catch (error) {
        console.log('❌ 聊天完成测试失败:', error.message);
      }
    } else {
      console.log('⚠️  跳过聊天完成测试 - 未设置 GEMINI_API_KEY 环境变量');
      console.log('请设置环境变量后重新测试:');
      console.log('export GEMINI_API_KEY=your_api_key_here');
    }
    console.log('');
    
    console.log('🎉 测试完成！');
    console.log('\n💡 提示：');
    console.log('- 确保设置了 GEMINI_API_KEY 环境变量才能完整测试');
    console.log('- 部署到阿里云函数计算后，记得配置 HTTP 触发器');
    console.log('- 建议设置适当的内存规格和超时时间');
    
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
  }
}

// 运行测试
runTests(); 