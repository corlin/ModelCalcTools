# LLM Memory Calculator - 部署文档

## 🎉 部署能力已就绪

本项目现在支持两种 Cloudflare 部署方式，配置完整，可以立即部署！

## 🚀 快速部署

### 方式一：Cloudflare Pages（推荐）
```bash
# 1. 构建项目
npm run pages:build

# 2. 本地预览（可选）
npm run pages:preview

# 3. 部署到 Pages
npm run pages:deploy
```

### 方式二：Cloudflare Workers
```bash
# 1. 本地测试
npm run worker:dev

# 2. 部署到 Workers
npm run worker:deploy
```

## 📋 完整功能清单

### ✅ Cloudflare Pages 支持
- 🟢 **静态构建**: 优化的 React 应用构建
- 🟢 **SPA 路由**: 自动重定向配置
- 🟢 **缓存策略**: 智能缓存头配置
- 🟢 **环境变量**: 生产和预览环境支持
- 🟢 **本地预览**: 本地开发服务器
- 🟢 **构建信息**: 自动生成构建元数据

### ✅ Cloudflare Workers 支持
- 🟢 **Worker 脚本**: 完整的请求处理逻辑
- 🟢 **健康检查**: `/health` 端点
- 🟢 **环境变量**: 生产环境配置
- 🟢 **本地开发**: 热重载开发服务器
- 🟢 **TypeScript**: 完整类型支持
- 🟢 **错误处理**: 完善的错误处理机制

### ✅ 开发工具
- 🟢 **测试脚本**: 配置验证和端点测试
- 🟢 **构建脚本**: 自动化构建流程
- 🟢 **部署脚本**: 一键部署命令
- 🟢 **文档**: 完整的部署指南

## 🛠️ 可用命令

### 测试命令
```bash
npm run worker:test           # 测试 Worker 配置
npm run pages:test           # 测试 Pages 配置
npm run worker:test-endpoints # 测试 Worker 端点
```

### 开发命令
```bash
npm run worker:dev           # Worker 本地开发
npm run pages:preview        # Pages 本地预览
```

### 构建命令
```bash
npm run build               # 标准构建
npm run worker:build        # Worker 构建
npm run pages:build         # Pages 构建（含优化）
```

### 部署命令
```bash
npm run worker:deploy       # 部署到 Workers
npm run pages:deploy        # 部署到 Pages
```

## 📊 项目结构

```
llm-memory-calculator/
├── src/
│   ├── worker.ts           # Worker 入口脚本
│   └── ...                 # React 应用源码
├── scripts/
│   ├── build-pages.cjs     # Pages 构建脚本
│   ├── test-worker.cjs     # Worker 测试脚本
│   ├── test-pages.cjs      # Pages 测试脚本
│   └── test-worker-endpoints.cjs
├── dist/                   # 构建输出
│   ├── _headers           # Pages 缓存配置
│   ├── _redirects         # Pages 路由配置
│   └── build-info.json    # 构建信息
├── wrangler.toml          # Worker 配置
├── pages.toml             # Pages 配置
├── tsconfig.worker.json   # Worker TypeScript 配置
└── 部署文档/
    ├── DEPLOYMENT_GUIDE.md    # 详细部署指南
    ├── DEPLOYMENT_STATUS.md   # 部署状态
    └── WORKER_SETUP.md        # Worker 设置文档
```

## 🌐 部署后访问

### Pages 部署
- **生产环境**: `https://llm-memory-calculator.pages.dev`
- **预览环境**: 每个 PR 自动生成预览链接

### Workers 部署
- **生产环境**: `https://llm-memory-calculator.your-subdomain.workers.dev`
- **健康检查**: `https://your-worker-url.com/health`

## 🔧 环境配置

### Pages 环境变量
在 Cloudflare Pages 设置中配置：
```
NODE_ENV=production
VITE_APP_TITLE=LLM Memory Calculator
VITE_APP_VERSION=1.0.0
```

### Workers 环境变量
在 `wrangler.toml` 中已配置：
```toml
[vars]
NODE_ENV = "production"
```

## 📈 性能优化

### Pages 优化
- ✅ 静态资源缓存（1年）
- ✅ HTML 缓存策略（实时更新）
- ✅ Gzip 压缩
- ✅ CDN 全球分发

### Workers 优化
- ✅ 边缘计算
- ✅ 全球低延迟
- ✅ 自动扩缩容

## 🚨 注意事项

1. **首次部署需要 Cloudflare 账户**
   ```bash
   npx wrangler auth login
   ```

2. **Pages Git 集成（推荐）**
   - 连接 GitHub/GitLab 仓库
   - 自动构建和部署
   - 预览环境支持

3. **自定义域名**
   - Pages: 在 Dashboard 中配置
   - Workers: 在 `wrangler.toml` 中添加路由

## 🎯 推荐部署流程

### 🥇 最佳选择：Pages + Git 集成
1. 推送代码到 GitHub
2. 在 Cloudflare Pages 连接仓库
3. 自动构建和部署
4. 享受自动预览和生产环境

### 🥈 快速部署：Pages 命令行
```bash
npm run pages:build && npm run pages:deploy
```

### 🥉 高级用户：Workers
```bash
npm run worker:deploy
```

## 📞 获取帮助

- 📖 [详细部署指南](./DEPLOYMENT_GUIDE.md)
- 📊 [部署状态](./DEPLOYMENT_STATUS.md)
- 🔧 [Worker 设置](./WORKER_SETUP.md)
- 🌐 [Cloudflare 文档](https://developers.cloudflare.com/)

---

**🎉 恭喜！你的 LLM Memory Calculator 现在可以部署到 Cloudflare 了！**