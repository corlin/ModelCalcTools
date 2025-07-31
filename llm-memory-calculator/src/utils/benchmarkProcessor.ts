import { 
  ExtendedBenchmarkData,
  ModelParameters
} from '../types';
import { 
  PERFORMANCE_BENCHMARKS, 
  getDataSourceCredibility
} from '../constants/performanceBenchmarks';

// 基准测试处理结果
export interface ProcessedBenchmarkResult {
  normalizedScore: number;      // 标准化评分 (0-100)
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  dataQuality: number;          // 数据质量评分 (0-1)
  sourceCredibility: number;    // 数据源可信度 (0-1)
  applicabilityScore: number;   // 对目标场景的适用性 (0-1)
  lastUpdated: Date;
}

// 性能预测结果
export interface PerformancePrediction {
  predictedTokensPerSecond: number;
  predictedMemoryEfficiency: number;
  predictedPowerEfficiency: number;
  confidenceLevel: number;      // 预测可信度 (0-1)
  predictionMethod: string;     // 预测方法说明
  basedOnBenchmarks: string[];  // 基于的基准测试
  limitations: string[];        // 预测局限性
}

// 相对性能比较结果
export interface RelativePerformance {
  relativeScore: number;        // 相对评分 (参考GPU = 100)
  performanceRatio: number;     // 性能比率
  confidenceLevel: number;      // 可信度
  comparisonBasis: string;      // 比较基础
}

// 基准测试数据处理器
export class BenchmarkProcessor {
  private static readonly REFERENCE_GPU = 'rtx-4090'; // 参考GPU
  private static readonly QUALITY_WEIGHTS = {
    dataFreshness: 0.3,         // 数据新鲜度权重
    sourceCredibility: 0.4,     // 数据源可信度权重
    verificationStatus: 0.3     // 验证状态权重
  };

  /**
   * 标准化基准测试数据
   * @param rawBenchmarks 原始基准测试数据数组
   * @returns 标准化后的基准测试数据
   */
  static normalizeBenchmarks(
    rawBenchmarks: ExtendedBenchmarkData[]
  ): Record<string, ProcessedBenchmarkResult> {
    const normalized: Record<string, ProcessedBenchmarkResult> = {};

    rawBenchmarks.forEach((benchmark, index) => {
      const key = `benchmark_${index}`;
      
      // 计算标准化评分
      const normalizedScore = this.calculateNormalizedScore(benchmark);
      
      // 计算置信区间
      const confidenceInterval = this.calculateConfidenceInterval(benchmark);
      
      // 评估数据质量
      const dataQuality = this.assessDataQuality(benchmark);
      
      // 获取数据源可信度
      const sourceCredibility = getDataSourceCredibility(benchmark.dataSource).credibilityScore;
      
      // 计算适用性评分
      const applicabilityScore = this.calculateApplicabilityScore(benchmark);

      normalized[key] = {
        normalizedScore,
        confidenceInterval,
        dataQuality,
        sourceCredibility,
        applicabilityScore,
        lastUpdated: benchmark.testDate
      };
    });

    return normalized;
  }

  /**
   * 计算标准化评分
   * @param benchmark 基准测试数据
   * @returns 标准化评分 (0-100)
   */
  private static calculateNormalizedScore(benchmark: ExtendedBenchmarkData): number {
    // 基于tokens/second进行标准化，以RTX 4090为基准(100分)
    const referencePerformance = 2847; // RTX 4090的tokens/second
    const currentPerformance = benchmark.llmInference.tokensPerSecond;
    
    const baseScore = (currentPerformance / referencePerformance) * 100;
    
    // 考虑内存效率和功耗效率的调整
    const memoryEfficiencyBonus = (benchmark.llmInference.memoryEfficiency - 0.8) * 50;
    const powerEfficiencyBonus = Math.log(benchmark.llmInference.powerEfficiency / 5) * 10;
    
    const adjustedScore = baseScore + memoryEfficiencyBonus + powerEfficiencyBonus;
    
    // 限制在0-200范围内
    return Math.max(0, Math.min(200, adjustedScore));
  }

