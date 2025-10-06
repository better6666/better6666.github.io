# 🤖 多AI模型灵活配置系统

## ✨ 新功能特性

### 🎯 核心改进

1. **模型名称自定义** - 不再硬编码，用户可以填写任何模型名称
2. **新增 Grok (xAI)** - 马斯克的 xAI Grok 模型支持
3. **新增 DeepSeek** - DeepSeek V3, Coder等模型
4. **新增 Kimi** - 月之暗面 Moonshot AI
5. **新增 Perplexity** - Sonar 系列模型
6. **新增豆包** - 字节跳动 Doubao
7. **所有配置永久生效** - 通过 Vercel KV 持久化存储

---

## 📊 支持的 AI 提供商

| AI 提供商 | 模型示例 | API类型 |
|----------|---------|--------|
| **Claude** | claude-3-5-sonnet, claude-4-0-sonnet, opus | Anthropic |
| **ChatGPT** | gpt-4, gpt-4o, o1, o1-preview, o3-mini | OpenAI |
| **Gemini** | gemini-2.5-pro, gemini-2.0-flash-exp | Google |
| **Grok** | grok-2, grok-beta, grok-vision-beta | xAI |
| **DeepSeek** | deepseek-chat, deepseek-coder, deepseek-v3 | OpenAI兼容 |
| **Kimi** | moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k | OpenAI兼容 |
| **Perplexity** | sonar, sonar-pro, sonar-small | OpenAI兼容 |
| **豆包** | doubao-pro, doubao-lite, doubao-128k | OpenAI兼容 |

---

## 🎨 配置界面

### 访问配置页面

```
https://your-domain.vercel.app/config-new.html
```

### 配置步骤

1. **选择 AI 提供商** - 滚动查看所有支持的 AI
2. **填写 API Key** - 输入你的 API 密钥
3. **自定义模型名称** - 填写任何你想要的模型
   - 例如：`gpt-4`, `claude-3-5-sonnet`, `grok-2`
4. **保存配置** - 点击"💾 保存配置"
5. **测试连接** - 点击"🧪 测试"确认配置有效

---

## 📝 模型名称示例

### Claude (Anthropic)

```
claude-3-5-sonnet-20241022  (最新Sonnet)
claude-3-opus-20240229       (Opus 大模型)
claude-3-sonnet-20240229     (标准Sonnet)
claude-3-haiku-20240307      (快速Haiku)
```

### ChatGPT (OpenAI)

```
gpt-4                  (GPT-4 标准)
gpt-4-turbo            (GPT-4 Turbo)
gpt-4o                 (GPT-4 Omni)
gpt-3.5-turbo          (GPT-3.5)
o1                     (o1 推理模型)
o1-preview             (o1 预览版)
o3-mini                (o3 轻量版)
```

### Google Gemini

```
gemini-2.5-pro              (最新2.5 Pro)
gemini-2.0-flash-exp        (2.0 Flash实验版)
gemini-1.5-pro              (1.5 Pro)
gemini-1.5-flash            (1.5 Flash)
```

### Grok (xAI)

```
grok-2                 (Grok 2)
grok-beta              (Grok Beta)
grok-vision-beta       (Grok Vision)
```

### DeepSeek

```
deepseek-chat          (DeepSeek 对话)
deepseek-coder         (DeepSeek 代码)
deepseek-v3            (DeepSeek V3)
```

### Kimi (Moonshot)

```
moonshot-v1-8k         (8K上下文)
moonshot-v1-32k        (32K上下文)
moonshot-v1-128k       (128K长文本)
```

### Perplexity

```
sonar                  (标准Sonar)
sonar-pro              (Pro版本)
sonar-small            (小型模型)
sonar-medium           (中型模型)
```

### 豆包 (Doubao)

```
doubao-pro             (Pro版本)
doubao-lite            (轻量版)
doubao-128k            (长上下文)
```

---

## 🔧 技术实现

### 后端更新 (`server-multi-ai.js`)

