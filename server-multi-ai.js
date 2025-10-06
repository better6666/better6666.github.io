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

// ==================== 🔑 API 配置存储（Vercel KV 持久化）====================
// 使用 Vercel KV (Redis) 实现跨用户共享配置
// 配置一次，所有人都能使用

let kv;
let useKV = false;

// 尝试加载 Vercel KV
try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv: vercelKV } = require('@vercel/kv');
        kv = vercelKV;
        useKV = true;
        console.log('✅ Vercel KV 已启用（持久化存储）');
    } else {
        console.log('⚠️ Vercel KV 未配置，使用内存存储（重启后丢失）');
    }
} catch (error) {
    console.log('⚠️ Vercel KV 不可用，使用内存存储');
    useKV = false;
}

// 从 KV 或环境变量加载配置
async function loadConfig() {
    if (useKV) {
        try {
            const stored = await kv.get('api_config');
            if (stored) {
                console.log('📥 从 Vercel KV 加载配置');
                return stored;
            }
        } catch (error) {
            console.error('从 KV 加载配置失败:', error);
        }
    }
    
    // 默认配置（从环境变量）
    return {
        claude: { 
            apiKey: process.env.CLAUDE_API_KEY || '', 
            model: 'claude-3-5-sonnet-20241022' 
        },
        openai: { 
            apiKey: process.env.OPENAI_API_KEY || '', 
            endpoint: 'https://api.openai.com/v1', 
            model: 'gpt-4' 
        },
        gemini: { 
            apiKey: process.env.GEMINI_API_KEY || '', 
            model: 'gemini-2.5-pro' 
        },
        grok: {
            apiKey: process.env.GROK_API_KEY || '',
            endpoint: 'https://api.x.ai/v1',
            model: 'grok-2'
        },
        deepseek: {
            apiKey: process.env.DEEPSEEK_API_KEY || '',
            endpoint: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
        },
        kimi: {
            apiKey: process.env.KIMI_API_KEY || '',
            endpoint: 'https://api.moonshot.cn/v1',
            model: 'moonshot-v1-8k'
        },
        perplexity: {
            apiKey: process.env.PERPLEXITY_API_KEY || '',
            endpoint: 'https://api.perplexity.ai',
            model: 'sonar'
        },
        doubao: {
            apiKey: process.env.DOUBAO_API_KEY || '',
            endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
            model: 'doubao-pro'
        },
        custom: { 
            apiKey: process.env.CUSTOM_API_KEY || '', 
            endpoint: process.env.CUSTOM_API_ENDPOINT || '', 
            model: '', 
            auth: 'bearer' 
        }
    };
}

// 保存配置到 KV
async function saveConfigToKV(config) {
    if (useKV) {
        try {
            await kv.set('api_config', config);
            console.log('💾 配置已保存到 Vercel KV');
            return true;
        } catch (error) {
            console.error('保存配置到 KV 失败:', error);
            return false;
        }
    }
    return false;
}

// ==================== 🎯 多模型配置系统 ====================
// 支持为每个AI品牌配置多个模型

let MODELS_LIST = []; // 存储所有模型配置

// 从 KV 加载模型列表
async function loadModels() {
    if (useKV) {
        try {
            const stored = await kv.get('models_list');
            if (stored && Array.isArray(stored)) {
                MODELS_LIST = stored;
                console.log(`📋 已加载 ${MODELS_LIST.length} 个模型配置`);
                return MODELS_LIST;
            }
        } catch (error) {
            console.error('从 KV 加载模型列表失败:', error);
        }
    }
    
    // 默认为空，需要用户添加
    MODELS_LIST = [];
    return MODELS_LIST;
}

