# 🚀 Gemini OpenAI 代理服务

使用 Google 官方 OpenAI 兼容端点的 Gemini 代理服务，基于 Next.js 框架构建。

## ✨ 特性

- 🔥 基于 Next.js 框架，支持 API Routes
- 🌐 完全兼容 OpenAI API 格式
- 📡 支持流式和非流式响应
- 🚀 支持最新的 Gemini 模型（2.5-flash, 2.5-pro, 2.0-flash 等）
- ☁️ 支持无服务器部署（Vercel、阿里云函数计算等）
- 🛡️ 内置 CORS 支持

## 🔧 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

## 📦 安装

```bash
# 安装依赖
pnpm install

# 或使用 npm
npm install
```

## ⚙️ 环境变量

创建 `.env.local` 文件并设置以下环境变量：

```bash
# Google Gemini API 密钥（必需）
GEMINI_API_KEY=your_gemini_api_key_here

# 端口号（可选，默认为 3000）
PORT=3000
```

## 🚀 启动服务

### 开发模式
```bash
pnpm dev
```

### 生产模式
```bash
# 构建项目
pnpm build

# 启动生产服务器
pnpm start
```

## 📡 API 端点

### 健康检查
```
GET /api/health
```

### 模型列表
```
GET /api/v1/models
```

### 聊天完成
```
POST /api/v1/chat/completions
```

## 🤖 支持的模型

- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-2.0-flash`
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.5-pro-vision`
- `gemini-pro`
- `gemini-pro-vision`

## 📖 使用示例

### 非流式请求
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "你好！"}
    ]
  }'
```

### 流式请求
```bash
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "你好！"}
    ],
    "stream": true
  }'
```

## 🚀 部署

### Vercel 部署
1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 设置环境变量 `GEMINI_API_KEY`
4. 部署完成

### 其他平台
本项目包含 `lib/serverless.js` 文件，可以适配阿里云函数计算等无服务器平台。

## 📝 项目结构

```
gemini-proxy/
├── lib/
│   ├── constants.js      # 常量定义
│   ├── openai.js        # OpenAI 客户端初始化
│   └── serverless.js    # 无服务器适配器
├── pages/
│   ├── api/
│   │   ├── health.js           # 健康检查端点
│   │   └── v1/
│   │       ├── models.js       # 模型列表端点
│   │       └── chat/
│   │           └── completions.js  # 聊天完成端点
│   └── index.js         # 主页
├── next.config.js       # Next.js 配置
└── package.json         # 依赖配置
```

## 🔄 从 Express 迁移

原有的 Express 应用已迁移到 Next.js API Routes：

- `/health` → `/api/health`
- `/v1/models` → `/api/v1/models`
- `/v1/chat/completions` → `/api/v1/chat/completions`

所有功能保持兼容，包括流式响应和错误处理。

## 📄 许可证

MIT License
