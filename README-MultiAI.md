# 🤖 Multi-AI Platform - 多 AI 聊天平台

一个支持多个 AI 提供商的统一聊天平台，可同时配置和使用 Claude、ChatGPT、Gemini 等多个 AI 服务。

## ✨ 功能特点

### 🎯 支持的 AI 提供商

| 提供商 | 支持模型 | API 获取 |
|-------|---------|----------|
| **Claude (Anthropic)** | 3.5 Sonnet, 3.5 Haiku, 3 Opus, 3 Sonnet | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **OpenAI (ChatGPT)** | GPT-4 Turbo, GPT-4, GPT-3.5 Turbo | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Google Gemini** | Gemini Pro, Gemini Pro Vision | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| **自定义 API** | 任何兼容的 API | 您自己的服务 |

### 💎 核心功能

- ✅ **多 AI 切换** - 在不同 AI 间自由切换
- ✅ **实时流式响应** - 打字机效果
- ✅ **对话历史** - 自动保存和管理
- ✅ **账号系统** - 密码保护
- ✅ **API 密钥管理** - 安全存储
- ✅ **自定义端点** - 支持代理和自建服务
- ✅ **可视化配置** - 无需修改代码
- ✅ **移动端适配** - 完美支持手机

---

## 🚀 快速开始

### 方式 1：一键启动（推荐）

**双击运行：`start-multi-ai.bat`**