```javascript
// 配置存储结构
{
  claude: { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
  openai: { apiKey: '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4' },
  gemini: { apiKey: '', model: 'gemini-2.5-pro' },
  grok: { apiKey: '', endpoint: 'https://api.x.ai/v1', model: 'grok-2' },
  deepseek: { apiKey: '', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  kimi: { apiKey: '', endpoint: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  perplexity: { apiKey: '', endpoint: 'https://api.perplexity.ai', model: 'sonar' },
  doubao: { apiKey: '', endpoint: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro' }
}
```

### API 兼容性

- **Grok, DeepSeek, Kimi, Perplexity, 豆包** 都使用 **OpenAI 兼容的 API**
- 自动复用 OpenAI 的调用逻辑
- 只需配置不同的 `endpoint` 和 `model` 即可

---

## 📤 部署步骤

### 1. 替换配置页面

**方法1：重命名（推荐）**
```bash
# 备份旧的配置页面
mv config.html config-old.html

# 使用新的配置页面
mv config-new.html config.html
```

**方法2：直接访问新页面**
```bash
# 访问新配置页面
https://your-domain.vercel.app/config-new.html
```

### 2. 推送到 GitHub

```bash
git add .
git commit -m "添加多AI模型支持：Grok, DeepSeek, Kimi, Perplexity, 豆包，模型名称自定义"
git push origin main
```

### 3. 等待 Vercel 部署

- ⏱️ 约 1-2 分钟自动部署
- 📧 收到部署成功邮件
- 🌐 访问网站测试

### 4. 配置 AI 模型

1. 访问 `https://your-domain.vercel.app/config.html`
2. 选择要使用的 AI 提供商
3. 填写 API Key 和模型名称
4. 点击"保存配置"
5. 点击"测试连接"确认

---

## 🎯 使用场景示例

### 场景1：使用最新 GPT-4 模型

```
1. 选择 "OpenAI (ChatGPT)"
2. API Key: sk-...
3. 模型名称: gpt-4o  (或 gpt-4-turbo, o1等)
4. 保存配置
```

### 场景2：使用 Claude 4.0 Sonnet

```
1. 选择 "Claude (Anthropic)"
2. API Key: sk-ant-api03-...
3. 模型名称: claude-4-0-sonnet
4. 保存配置
```

### 场景3：使用 Grok-2

```
1. 选择 "Grok (xAI)"
2. API Key: xai-...
3. API 端点: https://api.x.ai/v1
4. 模型名称: grok-2
5. 保存配置
```

### 场景4：使用 DeepSeek Coder

```
1. 选择 "DeepSeek"
2. API Key: sk-...
3. API 端点: https://api.deepseek.com/v1
4. 模型名称: deepseek-coder
5. 保存配置
```

### 场景5：使用 Kimi 长文本

```
1. 选择 "Kimi (月之暗面)"
2. API Key: sk-...
3. API 端点: https://api.moonshot.cn/v1
4. 模型名称: moonshot-v1-128k
5. 保存配置
```

---

## 🔒 安全性

### API Key 保护

- ✅ 传输加密（HTTPS）
- ✅ 存储加密（Vercel KV）
- ✅ 显示隐藏（`sk-an••••••••3xyz`）
- ✅ 环境变量支持

### 配置隔离

- 每个 AI 提供商独立配置
- 可以同时配置多个 AI
- 互不影响，按需使用

---

## 💡 高级用法

### 1. 配置多个 ChatGPT 模型

由于系统现在支持自定义模型名称，你可以：

```javascript
// 方案A：在前端动态切换模型
config: {
  model: 'gpt-4o'  // 用户可以实时修改
}

// 方案B：配置多个provider（需要修改代码）
openai_gpt4: { endpoint: '...', model: 'gpt-4' }
openai_gpt4o: { endpoint: '...', model: 'gpt-4o' }
```

### 2. 使用自定义 API 端点

如果你有自己的代理或中转服务：

```
OpenAI 端点: https://your-proxy.com/v1
Grok 端点: https://your-grok-proxy.com/v1
```

### 3. 环境变量配置（Vercel）

在 Vercel Dashboard 设置：

```
CLAUDE_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
GROK_API_KEY=xai-...
DEEPSEEK_API_KEY=sk-...
KIMI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
DOUBAO_API_KEY=...
```

