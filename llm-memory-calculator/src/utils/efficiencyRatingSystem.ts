import { 
  EnhancedGPUHardware, 
  EfficiencyRating, 
  RatingBreakdown, 
  BenchmarkData
} from '../types';

// 工作负载类型
export type WorkloadType = 'inference' | 'training' | 'mixed';

// 评级权重配置
export interface RatingWeights {
  computePerformance: number;
  memoryPerformance: number;
  powerEfficiency: number;
  costEffectiveness: number;
}

// 预定义的评级权重
export const RATING_WEIGHTS: Record<WorkloadType, RatingWeights> = {
  inference: {
    computePerformance: 0.45,
    memoryPerformance: 0.20,
    powerEfficiency: 0.25,
    costEffectiveness: 0.10
  },
  training: {
    computePerformance: 0.30,
    memoryPerformance: 0.40,
    powerEfficiency: 0.15,
    costEffectiveness: 0.15
  },
  mixed: {
    computePerformance: 0.37,
    memoryPerformance: 0.30,
    powerEfficiency: 0.20,
    costEffectiveness: 0.13
  }
};

// 性能评分接口
export interface PerformanceScore {
  rawScore: number;
  normalizedScore: number;
  confidence: number;
  factors: string[];
}

// 效率评分接口
export interface EfficiencyScore {
  memoryEfficiency: number;
  computeEfficiency: number;
  overallEfficiency: number;
  confidence: number;
  factors: string[];
}

// 功耗效率评分接口
export interface PowerEfficiencyScore {
  performancePerWatt: number;
  thermalEfficiency: number;
  overallPowerScore: number;
  confidence: number;
  factors: string[];
}

// 成本效益评分接口
export interface CostEffectivenessScore {
  performancePerDollar: number;
  memoryPerDollar: number;
  overallCostScore: number;
  confidence: number;
  factors: string[];
}

// 参考GPU性能基准（用于标准化）
const REFERENCE_BENCHMARKS = {
  // 使用RTX 4090作为参考基准（100分）
  reference: {
    tokensPerSecond: 2847,
    fp16Performance: 165.2,
    memoryBandwidth: 1008,
    powerEfficiency: 6.33,
    pricePerformanceRatio: 2847 / 1699 // tokens per dollar
  },
  // 最高性能基准（用于归一化）
  maximum: {
    tokensPerSecond: 5000,
    fp16Performance: 1000,
    memoryBandwidth: 3500,
    powerEfficiency: 10,
    pricePerformanceRatio: 5
  }
};

/**
 * 效率评级系统类
 * 基于多维度指标计算GPU的综合效率评分
 */
