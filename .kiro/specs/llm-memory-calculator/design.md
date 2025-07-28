# 大模型内存需求计算工具 - 设计文档

## 概述

本工具是一个基于React的单页面Web应用，提供直观的界面来计算大语言模型的GPU内存需求。应用采用现代化的组件架构，支持实时计算、结果可视化和响应式设计。

## 架构

### 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **图表库**: Chart.js + react-chartjs-2
- **状态管理**: React Hooks (useState, useEffect)
- **表单处理**: React Hook Form
- **数值计算**: 自定义计算引擎

### 项目结构
```
src/
├── components/           # React组件
│   ├── Calculator/      # 计算器主组件
│   ├── ModelInput/      # 模型参数输入
│   ├── ResultDisplay/   # 结果显示
│   ├── Charts/          # 图表组件
│   └── PresetModels/    # 预设模型选择
├── hooks/               # 自定义Hooks
├── utils/               # 工具函数
│   ├── memoryCalculator.ts  # 内存计算逻辑
│   └── modelPresets.ts      # 预设模型数据
├── types/               # TypeScript类型定义
└── constants/           # 常量定义
```

## 组件和接口

### 核心组件

#### 1. MemoryCalculator (主组件)
```typescript
interface MemoryCalculatorProps {
  // 主计算器组件，协调所有子组件
}

interface CalculatorState {
  modelParams: ModelParameters;
  calculationMode: 'inference' | 'training';
  results: MemoryCalculationResult;
  selectedPreset?: string;
}
```

#### 2. ModelInput (参数输入组件)
```typescript
interface ModelInputProps {
  onParametersChange: (params: ModelParameters) => void;
  initialParams?: ModelParameters;
}

interface ModelParameters {
  parameterCount: number;        // 参数数量 (billions)
  precision: 'fp32' | 'fp16' | 'int8' | 'int4';
  sequenceLength: number;        // 序列长度
  batchSize: number;            // 批处理大小
  hiddenSize: number;           // 隐藏层维度
  numLayers: number;            // 层数
  vocabularySize: number;       // 词汇表大小
}
```

#### 3. ResultDisplay (结果显示组件)
```typescript
interface ResultDisplayProps {
  results: MemoryCalculationResult;
  showHardwareRecommendations: boolean;
}

interface MemoryCalculationResult {
  modelWeights: number;         // 模型权重内存 (GB)
  activations: number;          // 激活值内存 (GB)
  gradients?: number;           // 梯度内存 (GB, 训练模式)
  optimizerStates?: number;     // 优化器状态内存 (GB, 训练模式)
  totalMemory: number;          // 总内存需求 (GB)
  breakdown: MemoryBreakdown;   // 详细分解
  recommendations: HardwareRecommendation[];
}
```

#### 4. MemoryChart (图表组件)
```typescript
interface MemoryChartProps {
  data: MemoryBreakdown;
  chartType: 'pie' | 'bar';
}

interface MemoryBreakdown {
  weights: number;
  activations: number;
  gradients: number;
  optimizer: number;
  labels: string[];
  colors: string[];
}
```

#### 5. PresetSelector (预设模型选择)
```typescript
interface PresetSelectorProps {
  onPresetSelect: (preset: ModelPreset) => void;
  selectedPreset?: string;
}

interface ModelPreset {
  id: string;
  name: string;
  description: string;
  parameters: ModelParameters;
  category: 'gpt' | 'llama' | 'bert' | 'other';
}
```

## 数据模型

### 内存计算公式

#### 模型权重内存
```typescript
const calculateModelWeights = (params: ModelParameters): number => {
  const bytesPerParam = getPrecisionBytes(params.precision);
  return (params.parameterCount * 1e9 * bytesPerParam) / (1024 ** 3); // GB
};

const getPrecisionBytes = (precision: string): number => {
  switch (precision) {
    case 'fp32': return 4;
    case 'fp16': return 2;
    case 'int8': return 1;
    case 'int4': return 0.5;
    default: return 4;
  }
};
```

#### 激活值内存
```typescript
const calculateActivations = (params: ModelParameters): number => {
  const {batchSize, sequenceLength, hiddenSize, numLayers} = params;
  const bytesPerActivation = getPrecisionBytes(params.precision);
  
  // 简化的激活值计算：每层的激活值大小
  const activationSize = batchSize * sequenceLength * hiddenSize * numLayers;
  return (activationSize * bytesPerActivation) / (1024 ** 3); // GB
};
```

#### 训练模式额外内存
```typescript
const calculateTrainingMemory = (modelWeights: number): {
  gradients: number;
  optimizer: number;
} => {
  return {
    gradients: modelWeights, // 梯度大小等于模型权重
    optimizer: modelWeights * 2 // Adam优化器需要2倍权重大小
  };
};
```

### 预设模型数据
```typescript
export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'gpt-3.5',
    name: 'GPT-3.5',
    description: '175B参数的GPT模型',
    parameters: {
      parameterCount: 175,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 12288,
      numLayers: 96,
      vocabularySize: 50257
    },
    category: 'gpt'
  },
  {
    id: 'llama-7b',
    name: 'LLaMA 7B',
    description: '7B参数的LLaMA模型',
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000
    },
    category: 'llama'
  }
  // 更多预设模型...
];
```

## 错误处理

### 输入验证
- 参数数量必须为正数
- 序列长度范围：1-32768
- 批处理大小范围：1-1024
- 隐藏层维度必须为正整数

### 错误状态管理
```typescript
interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorField?: string;
}

const validateModelParameters = (params: ModelParameters): ErrorState => {
  if (params.parameterCount <= 0) {
    return {
      hasError: true,
      errorMessage: '参数数量必须大于0',
      errorField: 'parameterCount'
    };
  }
  // 其他验证逻辑...
  return { hasError: false, errorMessage: '' };
};
```

## 测试策略

### 单元测试
- 内存计算函数的准确性测试
- 输入验证逻辑测试
- 组件渲染测试

### 集成测试
- 完整计算流程测试
- 预设模型加载测试
- 图表数据更新测试

### 端到端测试
- 用户交互流程测试
- 响应式设计测试
- 性能测试

### 测试工具
- **单元测试**: Jest + React Testing Library
- **端到端测试**: Playwright
- **性能测试**: Lighthouse CI

## 性能优化

### 计算优化
- 使用useMemo缓存计算结果
- 防抖输入更新以减少重复计算
- 延迟加载图表组件

### 渲染优化
- React.memo优化组件重渲染
- 虚拟化长列表（如果需要）
- 代码分割和懒加载

### 用户体验
- 加载状态指示器
- 平滑的动画过渡
- 错误边界处理

## 部署和维护

### 构建配置
- Vite构建优化
- 静态资源压缩
- 环境变量管理

### 部署策略
- 静态网站托管（Vercel/Netlify）
- CDN加速
- HTTPS支持

### 监控和分析
- 错误监控（Sentry）
- 用户行为分析
- 性能监控