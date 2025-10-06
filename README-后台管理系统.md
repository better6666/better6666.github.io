# 🔐 AI多模型后台管理系统

## 📖 简介

这是一个完整的AI模型API密钥安全管理后台系统，解决了API密钥在代码中暴露的安全风险。支持多个主流AI模型，所有API密钥加密存储在服务器端，前端代码不包含任何密钥信息。

## ✨ 核心特性

### 🛡️ 安全保障
- ✅ **加密存储**: API密钥使用AES-256加密，绝不明文保存
- ✅ **账号登录**: 管理员账号密码保护，Session会话管理
- ✅ **密钥隔离**: 前端代码完全不包含API密钥
- ✅ **配置保护**: 配置文件添加到.gitignore，不会上传Git

### 🤖 多模型支持
- **OpenAI (ChatGPT)**: GPT-4, GPT-3.5-Turbo等
- **Anthropic Claude**: Claude 3 Opus, Sonnet, Haiku等
- **Google Gemini**: Gemini Pro, Gemini Ultra等
- **xAI Grok**: Grok-1, Grok-2等
- **Moonshot AI (Kimi)**: 超长上下文模型

### 🎯 核心功能
- 🔐 安全登录认证
- 📝 API密钥配置
- 🧪 一键测试连接
- 📊 实时状态监控
- 📋 操作日志记录
- 🔑 密码修改功能

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

新增依赖：
```bash
npm install express-session
```

### 2. 启动服务器

**Windows:**
```bash
start-admin.bat
```

**Mac/Linux:**
```bash
node server-admin.js
```

或使用npm:
```bash
npm run start:admin
```

### 3. 访问后台

```
后台管理: http://localhost:3000/admin
聊天界面: http://localhost:3000
修改密码: http://localhost:3000/change-password.html
```

### 4. 默认登录信息

```
用户名: admin
密码: admin123
```

⚠️ **首次登录后请立即修改密码！**

---

## 📸 界面预览

### 登录界面
- 安全的账号密码登录
- 错误提示
- 自动跳转

### 管理主界面
- 统计卡片显示配置状态
- 多个AI模型配置卡片
- 一键保存/测试/删除
- 实时操作日志

### 修改密码
- 密码强度检测
- 实时强度提示
- 安全验证

---

## 🔧 使用方法

### 配置OpenAI API

1. **获取API Key**
   - 访问: https://platform.openai.com/api-keys
   - 创建新的API Key
   - 复制密钥（格式: `sk-...`）

2. **在后台配置**
   - 登录后台管理系统
   - 找到"OpenAI (ChatGPT)"卡片
   - 粘贴API Key
   - 可选：修改API Endpoint（用于代理）
   - 点击"保存配置"

3. **测试连接**
   - 点击"测试连接"按钮
   - 等待测试结果
   - 确认状态变为"已配置"

4. **开始使用**
   - 返回聊天界面
   - 选择OpenAI模型
   - 开始对话

### 配置其他模型

**Claude:**
- API Key: https://console.anthropic.com/
- 格式: `sk-ant-...`

**Gemini:**
- API Key: https://makersuite.google.com/app/apikey
- 格式: `AIza...`

**Grok:**
- API Key: https://x.ai/
- 格式: `xai-...`

**Kimi:**
- API Key: https://platform.moonshot.cn/
- 格式: `sk-...`

---

## 🛡️ 安全机制

### 1. API密钥加密

**加密流程:**
```
明文API Key
    ↓
AES-256-CBC加密
    ↓
加密字符串 (IV:EncryptedText)
    ↓
存储到 .config/api-keys.json
```

**使用流程:**
```
用户发送消息
    ↓
服务器接收请求
    ↓
从加密文件读取密钥
    ↓
AES-256解密
    ↓
调用AI API
    ↓
返回结果
```

### 2. 存储位置

```
.config/
├── api-keys.json      # API密钥（AES-256加密）
└── admin-users.json   # 管理员账户（SHA-256哈希）
```

✅ 已添加到`.gitignore`，不会上传到Git

### 3. 密码安全

- 密码使用SHA-256哈希存储
- 不存储明文密码
- 支持强度检测
- 登录会话24小时过期

### 4. 会话管理

- Session存储登录状态
- 自动过期清理
- 支持手动登出
- 防止未授权访问

---

## 📁 项目结构

```
project/
├── admin.html                    # 后台管理界面
├── change-password.html          # 修改密码页面
├── server-admin.js               # 后台服务器（核心）
├── chat.html                     # 聊天界面
├── start-admin.bat               # Windows启动脚本
├── package.json                  # 依赖配置
├── .gitignore                    # Git忽略文件
├── .config/                      # 配置目录（自动创建）
│   ├── api-keys.json            # API密钥（加密）
│   └── admin-users.json         # 管理员账户
├── 后台管理系统使用指南.md       # 详细文档
└── README-后台管理系统.md        # 本文件
```

