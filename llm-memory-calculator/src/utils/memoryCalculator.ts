import { 
  ModelParameters, 
  MemoryCalculationResult, 
  MemoryBreakdown,
  CalculationMode,
  HardwareRecommendation,
  BatchAnalysisPoint,
  BatchOptimizationResult,
  PerformanceEstimate,
  OptimizationValidation,
  BatchOptimizationError
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
  
  // 注意力机制的KV缓存 - 更精确的计算
  // KV缓存包含Key和Value，每个都是 [batch_size, num_heads, seq_len, head_dim]
  // 简化为 2 * batch_size * seq_len * hidden_size * num_layers
  const kvCache = 2 * batchSize * sequenceLength * hiddenSize * numLayers;
  
  // 中间激活值（前馈网络等）
  // 前馈网络通常是4倍隐藏维度，加上其他中间计算
  const intermediateActivations = hiddenStates * CALCULATION_CONSTANTS.INTERMEDIATE_ACTIVATION_FACTOR;
  
  // 总激活值大小（字节）
  const totalActivations = (hiddenStates + kvCache + intermediateActivations) * bytesPerActivation;
  
  // 应用安全系数并转换为GB
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
 * 验证批处理优化输入参数
 * @param params 模型参数
 * @param maxMemory 最大内存
 * @param safetyMargin 安全边距
 * @returns 验证结果
 */
export function validateBatchOptimizationInputs(
  params: ModelParameters,
  maxMemory: number,
  safetyMargin: number
): { isValid: boolean; errorMessage?: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  
  if (maxMemory <= 0) {
    fieldErrors.maxMemory = '内存限制必须大于0';
  }
  
  if (maxMemory > 1000) {
    fieldErrors.maxMemory = '内存限制不能超过1000GB';
  }
  
  if (safetyMargin <= 0 || safetyMargin > 1) {
    fieldErrors.safetyMargin = '安全边距必须在0到1之间';
  }
  
  if (params.batchSize <= 0) {
    fieldErrors.batchSize = '批处理大小必须大于0';
  }
  
  // 检查基础内存需求是否可行
  const baseParams = { ...params, batchSize: 1 };
  const baseResult = calculateMemoryRequirements(baseParams, 'inference');
  if (baseResult.inference.total > maxMemory) {
    fieldErrors.maxMemory = '即使批处理大小为1，内存需求也超过限制，请增加内存或减少模型参数';
  }
  
  const hasErrors = Object.keys(fieldErrors).length > 0;
  
  return {
    isValid: !hasErrors,
    errorMessage: hasErrors ? '输入参数验证失败' : undefined,
    fieldErrors
  };
}

/**
 * 估算吞吐量（简化估算）
 * @param batchSize 批处理大小
 * @param params 模型参数
 * @param mode 计算模式
 * @returns 估算的吞吐量 (tokens/s)
 */
function estimateThroughput(
  batchSize: number,
  params: ModelParameters,
  mode: CalculationMode
): number {
  // 简化的吞吐量估算公式
  // 实际吞吐量会受到GPU计算能力、内存带宽等多种因素影响
  const baseTokensPerSecond = mode === 'inference' ? 100 : 50;
  const batchEfficiency = Math.min(1, batchSize / 8); // 批处理效率递减
  const modelComplexityFactor = Math.max(0.1, 1 / Math.sqrt(params.parameterCount));
  
  return baseTokensPerSecond * batchSize * batchEfficiency * modelComplexityFactor;
}

/**
 * 生成性能估算
 * @param optimalBatchSize 最优批处理大小
 * @param currentBatchSize 当前批处理大小
 * @param params 模型参数
 * @param mode 计算模式
 * @param utilizationRate 内存利用率
 * @returns 性能估算
 */
function generatePerformanceEstimate(
  optimalBatchSize: number,
  currentBatchSize: number,
  params: ModelParameters,
  mode: CalculationMode,
  utilizationRate: number
): PerformanceEstimate {
  const currentThroughput = estimateThroughput(currentBatchSize, params, mode);
  const optimalThroughput = estimateThroughput(optimalBatchSize, params, mode);
  
  const throughputImprovement = ((optimalThroughput - currentThroughput) / currentThroughput) * 100;
  const memoryEfficiency = Math.min(100, utilizationRate * 125); // 80%利用率 = 100分
  
  return {
    throughputImprovement: Math.max(0, throughputImprovement),
    memoryEfficiency,
    recommendedForTraining: optimalBatchSize >= 4 && optimalBatchSize <= 32,
    recommendedForInference: optimalBatchSize >= 1 && utilizationRate < 0.9
  };
}

/**
 * 验证优化结果
 * @param result 优化结果
 * @param params 模型参数
 * @param maxMemory 最大内存
 * @param mode 计算模式
 * @returns 验证结果
 */
function validateOptimizationResult(
  result: Omit<BatchOptimizationResult, 'validation'>,
  params: ModelParameters,
  maxMemory: number,
  mode: CalculationMode
): OptimizationValidation {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let confidence: 'high' | 'medium' | 'low' = 'high';
  
  // 验证最优批处理大小的合理性
  if (result.optimalBatchSize < 1) {
    return {
      isValid: false,
      errorMessage: '无法找到可行的批处理大小，请考虑增加内存限制或减少模型参数',
      warnings: [],
      recommendations: ['增加GPU内存', '使用模型量化', '减少序列长度'],
      confidence: 'low'
    };
  }
  
  // 检查内存利用率
  if (result.utilizationRate < 0.3) {
    warnings.push('内存利用率过低，资源可能浪费');
    recommendations.push('考虑使用更小的GPU或增加批处理大小');
    confidence = 'medium';
  } else if (result.utilizationRate > 0.95) {
    warnings.push('内存利用率过高，可能存在OOM风险');
    recommendations.push('建议保留更多安全边距或使用更大的GPU');
    confidence = 'medium';
  }
  
  // 检查批处理大小的合理性
  if (mode === 'training') {
    if (result.optimalBatchSize > 64) {
      warnings.push('训练批处理大小较大，可能影响收敛稳定性');
      recommendations.push('监控训练收敛情况，必要时调整学习率');
    } else if (result.optimalBatchSize < 4) {
      warnings.push('训练批处理大小较小，可能影响梯度估计质量');
      recommendations.push('如果内存允许，考虑增加批处理大小');
    }
  }
  
  // 检查与当前配置的差异
  const batchSizeRatio = result.optimalBatchSize / params.batchSize;
  if (batchSizeRatio > 4) {
    warnings.push('推荐的批处理大小比当前配置大很多');
    recommendations.push('逐步增加批处理大小，并相应调整学习率');
    confidence = 'medium';
  } else if (batchSizeRatio < 0.25) {
    warnings.push('推荐的批处理大小比当前配置小很多');
    recommendations.push('检查是否存在内存限制过严的问题');
  }
  
  // 检查分析数据的完整性
  if (result.analysisData.length < 5) {
    warnings.push('分析数据点较少，结果可信度可能降低');
    confidence = confidence === 'high' ? 'medium' : 'low';
  }
  
  // 检查内存限制的合理性
  if (maxMemory < 8) {
    warnings.push('内存限制较低，可能限制优化效果');
    recommendations.push('考虑使用更大的GPU或增加内存限制');
  }
  
  return {
    isValid: true,
    warnings,
    recommendations,
    confidence
  };
}

/**
 * 生成增强的警告和建议
 * @param analysisData 分析数据
 * @param optimalBatchSize 最优批处理大小
 * @param params 模型参数
 * @param maxMemory 最大内存
 * @param mode 计算模式
 * @returns 警告和建议数组
 */
function generateEnhancedWarningsAndRecommendations(
  analysisData: BatchAnalysisPoint[],
  optimalBatchSize: number,
  params: ModelParameters,
  maxMemory: number,
  mode: CalculationMode
): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // 分析内存使用模式
  const validPoints = analysisData.filter(p => p.withinLimit);
  const maxValidBatchSize = validPoints.length > 0 ? Math.max(...validPoints.map(p => p.batchSize)) : 1;
  const avgUtilization = validPoints.length > 0 
    ? validPoints.reduce((sum, p) => sum + p.utilizationRate, 0) / validPoints.length 
    : 0;
  
  // 内存利用率相关警告和建议
  if (avgUtilization < 0.4) {
    warnings.push('平均内存利用率较低，可能存在资源浪费');
    recommendations.push('考虑使用更小的GPU或调整模型配置以提高效率');
  } else if (avgUtilization > 0.85) {
    warnings.push('平均内存利用率较高，建议保留更多安全边距');
    recommendations.push('考虑使用更大的GPU或启用梯度检查点以减少内存使用');
  }
  
  // 批处理大小范围分析
  if (maxValidBatchSize <= 2) {
    warnings.push('可用的批处理大小范围很小，可能限制性能优化');
    recommendations.push('考虑增加GPU内存或使用内存优化技术（如梯度累积）');
  }
  
  // 模式特定的建议
  if (mode === 'training') {
    if (optimalBatchSize < 8) {
      recommendations.push('训练批处理大小较小，考虑使用梯度累积来模拟更大的有效批处理大小');
    }
    if (optimalBatchSize > 32) {
      recommendations.push('大批处理大小训练时，建议使用学习率预热和适当的正则化');
    }
  } else {
    if (optimalBatchSize > 16) {
      recommendations.push('推理时大批处理大小可以提高吞吐量，但注意延迟增加');
    }
  }
  
  // 硬件相关建议
  const modelMemoryAtBatch1 = analysisData.find(p => p.batchSize === 1)?.memoryUsage || 0;
  if (modelMemoryAtBatch1 > maxMemory * 0.8) {
    warnings.push('模型基础内存需求较高，批处理优化空间有限');
    recommendations.push('考虑模型量化、层融合或使用更大显存的GPU');
  }
  
  // 序列长度相关建议
  if (params.sequenceLength > 4096 && optimalBatchSize < 4) {
    recommendations.push('长序列配置下批处理大小受限，考虑使用序列并行或减少序列长度');
  }
  
  return { warnings, recommendations };
}

