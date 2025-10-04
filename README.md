# Claude AI Clone - 完整版

一个功能完整的 Claude AI 克隆，支持真实的 Anthropic API 调用。

## ✨ 功能特点

- ✅ 真实的 Claude API 集成
- ✅ 支持所有 Claude 模型（3.5 Sonnet, 3 Opus, 3.5 Haiku 等）
- ✅ 流式响应（实时打字效果）
- ✅ 对话历史记录
- ✅ 多对话管理
- ✅ 完整的 UI 界面
- ✅ 移动端适配

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 设置 API Key

有两种方式设置您的 Anthropic API Key：

**方法 A：使用环境变量（推荐）**

```bash
# Windows PowerShell
$env:ANTHROPIC_API_KEY="sk-ant-api03-your-api-key-here"

# Windows CMD
set ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here

# macOS/Linux
export ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here
```

**方法 B：直接在代码中修改**

编辑 `server.js` 文件，将第 13 行的 API Key 替换为您的：

```javascript
apiKey: 'sk-ant-api03-your-api-key-here',
```

### 3. 获取 API Key

1. 访问 [Anthropic Console](https://console.anthropic.com/settings/keys)
2. 注册/登录账户
3. 创建新的 API Key
4. 复制 API Key

### 4. 启动服务器

```bash
npm start
```

或使用自动重启（开发模式）：

```bash
npm run dev
```

### 5. 打开浏览器

访问：http://localhost:3000

## 📋 支持的模型

| 模型名称 | API 标识符 | 说明 |
|---------|-----------|------|
| **Claude 3.5 Sonnet** | `claude-3-5-sonnet-20241022` | 最新最强大的模型 |
| **Claude 3.5 Haiku** | `claude-3-5-haiku-20241022` | 最快速的模型 |
| **Claude 3 Opus** | `claude-3-opus-20240229` | 复杂任务最佳 |
| **Claude 3 Sonnet** | `claude-3-sonnet-20240229` | 平衡性能 |

## 🔧 API 端点

### POST /api/chat
发送消息（非流式）

```javascript
{
  "message": "Hello!",
  "conversationId": "conv-123",
  "model": "sonnet-4.5"
}
```

### POST /api/chat/stream
发送消息（流式响应）

使用 Server-Sent Events (SSE) 实现实时响应。

### GET /api/conversations
获取所有对话列表

### GET /api/conversations/:id
获取特定对话的历史记录

### DELETE /api/conversations/:id
删除特定对话

## 📁 文件结构

```
├── server.js           # Node.js 后端服务器
├── package.json        # 项目依赖
├── chat.html          # 聊天界面
├── index.html         # 欢迎页面
├── upgrade.html       # 升级页面
└── README.md          # 说明文档
```

## 💡 使用示例

### 基本对话

1. 在输入框中输入消息
2. 点击发送按钮或按 Enter
3. AI 会实时生成回复

### 切换模型

1. 点击 "Sonnet 4.5" 下拉菜单
2. 选择其他模型（Opus, Haiku 等）
3. 新消息将使用选定的模型

### 新建对话

1. 点击 "New chat" 按钮
2. 开始全新的对话
3. 历史对话会保存在左侧栏

## ⚠️ 注意事项

1. **API Key 安全**：不要将 API Key 提交到公共仓库
2. **费用**：使用 API 会产生费用，请查看 [Anthropic 定价](https://www.anthropic.com/pricing)
3. **速率限制**：注意 API 的速率限制
4. **数据存储**：当前版本使用内存存储，重启后数据会丢失

## 🔒 生产环境建议

生产环境部署时建议：

1. 使用数据库存储对话历史（MongoDB, PostgreSQL 等）
2. 添加用户认证系统
3. 实现 API Key 管理和轮换
4. 添加日志和监控
5. 使用 HTTPS
6. 实现速率限制和配额管理

## 📝 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题，请创建 Issue。

