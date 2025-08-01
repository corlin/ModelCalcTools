# 大模型内存估算器 | LLM Memory Estimator

一个基于 React + TypeScript 的大语言模型 GPU 内存需求估算工具，帮助 AI 研究者和开发者准确估算运行不同大模型所需的硬件资源。

## ✨ 功能特性

### 🧮 精确内存计算
- **多精度支持**: FP32、FP16、INT8、INT4 量化精度
- **双模式计算**: 推理模式和训练模式
- **详细分解**: 模型权重、激活值、梯度、优化器状态内存分析
- **实时验证**: 参数输入实时验证和错误提示

### 📊 可视化展示
- **交互式图表**: 饼图、柱状图、折线图多种展示方式
- **内存分解**: 直观显示各部分内存占用比例
- **响应式设计**: 支持桌面和移动设备

### 🎯 预设模型
- **热门模型**: GPT、LLaMA、ChatGLM、Baichuan 等主流模型
- **分类筛选**: 按模型类型和参数规模筛选
- **一键应用**: 快速加载预设参数

### ⚡ 批量优化
- **批次大小优化**: 自动推荐最优批次大小
- **性能分析**: 内存使用效率和吞吐量分析
- **可视化对比**: 不同配置的性能对比图表

### 🖥️ 硬件推荐
- **GPU 推荐**: 基于内存需求推荐合适的 GPU 型号
- **成本分析**: 不同硬件配置的成本效益分析
- **对比表格**: 详细的硬件规格和价格对比

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装依赖
```bash
npm install
# 或
yarn install
```

### 开发模式
```bash
npm run dev
# 或
yarn dev
```

访问 `http://localhost:5173` 查看应用

### 构建生产版本
```bash
npm run build
# 或
yarn build
```

### 运行测试
```bash
# 运行所有测试
npm run test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

## 🏗️ 项目结构

```
src/
├── components/                 # React 组件
│   ├── ModelInput/            # 模型参数输入组件
│   ├── PresetSelector/        # 预设模型选择器
│   ├── ResultDisplay/         # 结果显示组件
│   ├── MemoryChart/           # 内存图表组件
│   ├── BatchOptimizer/        # 批量优化组件
│   └── HardwareRecommendation/ # 硬件推荐组件
├── utils/                     # 工具函数
│   ├── memoryCalculator.ts    # 内存计算核心逻辑
│   ├── modelPresets.ts        # 预设模型数据
│   ├── validation.ts          # 参数验证
│   └── formatters.ts          # 数据格式化
├── types/                     # TypeScript 类型定义
├── constants/                 # 常量定义
└── __tests__/                # 测试文件
```

## 🧪 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 4
- **图表库**: Chart.js + react-chartjs-2
- **表单处理**: React Hook Form
- **测试框架**: Jest + React Testing Library
- **代码规范**: ESLint + TypeScript

## 📖 使用指南

### 基本使用
1. **输入模型参数**: 在左侧面板输入模型参数数量、精度类型、序列长度等
2. **选择计算模式**: 选择推理模式或训练模式
3. **查看结果**: 右侧显示详细的内存需求分析
4. **可视化**: 切换到图表视图查看内存分布

### 预设模型
1. 点击"选择预设模型"按钮
2. 浏览或搜索想要的模型
3. 点击模型卡片自动填充参数

### 批量优化
1. 切换到"批量优化"标签
2. 设置目标 GPU 内存限制
3. 查看推荐的批次大小和性能分析

### 硬件推荐
1. 切换到"硬件推荐"标签
2. 查看基于当前配置的 GPU 推荐
3. 对比不同硬件的成本效益

## 🔧 配置说明

### 支持的模型精度
- **FP32**: 32位浮点数 (4 bytes/param)
- **FP16**: 16位浮点数 (2 bytes/param)  
- **INT8**: 8位整数 (1 byte/param)
- **INT4**: 4位整数 (0.5 bytes/param)

### 内存计算公式
- **模型权重**: `参数数量 × 精度字节数`
- **激活值**: `批次大小 × 序列长度 × 隐藏层维度 × 层数 × 精度字节数`
- **梯度**: `模型权重内存` (仅训练模式)
- **优化器状态**: `模型权重内存 × 2` (仅训练模式，Adam优化器)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Chart.js](https://www.chartjs.org/) - 图表可视化
- [React Hook Form](https://react-hook-form.com/) - 表单处理
- [Vite](https://vitejs.dev/) - 构建工具
