# 🚀 部署到 Vercel 指南

## ✨ 优势
- ✅ 完全免费
- ✅ 全球任何设备都能访问
- ✅ HTTPS 安全加密
- ✅ 自动域名（例如：your-project.vercel.app）
- ✅ 永久在线，无需保持电脑开机

---

## 📝 部署步骤

### **步骤 1：注册 Vercel 账号**
1. 访问：https://vercel.com
2. 使用 GitHub 账号登录（免费）

### **步骤 2：安装 Vercel CLI**
在命令行中运行：
```bash
npm install -g vercel
```

### **步骤 3：登录 Vercel**
```bash
vercel login
```
按提示选择 GitHub 登录。

### **步骤 4：部署项目**
在项目文件夹中运行：
```bash
vercel
```

按提示操作：
- Set up and deploy? **Y**
- Which scope? 选择您的账号
- Link to existing project? **N**
- Project name? 输入项目名称（例如：`my-ai-chat`）
- In which directory is your code located? **.**
- Want to override the settings? **N**

### **步骤 5：配置环境变量**
部署成功后：
1. 访问 Vercel Dashboard：https://vercel.com/dashboard
2. 选择您的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `CUSTOM_API_KEY` | `sk-YWVsd3yPnEM5CXPV7c6rej17bbhRWfhCDm8IIrGqWdo8fiW1` |
| `CUSTOM_API_ENDPOINT` | `https://api.moonshot.cn/v1/chat/completions` |
| `CUSTOM_MODEL` | `moonshot-v1-8k` |

5. 点击 **Save**

### **步骤 6：重新部署**
```bash
vercel --prod
```

### **步骤 7：获取访问地址**
部署成功后，Vercel 会显示：
```
✅ Production: https://your-project.vercel.app
```

**复制这个地址，任何设备都能访问！**

---

## 🌍 访问方式

### **电脑访问：**
```
https://your-project.vercel.app/chat.html
```

### **手机访问：**
```
https://your-project.vercel.app/chat.html
```

### **朋友访问：**
```
https://your-project.vercel.app/chat.html
```

**完全相同的地址，全球任何设备都能访问！** 🎉

---

## 🔐 安全说明

✅ API Key 存储在 Vercel 环境变量中  
✅ 不会暴露在前端代码  
✅ HTTPS 加密传输  
✅ 可以随时在 Vercel 控制台修改 API Key

---

## ❓ 常见问题

### Q: 部署需要花钱吗？
**A:** 不需要！Vercel 免费版完全够用。

### Q: 如何更新代码？
**A:** 修改代码后，再次运行 `vercel --prod` 即可。

### Q: 如何绑定自己的域名？
**A:** Vercel Dashboard → Settings → Domains → 添加域名

### Q: 部署失败怎么办？
**A:** 查看错误信息，或使用方案二（内网穿透）。

---

## 🎯 推荐配置

部署成功后，建议：
1. 在 Vercel 设置自定义域名（可选）
2. 启用分析功能（免费）
3. 配置自动部署（推送到 GitHub 自动更新）

---

**现在开始部署吧！** 🚀