  /**
   * 计算置信区间
   * @param benchmark 基准测试数据
   * @returns 置信区间
   */
  private static calculateConfidenceInterval(
    benchmark: ExtendedBenchmarkData
  ): { lower: number; upper: number } {
    const baseValue = benchmark.llmInference.tokensPerSecond;
    const variance = benchmark.additionalMetrics?.throughputVariance || 0.1;
    
    // 基于方差计算95%置信区间
    const margin = 1.96 * Math.sqrt(variance) * baseValue;
    
    return {
      lower: Math.max(0, baseValue - margin),
      upper: baseValue + margin
    };
  }

  /**
   * 评估数据质量
   * @param benchmark 基准测试数据
   * @returns 数据质量评分 (0-1)
   */
  private static assessDataQuality(benchmark: ExtendedBenchmarkData): number {
    const now = new Date();
    const daysSinceTest = (now.getTime() - benchmark.testDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // 数据新鲜度评分 (30天内为满分，之后线性衰减)
    const freshnessScore = Math.max(0, Math.min(1, (90 - daysSinceTest) / 90));
    
    // 数据源可信度评分
    const credibilityScore = benchmark.credibilityScore;
    
    // 验证状态评分
    const verificationScore = benchmark.verified ? 1.0 : 0.6;
    
    // 加权平均
    return (
      freshnessScore * this.QUALITY_WEIGHTS.dataFreshness +
      credibilityScore * this.QUALITY_WEIGHTS.sourceCredibility +
      verificationScore * this.QUALITY_WEIGHTS.verificationStatus
    );
  }

  /**
   * 计算适用性评分
   * @param benchmark 基准测试数据
   * @returns 适用性评分 (0-1)
   */
  private static calculateApplicabilityScore(benchmark: ExtendedBenchmarkData): number {
    // 基于测试条件的标准化程度评分
    const testConditions = benchmark.testConditions;
    
    let score = 1.0;
    
    // 检查是否使用标准测试条件
    if (testConditions.batchSize !== 1) score *= 0.9;
    if (testConditions.sequenceLength !== 2048) score *= 0.9;
    if (testConditions.precision !== 'fp16') score *= 0.8;
    if (testConditions.framework !== 'PyTorch') score *= 0.95;
    
    return score;
  }

  /**
   * 基于实际基准预测性能
   * @param gpuId GPU标识符
   * @param targetParams 目标模型参数
   * @returns 性能预测结果
   */
  static predictPerformance(
    gpuId: string,
    targetParams: ModelParameters
  ): PerformancePrediction {
    // 查找最匹配的基准测试
    const matchingBenchmarks = this.findMatchingBenchmarks(gpuId, targetParams);
    
    if (matchingBenchmarks.length === 0) {
      return this.generateFallbackPrediction(gpuId, targetParams);
    }

    // 基于匹配的基准测试进行预测
    const prediction = this.interpolatePerformance(matchingBenchmarks, targetParams);
    
    return prediction;
  }

  /**
   * 查找匹配的基准测试
   * @param gpuId GPU标识符
   * @param targetParams 目标参数
   * @returns 匹配的基准测试数据
   */
  private static findMatchingBenchmarks(
    gpuId: string,
    targetParams: ModelParameters
  ): ExtendedBenchmarkData[] {
    const matchingBenchmarks: ExtendedBenchmarkData[] = [];
    
    // 遍历所有基准测试
    Object.values(PERFORMANCE_BENCHMARKS.standardInferenceTests).forEach(test => {
      const gpuResult = (test.results as any)[gpuId];
      if (gpuResult) {
        // 计算参数匹配度
        const matchScore = this.calculateParameterMatchScore(
          gpuResult.testConditions,
          targetParams
        );
        
        if (matchScore > 0.5) { // 匹配度阈值
          matchingBenchmarks.push(gpuResult);
        }
      }
    });

    // 按匹配度排序
    return matchingBenchmarks.sort((a, b) => {
      const scoreA = this.calculateParameterMatchScore(a.testConditions, targetParams);
      const scoreB = this.calculateParameterMatchScore(b.testConditions, targetParams);
      return scoreB - scoreA;
    });
  }

  /**
   * 计算参数匹配评分
   * @param testConditions 测试条件
   * @param targetParams 目标参数
   * @returns 匹配评分 (0-1)
   */
  private static calculateParameterMatchScore(
    testConditions: any,
    targetParams: ModelParameters
  ): number {
    let score = 1.0;
    
    // 模型大小匹配
    const testModelSize = this.parseModelSize(testConditions.modelSize);
    const targetModelSize = targetParams.parameterCount;
    const sizeRatio = Math.min(testModelSize, targetModelSize) / Math.max(testModelSize, targetModelSize);
    score *= sizeRatio;
    
    // 批处理大小匹配
    const batchRatio = Math.min(testConditions.batchSize, targetParams.batchSize) / 
                      Math.max(testConditions.batchSize, targetParams.batchSize);
    score *= (0.7 + 0.3 * batchRatio);
    
    // 序列长度匹配
    const seqRatio = Math.min(testConditions.sequenceLength, targetParams.sequenceLength) / 
                    Math.max(testConditions.sequenceLength, targetParams.sequenceLength);
    score *= (0.8 + 0.2 * seqRatio);
    
    // 精度匹配
    if (testConditions.precision === targetParams.precision) {
      score *= 1.0;
    } else {
      score *= 0.8;
    }
    
    return score;
  }

  /**
   * 解析模型大小字符串
   * @param modelSizeStr 模型大小字符串 (如 "7B", "13B")
   * @returns 数值形式的模型大小
   */
  private static parseModelSize(modelSizeStr: string): number {
    const match = modelSizeStr.match(/(\d+(?:\.\d+)?)([BM])/);
    if (!match) return 7; // 默认值
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return unit === 'B' ? value : value / 1000;
  }

  /**
   * 插值预测性能
   * @param benchmarks 基准测试数据
   * @param targetParams 目标参数
   * @returns 性能预测
   */
  private static interpolatePerformance(
    benchmarks: ExtendedBenchmarkData[],
    targetParams: ModelParameters
  ): PerformancePrediction {
    if (benchmarks.length === 0) {
      throw new Error('No benchmarks available for interpolation');
    }

    // 使用最匹配的基准测试作为基础
    const baseBenchmark = benchmarks[0];
    
    // 计算缩放因子
    const scalingFactor = this.calculateScalingFactor(baseBenchmark, targetParams);
    
    // 预测性能指标
    const predictedTokensPerSecond = baseBenchmark.llmInference.tokensPerSecond * scalingFactor.throughput;
    const predictedMemoryEfficiency = Math.min(1.0, baseBenchmark.llmInference.memoryEfficiency * scalingFactor.memory);
    const predictedPowerEfficiency = baseBenchmark.llmInference.powerEfficiency * scalingFactor.power;
    
    // 计算可信度
    const confidenceLevel = this.calculatePredictionConfidence(benchmarks, targetParams);
    
    return {
      predictedTokensPerSecond,
      predictedMemoryEfficiency,
      predictedPowerEfficiency,
      confidenceLevel,
      predictionMethod: 'interpolation_based',
      basedOnBenchmarks: benchmarks.map(b => `${b.testConditions.modelSize}_${b.dataSource}`),
      limitations: this.generatePredictionLimitations(benchmarks, targetParams)
    };
  }

  /**
   * 计算缩放因子
   * @param baseBenchmark 基础基准测试
   * @param targetParams 目标参数
   * @returns 缩放因子
   */
  private static calculateScalingFactor(
    baseBenchmark: ExtendedBenchmarkData,
    targetParams: ModelParameters
  ): { throughput: number; memory: number; power: number } {
    const baseModelSize = this.parseModelSize(baseBenchmark.testConditions.modelSize);
    const targetModelSize = targetParams.parameterCount;
    
    // 基于模型大小的缩放
    const sizeRatio = baseModelSize / targetModelSize;
    
    // 吞吐量通常与模型大小成反比
    const throughputScaling = Math.pow(sizeRatio, 0.8);
    
    // 内存效率随模型大小变化较小
    const memoryScaling = Math.pow(sizeRatio, 0.2);
    
    // 功耗效率与吞吐量相关
    const powerScaling = throughputScaling * 0.9;
    
    // 批处理大小影响
    const batchRatio = targetParams.batchSize / baseBenchmark.testConditions.batchSize;
    const batchScaling = Math.pow(batchRatio, 0.6);
    
    return {
      throughput: throughputScaling * batchScaling,
      memory: memoryScaling,
      power: powerScaling
    };
  }

  /**
   * 计算预测可信度
   * @param benchmarks 基准测试数据
   * @param targetParams 目标参数
   * @returns 可信度评分 (0-1)
   */
  private static calculatePredictionConfidence(
    benchmarks: ExtendedBenchmarkData[],
    targetParams: ModelParameters
  ): number {
    if (benchmarks.length === 0) return 0;
    
    // 基于最佳匹配的基准测试计算可信度
    const bestMatch = benchmarks[0];
    const matchScore = this.calculateParameterMatchScore(bestMatch.testConditions, targetParams);
    
    // 数据质量影响
    const dataQuality = this.assessDataQuality(bestMatch);
    
    // 基准测试数量影响
    const benchmarkCountFactor = Math.min(1.0, benchmarks.length / 3);
    
    return matchScore * dataQuality * benchmarkCountFactor;
  }

  /**
   * 生成预测局限性说明
   * @param benchmarks 基准测试数据
   * @param targetParams 目标参数
   * @returns 局限性说明数组
   */
  private static generatePredictionLimitations(
    benchmarks: ExtendedBenchmarkData[],
    targetParams: ModelParameters
  ): string[] {
    const limitations: string[] = [];
    
    if (benchmarks.length < 2) {
      limitations.push('基准测试数据有限，预测精度可能受影响');
    }
    
    const bestMatch = benchmarks[0];
    const testModelSize = this.parseModelSize(bestMatch.testConditions.modelSize);
    
    if (Math.abs(testModelSize - targetParams.parameterCount) > testModelSize * 0.5) {
      limitations.push('目标模型大小与基准测试差异较大');
    }
    
    if (bestMatch.testConditions.batchSize !== targetParams.batchSize) {
      limitations.push('批处理大小不匹配可能影响预测准确性');
    }
    
    if (bestMatch.testConditions.precision !== targetParams.precision) {
      limitations.push('精度类型不匹配可能影响性能预测');
    }
    
    const dataAge = (new Date().getTime() - bestMatch.testDate.getTime()) / (1000 * 60 * 60 * 24);
    if (dataAge > 30) {
      limitations.push('基准测试数据较旧，可能不反映最新优化');
    }
    
    return limitations;
  }

  /**
   * 生成备用预测（当没有匹配的基准测试时）
   * @param gpuId GPU标识符
   * @param targetParams 目标参数
   * @returns 备用预测结果
   */
  private static generateFallbackPrediction(
    gpuId: string,
    targetParams: ModelParameters
  ): PerformancePrediction {
    // 基于GPU规格的简单估算
    const estimatedTokensPerSecond = this.estimatePerformanceFromSpecs(gpuId, targetParams);
    
    return {
      predictedTokensPerSecond: estimatedTokensPerSecond,
      predictedMemoryEfficiency: 0.8, // 保守估计
      predictedPowerEfficiency: 5.0,  // 保守估计
      confidenceLevel: 0.3,           // 低可信度
      predictionMethod: 'specification_based_estimation',
      basedOnBenchmarks: [],
      limitations: [
        '缺乏实际基准测试数据',
        '基于硬件规格的理论估算',
        '预测精度有限，仅供参考'
      ]
    };
  }

  /**
   * 基于硬件规格估算性能
   * @param _gpuId GPU标识符
   * @param targetParams 目标参数
   * @returns 估算的tokens/second
   */
  private static estimatePerformanceFromSpecs(
    _gpuId: string,
    targetParams: ModelParameters
  ): number {
    // 这里应该基于GPU的实际硬件规格进行估算
    // 简化实现，返回基于模型大小的粗略估算
    const basePerformance = 2000; // 基础性能
    const modelSizeFactor = Math.pow(7 / targetParams.parameterCount, 0.8);
    
    return basePerformance * modelSizeFactor;
  }

  /**
   * 计算相对性能
   * @param targetGpuId 目标GPU
   * @param referenceGpuId 参考GPU（默认为RTX 4090）
   * @param testConditions 测试条件
   * @returns 相对性能比较结果
   */
  static calculateRelativePerformance(
    targetGpuId: string,
    referenceGpuId: string = this.REFERENCE_GPU,
    testConditions?: Partial<ModelParameters>
  ): RelativePerformance {
    // 查找对应的基准测试数据
    const targetBenchmark = this.findBestMatchingBenchmark(targetGpuId, testConditions);
    const referenceBenchmark = this.findBestMatchingBenchmark(referenceGpuId, testConditions);
    
    if (!targetBenchmark || !referenceBenchmark) {
      return {
        relativeScore: 50, // 默认评分
        performanceRatio: 0.5,
        confidenceLevel: 0.1,
        comparisonBasis: 'insufficient_data'
      };
    }
    
    const performanceRatio = targetBenchmark.llmInference.tokensPerSecond / 
                            referenceBenchmark.llmInference.tokensPerSecond;
    
    const relativeScore = performanceRatio * 100;
    
    // 计算可信度
    const confidenceLevel = Math.min(
      targetBenchmark.credibilityScore,
      referenceBenchmark.credibilityScore
    );
    
    return {
      relativeScore,
      performanceRatio,
      confidenceLevel,
      comparisonBasis: `${targetBenchmark.dataSource}_vs_${referenceBenchmark.dataSource}`
    };
  }

  /**
   * 查找最佳匹配的基准测试
   * @param gpuId GPU标识符
   * @param testConditions 测试条件
   * @returns 最佳匹配的基准测试数据
   */
  private static findBestMatchingBenchmark(
    gpuId: string,
    testConditions?: Partial<ModelParameters>
  ): ExtendedBenchmarkData | null {
    let bestMatch: ExtendedBenchmarkData | null = null;
    let bestScore = 0;
    
    // 遍历所有基准测试
    Object.values(PERFORMANCE_BENCHMARKS.standardInferenceTests).forEach(test => {
      const gpuResult = (test.results as any)[gpuId];
      if (gpuResult) {
        let score = gpuResult.credibilityScore;
        
        // 如果提供了测试条件，计算匹配度
        if (testConditions) {
          const matchScore = this.calculateParameterMatchScore(
            gpuResult.testConditions,
            testConditions as ModelParameters
          );
          score *= matchScore;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = gpuResult;
        }
      }
    });
    
    return bestMatch;
  }
}

// 导出辅助函数
export const processGPUBenchmarks = (gpuId: string): ProcessedBenchmarkResult[] => {
  const benchmarks: ExtendedBenchmarkData[] = [];
  
  // 收集该GPU的所有基准测试数据
  Object.values(PERFORMANCE_BENCHMARKS.standardInferenceTests).forEach(test => {
    const gpuResult = (test.results as any)[gpuId];
    if (gpuResult) {
      benchmarks.push(gpuResult);
    }
  });
  
  Object.values(PERFORMANCE_BENCHMARKS.standardTrainingTests).forEach(test => {
    const gpuResult = (test.results as any)[gpuId];
    if (gpuResult) {
      benchmarks.push(gpuResult);
    }
  });
  
  const normalized = BenchmarkProcessor.normalizeBenchmarks(benchmarks);
  return Object.values(normalized);
};

export default BenchmarkProcessor;