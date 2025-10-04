const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// 增加请求体大小限制，支持大文件上传（图片 Base64 编码后会变大）
// 注意：图片Base64编码后大小会增加约33%
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static(__dirname));

// 添加请求日志
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// AI 客户端（延迟加载）
let anthropicClient = null;
let openaiClient = null;

// 对话历史存储（按会话ID区分不同用户）
// 数据结构：Map<sessionId, Map<conversationId, messages>>
const userSessions = new Map();

// ==================== 🔑 服务器端 API 配置（所有设备共享）====================
// 在这里配置 API Key 后，所有访问网站的用户都能直接使用，无需前端配置
const SERVER_CONFIG = {
    claude: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',  // Claude API Key
        model: 'claude-3-5-sonnet-20241022'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',  // OpenAI API Key
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-3.5-turbo'
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDXYDslr_G05gonG8eB_AfjapZQNoZfmig',  // Google Gemini API Key
        model: 'gemini-2.5-pro'  // 最新的 2.5 Pro 版本
    },
    custom: {
        apiKey: process.env.CUSTOM_API_KEY || 'sk-YWVsd3yPnEM5CXPV7c6rej17bbhRWfhCDm8IIrGqWdo8fiW1',  // 🌙 Kimi API Key（已配置）
        endpoint: process.env.CUSTOM_API_ENDPOINT || 'https://api.moonshot.cn/v1/chat/completions',
        model: process.env.CUSTOM_MODEL || 'moonshot-v1-8k',
        auth: 'bearer'  // 认证方式
    }
};

// 合并配置：优先使用前端传来的配置，如果没有则使用服务器默认配置
function mergeConfig(provider, clientConfig) {
    const serverConfig = SERVER_CONFIG[provider] || {};
    return {
        apiKey: clientConfig?.apiKey || serverConfig.apiKey,
        endpoint: clientConfig?.endpoint || serverConfig.endpoint,
        model: clientConfig?.model || serverConfig.model,
        auth: clientConfig?.auth || serverConfig.auth,
        stream: clientConfig?.stream
    };
}
// ==================== 配置结束 ====================

// ==================== Claude (Anthropic) ====================
async function initAnthropic(apiKey) {
    if (!anthropicClient || anthropicClient.apiKey !== apiKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        anthropicClient = new Anthropic({ apiKey });
    }
    return anthropicClient;
}

async function chatWithClaude(messages, config) {
    const client = await initAnthropic(config.apiKey);
    
    if (config.stream) {
        return await client.messages.stream({
            model: config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: messages,
        });
    } else {
        return await client.messages.create({
            model: config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 4096,
            messages: messages,
        });
    }
}

// ==================== OpenAI ====================
async function initOpenAI(apiKey, baseURL) {
    if (!openaiClient || openaiClient.apiKey !== apiKey) {
        const OpenAI = require('openai');
        openaiClient = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL || 'https://api.openai.com/v1'
        });
    }
    return openaiClient;
}

async function chatWithOpenAI(messages, config) {
    const client = await initOpenAI(config.apiKey, config.endpoint);
    
    const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    if (config.stream) {
        return await client.chat.completions.create({
            model: config.model || 'gpt-3.5-turbo',
            messages: formattedMessages,
            stream: true
        });
    } else {
        return await client.chat.completions.create({
            model: config.model || 'gpt-3.5-turbo',
            messages: formattedMessages
        });
    }
}

// ==================== Google Gemini ====================
async function chatWithGemini(messages, config) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model || 'gemini-2.5-pro' });

    // 转换消息格式，支持文本和图片
    const history = messages.slice(0, -1).map(msg => {
        const parts = [];
        const content = msg.content;
        
        // 检查是否包含图片（Base64 格式）
        const imageRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
        let match;
        let lastIndex = 0;
        let hasImages = false;
        
        while ((match = imageRegex.exec(content)) !== null) {
            hasImages = true;
            // 添加图片前的文本
            if (match.index > lastIndex) {
                const textBefore = content.substring(lastIndex, match.index).trim();
                if (textBefore) {
                    parts.push({ text: textBefore });
                }
            }
            
            // 添加图片数据
            const dataUrl = match[1];
            const [mimeType, base64Data] = dataUrl.replace('data:', '').split(';base64,');
            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
            
            lastIndex = match.index + match[0].length;
        }
        
        // 添加剩余文本
        if (lastIndex < content.length) {
            const remainingText = content.substring(lastIndex).trim();
            if (remainingText) {
                parts.push({ text: remainingText });
            }
        }
        
        // 如果没有找到图片，使用纯文本
        if (!hasImages) {
            parts.push({ text: content });
        }
        
        return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: parts
        };
    });

    const chat = model.startChat({ history });
    
    // 处理最后一条消息（可能包含图片）
    const lastMessage = messages[messages.length - 1].content;
    const lastParts = [];
    
    const imageRegex = /!\[.*?\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    let match;
    let lastIndex = 0;
    let hasImages = false;
    
    while ((match = imageRegex.exec(lastMessage)) !== null) {
        hasImages = true;
        if (match.index > lastIndex) {
            const textBefore = lastMessage.substring(lastIndex, match.index).trim();
            if (textBefore) {
                lastParts.push({ text: textBefore });
            }
        }
        
        const dataUrl = match[1];
        const [mimeType, base64Data] = dataUrl.replace('data:', '').split(';base64,');
        lastParts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });
        
        lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < lastMessage.length) {
        const remainingText = lastMessage.substring(lastIndex).trim();
        if (remainingText) {
            lastParts.push({ text: remainingText });
        }
    }
    
    if (!hasImages) {
        lastParts.push({ text: lastMessage });
    }

    console.log('🖼️ Gemini 消息处理:', {
        hasImages,
        partsCount: lastParts.length,
        messagePreview: lastMessage.substring(0, 100)
    });

    if (config.stream) {
        return await chat.sendMessageStream(lastParts);
    } else {
        return await chat.sendMessage(lastParts);
    }
}

