# 🚀 Vercel KV 配置指南 - 实现跨用户共享 API 配置

## 🎯 功能说明

**目标效果：**
- ✅ 你在网站配置一次 API 密钥
- ✅ 其他人访问网站时，无需再配置
- ✅ 所有用户共享同一套 API 配置
- ✅ 配置永久保存，重启后依然有效

**技术方案：Vercel KV（基于 Redis）**

---

## 📋 部署步骤

### 第一步：安装依赖

```bash
npm install
# 这会自动安装 @vercel/kv
```

### 第二步：推送代码到 GitHub

```bash
git add .
git commit -m "添加 Vercel KV 支持 - 实现跨用户共享配置"
git push origin main
```

### 第三步：在 Vercel 创建 KV 数据库

#### 1. 登录 Vercel Dashboard
```
https://vercel.com/dashboard
```

#### 2. 进入你的项目
找到 `better6666-github-io` 项目

#### 3. 创建 KV 数据库

**方法A：通过项目页面**
- 点击项目的 `Storage` 标签页
- 点击 `Create Database`
- 选择 `KV` (Redis)
- 输入数据库名称，例如：`ai-config-storage`
- 选择区域（推荐选择离你最近的）
- 点击 `Create`

**方法B：通过 Storage 页面**
- 访问：https://vercel.com/dashboard/stores
- 点击 `Create Database`
- 选择 `KV`
- 按提示完成创建

#### 4. 连接数据库到项目

创建完成后：
- 点击 `Connect to Project`
- 选择你的项目 `better6666-github-io`
- 点击 `Connect`

Vercel 会自动添加以下环境变量：
```
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
KV_URL
```

#### 5. 重新部署

- 回到项目页面
- 点击 `Deployments`
- 点击最新部署右侧的 `...` 菜单
- 选择 `Redeploy`
- 或者推送任意代码触发自动部署

---

## 🎯 使用方法

### 首次配置（管理员）

1. **访问配置页面**
   ```
   https://better6666-github-io.vercel.app/
   ```

2. **配置 API 密钥**
   - 启用需要的 AI 模型
   - 输入 API Key
   - 点击"💾 保存配置"

3. **看到成功提示**
   ```
   ✅ 配置已永久保存！所有用户都能使用此配置
   ```

4. **测试连接**
   - 点击"🧪 测试连接"
   - 确认连接成功

### 其他用户使用（自动）

1. **访问聊天页面**
   ```
   https://better6666-github-io.vercel.app/chat.html
   ```

2. **直接使用**
   - 无需任何配置
   - 选择 AI 模型
   - 开始对话 ✅

---

## 🔍 验证配置状态

### 方法1：查看配置页面

访问配置页面，会显示：
- ✅ 已配置（绿色）- 表示有 API Key
- ❌ 未配置（红色）- 需要配置

### 方法2：检查浏览器控制台

打开浏览器控制台（F12），访问配置页面，查看网络请求：

```bash
GET /api/config

返回：
{
  "success": true,
  "config": { ... },
  "storage": "Vercel KV"  ← 表示使用 KV 存储
}
```

如果显示 `"storage": "Memory"`，说明 KV 未启用。

### 方法3：查看 Vercel 日志

1. 进入 Vercel Dashboard
2. 选择项目
3. 点击 `Deployments`
4. 点击最新部署
5. 查看 `Functions` 日志

应该看到：
```
✅ Vercel KV 已启用（持久化存储）
📥 从 Vercel KV 加载配置
```

---

## 📊 工作原理

### 配置保存流程

```
用户在网站配置 API Key
    ↓
前端发送: POST /api/config
    ↓
服务器保存到 Vercel KV (Redis)
    ↓
✅ 配置永久保存
    ↓
所有用户都能使用
```

### 用户使用流程

```
用户A配置 → 保存到 KV
    ↓
用户B访问 → 从 KV 加载配置 → 直接使用 ✅
    ↓
用户C访问 → 从 KV 加载配置 → 直接使用 ✅
```

### 数据存储位置

```
Vercel KV (Redis)
├── api_config
│   ├── claude: { apiKey: "sk-ant-...", model: "..." }
│   ├── openai: { apiKey: "sk-...", model: "..." }
│   ├── gemini: { apiKey: "AIza...", model: "..." }
│   └── custom: { apiKey: "sk-...", endpoint: "...", model: "..." }
```

---

## 🔒 安全性

### API 密钥保护

1. **传输加密**
   - 使用 HTTPS 加密传输
   - Vercel 自动提供 SSL 证书