### 方式 2：手动启动

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 打开浏览器
# http://localhost:3000
```

---

## 📝 配置步骤

### 1. 获取 API Keys

#### Claude (Anthropic)
1. 访问：https://console.anthropic.com/settings/keys
2. 点击 "Create Key"
3. 复制格式：`sk-ant-api03-...`

#### OpenAI
1. 访问：https://platform.openai.com/api-keys
2. 点击 "Create new secret key"
3. 复制格式：`sk-...`

#### Google Gemini
1. 访问：https://makersuite.google.com/app/apikey
2. 点击 "Create API key"
3. 复制格式：`AIza...`

### 2. 配置界面

1. **启动服务器后访问：**
   ```
   http://localhost:3000
   ```

2. **在配置页面：**
   - 点击要使用的 AI 提供商右侧的开关
   - 输入对应的 API Key
   - 选择默认模型
   - 点击 "测试连接" 验证
   - 点击 "保存配置"

3. **完成配置：**
   - 点击 "完成配置，开始使用"
   - 自动跳转到聊天界面

---

## 🎮 使用方法

### 切换 AI 提供商

在聊天界面的模型选择器中：
1. 点击当前模型名称
2. 选择不同的 AI 提供商
3. 新消息将使用选中的 AI

### 新建对话

- 点击左上角 "New chat"
- 或在聊天界面按 `Ctrl+N`

### 查看历史

- 左侧边栏显示最近对话
- 点击任意对话恢复历史

---

## 🔧 高级配置

### 使用自定义 OpenAI 端点

适用于：
- OpenAI 代理服务
- Azure OpenAI
- 第三方兼容服务

配置方式：
1. 在 OpenAI 配置中找到 "API 端点"
2. 输入自定义地址，例如：
   ```
   https://your-proxy.com/v1
   https://your-azure.openai.azure.com/
   ```

### 接入自定义 AI

1. 在配置页面启用 "自定义 API"
2. 填写：
   - **服务名称**：显示名称
   - **API 端点**：完整 URL
   - **API Key**：认证密钥
   - **认证方式**：Bearer / API Key / Basic Auth

3. 测试连接后保存

---

## 📊 API 端点说明

### POST /api/chat
发送消息（非流式）

```javascript
{
  "message": "你好",
  "conversationId": "conv-123",
  "provider": "claude",  // claude, openai, gemini, custom
  "config": {
    "apiKey": "sk-...",
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

### POST /api/chat/stream
流式响应（SSE）

### POST /api/test/:provider
测试 API 连接

---

## 💰 费用说明

### Claude (Anthropic)
- **3.5 Sonnet**: ~$3 / 百万 tokens
- **3.5 Haiku**: ~$0.25 / 百万 tokens
- **3 Opus**: ~$15 / 百万 tokens

### OpenAI
- **GPT-4 Turbo**: ~$10 / 百万 tokens
- **GPT-4**: ~$30 / 百万 tokens
- **GPT-3.5 Turbo**: ~$0.5 / 百万 tokens

### Google Gemini
- **Gemini Pro**: 免费额度 + 付费

**详细定价：**
- Anthropic: https://www.anthropic.com/pricing
- OpenAI: https://openai.com/pricing
- Google: https://ai.google.dev/pricing

---

## 🛡️ 安全建议

### 开发/测试环境
✅ 当前配置即可使用

### 生产环境
建议添加：

1. **环境变量管理**
   ```bash
   # 不在代码中硬编码 API Key
   export ANTHROPIC_API_KEY=...
   export OPENAI_API_KEY=...
   ```

2. **用户认证系统**
   - 实现完整的注册/登录
   - 使用数据库存储用户信息
   - 密码加密（bcrypt）

3. **API 密钥加密**
   - 使用加密算法存储 API Key
   - 不直接存储明文

4. **速率限制**
   - 防止滥用
   - 控制成本

5. **HTTPS**
   - 使用 SSL 证书
   - 保护数据传输

---

## 📁 文件结构

```
multi-ai-platform/
├── server-multi-ai.js     # 多AI服务器（主程序）
├── server.js              # 简单版服务器（仅Claude）
├── config.html            # 配置管理界面 ⭐
├── chat.html             # 聊天界面
├── index.html            # 欢迎页面
├── upgrade.html          # 升级页面
├── package.json          # 依赖配置
├── start-multi-ai.bat    # Windows启动脚本 ⭐
├── start.bat             # 简单版启动脚本
└── README-MultiAI.md     # 本文档 ⭐
```

---

## 🐛 常见问题

### Q1: 提示 "未检测到 Node.js"
**A:** 安装 Node.js：https://nodejs.org/（推荐 LTS 版本）

### Q2: API 连接失败
**A:** 检查：
1. API Key 是否正确
2. 账户是否有余额
3. 网络是否正常（可能需要代理）

### Q3: 模型选择器没有显示某个 AI
**A:** 
1. 检查配置页面是否已启用
2. 检查 API Key 是否已保存

### Q4: 如何使用国内 OpenAI 代理？
**A:** 
1. 在 OpenAI 配置中
2. 将 "API 端点" 改为代理地址
3. 例如：`https://api.openai-proxy.com/v1`

### Q5: 想同时使用多个 API Key 轮换
**A:** 当前版本暂不支持，但可以：
1. 手动切换配置
2. 或修改 `server-multi-ai.js` 添加轮换逻辑

---

## 🎯 功能对比

| 功能 | 简单版 (server.js) | 多AI版 (server-multi-ai.js) |
|------|-------------------|----------------------------|
| Claude API | ✅ | ✅ |
| OpenAI API | ❌ | ✅ |
| Google Gemini | ❌ | ✅ |
| 自定义 API | ❌ | ✅ |
| 可视化配置 | ❌ | ✅ |
| AI 切换 | ❌ | ✅ |
| 账号系统 | ❌ | ✅ |

**推荐使用多AI版本！**

---

## 🔄 更新日志

### v2.0.0 (2024-10-04)
- ✨ 新增多 AI 提供商支持
- ✨ 新增可视化配置界面
- ✨ 新增 OpenAI 集成
- ✨ 新增 Google Gemini 集成
- ✨ 新增自定义 API 支持
- ✨ 新增账号管理系统
- 🎨 优化 UI 设计

### v1.0.0 (2024-10-03)
- 🎉 初始版本
- ✅ Claude API 集成

---

## 📮 反馈与支持

遇到问题或有建议？请：
1. 检查本文档的常见问题
2. 查看浏览器控制台错误信息
3. 提供详细的错误描述

---

## 📜 许可证

MIT License

---

## 🙏 致谢

感谢以下 AI 服务提供商：
- Anthropic (Claude)
- OpenAI (ChatGPT)
- Google (Gemini)

---

**🎉 享受多 AI 平台带来的便利！**

