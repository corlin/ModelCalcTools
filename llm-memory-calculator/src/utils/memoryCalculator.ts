import { 
  ModelParameters, 
  MemoryCalculationResult, 
  MemoryBreakdown,
  CalculationMode,
  HardwareRecommendation 
} from '../types';
import { 
  PRECISION_BYTES, 
  MEMORY_UNITS, 
  OPTIMIZER_MEMORY_MULTIPLIERS,
  CALCULATION_CONSTANTS,
  GPU_HARDWARE,
  CHART_COLORS,
  CHART_LABELS
} from '../constants';

/**
 * 计算模型权重内存需求
 * @param params 模型参数
 * @returns 权重内存大小 (GB)
 */
export function calculateModelWeights(params: ModelParameters): number {
  const bytesPerParam = PRECISION_BYTES[params.precision];
  const totalBytes = params.parameterCount * 1e9 * bytesPerParam;
  return totalBytes / MEMORY_UNITS.BYTES_TO_GB;
}

/**
 * 计算激活值内存需求
 * @param params 模型参数
 * @returns 激活值内存大小 (GB)
 */
export function calculateActivations(params: ModelParameters): number {
  const { batchSize, sequenceLength, hiddenSize, numLayers } = params;
  const bytesPerActivation = PRECISION_BYTES[params.precision];
  
  // 基础激活值：每层的隐藏状态
  const hiddenStates = batchSize * sequenceLength * hiddenSize * numLayers;
  
  // 注意力机制的KV缓存
  const kvCache = batchSize * sequenceLength * hiddenSize * numLayers * CALCULATION_CONSTANTS.KV_CACHE_FACTOR;
  
  // 中间激活值（前馈网络等）
  const intermediateActivations = hiddenStates * CALCULATION_CONSTANTS.INTERMEDIATE_ACTIVATION_FACTOR;
  
  // 总激活值大小
  const totalActivations = (hiddenStates + kvCache + intermediateActivations) * bytesPerActivation;
  
  // 应用安全系数
  return (totalActivations * CALCULATION_CONSTANTS.ACTIVATION_SAFETY_FACTOR) / MEMORY_UNITS.BYTES_TO_GB;
}

/**
 * 计算梯度内存需求（训练模式）
 * @param modelWeights 模型权重内存大小 (GB)
 * @returns 梯度内存大小 (GB)
 */
export function calculateGradients(modelWeights: number): number {
  // 梯度大小等于模型权重大小
  return modelWeights;
}

/**
 * 计算优化器状态内存需求（训练模式）
 * @param modelWeights 模型权重内存大小 (GB)
 * @param optimizerType 优化器类型
 * @returns 优化器状态内存大小 (GB)
 */
export function calculateOptimizerStates(
  modelWeights: number, 
  optimizerType: keyof typeof OPTIMIZER_MEMORY_MULTIPLIERS = 'adam'
): number {
  const multiplier = OPTIMIZER_MEMORY_MULTIPLIERS[optimizerType];
  return modelWeights * multiplier;
}

/**
 * 生成硬件推荐
 * @param totalMemory 总内存需求 (GB)
 * @returns 硬件推荐列表
 */
export function generateHardwareRecommendations(totalMemory: number): HardwareRecommendation[] {
  const recommendations: HardwareRecommendation[] = [];
  
  GPU_HARDWARE.forEach(gpu => {
    const suitable = gpu.memorySize >= totalMemory;
    const multiCardRequired = suitable ? 1 : Math.ceil(totalMemory / gpu.memorySize);
    
    let description = '';
    if (suitable) {
      const memoryUtilization = (totalMemory / gpu.memorySize * 100).toFixed(1);
      description = `单卡可运行，内存利用率 ${memoryUtilization}%`;
    } else {
      description = `需要 ${multiCardRequired} 张卡并行运行`;
    }
    
    recommendations.push({
      id: gpu.id,
      name: gpu.name,
      memorySize: gpu.memorySize,
      price: gpu.price,
      suitable,
      multiCardRequired,
      efficiency: gpu.efficiency,
      description
    });
  });
  
  // 按适用性和效率排序
  return recommendations.sort((a, b) => {
    if (a.suitable && !b.suitable) return -1;
    if (!a.suitable && b.suitable) return 1;
    if (a.suitable && b.suitable) {
      // 都适用时，按内存利用率排序（接近但不超过最佳）
      const aUtilization = totalMemory / a.memorySize;
      const bUtilization = totalMemory / b.memorySize;
      return Math.abs(0.8 - aUtilization) - Math.abs(0.8 - bUtilization);
    }
    // 都不适用时，按需要的卡数排序
    return a.multiCardRequired - b.multiCardRequired;
  });
}

