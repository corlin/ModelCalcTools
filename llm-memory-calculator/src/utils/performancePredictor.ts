import { 
  ModelParameters, 
  HardwareRecommendation, 
  EnhancedGPUHardware
} from '../types';
import { ENHANCED_GPU_HARDWARE } from '../constants';
import BenchmarkProcessor, { PerformancePrediction } from './benchmarkProcessor';
import { getGPUBenchmarkCoverage } from '../constants/performanceBenchmarks';

// 增强的硬件推荐，包含性能预测
export interface EnhancedHardwareRecommendation extends HardwareRecommendation {
  performancePrediction: PerformancePrediction;
  benchmarkCoverage: number;        // 基准测试覆盖率 (0-1)
  dataQualityScore: number;         // 数据质量评分 (0-1)
  predictionReliability: 'high' | 'medium' | 'low';
  detailedMetrics: {
    expectedTokensPerSecond: number;
    expectedMemoryUtilization: number;
    expectedPowerConsumption: number;
    expectedThermalPerformance: number;
  };
  comparisonMetrics: {
    relativeToReference: number;    // 相对于参考GPU的性能比率
    costPerformanceRatio: number;   // 成本性能比
    powerEfficiencyRating: number;  // 功耗效率评级
  };
  riskAssessment: {
    performanceRisk: 'low' | 'medium' | 'high';
    reliabilityRisk: 'low' | 'medium' | 'high';
    obsolescenceRisk: 'low' | 'medium' | 'high';
  };
}

// 性能预测器类
export class PerformancePredictor {
  private static readonly PERFORMANCE_WEIGHT = 0.4;
  private static readonly COST_WEIGHT = 0.3;
  private static readonly EFFICIENCY_WEIGHT = 0.2;
  private static readonly RELIABILITY_WEIGHT = 0.1;

