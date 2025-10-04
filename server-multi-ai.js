const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// AI 客户端（延迟加载）
let anthropicClient = null;
let openaiClient = null;

// 对话历史存储
const conversations = new Map();

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
    const model = genAI.getGenerativeModel({ model: config.model || 'gemini-pro' });

    // 转换消息格式
    const history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;

    if (config.stream) {
        return await chat.sendMessageStream(lastMessage);
    } else {
        return await chat.sendMessage(lastMessage);
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

// ==================== 统一聊天接口 ====================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId, provider, config } = req.body;

        // 获取或创建对话历史
        let history = conversations.get(conversationId) || [];
        history.push({ role: 'user', content: message });

        let response;
        let assistantMessage;

        switch (provider) {
            case 'claude':
                response = await chatWithClaude(history, config);
                assistantMessage = response.content[0].text;
                break;

            case 'openai':
                response = await chatWithOpenAI(history, config);
                assistantMessage = response.choices[0].message.content;
                break;

            case 'gemini':
                response = await chatWithGemini(history, config);
                assistantMessage = response.response.text();
                break;

            case 'custom':
                response = await chatWithCustom(history, config);
                assistantMessage = response.message || response.content;
                break;

            default:
                throw new Error('Unknown provider: ' + provider);
        }

        // 保存助手消息
        history.push({ role: 'assistant', content: assistantMessage });
        conversations.set(conversationId, history);

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
        const { message, conversationId, provider, config } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let history = conversations.get(conversationId) || [];
        history.push({ role: 'user', content: message });

        let fullResponse = '';
        config.stream = true;

        switch (provider) {
            case 'claude':
                const claudeStream = await chatWithClaude(history, config);
                claudeStream.on('text', (text) => {
                    fullResponse += text;
                    res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                });
                claudeStream.on('end', () => {
                    history.push({ role: 'assistant', content: fullResponse });
                    conversations.set(conversationId, history);
                    res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                    res.end();
                });
                break;

            case 'openai':
                const openaiStream = await chatWithOpenAI(history, config);
                for await (const chunk of openaiStream) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullResponse += content;
                        res.write(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
                    }
                }
                history.push({ role: 'assistant', content: fullResponse });
                conversations.set(conversationId, history);
                res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                res.end();
                break;

            case 'gemini':
                const geminiStream = await chatWithGemini(history, config);
                for await (const chunk of geminiStream.stream) {
                    const text = chunk.text();
                    fullResponse += text;
                    res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
                }
                history.push({ role: 'assistant', content: fullResponse });
                conversations.set(conversationId, history);
                res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                res.end();
                break;

            case 'custom':
                // 使用 fetch 调用自定义 API（如 Kimi）
                const fetch = require('node-fetch');
                const customHeaders = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                };
                
                const customResponse = await fetch(config.endpoint, {
                    method: 'POST',
                    headers: customHeaders,
                    body: JSON.stringify({
                        model: config.model || 'moonshot-v1-8k',
                        messages: history,
                        stream: true
                    })
                });

                if (!customResponse.ok) {
                    const errorData = await customResponse.json();
                    throw new Error(errorData.error?.message || 'Custom API request failed');
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
                    history.push({ role: 'assistant', content: fullResponse });
                    conversations.set(conversationId, history);
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
        const { apiKey, endpoint } = req.body;

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
                const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                const geminiTest = await model.generateContent('Hi');
                result = { success: true, model: 'gemini-pro' };
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