---

## 🔑 API端点

### 管理员认证

```javascript
// 登录
POST /api/admin/login
Body: { username, password }

// 登出
POST /api/admin/logout

// 检查登录状态
GET /api/admin/check-auth

// 修改密码
POST /api/admin/change-password
Body: { currentPassword, newPassword }
```

### API配置管理

```javascript
// 获取所有API配置
GET /api/admin/apis

// 保存API配置
POST /api/admin/apis
Body: { provider, config: { apiKey, endpoint? } }

// 删除API配置
DELETE /api/admin/apis/:provider

// 测试API连接
POST /api/admin/test/:provider
```

### 聊天接口

```javascript
// 普通聊天
POST /api/chat
Body: { message, provider, model?, conversationId? }

// 流式聊天
POST /api/chat/stream
Body: { message, provider, model?, conversationId? }

// 获取可用提供商
GET /api/providers
```

---

## 🎓 最佳实践

### 开发环境

1. **启动服务器**
   ```bash
   npm run dev:admin
   ```

2. **访问后台**
   - http://localhost:3000/admin

3. **配置API**
   - 逐个添加需要的AI模型
   - 每个都测试连接
   - 查看操作日志

### 生产环境

1. **修改默认密码**
   ```
   访问: http://your-domain/change-password.html
   设置强密码（至少12位，包含大小写、数字、符号）
   ```

2. **使用HTTPS**
   ```bash
   # 使用反向代理（Nginx/Apache）
   # 或使用Node.js HTTPS模块
   ```

3. **设置环境变量**
   ```bash
   # 加密密钥
   export ENCRYPTION_KEY="your-64-character-hex-key"
   
   # Session密钥
   export SESSION_SECRET="your-random-secret"
   
   # 端口
   export PORT=3000
   ```

4. **启用防火墙**
   - 限制后台访问IP
   - 使用Nginx反向代理
   - 启用速率限制

5. **定期备份**
   ```bash
   # 备份配置
   cp -r .config .config.backup
   
   # 或使用自动备份脚本
   ```

---

## ❓ 常见问题

### Q: 忘记密码怎么办？

**A:** 删除`.config/admin-users.json`文件，重启服务器会重新创建默认账户（admin/admin123）

### Q: API测试失败？

**A:** 检查：
1. API Key格式是否正确
2. API Key是否有效
3. 是否有足够的配额
4. 网络连接是否正常

### Q: 如何添加新的管理员？

**A:** 编辑`.config/admin-users.json`:
```json
{
  "admin": { "password": "hash1", "createdAt": "..." },
  "admin2": { "password": "hash2", "createdAt": "..." }
}
```

### Q: 可以部署到云服务器吗？

**A:** 可以！注意事项：
1. 使用HTTPS（必须）
2. 修改默认密码
3. 设置防火墙规则
4. 使用PM2等进程管理工具
5. 定期备份配置文件

### Q: 如何迁移配置？

**A:** 复制`.config`目录到新服务器即可，加密密钥需要保持一致

---

## 📊 性能优化

### 1. 使用PM2管理进程

```bash
npm install -g pm2
pm2 start server-admin.js --name "ai-admin"
pm2 save
pm2 startup
```

### 2. Nginx反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 限制后台访问
    location /admin {
        allow YOUR_IP;
        deny all;
        proxy_pass http://localhost:3000;
    }
}
```

### 3. 启用HTTPS

```bash
# 使用Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 🔄 更新日志

### v1.0.0 (2025-10-06)
- ✅ 完整的后台管理系统
- ✅ API密钥加密存储
- ✅ 多模型支持
- ✅ 安全登录认证
- ✅ 连接测试功能
- ✅ 操作日志记录
- ✅ 密码修改功能

---

## 📞 技术支持

### 查看日志

**服务器日志:**
```bash
# 查看实时日志
tail -f server.log

# 或直接看控制台输出
node server-admin.js
```

**操作日志:**
- 登录后台管理界面
- 滚动到"操作日志"区域
- 查看所有操作记录

### 调试模式

```bash
# 启用详细日志
DEBUG=* node server-admin.js
```

---

## 📝 许可证

MIT License

---

## 🎉 开始使用

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm run start:admin

# 3. 访问后台
# 打开浏览器: http://localhost:3000/admin

# 4. 登录（admin/admin123）

# 5. 配置API密钥

# 6. 开始使用！
```

---

## 🔗 相关资源

- [详细使用指南](./后台管理系统使用指南.md)
- [设备检测文档](./设备检测与响应式优化说明.md)
- [快速开始指南](./设备检测快速开始.md)

---

**享受安全便捷的AI服务！** 🚀

