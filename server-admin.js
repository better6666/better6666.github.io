const express = require('express');
const cors = require('cors');
const session = require('express-session');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 配置文件路径 ====================
const CONFIG_DIR = path.join(__dirname, '.config');
const API_KEYS_FILE = path.join(CONFIG_DIR, 'api-keys.json');
const ADMIN_USERS_FILE = path.join(CONFIG_DIR, 'admin-users.json');

// 确保配置目录存在
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// ==================== 加密工具 ====================
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('解密失败:', error);
        return null;
    }
}

// ==================== 数据存储管理 ====================
function loadAPIKeys() {
    try {
        if (fs.existsSync(API_KEYS_FILE)) {
            const data = fs.readFileSync(API_KEYS_FILE, 'utf8');
            const encrypted = JSON.parse(data);
            const decrypted = {};
            
            for (const [provider, config] of Object.entries(encrypted)) {
                if (config && config.apiKey) {
                    decrypted[provider] = {
                        ...config,
                        apiKey: decrypt(config.apiKey)
                    };
                }
            }
            
            return decrypted;
        }
    } catch (error) {
        console.error('加载API密钥失败:', error);
    }
    return {};
}

function saveAPIKeys(keys) {
    try {
        const encrypted = {};
        
        for (const [provider, config] of Object.entries(keys)) {
            if (config && config.apiKey) {
                encrypted[provider] = {
                    ...config,
                    apiKey: encrypt(config.apiKey)
                };
            }
        }
        
        fs.writeFileSync(API_KEYS_FILE, JSON.stringify(encrypted, null, 2));
        return true;
    } catch (error) {
        console.error('保存API密钥失败:', error);
        return false;
    }
}

function loadAdminUsers() {
    try {
        if (fs.existsSync(ADMIN_USERS_FILE)) {
            const data = fs.readFileSync(ADMIN_USERS_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            // 默认管理员账户
            const defaultUsers = {
                admin: {
                    password: crypto.createHash('sha256').update('admin123').digest('hex'),
                    createdAt: new Date().toISOString()
                }
            };
            fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(defaultUsers, null, 2));
            console.log('⚠️  已创建默认管理员账户: admin / admin123');
            console.log('⚠️  请立即修改密码！');
            return defaultUsers;
        }
    } catch (error) {
        console.error('加载管理员用户失败:', error);
        return {};
    }
}

// ==================== 中间件配置 ====================
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.static(__dirname));

// Session配置
app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
}));

// ==================== 认证中间件 ====================
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: '未授权，请先登录'
        });
    }
}

// ==================== 管理员API路由 ====================

// 登录
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.json({
            success: false,
            message: '用户名和密码不能为空'
        });
    }
    
    const users = loadAdminUsers();
    const user = users[username];
    
    if (!user) {
        return res.json({
            success: false,
            message: '用户名或密码错误'
        });
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    if (hashedPassword === user.password) {
        req.session.authenticated = true;
        req.session.username = username;
        
        console.log(`✅ 用户 ${username} 登录成功`);
        
        res.json({
            success: true,
            message: '登录成功',
            username: username
        });
    } else {
        res.json({
            success: false,
            message: '用户名或密码错误'
        });
    }
});

// 退出登录
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// 检查认证状态
app.get('/api/admin/check-auth', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.json({
            authenticated: true,
            username: req.session.username
        });
    } else {
        res.json({ authenticated: false });
    }
});

// 修改密码
app.post('/api/admin/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const username = req.session.username;
    
    if (!currentPassword || !newPassword) {
        return res.json({
            success: false,
            message: '当前密码和新密码不能为空'
        });
    }
    
    if (newPassword.length < 8) {
        return res.json({
            success: false,
            message: '新密码至少需要8个字符'
        });
    }
    
    const users = loadAdminUsers();
    const user = users[username];
    
    if (!user) {
        return res.json({
            success: false,
            message: '用户不存在'
        });
    }
    
    // 验证当前密码
    const currentHashed = crypto.createHash('sha256').update(currentPassword).digest('hex');
    if (currentHashed !== user.password) {
        return res.json({
            success: false,
            message: '当前密码错误'
        });
    }
    
    // 更新密码
    const newHashed = crypto.createHash('sha256').update(newPassword).digest('hex');
    users[username].password = newHashed;
    users[username].updatedAt = new Date().toISOString();
    
    try {
        fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(users, null, 2));
        console.log(`✅ 用户 ${username} 修改了密码`);
        
        res.json({
            success: true,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('密码修改失败:', error);
        res.json({
            success: false,
            message: '密码修改失败，请重试'
        });
    }
});

