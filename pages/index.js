import { useState } from 'react';
import { SUPPORTED_MODELS } from '../lib/constants.js';

export default function Home() {
    const [testMessage, setTestMessage] = useState('你好，请介绍一下自己');
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState('');

    const testAPI = async () => {
        setIsLoading(true);
        setResponse('');
        
        try {
            const result = await fetch('/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        { role: 'user', content: testMessage }
                    ]
                })
            });

            const data = await result.json();
            
            if (data.error) {
                setResponse(`❌ 错误: ${data.error.message}`);
            } else {
                setResponse(`✅ 成功!\n\n${data.choices[0].message.content}`);
            }
        } catch (error) {
            setResponse(`❌ 请求失败: ${error.message}`);
        }
        
        setIsLoading(false);
    };
    return (
        <div style={{ 
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
            lineHeight: '1.6'
        }}>
            <h1>🚀 Gemini OpenAI 代理服务</h1>

            <div style={{ marginBottom: '2rem' }}>
                <h2>🔗 API 端点</h2>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <strong>健康检查:</strong>{' '}
                        <a 
                            href="/api/health" 
                            target="_blank" 
                            style={{ 
                                color: '#0070f3', 
                                textDecoration: 'none',
                                padding: '0.25rem 0.5rem',
                                background: '#f0f8ff',
                                borderRadius: '4px',
                                border: '1px solid #0070f3'
                            }}
                        >
                            GET /api/health
                        </a>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <strong>模型列表:</strong>{' '}
                        <a 
                            href="/api/v1/models" 
                            target="_blank"
                            style={{ 
                                color: '#0070f3', 
                                textDecoration: 'none',
                                padding: '0.25rem 0.5rem',
                                background: '#f0f8ff',
                                borderRadius: '4px',
                                border: '1px solid #0070f3'
                            }}
                        >
                            GET /api/v1/models
                        </a>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <strong>聊天完成:</strong>{' '}
                        <span style={{ 
                            color: '#666', 
                            padding: '0.25rem 0.5rem',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}>
                            POST /api/v1/chat/completions
                        </span>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: '#666' }}>
                            (需要 POST 请求)
                        </span>
                    </li>
                </ul>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h2>🤖 支持的模型</h2>
                <ul>
                    {SUPPORTED_MODELS.map(model => (
                        <li key={model}><code>{model}</code></li>
                    ))}
                </ul>
            </div>

            <div style={{ 
                background: '#f0f8f0',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '1px solid #d4edda'
            }}>
                <h2>🧪 在线测试</h2>
                <p>直接在浏览器中测试 API 功能：</p>
                
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        选择模型：
                    </label>
                    <select 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}
                    >
                        {SUPPORTED_MODELS.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        测试消息：
                    </label>
                    <textarea 
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="输入您想测试的消息..."
                        style={{ 
                            width: '100%', 
                            height: '80px',
                            padding: '0.5rem', 
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <button 
                    onClick={testAPI}
                    disabled={isLoading}
                    style={{ 
                        background: isLoading ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '4px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: '1rem',
                        marginBottom: '1rem'
                    }}
                >
                    {isLoading ? '🔄 测试中...' : '🚀 发送测试'}
                </button>

                {response && (
                    <div style={{ 
                        background: '#f8f9fa',
                        padding: '1rem',
                        borderRadius: '4px',
                        border: '1px solid #dee2e6',
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem'
                    }}>
                        <strong>响应结果：</strong><br />
                        {response}
                    </div>
                )}
            </div>

            <div style={{ 
                background: '#e8f4fd',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem'
            }}>
                <h2>📖 使用示例</h2>
                <p>使用 curl 测试 API：</p>
                <pre style={{ 
                    background: '#f9f9f9',
                    padding: '1rem',
                    borderRadius: '4px',
                    overflow: 'auto'
                }}>
{`curl -X POST /api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'`}
                </pre>
            </div>

            <div style={{ 
                background: '#fff3cd',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #ffeaa7'
            }}>
                <h2>⚙️ 环境变量</h2>
                <p>确保设置以下环境变量：</p>
                <ul>
                    <li><code>GEMINI_API_KEY</code> - 您的 Google Gemini API 密钥</li>
                </ul>
            </div>
        </div>
    );
} 