/**
 * 批处理大小优化（增强版）
 * @param params 模型参数
 * @param maxMemory 最大可用内存 (GB)
 * @param mode 计算模式
 * @param safetyMargin 安全边距 (0-1)
 * @returns 优化后的批处理大小和详细分析
 */
export function optimizeBatchSize(
  params: ModelParameters,
  maxMemory: number,
  mode: CalculationMode = 'inference',
  safetyMargin: number = 0.9
): BatchOptimizationResult {
  try {
    // 输入验证
    const validation = validateBatchOptimizationInputs(params, maxMemory, safetyMargin);
    if (!validation.isValid) {
      throw new BatchOptimizationError(
        validation.errorMessage || '输入参数验证失败',
        'INVALID_PARAMS',
        validation.fieldErrors
      );
    }

  const analysisData: BatchAnalysisPoint[] = [];
  let optimalBatchSize = 1;
  let bestMemoryUsage = 0;
  let bestUtilizationRate = 0;
  
  const maxBatchSize = Math.min(128, Math.floor(maxMemory * 2)); // 动态调整最大批处理大小
  const safeMemoryLimit = maxMemory * safetyMargin;
  
  // 分析不同批处理大小的内存需求
  for (let batchSize = 1; batchSize <= maxBatchSize; batchSize++) {
    const testParams = { ...params, batchSize };
    const result = calculateMemoryRequirements(testParams, mode);
    
    const totalMemory = mode === 'inference' ? result.inference.total : result.training.total;
    const utilizationRate = totalMemory / maxMemory;
    const withinLimit = totalMemory <= maxMemory;
    const safetyMarginExceeded = totalMemory > safeMemoryLimit;
    
    // 估算吞吐量
    const estimatedThroughput = estimateThroughput(batchSize, testParams, mode);
    
    // 创建内存分解
    const memoryBreakdown = mode === 'inference' 
      ? {
          weights: result.inference.modelWeights,
          activations: result.inference.activations
        }
      : {
          weights: result.training.modelWeights,
          activations: result.training.activations,
          gradients: result.training.gradients,
          optimizer: result.training.optimizerStates
        };
    
    analysisData.push({
      batchSize,
      memoryUsage: totalMemory,
      utilizationRate,
      withinLimit,
      safetyMarginExceeded,
      estimatedThroughput,
      memoryBreakdown
    });
    
    // 找到在安全边距内的最大批处理大小
    if (totalMemory <= safeMemoryLimit) {
      optimalBatchSize = batchSize;
      bestMemoryUsage = totalMemory;
      bestUtilizationRate = utilizationRate;
    } else if (totalMemory > maxMemory) {
      // 超出内存限制，停止搜索
      break;
    }
  }
  
  // 生成增强的警告和建议
  const { warnings, recommendations } = generateEnhancedWarningsAndRecommendations(
    analysisData, optimalBatchSize, params, maxMemory, mode
  );
  
  // 生成性能估算
  const performanceEstimate = generatePerformanceEstimate(
    optimalBatchSize, params.batchSize, params, mode, bestUtilizationRate
  );
  
  // 创建初步结果（不包含验证）
  const preliminaryResult = {
    optimalBatchSize,
    memoryUsage: bestMemoryUsage,
    utilizationRate: bestUtilizationRate,
    analysisData,
    warnings,
    recommendations,
    performanceEstimate,
    safetyMargin,
    maxMemoryLimit: maxMemory
  };
  
  // 验证优化结果
  const resultValidation = validateOptimizationResult(preliminaryResult, params, maxMemory, mode);
  
    return {
      ...preliminaryResult,
      validation: resultValidation
    };
  } catch (error) {
    return handleOptimizationError(error, params, maxMemory, safetyMargin);
  }
}