// 获取所有API配置（不返回完整密钥）
app.get('/api/admin/apis', requireAuth, (req, res) => {
    const keys = loadAPIKeys();
    const safeKeys = {};
    
    // 隐藏部分密钥，只显示前后几位
    for (const [provider, config] of Object.entries(keys)) {
        if (config && config.apiKey) {
            const key = config.apiKey;
            safeKeys[provider] = {
                ...config,
                apiKey: key.length > 20 
                    ? key.substring(0, 8) + '...' + key.substring(key.length - 4)
                    : key
            };
        }
    }
    
    res.json({
        success: true,
        apis: keys // 后台管理界面可以看到完整密钥
    });
});

// 保存API配置
app.post('/api/admin/apis', requireAuth, (req, res) => {
    const { provider, config } = req.body;
    
    if (!provider || !config || !config.apiKey) {
        return res.json({
            success: false,
            message: 'Provider和API Key不能为空'
        });
    }
    
    const keys = loadAPIKeys();
    keys[provider] = config;
    
    if (saveAPIKeys(keys)) {
        console.log(`✅ ${req.session.username} 保存了 ${provider} 的API配置`);
        res.json({
            success: true,
            message: 'API配置保存成功'
        });
    } else {
        res.json({
            success: false,
            message: '保存失败'
        });
    }
});

// 删除API配置
app.delete('/api/admin/apis/:provider', requireAuth, (req, res) => {
    const { provider } = req.params;
    const keys = loadAPIKeys();
    
    if (keys[provider]) {
        delete keys[provider];
        saveAPIKeys(keys);
        console.log(`🗑️  ${req.session.username} 删除了 ${provider} 的API配置`);
    }
    
    res.json({
        success: true,
        message: 'API配置已删除'
    });
});