// ==================== 自定义 API ====================
async function chatWithCustom(messages, config) {
    const fetch = require('node-fetch');
    
    const headers = {
        'Content-Type': 'application/json'
    };

    // 根据认证方式添加 header
    if (config.auth === 'bearer') {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    } else if (config.auth === 'apikey') {
        headers['X-API-Key'] = config.apiKey;
    }

    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            messages: messages,
            stream: config.stream || false
        })
    });

    return await response.json();
}

// ==================== 获取或创建用户会话 ====================
app.get('/api/session', (req, res) => {
    try {
        // 生成唯一的会话ID
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 创建新的会话存储
        userSessions.set(sessionId, new Map());
        
        console.log('Created new session:', sessionId);
        
        res.json({
            success: true,
            sessionId: sessionId
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== 获取用户的对话历史 ====================
app.get('/api/conversations/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        const sessionData = userSessions.get(sessionId);
        if (!sessionData) {
            return res.json({
                success: true,
                conversations: []
            });
        }
        
        // 将 Map 转换为数组返回
        const conversations = [];
        sessionData.forEach((messages, conversationId) => {
            if (messages.length > 0) {
                conversations.push({
                    conversationId: conversationId,
                    title: messages[0].content.substring(0, 30),
                    messages: messages,
                    timestamp: messages[0].timestamp || Date.now()
                });
            }
        });
        
        res.json({
            success: true,
            conversations: conversations
        });
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== 统一聊天接口 ====================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId, provider, config, sessionId } = req.body;

        // 🔑 合并服务器端配置和客户端配置
        const finalConfig = mergeConfig(provider, config);

        // 获取用户会话数据
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, new Map());
        }
        const sessionData = userSessions.get(sessionId);
        
        // 获取或创建对话历史
        let history = sessionData.get(conversationId) || [];
        history.push({ role: 'user', content: message, timestamp: Date.now() });

        let response;
        let assistantMessage;

        switch (provider) {
            case 'claude':
                response = await chatWithClaude(history, finalConfig);
                assistantMessage = response.content[0].text;
                break;

            case 'openai':
                response = await chatWithOpenAI(history, finalConfig);
                assistantMessage = response.choices[0].message.content;
                break;

            case 'gemini':
                response = await chatWithGemini(history, finalConfig);
                assistantMessage = response.response.text();
                break;

            case 'custom':
                response = await chatWithCustom(history, finalConfig);
                assistantMessage = response.message || response.content;
                break;

            default:
                throw new Error('Unknown provider: ' + provider);
        }

        // 保存助手消息
        history.push({ role: 'assistant', content: assistantMessage, timestamp: Date.now() });
        sessionData.set(conversationId, history);

        res.json({
            success: true,
            message: assistantMessage,
            conversationId: conversationId,
            provider: provider
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== 流式聊天接口 ====================
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, conversationId, provider, config, sessionId } = req.body;

        // 🔑 合并服务器端配置和客户端配置
        const finalConfig = mergeConfig(provider, config);
        finalConfig.stream = true;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 获取用户会话数据
        if (!userSessions.has(sessionId)) {
            userSessions.set(sessionId, new Map());
        }
        const sessionData = userSessions.get(sessionId);
        
        let history = sessionData.get(conversationId) || [];
        history.push({ role: 'user', content: message, timestamp: Date.now() });

        let fullResponse = '';

        switch (provider) {
            case 'claude':
                const claudeStream = await chatWithClaude(history, finalConfig);
                claudeStream.on('text', (text) => {
                    fullResponse += text;
                    res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                });
                claudeStream.on('end', () => {
                    history.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
                    sessionData.set(conversationId, history);
                    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                    res.end();
                });
                break;

            case 'openai':
                const openaiStream = await chatWithOpenAI(history, finalConfig);
                for await (const chunk of openaiStream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
                    }
                }
                history.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
                sessionData.set(conversationId, history);
                res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                res.end();
                break;

            case 'gemini':
                const geminiStream = await chatWithGemini(history, finalConfig);
                for await (const chunk of geminiStream.stream) {
                    const text = chunk.text();
                    fullResponse += text;
                    res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                }
                history.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
                sessionData.set(conversationId, history);
                res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                res.end();
                break;

            case 'custom':
                // 使用 fetch 调用自定义 API（如 Kimi）
                const fetch = require('node-fetch');
                const customHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${finalConfig.apiKey}`
                };
                
                const customResponse = await fetch(finalConfig.endpoint, {
                    method: 'POST',
                    headers: customHeaders,
                    body: JSON.stringify({
                        model: finalConfig.model || 'moonshot-v1-8k',
                        messages: history,
                        stream: true
                    })
                });

                if (!customResponse.ok) {
                    const errorData = await customResponse.json();
                    const errorMessage = errorData.error?.message || errorData.message || 'Custom API request failed';
                    console.error('Custom API Error:', errorData);
                    throw new Error(errorMessage);
                }

                // 处理流式响应
                const reader = customResponse.body;
                reader.on('data', (chunk) => {
                    const lines = chunk.toString().split('\n').filter(line => line.trim());
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            
                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.choices?.[0]?.delta?.content || '';
                                if (content) {
                                    fullResponse += content;
                                    res.write(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    }
                });

                reader.on('end', () => {
                    history.push({ role: 'assistant', content: fullResponse, timestamp: Date.now() });
                    sessionData.set(conversationId, history);
                    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                    res.end();
                });

                reader.on('error', (error) => {
                    console.error('Custom stream error:', error);
                    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
                    res.end();
                });
                break;

            default:
                throw new Error('Stream not supported for: ' + provider);
        }

    } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

// ==================== 测试连接 ====================
app.post('/api/test/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { apiKey, endpoint, model } = req.body;

        let result = { success: false };

        switch (provider) {
            case 'claude':
                const Anthropic = require('@anthropic-ai/sdk');
                const claude = new Anthropic({ apiKey });
                const claudeTest = await claude.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }]
                });
                result = { success: true, model: 'claude-3-5-sonnet-20241022' };
                break;

            case 'openai':
                const OpenAI = require('openai');
                const openai = new OpenAI({ 
                    apiKey,
                    baseURL: endpoint || 'https://api.openai.com/v1'
                });
                const openaiTest = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo',
                    messages: [{ role: 'user', content: 'Hi' }],
                    max_tokens: 5
                });
                result = { success: true, model: 'gpt-3.5-turbo' };
                break;

            case 'gemini':
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const geminiModel = model || config.gemini.model || 'gemini-2.5-pro';
                const geminiInstance = genAI.getGenerativeModel({ model: geminiModel });
                const geminiTest = await geminiInstance.generateContent('Hi');
                result = { success: true, model: geminiModel };
                break;

            case 'custom':
                const fetch = require('node-fetch');
                const customHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                
                const customResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: customHeaders,
                    body: JSON.stringify({
                        model: 'moonshot-v1-8k',
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 10
                    })
                });
                
                const customData = await customResponse.json();
                
                if (customResponse.ok) {
                    result = { 
                        success: true, 
                        model: customData.model || 'custom-model' 
                    };
                } else {
                    result = { 
                        success: false, 
                        error: customData.error?.message || 'Connection failed' 
                    };
                }
                break;

            default:
                result = { success: false, error: 'Unknown provider' };
        }

        res.json(result);

    } catch (error) {
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ==================== 其他路由 ====================
app.get('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    const history = conversations.get(id) || [];
    res.json({ success: true, messages: history });
});

app.delete('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    conversations.delete(id);
    res.json({ success: true });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'config.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'config.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 Multi-AI Platform Server Running!`);
    console.log(`📍 Configuration: http://localhost:${PORT}`);
    console.log(`💬 Chat Interface: http://localhost:${PORT}/chat`);
    console.log(`\n📦 Supported AI Providers:`);
    console.log(`   ✅ Claude (Anthropic)`);
    console.log(`   ✅ OpenAI (ChatGPT)`);
    console.log(`   ✅ Google Gemini`);
    console.log(`   ✅ Custom API\n`);
});