/**
 * 创建内存分解数据
 * @param weights 权重内存
 * @param activations 激活值内存
 * @param gradients 梯度内存
 * @param optimizer 优化器内存
 * @returns 内存分解对象
 */
export function createMemoryBreakdown(
  weights: number,
  activations: number,
  gradients: number = 0,
  optimizer: number = 0
): MemoryBreakdown {
  const labels: string[] = [];
  const colors: string[] = [];
  const values: number[] = [];
  
  if (weights > 0) {
    labels.push(CHART_LABELS.weights);
    colors.push(CHART_COLORS.weights);
    values.push(weights);
  }
  
  if (activations > 0) {
    labels.push(CHART_LABELS.activations);
    colors.push(CHART_COLORS.activations);
    values.push(activations);
  }
  
  if (gradients > 0) {
    labels.push(CHART_LABELS.gradients);
    colors.push(CHART_COLORS.gradients);
    values.push(gradients);
  }
  
  if (optimizer > 0) {
    labels.push(CHART_LABELS.optimizer);
    colors.push(CHART_COLORS.optimizer);
    values.push(optimizer);
  }
  
  return {
    weights,
    activations,
    gradients,
    optimizer,
    labels,
    colors
  };
}

/**
 * 主要的内存计算函数
 * @param params 模型参数
 * @param mode 计算模式（推理或训练）
 * @returns 完整的内存计算结果
 */
export function calculateMemoryRequirements(
  params: ModelParameters,
  mode: CalculationMode = 'inference'
): MemoryCalculationResult {
  // 计算基础内存需求
  const modelWeights = calculateModelWeights(params);
  const activations = calculateActivations(params);
  
  let gradients = 0;
  let optimizerStates = 0;
  
  // 训练模式下计算额外内存
  if (mode === 'training') {
    gradients = calculateGradients(modelWeights);
    optimizerStates = calculateOptimizerStates(modelWeights);
  }
  
  // 计算总内存需求
  const totalMemory = modelWeights + activations + gradients + optimizerStates;
  
  // 创建内存分解
  // const breakdown = createMemoryBreakdown(modelWeights, activations, gradients, optimizerStates);
  
  // 生成硬件推荐
  const recommendations = generateHardwareRecommendations(totalMemory);
  
  return {
    parameters: params,
    inference: {
      modelWeights,
      activations,
      total: modelWeights + activations
    },
    training: {
      modelWeights,
      activations: activations * 2, // 训练时激活值需要更多内存
      gradients,
      optimizerStates,
      total: modelWeights + (activations * 2) + gradients + optimizerStates
    },
    recommendations
  };
}

/**
 * 批处理大小优化
 * @param params 模型参数
 * @param maxMemory 最大可用内存 (GB)
 * @param mode 计算模式
 * @returns 优化后的批处理大小
 */
export function optimizeBatchSize(
  params: ModelParameters,
  maxMemory: number,
  mode: CalculationMode = 'inference'
): { optimalBatchSize: number; memoryUsage: number; warning?: string } {
  let optimalBatchSize = 1;
  let bestMemoryUsage = 0;
  
  // 从当前批处理大小开始，逐步增加
  for (let batchSize = 1; batchSize <= 128; batchSize++) {
    const testParams = { ...params, batchSize };
    const result = calculateMemoryRequirements(testParams, mode);
    
    const totalMemory = mode === 'inference' ? result.inference.total : result.training.total;
    if (totalMemory <= maxMemory) {
      optimalBatchSize = batchSize;
      bestMemoryUsage = totalMemory;
    } else {
      break;
    }
  }
  
  let warning: string | undefined;
  if (optimalBatchSize === 1 && bestMemoryUsage > maxMemory * 0.9) {
    warning = '内存使用率过高，建议考虑模型量化或使用更大显存的GPU';
  }
  
  return {
    optimalBatchSize,
    memoryUsage: bestMemoryUsage,
    warning
  };
}

/**
 * 验证模型参数的合理性
 * @param params 模型参数
 * @returns 验证结果
 */
export function validateModelParameters(params: ModelParameters): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (params.parameterCount <= 0) {
    errors.push('参数数量必须大于0');
  }
  
  if (params.sequenceLength <= 0 || params.sequenceLength > 32768) {
    errors.push('序列长度必须在1到32768之间');
  }
  
  if (params.batchSize <= 0 || params.batchSize > 1024) {
    errors.push('批处理大小必须在1到1024之间');
  }
  
  if (params.hiddenSize <= 0) {
    errors.push('隐藏层维度必须大于0');
  }
  
  if (params.numLayers <= 0) {
    errors.push('层数必须大于0');
  }
  
  if (params.vocabularySize <= 0) {
    errors.push('词汇表大小必须大于0');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}