export class EfficiencyRatingSystem {
  /**
   * 计算GPU的综合效率评级
   */
  calculateOverallRating(
    gpu: EnhancedGPUHardware, 
    workload: WorkloadType = 'mixed'
  ): EfficiencyRating {
    const weights = RATING_WEIGHTS[workload];
    
    // 计算各维度评分
    const performanceScore = this.getPerformanceScore(gpu.benchmarks);
    const efficiencyScore = this.getEfficiencyScore(gpu);
    const powerScore = this.getPowerEfficiencyScore(gpu);
    const costScore = this.getCostEffectivenessScore(gpu);
    
    // 计算加权综合评分
    const overall = Math.round(
      performanceScore.normalizedScore * weights.computePerformance +
      efficiencyScore.overallEfficiency * weights.memoryPerformance +
      powerScore.overallPowerScore * weights.powerEfficiency +
      costScore.overallCostScore * weights.costEffectiveness
    );
    
    // 计算综合可信度
    const confidence = Math.min(
      performanceScore.confidence,
      efficiencyScore.confidence,
      powerScore.confidence,
      costScore.confidence
    );
    
    // 构建评级分解
    const breakdown: RatingBreakdown = {
      computePerformance: {
        score: performanceScore.normalizedScore,
        weight: weights.computePerformance,
        factors: performanceScore.factors
      },
      memoryPerformance: {
        score: efficiencyScore.overallEfficiency,
        weight: weights.memoryPerformance,
        factors: efficiencyScore.factors
      },
      powerEfficiency: {
        score: powerScore.overallPowerScore,
        weight: weights.powerEfficiency,
        factors: powerScore.factors
      },
      costEffectiveness: {
        score: costScore.overallCostScore,
        weight: weights.costEffectiveness,
        factors: costScore.factors
      }
    };
    
    return {
      overall: Math.max(0, Math.min(100, overall)),
      performance: performanceScore.normalizedScore,
      efficiency: efficiencyScore.overallEfficiency,
      costEffectiveness: costScore.overallCostScore,
      powerEfficiency: powerScore.overallPowerScore,
      reliability: this.calculateReliabilityScore(gpu),
      breakdown,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }
  
  /**
   * 计算性能评分
   */
  getPerformanceScore(benchmarks: BenchmarkData): PerformanceScore {
    const factors: string[] = [];
    let confidence = 0.9; // 基础可信度
    
    // LLM推理性能评分（40%权重）
    const inferenceRatio = benchmarks.llmInference.tokensPerSecond / 
                          REFERENCE_BENCHMARKS.reference.tokensPerSecond;
    const inferenceScore = Math.min(100, inferenceRatio * 100);
    factors.push(`LLM推理: ${benchmarks.llmInference.tokensPerSecond} tokens/s`);
    
    // 计算性能评分（35%权重）
    const computeRatio = benchmarks.syntheticBenchmarks.fp16Performance / 
                        REFERENCE_BENCHMARKS.reference.fp16Performance;
    const computeScore = Math.min(100, computeRatio * 100);
    factors.push(`FP16计算: ${benchmarks.syntheticBenchmarks.fp16Performance} TFLOPS`);
    
    // 内存带宽性能（25%权重）
    // 需要从GPU硬件信息中获取内存带宽
    const memoryScore = 85; // 临时固定值，实际应该从GPU数据中计算
    factors.push(`内存带宽利用率: ${benchmarks.syntheticBenchmarks.memoryBandwidthUtilization * 100}%`);
    
    // 计算加权性能评分
    const rawScore = inferenceScore * 0.4 + computeScore * 0.35 + memoryScore * 0.25;
    const normalizedScore = Math.round(Math.max(0, Math.min(100, rawScore)));
    
    // 根据测试条件调整可信度
    if (benchmarks.testConditions.modelSize === '7B') {
      confidence *= 0.95; // 标准测试条件
    } else if (benchmarks.testConditions.modelSize === '70B') {
      confidence *= 0.9; // 大模型测试，可信度稍低
    }
    
    return {
      rawScore,
      normalizedScore,
      confidence,
      factors
    };
  }
  
  /**
   * 计算效率评分
   */
  getEfficiencyScore(gpu: EnhancedGPUHardware): EfficiencyScore {
    const factors: string[] = [];
    let confidence = 0.85;
    
    // 内存效率评分
    const memoryEfficiency = Math.round(gpu.benchmarks.llmInference.memoryEfficiency * 100);
    factors.push(`内存利用效率: ${memoryEfficiency}%`);
    
    // 计算效率评分（基于内存带宽利用率）
    const computeEfficiency = Math.round(
      gpu.benchmarks.syntheticBenchmarks.memoryBandwidthUtilization * 100
    );
    factors.push(`计算资源利用率: ${computeEfficiency}%`);
    
    // 架构效率加成
    let architectureBonus = 0;
    if (gpu.architecture === 'Hopper') {
      architectureBonus = 5;
      factors.push('Hopper架构优化加成');
    } else if (gpu.architecture === 'Ada Lovelace') {
      architectureBonus = 3;
      factors.push('Ada Lovelace架构优化加成');
    } else if (gpu.architecture === 'Ampere') {
      architectureBonus = 2;
      factors.push('Ampere架构优化加成');
    }
    
    // 综合效率评分
    const overallEfficiency = Math.round(
      Math.min(100, (memoryEfficiency * 0.6 + computeEfficiency * 0.4 + architectureBonus))
    );
    
    return {
      memoryEfficiency,
      computeEfficiency,
      overallEfficiency,
      confidence,
      factors
    };
  }
  
  /**
   * 计算功耗效率评分
   */
  getPowerEfficiencyScore(gpu: EnhancedGPUHardware): PowerEfficiencyScore {
    const factors: string[] = [];
    let confidence = 0.8;
    
    // 性能功耗比评分
    const powerEfficiencyRatio = gpu.benchmarks.llmInference.powerEfficiency / 
                                REFERENCE_BENCHMARKS.reference.powerEfficiency;
    const performancePerWatt = Math.round(Math.min(100, powerEfficiencyRatio * 100));
    factors.push(`性能功耗比: ${gpu.benchmarks.llmInference.powerEfficiency} tokens/watt`);
    
    // 热设计功耗评分（TDP越低越好）
    const tdpScore = Math.max(0, 100 - (gpu.tdp - 200) / 5); // 200W为基准
    const thermalEfficiency = Math.round(Math.max(0, Math.min(100, tdpScore)));
    factors.push(`热设计功耗: ${gpu.tdp}W`);
    
    // 架构功耗优化
    let powerOptimizationBonus = 0;
    if (gpu.architecture === 'Hopper') {
      powerOptimizationBonus = 5;
      factors.push('Hopper架构功耗优化');
    } else if (gpu.architecture === 'Ada Lovelace') {
      powerOptimizationBonus = 8;
      factors.push('Ada Lovelace架构功耗优化');
    }
    
    // 综合功耗效率评分
    const overallPowerScore = Math.round(
      Math.min(100, (performancePerWatt * 0.7 + thermalEfficiency * 0.3 + powerOptimizationBonus))
    );
    
    return {
      performancePerWatt,
      thermalEfficiency,
      overallPowerScore,
      confidence,
      factors
    };
  }
  
  /**
   * 计算成本效益评分
   */
  getCostEffectivenessScore(gpu: EnhancedGPUHardware): CostEffectivenessScore {
    const factors: string[] = [];
    let confidence = 0.75; // 价格数据可信度相对较低
    
    // 性能价格比评分
    const pricePerformanceRatio = gpu.benchmarks.llmInference.tokensPerSecond / 
                                 gpu.price.currentPrice;
    const performancePerDollar = Math.round(
      Math.min(100, (pricePerformanceRatio / REFERENCE_BENCHMARKS.reference.pricePerformanceRatio) * 100)
    );
    factors.push(`性能价格比: ${pricePerformanceRatio.toFixed(3)} tokens/$`);
    
    // 内存价格比评分
    const memoryPriceRatio = gpu.memorySize / gpu.price.currentPrice;
    const memoryPerDollar = Math.round(Math.min(100, memoryPriceRatio * 1000)); // 标准化到合理范围
    factors.push(`内存价格比: ${memoryPriceRatio.toFixed(3)} GB/$`);
    
    // 价格区间调整
    let priceRangeAdjustment = 0;
    if (gpu.price.currentPrice < 2000) {
      priceRangeAdjustment = 10; // 消费级价格加成
      factors.push('消费级价格优势');
    } else if (gpu.price.currentPrice > 20000) {
      priceRangeAdjustment = -5; // 企业级价格惩罚
      factors.push('企业级价格考量');
    }
    
    // 可用性影响
    let availabilityAdjustment = 0;
    if (gpu.availability.status === 'available') {
      availabilityAdjustment = 5;
      factors.push('现货可用');
    } else if (gpu.availability.status === 'limited') {
      availabilityAdjustment = -3;
      factors.push('供应有限');
    } else {
      availabilityAdjustment = -10;
      factors.push('缺货状态');
    }
    
    // 综合成本效益评分
    const overallCostScore = Math.round(
      Math.max(0, Math.min(100, 
        performancePerDollar * 0.6 + 
        memoryPerDollar * 0.4 + 
        priceRangeAdjustment + 
        availabilityAdjustment
      ))
    );
    
    return {
      performancePerDollar,
      memoryPerDollar,
      overallCostScore,
      confidence,
      factors
    };
  }
  
  /**
   * 计算可靠性评分
   */
  private calculateReliabilityScore(gpu: EnhancedGPUHardware): number {
    let reliabilityScore = 85; // 基础可靠性评分
    
    // 制造商可靠性加成
    if (gpu.manufacturer === 'nvidia') {
      reliabilityScore += 10; // NVIDIA通常有更好的驱动支持
    }
    
    // 架构成熟度加成
    if (gpu.architecture === 'Ampere') {
      reliabilityScore += 5; // 成熟架构
    } else if (gpu.architecture === 'Ada Lovelace') {
      reliabilityScore += 3; // 较新但稳定
    }
    
    // 数据验证状态影响
    if (gpu.verified) {
      reliabilityScore += 5;
    }
    
    // 数据来源可信度影响
    if (gpu.dataSource === 'manufacturer_official') {
      reliabilityScore += 5;
    }
    
    return Math.max(0, Math.min(100, reliabilityScore));
  }
  
  /**
   * 获取评级等级描述
   */
  getRatingDescription(score: number): string {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '中等';
    if (score >= 60) return '一般';
    return '较差';
  }
  
  /**
   * 获取评级颜色
   */
  getRatingColor(score: number): string {
    if (score >= 90) return '#10b981'; // 绿色
    if (score >= 80) return '#3b82f6'; // 蓝色
    if (score >= 70) return '#f59e0b'; // 橙色
    if (score >= 60) return '#ef4444'; // 红色
    return '#6b7280'; // 灰色
  }
  
  /**
   * 批量计算多个GPU的效率评级
   */
  calculateBatchRatings(
    gpus: EnhancedGPUHardware[], 
    workload: WorkloadType = 'mixed'
  ): Array<{ gpu: EnhancedGPUHardware; rating: EfficiencyRating }> {
    return gpus.map(gpu => ({
      gpu,
      rating: this.calculateOverallRating(gpu, workload)
    }));
  }
  
  /**
   * 根据工作负载推荐最佳GPU
   */
  recommendBestGPU(
    gpus: EnhancedGPUHardware[], 
    workload: WorkloadType,
    maxBudget?: number
  ): { gpu: EnhancedGPUHardware; rating: EfficiencyRating; reason: string } | null {
    let filteredGPUs = gpus;
    
    // 预算筛选
    if (maxBudget) {
      filteredGPUs = gpus.filter(gpu => gpu.price.currentPrice <= maxBudget);
    }
    
    if (filteredGPUs.length === 0) {
      return null;
    }
    
    // 计算所有GPU的评级
    const ratings = this.calculateBatchRatings(filteredGPUs, workload);
    
    // 按综合评分排序
    ratings.sort((a, b) => b.rating.overall - a.rating.overall);
    
    const best = ratings[0];
    const reason = this.generateRecommendationReason(best.rating, workload);
    
    return {
      gpu: best.gpu,
      rating: best.rating,
      reason
    };
  }
  
  /**
   * 生成推荐理由
   */
  private generateRecommendationReason(rating: EfficiencyRating, workload: WorkloadType): string {
    const reasons: string[] = [];
    
    if (rating.overall >= 90) {
      reasons.push('综合评分优秀');
    }
    
    if (rating.performance >= 85) {
      reasons.push('性能表现出色');
    }
    
    if (rating.powerEfficiency >= 85) {
      reasons.push('功耗效率优秀');
    }
    
    if (rating.costEffectiveness >= 80) {
      reasons.push('成本效益良好');
    }
    
    // 根据工作负载添加特定理由
    if (workload === 'inference' && rating.performance >= 80) {
      reasons.push('推理性能优化');
    } else if (workload === 'training' && rating.efficiency >= 80) {
      reasons.push('训练效率优化');
    }
    
    return reasons.length > 0 ? reasons.join('，') : '综合性能均衡';
  }
}

// 导出单例实例
export const efficiencyRatingSystem = new EfficiencyRatingSystem();