2. **存储加密**
   - Vercel KV 数据加密存储
   - 只有你的项目能访问

3. **访问控制**
   - 环境变量保护
   - KV_REST_API_TOKEN 密钥验证

4. **显示隐藏**
   - 配置页面只显示部分密钥
   - 格式：`sk-an••••••••3xyz`

### 建议

- ✅ 定期更换 API 密钥
- ✅ 监控 API 使用情况
- ✅ 设置使用配额限制
- ⚠️ 不要分享你的网站给不信任的人

---

## 💰 费用说明

### Vercel KV 免费额度

**Hobby（免费）计划：**
- ✅ 30,000 次请求/月
- ✅ 256 MB 存储空间
- ✅ 完全够用（只存储少量配置）

**估算：**
- 配置 4 个模型 ≈ 1 KB
- 256 MB = 可存储 26 万组配置
- 每次访问 ≈ 2-3 次请求
- 30,000 次请求 = 约 10,000 次访问

**对于个人使用，免费额度完全足够！**

---

## 🐛 故障排查

### 问题1：保存配置后显示"仅当前会话有效"

**原因：** KV 未启用

**解决：**
1. 检查 Vercel KV 是否已创建
2. 检查 KV 是否已连接到项目
3. 检查环境变量是否存在：
   - 访问项目 Settings → Environment Variables
   - 确认有 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`
4. 重新部署项目

### 问题2：其他用户无法使用配置

**排查步骤：**

1. **确认配置已保存**
   ```
   访问配置页面 → 检查状态是否为 ✅ 已配置
   ```

2. **确认使用 KV 存储**
   ```
   控制台查看：storage: "Vercel KV"
   ```

3. **清除浏览器缓存**
   ```
   Ctrl + Shift + Delete → 清除缓存
   ```

4. **检查 Vercel 日志**
   ```
   Dashboard → Functions → 查看错误日志
   ```

### 问题3：配置突然丢失

**可能原因：**
- KV 数据库被删除
- 环境变量被移除
- 部署回滚到旧版本

**解决：**
1. 确认 KV 数据库存在
2. 重新连接 KV 到项目
3. 重新配置 API 密钥

### 问题4：访问速度慢

**优化方案：**
- 选择离用户更近的 KV 区域
- 启用缓存（代码已包含内存缓存）
- 升级 Vercel 计划（Pro）

---

## 📈 监控和管理

### 查看 KV 使用情况

1. **访问 Storage Dashboard**
   ```
   https://vercel.com/dashboard/stores
   ```

2. **选择你的 KV 数据库**
   - 查看请求次数
   - 查看存储使用量
   - 查看响应时间

### 查看存储的数据

Vercel Dashboard 提供 Data Browser：
- 可以查看所有键值对
- 可以手动编辑数据
- 可以删除数据

### 备份配置

**方法1：手动导出**
访问配置页面，点击"导出配置"按钮（如果有）

**方法2：从 KV 导出**
使用 Vercel CLI：
```bash
vercel kv get api_config
```

---

## 🎓 高级配置

### 设置访问密码保护

如果只想让特定人配置，可以添加密码保护：

在 `config.html` 添加简单验证：

```javascript
const ADMIN_PASSWORD = 'your_secure_password';

function saveConfig(provider) {
    const password = prompt('请输入管理员密码:');
    if (password !== ADMIN_PASSWORD) {
        alert('密码错误！');
        return;
    }
    // ... 原有保存逻辑
}
```

### 使用环境变量作为后备

代码已实现：如果 KV 中没有配置，会从环境变量读取：

```bash
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
```

这样即使 KV 出问题，也能正常运行。

---

## 📚 相关资源

- [Vercel KV 官方文档](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Storage](https://vercel.com/dashboard/stores)

---

## ✅ 完成检查清单

配置完成后，确认：

- [ ] 已安装 `@vercel/kv` 依赖
- [ ] 代码已推送到 GitHub
- [ ] Vercel KV 数据库已创建
- [ ] KV 已连接到项目
- [ ] 环境变量已自动添加
- [ ] 项目已重新部署
- [ ] 配置页面显示"Vercel KV"存储
- [ ] 保存配置提示"所有用户都能使用"
- [ ] 其他用户访问时无需配置即可使用

---

## 🎉 成功！

完成以上步骤后，你的网站就实现了：

✅ **配置一次，所有人共享**
✅ **配置永久保存**
✅ **跨设备、跨IP自动同步**
✅ **无需每个用户单独配置**

**享受便捷的AI服务！** 🚀