---

## 🐛 故障排查

### 问题1：保存配置失败

**原因：** Vercel KV 未配置

**解决：**
1. 创建 Vercel KV 数据库
2. 连接到项目
3. 重新部署

### 问题2：测试连接失败

**检查：**
- ✅ API Key 是否正确
- ✅ 端点 URL 是否正确
- ✅ 模型名称是否支持
- ✅ 网络连接是否正常

### 问题3：模型不响应

**可能原因：**
- API Key 额度不足
- 模型名称拼写错误
- API 端点不可用
- 模型已被弃用

**解决：**
1. 检查 API Key 额度
2. 确认模型名称正确
3. 测试 API 端点连通性
4. 更换为最新模型

### 问题4：Grok/DeepSeek等新模型无法使用

**原因：** 后端代码未更新

**解决：**
确保 `server-multi-ai.js` 包含最新的 provider 支持：

```javascript
case 'grok':
case 'deepseek':
case 'kimi':
case 'perplexity':
case 'doubao':
    // OpenAI 兼容 API
    response = await chatWithOpenAI(history, finalConfig);
```

---

## 📚 API 文档链接

| AI提供商 | 官方文档 | API 获取 |
|---------|---------|---------|
| Claude | https://docs.anthropic.com | https://console.anthropic.com |
| ChatGPT | https://platform.openai.com/docs | https://platform.openai.com/api-keys |
| Gemini | https://ai.google.dev | https://aistudio.google.com/app/apikey |
| Grok | https://x.ai/api | https://console.x.ai |
| DeepSeek | https://platform.deepseek.com/docs | https://platform.deepseek.com |
| Kimi | https://platform.moonshot.cn/docs | https://platform.moonshot.cn |
| Perplexity | https://docs.perplexity.ai | https://www.perplexity.ai/settings/api |
| 豆包 | https://www.volcengine.com/docs | https://console.volcengine.com |

---

## 🎉 功能对比

| 特性 | 旧版本 | 新版本 |
|-----|-------|-------|
| 支持 AI 数量 | 4个 | 9个 |
| 模型选择 | 下拉菜单固定 | 自由输入任意模型 |
| Claude 模型 | 仅3.5 Sonnet | 任意版本 |
| ChatGPT 模型 | 固定几个 | 所有模型（gpt-4, o1, o3等） |
| Grok 支持 | ❌ | ✅ |
| DeepSeek | ❌ | ✅ |
| Perplexity | ❌ | ✅ |
| 豆包 | ❌ | ✅ |
| 配置界面 | 基础 | 现代化、卡片式 |
| 实时状态 | 基础 | ✅已配置/❌未配置 |

---

## ✅ 测试清单

部署后，测试以下功能：

- [ ] 访问新配置页面正常
- [ ] Claude 配置和测试成功
- [ ] ChatGPT 配置和测试成功
- [ ] Gemini 配置和测试成功
- [ ] Grok 配置和测试成功
- [ ] DeepSeek 配置和测试成功
- [ ] Kimi 配置和测试成功
- [ ] Perplexity 配置和测试成功
- [ ] 豆包配置和测试成功
- [ ] 模型名称自定义有效
- [ ] 配置保存后刷新依然存在
- [ ] 聊天功能正常
- [ ] 流式输出正常

---

## 🚀 未来扩展

可以继续添加的 AI 提供商：

- [ ] **Cohere** - Cohere Command系列
- [ ] **Together AI** - 开源模型托管
- [ ] **Replicate** - AI模型API平台
- [ ] **AI21** - Jurassic-2 系列
- [ ] **Mistral AI** - Mistral 系列
- [ ] **Anthropic Constitutional AI** - 更安全的AI
- [ ] **Baidu ERNIE** - 百度文心一言
- [ ] **Alibaba Qwen** - 阿里通义千问

只需按照当前模式添加配置即可！

---

## 📞 需要帮助？

如果遇到问题：

1. 查看浏览器控制台（F12）
2. 查看 Vercel 函数日志
3. 确认 API Key 有效
4. 检查网络连接
5. 阅读官方API文档

**享受多AI模型的强大功能！** 🎉

