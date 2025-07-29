import { PrecisionType, ModelCategory } from '../types';

// 精度对应的字节数
export const PRECISION_BYTES: Record<PrecisionType, number> = {
  fp32: 4,
  fp16: 2,
  int8: 1,
  int4: 0.5,
};

// 精度显示名称
export const PRECISION_LABELS: Record<PrecisionType, string> = {
  fp32: 'FP32 (32位浮点)',
  fp16: 'FP16 (16位浮点)',
  int8: 'INT8 (8位整数)',
  int4: 'INT4 (4位整数)',
};

// 模型类别显示名称
export const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
  gpt: 'GPT系列',
  llama: 'LLaMA系列',
  bert: 'BERT系列',
  deepseek: 'DeepSeek系列',
  other: '其他模型',
};

// 默认模型参数
export const DEFAULT_MODEL_PARAMS = {
  parameterCount: 7,
  precision: 'fp16' as PrecisionType,
  sequenceLength: 2048,
  batchSize: 1,
  hiddenSize: 4096,
  numLayers: 32,
  vocabularySize: 32000,
};

// 参数验证范围
export const VALIDATION_RANGES = {
  parameterCount: { min: 0.1, max: 1000 },
  sequenceLength: { min: 1, max: 32768 },
  batchSize: { min: 1, max: 1024 },
  hiddenSize: { min: 64, max: 32768 },
  numLayers: { min: 1, max: 200 },
  vocabularySize: { min: 1000, max: 200000 },
};

// 图表颜色配置
export const CHART_COLORS = {
  weights: '#3b82f6',      // 蓝色
  activations: '#10b981',  // 绿色
  gradients: '#f59e0b',    // 橙色
  optimizer: '#ef4444',    // 红色
};

// 图表标签
export const CHART_LABELS = {
  weights: '模型权重',
  activations: '激活值',
  gradients: '梯度',
  optimizer: '优化器状态',
};

// GPU硬件数据
export const GPU_HARDWARE = [
  {
    id: 'rtx-4090',
    name: 'RTX 4090',
    memorySize: 24,
    price: 1599,
    efficiency: 'high' as const,
  },
  {
    id: 'rtx-4080',
    name: 'RTX 4080',
    memorySize: 16,
    price: 1199,
    efficiency: 'high' as const,
  },
  {
    id: 'rtx-3090',
    name: 'RTX 3090',
    memorySize: 24,
    price: 999,
    efficiency: 'medium' as const,
  },
  {
    id: 'a100-40gb',
    name: 'A100 40GB',
    memorySize: 40,
    price: 10000,
    efficiency: 'high' as const,
  },
  {
    id: 'a100-80gb',
    name: 'A100 80GB',
    memorySize: 80,
    price: 15000,
    efficiency: 'high' as const,
  },
  {
    id: 'h100',
    name: 'H100',
    memorySize: 80,
    price: 25000,
    efficiency: 'high' as const,
  },
  {
    id: 'v100',
    name: 'V100',
    memorySize: 32,
    price: 8000,
    efficiency: 'medium' as const,
  },
];

// 内存单位转换
export const MEMORY_UNITS = {
  BYTES_TO_GB: 1024 ** 3,
  BYTES_TO_MB: 1024 ** 2,
  GB_TO_BYTES: 1024 ** 3,
  MB_TO_BYTES: 1024 ** 2,
};

// 优化器内存倍数（相对于模型权重）
export const OPTIMIZER_MEMORY_MULTIPLIERS = {
  adam: 2,      // Adam优化器需要2倍权重大小（动量+方差）
  sgd: 1,       // SGD只需要1倍权重大小（动量）
  adamw: 2,     // AdamW类似Adam
};

// 错误消息
export const ERROR_MESSAGES = {
  INVALID_PARAMETER_COUNT: '参数数量必须在0.1B到1000B之间',
  INVALID_SEQUENCE_LENGTH: '序列长度必须在1到32768之间',
  INVALID_BATCH_SIZE: '批处理大小必须在1到1024之间',
  INVALID_HIDDEN_SIZE: '隐藏层维度必须在64到32768之间',
  INVALID_NUM_LAYERS: '层数必须在1到200之间',
  INVALID_VOCABULARY_SIZE: '词汇表大小必须在1000到200000之间',
  CALCULATION_ERROR: '计算过程中发生错误',
  NETWORK_ERROR: '网络请求失败',
};

// 计算常量
export const CALCULATION_CONSTANTS = {
  // 激活值计算中的安全系数
  ACTIVATION_SAFETY_FACTOR: 1.2,
  // KV缓存的额外内存系数（已废弃，直接在计算中使用2）
  KV_CACHE_FACTOR: 2,
  // 中间激活值的估算系数（前馈网络通常是4倍隐藏维度）
  INTERMEDIATE_ACTIVATION_FACTOR: 4,
};

// 批处理优化默认配置
export const BATCH_OPTIMIZATION_DEFAULTS = {
  MAX_MEMORY_GB: 48,           // 默认最大内存
  SAFETY_MARGIN: 0.9,          // 安全边距
  MAX_BATCH_SIZE: 128,         // 最大批处理大小
  MIN_BATCH_SIZE: 1,           // 最小批处理大小
  MEMORY_STEP_SIZE: 2,         // 内存步长
};

// GPU内存配置
export const GPU_MEMORY_CONFIGS = {
  RTX_4090: 24,
  A100_40GB: 40,
  A100_80GB: 80,
  H100: 80,
  DEFAULT: 48,                 // 默认配置
};