# Gemini Proxy for 阿里云函数计算

这是一个运行在阿里云函数计算上的 Gemini API 代理，使用客户端调用格式。用于解决中国无法直接调用gemini 的问题。


## 部署到阿里云函数计算

1. **创建函数**：
   - 运行时：`Node.js 20` 或更高版本
   - 内存规格：建议 256MB 或以上
   - 超时时间：建议 120 秒

2. **上传代码文件**：
   - 复制 `index.mjs` 内容
   - 创建 `package.json` 文件并复制内容

3. **安装依赖**：
   在函数计算控制台的终端中运行：
   ```bash
   npm install
   ```

## API 端点

### 1. 聊天完成 (Chat Completions)

**端点**: `POST /v1/chat/completions`

**请求格式**:
```json
{
  "model": "gemini-2.5-flash",
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下自己"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**响应格式**:
```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gemini-2.5-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是 Gemini..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

### 2. 模型列表 (Models)

**端点**: `POST /v1/models`

**响应格式**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "gemini-1.5-flash",
      "object": "model",
      "created": 1234567890,
      "owned_by": "google"
    }
  ]
}
```

## 使用示例

### 使用 OpenAI Python 客户端

```python
from openai import OpenAI

# 替换为你的函数计算 HTTP 触发器 URL
client = OpenAI(
    api_key="dummy",  # Gemini API Key 通过环境变量设置
    base_url="https://your-fc-domain.com"
)

response = client.chat.completions.create(
    model="gemini-1.5-flash",
    messages=[
        {"role": "user", "content": "你好，请介绍一下自己"}
    ]
)

print(response.choices[0].message.content)
```

### 使用 curl

```bash
curl -X POST "https://your-fc-domain.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-1.5-flash",
    "messages": [
      {
        "role": "user", 
        "content": "你好，请介绍一下自己"
      }
    ],
    "temperature": 0.7
  }'
```

### 使用 JavaScript/Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your_auth_token_here',  // 使用 AUTH_TOKEN
  baseURL: 'https://xx.fcapp.run'
});

// 聊天完成
const response = await openai.chat.completions.create({
  model: 'gemini-2.0-flash',
  messages: [{ role: 'user', content: '你好' }],
  stream: false
});

console.log(response.choices[0].message.content);

// 流式响应
const stream = await openai.chat.completions.create({
  model: 'gemini-2.0-flash',
  messages: [{ role: 'user', content: '请写一首诗' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// 模型列表
const models = await openai.models.list();
console.log('支持的模型:', models.data.map(m => m.id));
```


## 功能测试

项目包含了一个全面的测试脚本 `fc-test.js`，用于验证线上代理服务的各项功能。

### 测试脚本功能

测试脚本包含 **10 个测试用例**，全面验证代理服务的功能：

1. **健康检查测试** - 验证服务状态和配置信息
2. **模型列表测试** - 验证支持的 Gemini 模型列表
3. **聊天完成测试（非流式）** - 验证基本聊天功能
4. **聊天完成测试（流式）** - 验证 Server-Sent Events 流式响应
5. **OpenAI 客户端测试** - 验证与 OpenAI SDK 的兼容性
6. **OpenAI 客户端流式测试** - 验证 OpenAI SDK 的流式调用
7. **错误处理测试（无效认证）** - 验证身份验证机制
8. **错误处理测试（不支持的模型）** - 验证模型验证逻辑
9. **CORS 预检测试** - 验证跨域请求支持
10. **性能测试** - 验证并发请求处理能力


### 运行测试

#### 1. 安装依赖

```bash
pnpm install
```

#### 2. 修改配置

打开 fc-test.js，修改配置

```javascript
const CONFIG = {
  baseURL: 'https://xx.fcapp.run',
  authToken: process.env.AUTH_TOKEN || 'fc_config_token',
  timeout: 30000 // 30秒超时
};
```

#### 3. 运行测试

```bash
node fc-test.js
```

