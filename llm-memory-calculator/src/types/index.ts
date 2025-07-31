// 精度类型
export type PrecisionType = 'fp32' | 'fp16' | 'int8' | 'int4';

// 模型类别
export type ModelCategory = 'gpt' | 'llama' | 'bert' | 'deepseek' | 'other';

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
  utilizationDetails?: {        // 利用率详情
    theoreticalUtilization: number;
    practicalUtilization: number;
    fragmentationLoss: number;
    systemOverhead: number;
    safetyBuffer: number;
    recommendations: string[];
    efficiency: 'high' | 'medium' | 'low';
    details: {
      totalMemoryNeeded: number;
      availableMemory: number;
      wastedMemory: number;
      utilizationScore: number;
    };
  };
  multiCardDetails?: {          // 多卡配置详情
    totalEffectiveMemory: number;
    communicationOverhead: number;
    loadBalancingEfficiency: number;
    scalingFactor: number;
    optimalCardCount: number;
    perCardUtilization: number[];
    recommendations: string[];
    costEfficiency: number;
  };
}

// GPU制造商类型
export type GPUManufacturer = 'nvidia' | 'amd' | 'intel';

// GPU效率评级类型
export type GPUEfficiency = 'high' | 'medium' | 'low';

// GPU可用性状态
export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

// GPU库存水平
export type StockLevel = 'high' | 'medium' | 'low' | 'out_of_stock';

// 价格信息接口
export interface PriceInfo {
  msrp: number;                 // 官方定价
  currentPrice: number;         // 当前市场价格
  priceHistory?: PricePoint[];  // 价格历史
  regionPrices?: Record<string, number>; // 地区价格
  currency: string;
  lastUpdated: Date;
}

// 价格历史点
export interface PricePoint {
  date: Date;
  price: number;
  source?: string;
}

// 可用性信息接口
export interface AvailabilityInfo {
  status: AvailabilityStatus;
  leadTime: number;             // 交货时间（天）
  stockLevel: StockLevel;
  lastChecked?: Date;
}

// 基准测试数据接口
export interface BenchmarkData {
  llmInference: {
    tokensPerSecond: number;
    memoryEfficiency: number;   // 0-1
    powerEfficiency: number;    // tokens/watt
  };
  llmTraining: {
    samplesPerSecond: number;
    gradientThroughput: number;
    memoryUtilization: number;
  };
  syntheticBenchmarks: {
    fp16Performance: number;    // TFLOPS
    int8Performance: number;    // TOPS
    memoryBandwidthUtilization: number;
  };
  testConditions: {
    modelSize: string;
    batchSize: number;
    sequenceLength: number;
    precision: string;
    framework: string;
  };
}

// 扩展的基准测试数据接口
export interface ExtendedBenchmarkData extends BenchmarkData {
  credibilityScore: number;
  dataSource: string;
  verified: boolean;
  testDate: Date;
  additionalMetrics?: {
    latencyP50?: number;        // 50th percentile latency (ms)
    latencyP95?: number;        // 95th percentile latency (ms)
    throughputVariance?: number; // 吞吐量方差
    temperatureStability?: number; // 温度稳定性评分
  };
}

// 效率评级接口
export interface EfficiencyRating {
  overall: number;              // 0-100 综合评分
  performance: number;          // 性能评分
  efficiency: number;           // 效率评分
  costEffectiveness: number;    // 成本效益评分
  powerEfficiency: number;      // 功耗效率评分
  reliability: number;          // 可靠性评分
  breakdown?: RatingBreakdown;
  confidence: number;           // 评分可信度
}

// 评级分解
export interface RatingBreakdown {
  computePerformance: {
    score: number;
    weight: number;
    factors: string[];
  };
  memoryPerformance: {
    score: number;
    weight: number;
    factors: string[];
  };
  powerEfficiency: {
    score: number;
    weight: number;
    factors: string[];
  };
  costEffectiveness: {
    score: number;
    weight: number;
    factors: string[];
  };
}

// 增强的GPU硬件接口
export interface EnhancedGPUHardware {
  id: string;
  name: string;
  manufacturer: GPUManufacturer;
  architecture: string;
  memorySize: number;           // GB
  memoryType: string;           // GDDR6X, HBM2e, etc.
  memoryBandwidth: number;      // GB/s
  computeUnits: number;         // CUDA cores, Stream processors
  baseClock: number;            // MHz
  boostClock: number;           // MHz
  tdp: number;                  // Watts
  price: PriceInfo;
  availability: AvailabilityInfo;
  efficiency: EfficiencyRating;
  benchmarks: BenchmarkData;
  lastUpdated: Date;
  dataSource: string;
  verified: boolean;
}

