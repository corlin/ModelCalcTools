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

#### 5. PresetSelector (预设模型选择) - 优化版本
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
  category: 'gpt' | 'llama' | 'bert' | 'deepseek' | 'other';
  popular?: boolean;
  tags?: string[];  // 新增：用于搜索和筛选的标签
}

interface PresetSelectorState {
  searchQuery: string;
  selectedCategory: string | 'all';
  showPopularOnly: boolean;
  sortBy: 'name' | 'parameters' | 'category';
}

// 新增搜索和筛选功能
interface ModelSearchFilters {
  query: string;
  category?: string;
  popularOnly?: boolean;
  parameterRange?: {
    min: number;
    max: number;
  };
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
  // DeepSeek系列 - 新增
  {
    id: 'deepseek-r1',
    name: 'DeepSeek-R1',
    description: '671B参数的DeepSeek推理优化模型，支持复杂推理任务',
    parameters: {
      parameterCount: 671,
      precision: 'fp16',
      sequenceLength: 8192,
      batchSize: 1,
      hiddenSize: 11008,
      numLayers: 64,
      vocabularySize: 102400
    },
    category: 'other',
    popular: true
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    name: 'DeepSeek-R1-Distill-Qwen-32B',
    description: '32B参数的DeepSeek蒸馏模型，基于Qwen架构优化',
    parameters: {
      parameterCount: 32,
      precision: 'fp16',
      sequenceLength: 8192,
      batchSize: 1,
      hiddenSize: 5120,
      numLayers: 64,
      vocabularySize: 151936
    },
    category: 'other',
    popular: true
  },
  // GPT系列
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

## 优化的预设模型选择界面设计

### 界面布局
```typescript
interface EnhancedPresetSelectorLayout {
  searchBar: {
    placeholder: string;
    debounceMs: number;
    clearButton: boolean;
  };
  filterPanel: {
    categoryFilter: boolean;
    popularToggle: boolean;
    parameterRangeSlider: boolean;
    sortOptions: string[];
  };
  modelGrid: {
    itemsPerPage: number;
    virtualScrolling: boolean;
    cardLayout: 'compact' | 'detailed';
  };
}
```

### 搜索功能实现
```typescript
const useModelSearch = (models: ModelPreset[], filters: ModelSearchFilters) => {
  return useMemo(() => {
    return models.filter(model => {
      // 文本搜索
      const matchesQuery = !filters.query || 
        model.name.toLowerCase().includes(filters.query.toLowerCase()) ||
        model.description.toLowerCase().includes(filters.query.toLowerCase()) ||
        model.tags?.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()));
      
      // 类别筛选
      const matchesCategory = !filters.category || 
        filters.category === 'all' || 
        model.category === filters.category;
      
      // 热门筛选
      const matchesPopular = !filters.popularOnly || model.popular;
      
      // 参数范围筛选
      const matchesParameterRange = !filters.parameterRange ||
        (model.parameters.parameterCount >= filters.parameterRange.min &&
         model.parameters.parameterCount <= filters.parameterRange.max);
      
      return matchesQuery && matchesCategory && matchesPopular && matchesParameterRange;
    });
  }, [models, filters]);
};
```

### DeepSeek模型特殊处理
```typescript
const DEEPSEEK_MODELS = {
  'deepseek-r1': {
    specialFeatures: ['推理优化', '大规模参数', '高性能'],
    recommendedUseCase: '复杂推理任务、代码生成、数学问题求解',
    memoryOptimization: 'fp16精度下优化内存使用'
  },
  'deepseek-r1-distill-qwen-32b': {
    specialFeatures: ['蒸馏优化', '高效推理', 'Qwen架构'],
    recommendedUseCase: '资源受限环境、快速推理、生产部署',
    memoryOptimization: '相比原版模型显著减少内存需求'
  }
};
```

## 性能优化

### 计算优化
- 使用useMemo缓存计算结果
- 防抖输入更新以减少重复计算
- 延迟加载图表组件

### 渲染优化
- React.memo优化组件重渲染
- 虚拟化长列表（模型选择器）
- 代码分割和懒加载

### 用户体验
- 加载状态指示器
- 平滑的动画过渡
- 错误边界处理
- 搜索结果高亮显示

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