/**
 * 处理批处理优化错误
 * @param error 错误对象
 * @param params 模型参数
 * @param maxMemory 最大内存
 * @returns 错误情况下的优化结果
 */
export function handleOptimizationError(
  error: unknown,
  params: ModelParameters,
  maxMemory: number,
  safetyMargin: number = 0.9
): BatchOptimizationResult {
  let errorMessage = '计算过程中发生未知错误';
  let recommendations = ['请刷新页面并重试'];
  
  if (error instanceof BatchOptimizationError) {
    errorMessage = error.message;
    switch (error.code) {
      case 'INVALID_PARAMS':
        recommendations = ['请检查输入参数的有效性'];
        break;
      case 'NO_FEASIBLE_SOLUTION':
        recommendations = ['增加GPU内存', '使用模型量化', '减少序列长度'];
        break;
      case 'MEMORY_LIMIT_TOO_LOW':
        recommendations = ['增加内存限制', '使用更大的GPU'];
        break;
      default:
        recommendations = ['请检查输入参数并重试'];
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  console.error('批处理优化计算失败:', error);
  
  // 尝试计算基础内存使用量作为fallback
  let fallbackMemoryUsage = 0;
  try {
    const baseResult = calculateMemoryRequirements({ ...params, batchSize: 1 }, 'inference');
    fallbackMemoryUsage = baseResult.inference.total;
  } catch {
    // 如果连基础计算都失败，使用0
    fallbackMemoryUsage = 0;
  }
  
  return {
    optimalBatchSize: 1,
    memoryUsage: fallbackMemoryUsage,
    utilizationRate: fallbackMemoryUsage / maxMemory,
    analysisData: [],
    warnings: [errorMessage],
    recommendations,
    performanceEstimate: {
      throughputImprovement: 0,
      memoryEfficiency: 0,
      recommendedForTraining: false,
      recommendedForInference: false
    },
    validation: {
      isValid: false,
      errorMessage,
      warnings: [errorMessage],
      recommendations,
      confidence: 'low'
    },
    safetyMargin,
    maxMemoryLimit: maxMemory
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