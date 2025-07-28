// 精度类型
export type PrecisionType = 'fp32' | 'fp16' | 'int8' | 'int4';

// 模型类别
export type ModelCategory = 'gpt' | 'llama' | 'bert' | 'other';

// 计算模式
export type CalculationMode = 'inference' | 'training';

// 模型参数接口
export interface ModelParameters {
  parameterCount: number;        // 参数数量 (billions)
  precision: PrecisionType;      // 精度类型
  sequenceLength: number;        // 序列长度
  batchSize: number;            // 批处理大小
  hiddenSize: number;           // 隐藏层维度
  numLayers: number;            // 层数
  vocabularySize: number;       // 词汇表大小
}

// 内存分解详情
export interface MemoryBreakdown {
  weights: number;              // 权重内存 (GB)
  activations: number;          // 激活值内存 (GB)
  gradients: number;            // 梯度内存 (GB)
  optimizer: number;            // 优化器状态内存 (GB)
  labels: string[];             // 图表标签
  colors: string[];             // 图表颜色
}

// 内存计算结果
export interface MemoryCalculationResult {
  parameters: ModelParameters;  // 计算使用的参数
  inference: {
    modelWeights: number;       // 模型权重内存 (GB)
    activations: number;        // 激活值内存 (GB)
    total: number;              // 推理总内存 (GB)
  };
  training: {
    modelWeights: number;       // 模型权重内存 (GB)
    activations: number;        // 激活值内存 (GB)
    gradients: number;          // 梯度内存 (GB)
    optimizerStates: number;    // 优化器状态内存 (GB)
    total: number;              // 训练总内存 (GB)
  };
  recommendations?: HardwareRecommendation[];
}

// 硬件推荐
export interface HardwareRecommendation {
  id: string;
  name: string;                 // GPU名称
  memorySize: number;           // 显存大小 (GB)
  price: number;                // 价格 (USD)
  suitable: boolean;            // 是否适合
  multiCardRequired: number;    // 需要的卡数
  efficiency: 'high' | 'medium' | 'low';  // 效率评级
  description: string;          // 推荐说明
}

// 预设模型配置
export interface ModelPreset {
  id: string;
  name: string;                 // 模型名称
  description: string;          // 模型描述
  parameters: ModelParameters;  // 模型参数
  category: ModelCategory;      // 模型类别
  popular?: boolean;            // 是否为热门模型
}

// 错误状态
export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorField?: string;
}

// 计算器状态
export interface CalculatorState {
  modelParams: ModelParameters;
  calculationMode: CalculationMode;
  results: MemoryCalculationResult | null;
  selectedPreset?: string;
  isCalculating: boolean;
  error: ErrorState;
}

// 图表数据类型
export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }[];
}

// 批处理优化结果
export interface BatchOptimizationResult {
  optimalBatchSize: number;
  memoryUsage: number;          // 内存使用量 (GB)
  throughputEstimate?: number;
  warning?: string;
}