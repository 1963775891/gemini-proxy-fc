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

4. **配置环境变量**

在阿里云函数计算控制台中设置以下环境变量：

```
GEMINI_API_KEY=your_gemini_api_key_here
AUTH_TOKEN=Bearer_token
```
GEMINI_API_KEY ，获取 Gemini API Key：
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 创建新的 API Key
3. 将 API Key 添加到函数计算环境变量
AUTH_TOKEN 自定义的校验 token，防止他人调用


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
  apiKey: 'dummy', // Gemini API Key 通过环境变量设置
  baseURL: 'https://your-fc-domain.com'
});

async function main() {
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: '你好，请介绍一下自己' }],
    model: 'gemini-1.5-flash',
  });

  console.log(completion.choices[0].message.content);
}

main();
```


