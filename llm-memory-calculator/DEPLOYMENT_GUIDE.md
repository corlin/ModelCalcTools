# 部署指南

本项目支持两种 Cloudflare 部署方式：**Workers** 和 **Pages**。每种方式都有其优势和适用场景。

## 🚀 部署选项对比

| 特性 | Cloudflare Workers | Cloudflare Pages |
|------|-------------------|------------------|
| **适用场景** | 需要服务端逻辑的动态应用 | 静态网站和 SPA |
| **性能** | 边缘计算，超低延迟 | CDN 分发，快速加载 |
| **复杂度** | 中等（需要 Worker 脚本） | 简单（直接部署静态文件） |
| **成本** | 按请求计费 | 免费额度更高 |
| **自动部署** | 支持 | 支持（Git 集成） |
| **自定义域名** | 支持 | 支持 |
| **环境变量** | 支持 | 支持 |

## 📦 Cloudflare Pages 部署（推荐）

### 优势
- ✅ 简单易用，适合静态 React 应用
- ✅ 免费额度高（每月 500 次构建，无限带宽）
- ✅ 自动 Git 集成，推送即部署
- ✅ 内置预览环境
- ✅ 自动 HTTPS 和全球 CDN

### 快速开始

#### 方法 1: Git 集成（推荐）
1. 将代码推送到 GitHub/GitLab
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 Pages 页面，点击 "Create a project"
4. 连接你的 Git 仓库
5. 配置构建设置：
   - **构建命令**: `npm run build`
   - **构建输出目录**: `dist`
   - **Node.js 版本**: `20`

#### 方法 2: 命令行部署
```bash
# 构建项目
npm run pages:build

# 预览构建结果
npm run pages:preview

# 部署到 Pages
npm run pages:deploy
```

#### 方法 3: 手动上传
```bash
# 构建项目
npm run build

# 将 dist/ 目录拖拽到 Cloudflare Pages Dashboard
```

### 环境变量配置
在 Cloudflare Pages 设置中添加：
- `NODE_ENV`: `production`
- `VITE_APP_TITLE`: `LLM Memory Calculator`
- `VITE_APP_VERSION`: `1.0.0`

## ⚡ Cloudflare Workers 部署

### 优势
- ✅ 支持服务端逻辑和 API
- ✅ 边缘计算，全球低延迟
- ✅ 可以处理动态内容
- ✅ 支持数据库和存储集成

### 快速开始

```bash
# 测试 Worker 配置
npm run worker:test

# 本地开发
npm run worker:dev

# 部署到 Workers
npm run worker:deploy
```

### 首次部署设置
1. 安装 Wrangler CLI（已包含在项目中）
2. 登录 Cloudflare 账户：
   ```bash
   npx wrangler auth login
   ```
3. 部署 Worker：
   ```bash
   npm run worker:deploy
   ```

## 🔧 测试部署

### Pages 测试
```bash
# 测试 Pages 配置
npm run pages:test

# 本地预览 Pages
npm run pages:preview
```

### Workers 测试
```bash
# 测试 Worker 配置
npm run worker:test

# 本地开发 Worker
npm run worker:dev

# 测试 Worker 端点
npm run worker:test-endpoints
```

## 🌐 自定义域名

### Pages 自定义域名
1. 在 Cloudflare Pages 项目设置中
2. 点击 "Custom domains"
3. 添加你的域名
4. 按照指示配置 DNS

### Workers 自定义域名
1. 在 `wrangler.toml` 中添加路由：
   ```toml
   [[routes]]
   pattern = "your-domain.com/*"
   zone_name = "your-domain.com"
   ```
2. 重新部署 Worker

## 📊 监控和分析

### Pages 分析
- 访问 Cloudflare Pages Dashboard
- 查看访问统计和性能指标
- 监控构建历史

### Workers 分析
- 访问 Cloudflare Workers Dashboard
- 查看请求统计和错误日志
- 监控性能指标

## 🚨 故障排除

### 常见问题

#### Pages 构建失败
- 检查 Node.js 版本（推荐 18+）
- 确认构建命令正确
- 检查环境变量配置

#### Workers 部署失败
- 确认已登录 Cloudflare 账户
- 检查 `wrangler.toml` 配置
- 验证 Worker 脚本语法

#### 域名配置问题
- 确认 DNS 记录正确
- 等待 DNS 传播（最多 24 小时）
- 检查 SSL 证书状态

## 💡 最佳实践

1. **选择合适的部署方式**
   - 纯静态应用 → Pages
   - 需要服务端逻辑 → Workers

2. **使用环境变量**
   - 不要在代码中硬编码配置
   - 为不同环境设置不同的变量

3. **监控和优化**
   - 定期检查性能指标
   - 优化资源大小和加载速度
   - 设置适当的缓存策略

4. **安全考虑**
   - 启用 HTTPS
   - 配置安全头
   - 定期更新依赖

## 📞 获取帮助

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)