  /**
   * 基于实际基准数据生成增强的硬件推荐
   * @param modelParams 模型参数
   * @param maxBudget 最大预算（可选）
   * @returns 增强的硬件推荐列表
   */
  static generateEnhancedRecommendations(
    modelParams: ModelParameters,
    maxBudget?: number
  ): EnhancedHardwareRecommendation[] {
    const recommendations: EnhancedHardwareRecommendation[] = [];

    // 遍历所有GPU硬件
    for (const gpu of ENHANCED_GPU_HARDWARE) {
      // 预算筛选
      if (maxBudget && gpu.price.currentPrice > maxBudget) {
        continue;
      }

      // 生成性能预测
      const performancePrediction = BenchmarkProcessor.predictPerformance(gpu.id, modelParams);
      
      // 计算基准测试覆盖率
      const benchmarkCoverage = getGPUBenchmarkCoverage(gpu.id);
      
      // 评估数据质量
      const dataQualityScore = this.assessOverallDataQuality(gpu);
      
      // 确定预测可靠性
      const predictionReliability = this.determinePredictionReliability(
        performancePrediction.confidenceLevel,
        benchmarkCoverage,
        dataQualityScore
      );

      // 计算详细指标
      const detailedMetrics = this.calculateDetailedMetrics(gpu, performancePrediction, modelParams);
      
      // 计算比较指标
      const comparisonMetrics = this.calculateComparisonMetrics(gpu, performancePrediction);
      
      // 评估风险
      const riskAssessment = this.assessRisks(gpu, performancePrediction);

      // 判断是否适合
      const memoryRequired = this.estimateMemoryRequirement(modelParams);
      const suitable = gpu.memorySize >= memoryRequired;
      const multiCardRequired = suitable ? 1 : Math.ceil(memoryRequired / gpu.memorySize);

      // 生成推荐描述
      const description = this.generateRecommendationDescription(
        gpu, 
        performancePrediction, 
        predictionReliability,
        suitable
      );

      // 计算综合效率评级
      const efficiency = this.calculateOverallEfficiency(
        performancePrediction,
        gpu.price.currentPrice,
        gpu.tdp
      );

      const recommendation: EnhancedHardwareRecommendation = {
        id: gpu.id,
        name: gpu.name,
        memorySize: gpu.memorySize,
        price: gpu.price.currentPrice,
        suitable,
        multiCardRequired,
        efficiency,
        description,
        performancePrediction,
        benchmarkCoverage,
        dataQualityScore,
        predictionReliability,
        detailedMetrics,
        comparisonMetrics,
        riskAssessment
      };

      recommendations.push(recommendation);
    }

    // 按综合评分排序
    return recommendations.sort((a, b) => {
      const scoreA = this.calculateOverallScore(a);
      const scoreB = this.calculateOverallScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * 评估整体数据质量
   * @param gpu GPU硬件信息
   * @returns 数据质量评分 (0-1)
   */
  private static assessOverallDataQuality(gpu: EnhancedGPUHardware): number {
    let score = 0.8; // 基础分

    // 数据验证状态
    if (gpu.verified) score += 0.1;
    
    // 数据新鲜度
    const daysSinceUpdate = (new Date().getTime() - gpu.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 0.1;
    else if (daysSinceUpdate > 90) score -= 0.2;

    // 数据源可信度
    if (gpu.dataSource.includes('official')) score += 0.1;
    
    // 基准测试完整性
    if (gpu.benchmarks.llmInference && gpu.benchmarks.llmTraining) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 确定预测可靠性等级
   * @param confidenceLevel 置信水平
   * @param benchmarkCoverage 基准测试覆盖率
   * @param dataQuality 数据质量
   * @returns 可靠性等级
   */
  private static determinePredictionReliability(
    confidenceLevel: number,
    benchmarkCoverage: number,
    dataQuality: number
  ): 'high' | 'medium' | 'low' {
    const overallScore = (confidenceLevel + benchmarkCoverage + dataQuality) / 3;
    
    if (overallScore >= 0.8) return 'high';
    if (overallScore >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * 计算详细性能指标
   * @param gpu GPU硬件信息
   * @param prediction 性能预测
   * @param modelParams 模型参数
   * @returns 详细指标
   */
  private static calculateDetailedMetrics(
    gpu: EnhancedGPUHardware,
    prediction: PerformancePrediction,
    _modelParams: ModelParameters
  ) {
    return {
      expectedTokensPerSecond: prediction.predictedTokensPerSecond,
      expectedMemoryUtilization: prediction.predictedMemoryEfficiency,
      expectedPowerConsumption: gpu.tdp * 0.8, // 估算实际功耗
      expectedThermalPerformance: this.estimateThermalPerformance(gpu)
    };
  }

  /**
   * 计算比较指标
   * @param gpu GPU硬件信息
   * @param prediction 性能预测
   * @returns 比较指标
   */
  private static calculateComparisonMetrics(
    gpu: EnhancedGPUHardware,
    prediction: PerformancePrediction
  ) {
    // 计算相对于参考GPU的性能
    const relativePerformance = BenchmarkProcessor.calculateRelativePerformance(gpu.id);
    
    return {
      relativeToReference: relativePerformance.performanceRatio,
      costPerformanceRatio: prediction.predictedTokensPerSecond / gpu.price.currentPrice,
      powerEfficiencyRating: prediction.predictedPowerEfficiency
    };
  }

  /**
   * 评估各种风险
   * @param gpu GPU硬件信息
   * @param prediction 性能预测
   * @returns 风险评估
   */
  private static assessRisks(
    gpu: EnhancedGPUHardware,
    prediction: PerformancePrediction
  ) {
    // 性能风险评估
    const performanceRisk = prediction.confidenceLevel < 0.7 ? 'high' : 
                           prediction.confidenceLevel < 0.85 ? 'medium' : 'low';

    // 可靠性风险评估
    const reliabilityRisk = gpu.efficiency.reliability < 85 ? 'high' :
                           gpu.efficiency.reliability < 92 ? 'medium' : 'low';

    // 技术淘汰风险评估
    const architectureAge = this.getArchitectureAge(gpu.architecture);
    const obsolescenceRisk = architectureAge > 3 ? 'high' :
                            architectureAge > 1.5 ? 'medium' : 'low';

    return {
      performanceRisk: performanceRisk as 'low' | 'medium' | 'high',
      reliabilityRisk: reliabilityRisk as 'low' | 'medium' | 'high',
      obsolescenceRisk: obsolescenceRisk as 'low' | 'medium' | 'high'
    };
  }

  /**
   * 估算架构年龄
   * @param architecture 架构名称
   * @returns 架构年龄（年）
   */
  private static getArchitectureAge(architecture: string): number {
    const architectureAges: Record<string, number> = {
      'Hopper': 0.5,      // H100等
      'Ada Lovelace': 1.0, // RTX 40系列
      'Ampere': 2.5,      // RTX 30系列, A100
      'Turing': 4.0,      // RTX 20系列
      'Pascal': 6.0       // GTX 10系列
    };
    
    return architectureAges[architecture] || 3.0;
  }

  /**
   * 估算热性能
   * @param gpu GPU硬件信息
   * @returns 热性能评分 (0-1)
   */
  private static estimateThermalPerformance(gpu: EnhancedGPUHardware): number {
    // 基于TDP和架构估算热性能
    const tdpScore = Math.max(0, (500 - gpu.tdp) / 500);
    const architectureBonus = gpu.architecture === 'Hopper' ? 0.1 : 
                             gpu.architecture === 'Ada Lovelace' ? 0.05 : 0;
    
    return Math.min(1, tdpScore + architectureBonus);
  }

  /**
   * 估算内存需求
   * @param modelParams 模型参数
   * @returns 估算的内存需求 (GB)
   */
  private static estimateMemoryRequirement(modelParams: ModelParameters): number {
    // 简化的内存需求计算
    const parameterBytes = modelParams.parameterCount * 1e9 * (modelParams.precision === 'fp16' ? 2 : 4);
    const activationBytes = modelParams.batchSize * modelParams.sequenceLength * modelParams.hiddenSize * 2;
    
    return (parameterBytes + activationBytes) / (1024 ** 3);
  }

  /**
   * 计算综合效率评级
   * @param prediction 性能预测
   * @param price 价格
   * @param tdp 功耗
   * @returns 效率评级
   */
  private static calculateOverallEfficiency(
    prediction: PerformancePrediction,
    price: number,
    tdp: number
  ): 'high' | 'medium' | 'low' {
    const performanceScore = prediction.predictedTokensPerSecond / 3000; // 标准化
    const costScore = Math.max(0, (5000 - price) / 5000);
    const powerScore = Math.max(0, (600 - tdp) / 600);
    
    const overallScore = (performanceScore + costScore + powerScore) / 3;
    
    if (overallScore >= 0.7) return 'high';
    if (overallScore >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * 生成推荐描述
   * @param gpu GPU硬件信息
   * @param prediction 性能预测
   * @param reliability 可靠性等级
   * @param suitable 是否适合
   * @returns 推荐描述
   */
  private static generateRecommendationDescription(
    gpu: EnhancedGPUHardware,
    prediction: PerformancePrediction,
    reliability: 'high' | 'medium' | 'low',
    suitable: boolean
  ): string {
    const parts: string[] = [];
    
    if (!suitable) {
      parts.push('需要多卡配置');
    }
    
    // 性能描述
    if (prediction.predictedTokensPerSecond > 4000) {
      parts.push('极高性能');
    } else if (prediction.predictedTokensPerSecond > 2500) {
      parts.push('高性能');
    } else if (prediction.predictedTokensPerSecond > 1500) {
      parts.push('中等性能');
    } else {
      parts.push('基础性能');
    }
    
    // 效率描述
    if (prediction.predictedPowerEfficiency > 8) {
      parts.push('优秀功耗效率');
    } else if (prediction.predictedPowerEfficiency > 6) {
      parts.push('良好功耗效率');
    }
    
    // 可靠性描述
    if (reliability === 'high') {
      parts.push('预测可靠性高');
    } else if (reliability === 'low') {
      parts.push('预测存在不确定性');
    }
    
    // 成本效益
    const costPerformance = prediction.predictedTokensPerSecond / gpu.price.currentPrice;
    if (costPerformance > 2) {
      parts.push('优秀性价比');
    } else if (costPerformance > 1) {
      parts.push('良好性价比');
    }
    
    return parts.join('，');
  }

  /**
   * 计算综合评分
   * @param recommendation 推荐信息
   * @returns 综合评分
   */
  private static calculateOverallScore(recommendation: EnhancedHardwareRecommendation): number {
    // 性能评分
    const performanceScore = recommendation.performancePrediction.predictedTokensPerSecond / 5000;
    
    // 成本评分（价格越低越好）
    const costScore = Math.max(0, (30000 - recommendation.price) / 30000);
    
    // 效率评分
    const efficiencyScore = recommendation.performancePrediction.predictedPowerEfficiency / 10;
    
    // 可靠性评分
    const reliabilityScore = recommendation.predictionReliability === 'high' ? 1 : 
                            recommendation.predictionReliability === 'medium' ? 0.7 : 0.4;
    
    // 适用性评分
    const suitabilityScore = recommendation.suitable ? 1 : 0.5;
    
    return (
      performanceScore * this.PERFORMANCE_WEIGHT +
      costScore * this.COST_WEIGHT +
      efficiencyScore * this.EFFICIENCY_WEIGHT +
      reliabilityScore * this.RELIABILITY_WEIGHT
    ) * suitabilityScore;
  }

  /**
   * 获取特定GPU的详细性能分析
   * @param gpuId GPU标识符
   * @param modelParams 模型参数
   * @returns 详细性能分析
   */
  static getDetailedPerformanceAnalysis(
    gpuId: string,
    modelParams: ModelParameters
  ): {
    prediction: PerformancePrediction;
    benchmarkComparison: any;
    riskAnalysis: any;
    recommendations: string[];
  } {
    const prediction = BenchmarkProcessor.predictPerformance(gpuId, modelParams);
    const relativePerformance = BenchmarkProcessor.calculateRelativePerformance(gpuId);
    
    const gpu = ENHANCED_GPU_HARDWARE.find(g => g.id === gpuId);
    if (!gpu) {
      throw new Error(`GPU ${gpuId} not found`);
    }

    const riskAnalysis = this.assessRisks(gpu, prediction);
    
    const recommendations = this.generateOptimizationRecommendations(gpu, prediction, modelParams);

    return {
      prediction,
      benchmarkComparison: {
        relativePerformance: relativePerformance.performanceRatio,
        confidenceLevel: relativePerformance.confidenceLevel,
        comparisonBasis: relativePerformance.comparisonBasis
      },
      riskAnalysis,
      recommendations
    };
  }

  /**
   * 生成优化建议
   * @param gpu GPU硬件信息
   * @param prediction 性能预测
   * @param modelParams 模型参数
   * @returns 优化建议列表
   */
  private static generateOptimizationRecommendations(
    gpu: EnhancedGPUHardware,
    prediction: PerformancePrediction,
    _modelParams: ModelParameters
  ): string[] {
    const recommendations: string[] = [];
    
    // 内存优化建议
    if (prediction.predictedMemoryEfficiency < 0.8) {
      recommendations.push('考虑使用梯度检查点技术减少内存使用');
      recommendations.push('尝试减少批处理大小以提高内存效率');
    }
    
    // 性能优化建议
    if (prediction.predictedTokensPerSecond < 2000) {
      recommendations.push('考虑使用混合精度训练提升性能');
      recommendations.push('启用编译优化（如torch.compile）');
    }
    
    // 功耗优化建议
    if (gpu.tdp > 400) {
      recommendations.push('注意散热和电源供应要求');
      recommendations.push('考虑功耗限制设置以平衡性能和功耗');
    }
    
    // 成本优化建议
    if (gpu.price.currentPrice > 20000) {
      recommendations.push('评估云计算服务作为替代方案');
      recommendations.push('考虑分时使用或共享资源');
    }
    
    return recommendations;
  }
}

export default PerformancePredictor;