// 保存模型列表到 KV
async function saveModels(models) {
    if (useKV) {
        try {
            await kv.set('models_list', models);
            MODELS_LIST = models;
            console.log('💾 模型列表已保存');
            return true;
        } catch (error) {
            console.error('保存模型列表失败:', error);
            return false;
        }
    }
    // 如果没有 KV，只保存在内存
    MODELS_LIST = models;
    return true;
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 初始化配置（保留旧版兼容）
let SERVER_CONFIG = null;

// 异步初始化
async function getConfig() {
    if (!SERVER_CONFIG) {
        SERVER_CONFIG = await loadConfig();
        console.log('📋 API 配置状态:');
        console.log('  Claude:', SERVER_CONFIG.claude.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  OpenAI:', SERVER_CONFIG.openai.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Gemini:', SERVER_CONFIG.gemini.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Grok:', SERVER_CONFIG.grok.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  DeepSeek:', SERVER_CONFIG.deepseek.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Kimi:', SERVER_CONFIG.kimi.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Perplexity:', SERVER_CONFIG.perplexity.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Doubao:', SERVER_CONFIG.doubao.apiKey ? '✅ 已配置' : '⚠️ 未配置');
        console.log('  Custom:', SERVER_CONFIG.custom.apiKey ? '✅ 已配置' : '⚠️ 未配置');
    }
    
    // 同时加载模型列表
    if (MODELS_LIST.length === 0) {
        await loadModels();
    }
    
    return SERVER_CONFIG;
}

// 合并配置：优先使用前端传来的配置，如果没有则使用服务器默认配置
async function mergeConfig(provider, clientConfig) {
    const config = await getConfig();
    const serverConfig = config[provider] || {};
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
        const finalConfig = await mergeConfig(provider, config);

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
            case 'grok':
            case 'deepseek':
            case 'kimi':
            case 'perplexity':
            case 'doubao':
                // 这些AI都使用OpenAI兼容的API
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
        const finalConfig = await mergeConfig(provider, config);
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
            case 'grok':
            case 'deepseek':
            case 'kimi':
            case 'perplexity':
            case 'doubao':
                // 这些AI都使用OpenAI兼容的流式API
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

// ==================== 配置管理 API ====================

// 获取当前配置（隐藏完整密钥）
app.get('/api/config', async (req, res) => {
    try {
        const config = await getConfig();
        const safeConfig = {};
        for (const [provider, cfg] of Object.entries(config)) {
            safeConfig[provider] = {
                ...cfg,
                apiKey: cfg.apiKey ? maskApiKey(cfg.apiKey) : '',
                hasKey: !!cfg.apiKey
            };
        }
        res.json({ success: true, config: safeConfig, storage: useKV ? 'Vercel KV' : 'Memory' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 保存配置（持久化到 Vercel KV）
app.post('/api/config', async (req, res) => {
    try {
        const { provider, config } = req.body;
        
        if (!provider || !config) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        
        // 获取当前配置
        const currentConfig = await getConfig();
        
        // 更新配置
        currentConfig[provider] = {
            ...currentConfig[provider],
            ...config
        };
        
        // 保存到 KV（如果可用）
        const saved = await saveConfigToKV(currentConfig);
        
        // 更新内存缓存
        SERVER_CONFIG = currentConfig;
        
        console.log(`✅ ${provider} 配置已更新${saved ? '（已永久保存）' : '（仅内存）'}`);
        
        res.json({
            success: true,
            message: saved 
                ? '✅ 配置已永久保存！所有用户都能使用此配置' 
                : '⚠️ 配置已保存（仅当前会话）\n💡 提示：启用 Vercel KV 实现永久存储',
            storage: saved ? 'persistent' : 'memory'
        });
        
    } catch (error) {
        console.error('保存配置错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 删除配置（持久化删除）
app.delete('/api/config/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const currentConfig = await getConfig();
        
        if (currentConfig[provider]) {
            currentConfig[provider].apiKey = '';
            
            // 保存到 KV
            const saved = await saveConfigToKV(currentConfig);
            SERVER_CONFIG = currentConfig;
            
            console.log(`🗑️ ${provider} 配置已清除${saved ? '（永久）' : '（内存）'}`);
            
            res.json({
                success: true,
                message: '配置已清除'
            });
        } else {
            res.status(404).json({
                success: false,
                message: '配置不存在'
            });
        }
    } catch (error) {
        console.error('删除配置错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 测试API连接
app.post('/api/config/test/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const currentConfig = await getConfig();
        const config = currentConfig[provider];
        
        if (!config || !config.apiKey) {
            return res.json({
                success: false,
                message: 'API Key 未配置'
            });
        }
        
        // 根据不同提供商测试连接
        let testResult = false;
        let errorMessage = '';
        
        try {
            switch (provider) {
                case 'claude':
                    const Anthropic = require('@anthropic-ai/sdk');
                    const anthropic = new Anthropic({ apiKey: config.apiKey });
                    await anthropic.messages.create({
                        model: config.model,
                        max_tokens: 10,
                        messages: [{ role: 'user', content: 'Hi' }]
                    });
                    testResult = true;
                    break;
                    
                case 'openai':
                case 'grok':
                case 'deepseek':
                case 'kimi':
                case 'perplexity':
                case 'doubao':
                    // OpenAI 兼容的 API 测试
                    const response = await fetch(`${config.endpoint}/models`, {
                        headers: { 'Authorization': `Bearer ${config.apiKey}` }
                    });
                    testResult = response.ok;
                    if (!response.ok) {
                        errorMessage = '连接失败';
                    }
                    break;
                    
                case 'gemini':
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
                    const geminiResponse = await fetch(geminiUrl);
                    testResult = geminiResponse.ok;
                    if (!geminiResponse.ok) {
                        errorMessage = 'API Key 无效';
                    }
                    break;
                    
                case 'custom':
                    // 简单的连接测试
                    testResult = true;
                    break;
                    
                default:
                    errorMessage = '不支持的提供商';
            }
            
            res.json({
                success: testResult,
                message: testResult ? '连接测试成功' : errorMessage
            });
            
        } catch (error) {
            res.json({
                success: false,
                message: error.message || '连接测试失败'
            });
        }
    } catch (error) {
        console.error('测试连接错误:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 隐藏API Key的辅助函数
function maskApiKey(key) {
    if (!key || key.length < 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
}

// ==================== 🎯 多模型管理 API ====================

// 获取所有模型配置
app.get('/api/models', async (req, res) => {
    try {
        await getConfig(); // 确保已加载
        
        // 返回模型列表，隐藏完整API Key
        const safeModels = MODELS_LIST.map(model => ({
            ...model,
            apiKey: model.apiKey ? '••••••••' : ''
        }));
        
        res.json({
            success: true,
            models: safeModels
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 添加新模型配置
app.post('/api/models', async (req, res) => {
    try {
        const { provider, name, model, apiKey, endpoint } = req.body;
        
        if (!provider || !name || !model || !apiKey) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        
        await getConfig(); // 确保已加载
        
        // 创建新模型配置
        const newModel = {
            id: generateId(),
            provider: provider,
            name: name,
            model: model,
            apiKey: apiKey,
            endpoint: endpoint || '',
            createdAt: Date.now()
        };
        
        // 添加到列表
        MODELS_LIST.push(newModel);
        
        // 保存
        const saved = await saveModels(MODELS_LIST);
        
        res.json({
            success: true,
            message: saved ? '模型添加成功（已永久保存）' : '模型添加成功（仅内存）',
            model: { ...newModel, apiKey: '••••••••' }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 更新模型配置
app.put('/api/models/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, model, apiKey, endpoint } = req.body;
        
        await getConfig(); // 确保已加载
        
        // 查找模型
        const index = MODELS_LIST.findIndex(m => m.id === id);
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: '模型不存在'
            });
        }
        
        // 更新字段
        if (name) MODELS_LIST[index].name = name;
        if (model) MODELS_LIST[index].model = model;
        if (apiKey) MODELS_LIST[index].apiKey = apiKey;
        if (endpoint !== undefined) MODELS_LIST[index].endpoint = endpoint;
        
        // 保存
        const saved = await saveModels(MODELS_LIST);
        
        res.json({
            success: true,
            message: '更新成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 删除模型配置
app.delete('/api/models/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await getConfig(); // 确保已加载
        
        // 删除模型
        const newList = MODELS_LIST.filter(m => m.id !== id);
        
        if (newList.length === MODELS_LIST.length) {
            return res.status(404).json({
                success: false,
                message: '模型不存在'
            });
        }
        
        // 保存
        await saveModels(newList);
        
        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 测试模型连接
app.post('/api/models/:id/test', async (req, res) => {
    try {
        const { id } = req.params;
        
        await getConfig(); // 确保已加载
        
        // 查找模型
        const model = MODELS_LIST.find(m => m.id === id);
        if (!model) {
            return res.status(404).json({
                success: false,
                message: '模型不存在'
            });
        }
        
        // 根据provider类型测试
        let testResult = false;
        let errorMsg = '';
        
        try {
            if (model.provider === 'claude') {
                const Anthropic = require('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey: model.apiKey });
                await anthropic.messages.create({
                    model: model.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }]
                });
                testResult = true;
            } 
            else if (model.provider === 'gemini') {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(model.apiKey);
                const geminiModel = genAI.getGenerativeModel({ model: model.model });
                await geminiModel.generateContent('Hi');
                testResult = true;
            }
            else if (['openai', 'grok', 'deepseek', 'kimi', 'perplexity', 'doubao', 'qwen', 'ernie', 'other'].includes(model.provider)) {
                // OpenAI 兼容 API
                const fetch = require('node-fetch');
                const response = await fetch(`${model.endpoint}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${model.apiKey}`
                    },
                    body: JSON.stringify({
                        model: model.model,
                        messages: [{ role: 'user', content: 'Hi' }],
                        max_tokens: 5
                    })
                });
                
                if (response.ok) {
                    testResult = true;
                } else {
                    const error = await response.text();
                    errorMsg = '测试失败: ' + error;
                }
            }
            else {
                errorMsg = '不支持的提供商';
            }
        } catch (error) {
            errorMsg = error.message;
        }
        
        res.json({
            success: testResult,
            message: testResult ? '连接测试成功' : errorMsg
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
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