// GPU数据验证结果
export interface GPUValidationResult {
  isValid: boolean;
  errors: GPUValidationError[];
  warnings: string[];
  confidence: number;           // 数据可信度 0-1
}

// GPU数据验证错误
export interface GPUValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  expectedRange?: { min: number; max: number };
  actualValue?: any;
}

// GPU数据更新接口
export interface GPUUpdate {
  id: string;
  field: keyof EnhancedGPUHardware;
  value: any;
  source: string;
  timestamp: Date;
}

// 预设模型配置
export interface ModelPreset {
  id: string;
  name: string;                 // 模型名称
  description: string;          // 模型描述
  parameters: ModelParameters;  // 模型参数
  category: ModelCategory;      // 模型类别
  popular?: boolean;            // 是否为热门模型
  tags?: string[];              // 标签，用于搜索和筛选
  recommendedUseCase?: string;  // 推荐用例
  specialFeatures?: string[];   // 特殊功能标签
}

// 错误状态
export interface ErrorState {
  hasError: boolean;
  errorMessage: string;
  errorField?: string;
}

// 批处理优化错误类型
export type BatchOptimizationErrorCode = 
  | 'INVALID_PARAMS' 
  | 'CALCULATION_FAILED' 
  | 'NO_FEASIBLE_SOLUTION'
  | 'MEMORY_LIMIT_TOO_LOW'
  | 'SAFETY_MARGIN_INVALID';

// 批处理优化错误
export class BatchOptimizationError extends Error {
  constructor(
    message: string,
    public code: BatchOptimizationErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'BatchOptimizationError';
  }
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

// 批处理大小分析数据点
export interface BatchAnalysisPoint {
  batchSize: number;
  memoryUsage: number;          // GB
  utilizationRate: number;      // 0-1
  withinLimit: boolean;
  safetyMarginExceeded: boolean;
  estimatedThroughput?: number; // tokens/s
  memoryBreakdown?: {
    weights: number;
    activations: number;
    gradients?: number;
    optimizer?: number;
  };
}

// 性能估算
export interface PerformanceEstimate {
  throughputImprovement: number; // 相对于当前配置的改进百分比
  memoryEfficiency: number;      // 内存效率评分 (0-100)
  recommendedForTraining: boolean;
  recommendedForInference: boolean;
}

// 优化验证结果
export interface OptimizationValidation {
  isValid: boolean;
  errorMessage?: string;
  warnings: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low'; // 结果可信度
}

// 批处理优化结果
export interface BatchOptimizationResult {
  optimalBatchSize: number;
  memoryUsage: number;          // GB
  utilizationRate: number;      // 0-1
  analysisData: BatchAnalysisPoint[];
  warnings: string[];
  recommendations: string[];
  performanceEstimate?: PerformanceEstimate;
  validation: OptimizationValidation;
  safetyMargin: number;         // 使用的安全边距
  maxMemoryLimit: number;       // 最大内存限制
}

// 标准化利用率计算结果
export interface StandardizedUtilizationResult {
  theoreticalUtilization: number;    // 0-1 范围
  practicalUtilization: number;      // 0-1 范围，可能>1表示不足
  utilizationPercentage: number;     // 0-100+ 范围，用于显示
  isOverCapacity: boolean;           // 是否超出容量
  efficiencyRating: 'excellent' | 'good' | 'fair' | 'poor';
}

// 利用率计算配置
export interface UtilizationConfig {
  systemReservedMemory: number;      // 系统保留内存 (GB)
  driverOverhead: number;            // 驱动开销 (GB)
  memoryFragmentationFactor: number; // 内存碎片化因子 (0-1)
}

// 内存分解项
export interface MemoryBreakdownItem {
  label: string;
  valueBytes: number;
  percentage: number;
  color: string;
  description: string;
}

// 标准化内存数据
export interface StandardizedMemoryData {
  totalBytes: number;           // 统一使用bytes作为基准单位
  breakdown: {
    weightsBytes: number;
    activationsBytes: number;
    gradientsBytes?: number;
    optimizerBytes?: number;
  };
  utilization: StandardizedUtilizationResult;
  metadata: {
    calculationMode: CalculationMode;
    timestamp: Date;
    version: string;
  };
}

// 内存显示属性
export interface MemoryDisplayProps {
  memoryData: StandardizedMemoryData;
  gpuMemoryBytes: number;
  displayOptions?: {
    showPercentages: boolean;
    showAbsoluteValues: boolean;
    precision: number;
  };
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 内存显示降级策略
export interface MemoryDisplayFallback {
  showPlaceholder: boolean;
  placeholderText: string;
  errorMessage: string;
  retryAction: () => void;
}

// 利用率显示降级策略
export interface UtilizationDisplayFallback {
  utilizationPercentage: number;
  status: 'unknown' | 'error' | 'loading';
  message: string;
}