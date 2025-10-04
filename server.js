const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Anthropic API 客户端
// 请在运行前设置您的 API Key
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here', // 替换为您的 API Key
});

// 模型映射
const MODEL_MAP = {
    'sonnet-4.5': 'claude-3-5-sonnet-20241022',
    'sonnet-4': 'claude-3-5-sonnet-20240620',
    'opus-4.1': 'claude-3-opus-20240229',
    'opus-4': 'claude-3-opus-20240229',
    'sonnet-3.7': 'claude-3-sonnet-20240229',
    'opus-3': 'claude-3-opus-20240229',
    'haiku-3.5': 'claude-3-5-haiku-20241022'
};

// 对话历史存储（实际应用中应使用数据库）
const conversations = new Map();

// API 路由：发送消息
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationId, model = 'sonnet-4.5', systemPrompt } = req.body;

        // 获取或创建对话历史
        let history = conversations.get(conversationId) || [];

        // 添加用户消息到历史
        history.push({
            role: 'user',
            content: message
        });

        // 准备消息
        const messages = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // 选择模型
        const selectedModel = MODEL_MAP[model] || MODEL_MAP['sonnet-4.5'];

        console.log(`Using model: ${selectedModel}`);
        console.log(`Message: ${message}`);

        // 调用 Claude API
        const response = await anthropic.messages.create({
            model: selectedModel,
            max_tokens: 4096,
            system: systemPrompt || "You are Claude, a helpful AI assistant created by Anthropic.",
            messages: messages,
        });

        // 提取回复
        const assistantMessage = response.content[0].text;

        // 添加助手消息到历史
        history.push({
            role: 'assistant',
            content: assistantMessage
        });

        // 保存对话历史
        conversations.set(conversationId, history);

        // 返回响应
        res.json({
            success: true,
            message: assistantMessage,
            conversationId: conversationId,
            model: selectedModel,
            usage: response.usage
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
});

// API 路由：流式响应（SSE）
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { message, conversationId, model = 'sonnet-4.5', systemPrompt } = req.body;

        // 设置 SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 获取或创建对话历史
        let history = conversations.get(conversationId) || [];

        // 添加用户消息到历史
        history.push({
            role: 'user',
            content: message
        });

        // 准备消息
        const messages = history.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // 选择模型
        const selectedModel = MODEL_MAP[model] || MODEL_MAP['sonnet-4.5'];

        // 调用 Claude API（流式）
        const stream = await anthropic.messages.stream({
            model: selectedModel,
            max_tokens: 4096,
            system: systemPrompt || "You are Claude, a helpful AI assistant created by Anthropic.",
            messages: messages,
        });

        let fullResponse = '';

        // 处理流式响应
        stream.on('text', (text) => {
            fullResponse += text;
            // 发送数据块到客户端
            res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
        });

        stream.on('message', (message) => {
            // 处理完整消息
        });

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
            res.end();
        });

        stream.on('end', () => {
            // 添加助手消息到历史
            history.push({
                role: 'assistant',
                content: fullResponse
            });

            // 保存对话历史
            conversations.set(conversationId, history);

            // 发送结束信号
            res.write(`data: ${JSON.stringify({ type: 'end', conversationId: conversationId })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('Error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

// API 路由：获取对话历史
app.get('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    const history = conversations.get(id) || [];
    res.json({
        success: true,
        messages: history
    });
});

// API 路由：清除对话历史
app.delete('/api/conversations/:id', (req, res) => {
    const { id } = req.params;
    conversations.delete(id);
    res.json({
        success: true,
        message: 'Conversation deleted'
    });
});

// API 路由：获取所有对话列表
app.get('/api/conversations', (req, res) => {
    const conversationList = Array.from(conversations.keys()).map(id => ({
        id: id,
        messageCount: conversations.get(id).length
    }));
    res.json({
        success: true,
        conversations: conversationList
    });
});

// 提供静态文件（前端页面）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📝 Make sure to set your ANTHROPIC_API_KEY environment variable`);
    console.log(`   Or replace 'your-api-key-here' in the code with your actual API key`);
});