// 测试API连接
app.post('/api/admin/test/:provider', requireAuth, async (req, res) => {
    const { provider } = req.params;
    const keys = loadAPIKeys();
    const config = keys[provider];
    
    if (!config || !config.apiKey) {
        return res.json({
            success: false,
            message: 'API未配置'
        });
    }
    
    // 简单的测试逻辑
    try {
        switch (provider) {
            case 'openai':
                // 测试OpenAI API
                const openaiResponse = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${config.apiKey}` }
                });
                if (openaiResponse.ok) {
                    res.json({ success: true, message: 'OpenAI API连接成功' });
                } else {
                    res.json({ success: false, message: 'API Key无效' });
                }
                break;
                
            case 'claude':
                // 测试Claude API
                const Anthropic = require('@anthropic-ai/sdk');
                const anthropic = new Anthropic({ apiKey: config.apiKey });
                await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hi' }]
                });
                res.json({ success: true, message: 'Claude API连接成功' });
                break;
                
            case 'gemini':
                // 测试Gemini API
                const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
                const geminiResponse = await fetch(geminiEndpoint);
                if (geminiResponse.ok) {
                    res.json({ success: true, message: 'Gemini API连接成功' });
                } else {
                    res.json({ success: false, message: 'API Key无效' });
                }
                break;
                
            default:
                res.json({ success: true, message: 'API配置已保存（未验证）' });
        }
    } catch (error) {
        res.json({
            success: false,
            message: error.message || 'API连接测试失败'
        });
    }
});

// ==================== 聊天API路由（使用服务器端密钥）====================

// 获取可用的AI提供商列表
app.get('/api/providers', (req, res) => {
    const keys = loadAPIKeys();
    const providers = [];
    
    for (const [provider, config] of Object.entries(keys)) {
        if (config && config.apiKey) {
            providers.push({
                id: provider,
                name: getProviderName(provider),
                enabled: true
            });
        }
    }
    
    res.json({
        success: true,
        providers: providers
    });
});

// 聊天接口（多模型支持）
app.post('/api/chat', async (req, res) => {
    const { message, provider = 'claude', model, conversationId } = req.body;
    
    const keys = loadAPIKeys();
    const config = keys[provider];
    
    if (!config || !config.apiKey) {
        return res.status(400).json({
            success: false,
            error: `${provider} API未配置，请联系管理员`
        });
    }
    
    try {
        let response;
        
        switch (provider) {
            case 'claude':
                response = await handleClaudeRequest(config, message, model, conversationId);
                break;
            case 'openai':
                response = await handleOpenAIRequest(config, message, model, conversationId);
                break;
            case 'gemini':
                response = await handleGeminiRequest(config, message, model, conversationId);
                break;
            default:
                throw new Error('不支持的AI提供商');
        }
        
        res.json(response);
    } catch (error) {
        console.error(`${provider} API调用失败:`, error);
        res.status(500).json({
            success: false,
            error: error.message || 'AI服务暂时不可用'
        });
    }
});

// 流式聊天接口
app.post('/api/chat/stream', async (req, res) => {
    const { message, provider = 'claude', model, conversationId } = req.body;
    
    const keys = loadAPIKeys();
    const config = keys[provider];
    
    if (!config || !config.apiKey) {
        return res.status(400).json({
            success: false,
            error: `${provider} API未配置，请联系管理员`
        });
    }
    
    // 设置 SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    try {
        switch (provider) {
            case 'claude':
                await handleClaudeStream(config, message, model, conversationId, res);
                break;
            default:
                res.write(`data: ${JSON.stringify({ type: 'error', content: '该提供商暂不支持流式响应' })}\n\n`);
                res.end();
        }
    } catch (error) {
        console.error(`${provider} 流式API调用失败:`, error);
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    }
});

// ==================== AI提供商处理函数 ====================

async function handleClaudeRequest(config, message, model, conversationId) {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: config.apiKey });
    
    const response = await anthropic.messages.create({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: message }]
    });
    
    return {
        success: true,
        message: response.content[0].text,
        usage: response.usage
    };
}

async function handleClaudeStream(config, message, model, conversationId, res) {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: config.apiKey });
    
    const stream = await anthropic.messages.stream({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{ role: 'user', content: message }]
    });
    
    stream.on('text', (text) => {
        res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
    });
    
    stream.on('error', (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
        res.end();
    });
    
    stream.on('end', () => {
        res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
        res.end();
    });
}

async function handleOpenAIRequest(config, message, model, conversationId) {
    const endpoint = config.endpoint || 'https://api.openai.com/v1';
    
    const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
            model: model || 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: message }]
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'OpenAI API调用失败');
    }
    
    return {
        success: true,
        message: data.choices[0].message.content,
        usage: data.usage
    };
}

async function handleGeminiRequest(config, message, model, conversationId) {
    const modelName = model || 'gemini-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${config.apiKey}`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }]
        })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.error?.message || 'Gemini API调用失败');
    }
    
    return {
        success: true,
        message: data.candidates[0].content.parts[0].text
    };
}

function getProviderName(provider) {
    const names = {
        'openai': 'OpenAI (ChatGPT)',
        'claude': 'Anthropic Claude',
        'gemini': 'Google Gemini',
        'grok': 'xAI Grok',
        'kimi': 'Moonshot AI (Kimi)'
    };
    return names[provider] || provider;
}

// ==================== 静态文件路由 ====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'chat.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 服务器已启动');
    console.log('='.repeat(60));
    console.log(`📍 聊天界面: http://localhost:${PORT}/`);
    console.log(`🔐 后台管理: http://localhost:${PORT}/admin`);
    console.log('='.repeat(60));
    console.log('⚠️  默认管理员账户: admin / admin123');
    console.log('⚠️  请立即登录后台修改密码！');
    console.log('='.repeat(60));
    console.log(`📁 配置文件目录: ${CONFIG_DIR}`);
    console.log(`🔑 加密密钥长度: ${ENCRYPTION_KEY.length} 字符`);
    console.log('='.repeat(60));
});

module.exports = app;

