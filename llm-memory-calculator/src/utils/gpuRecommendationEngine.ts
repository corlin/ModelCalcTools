import { MemoryCalculationResult, CalculationMode, HardwareRecommendation } from '../types';
import { MemoryUnitConverter } from './MemoryUnitConverter';
import { ENHANCED_GPU_HARDWARE } from '../constants';
import { gpuDataValidator } from './gpuDataValidator';
import { gpuEfficiencyUpdater } from './gpuEfficiencyUpdater';
import { UtilizationCalculator, DEFAULT_UTILIZATION_CONFIG } from './utilizationCalculator';
import { WorkloadType } from './efficiencyRatingSystem';

export interface GPURecommendationOptions {
  budget?: number;
  sortBy?: 'price' | 'memory' | 'efficiency';
  maxResults?: number;
}

export interface GPURecommendationResult {
  recommendations: ExtendedHardwareRecommendation[];
  compatibleCount: number;
  totalCount: number;
  bestRecommendation: ExtendedHardwareRecommendation | null;
}

export interface ExtendedHardwareRecommendation extends HardwareRecommendation {
  memoryUtilization: number;
  efficiencyScore: number;
  costPerGB: number;
  standardizedUtilization: any;
  enhancedData: {
    architecture: string;
    memoryBandwidth: number;
    tdp: number;
    benchmarks: any;
    confidence: number;
    efficiencyRating: any;
  };
}

/**
 * 统一的GPU推荐引擎
 * 为计算结果页面和硬件推荐页面提供一致的推荐逻辑
 */
export class GPURecommendationEngine {
  private utilizationCalculator: UtilizationCalculator;

  constructor() {
    this.utilizationCalculator = new UtilizationCalculator();
  }

  /**
   * 生成GPU推荐
   */
  generateRecommendations(
    result: MemoryCalculationResult,
    mode: CalculationMode,
    options: GPURecommendationOptions = {}
  ): GPURecommendationResult {
    const { budget = 0, sortBy = 'efficiency', maxResults = 10 } = options;

    // 计算总内存需求
    const totalMemoryNeededGB = mode === 'inference' ? result.inference.total : result.training.total;
    const totalMemoryNeededBytes = MemoryUnitConverter.gbToBytes(totalMemoryNeededGB);

    if (totalMemoryNeededGB === 0) {
      return {
        recommendations: [],
        compatibleCount: 0,
        totalCount: 0,
        bestRecommendation: null
      };
    }

    // 获取有效的GPU数据
    const workloadType: WorkloadType = mode === 'inference' ? 'inference' : 'training';
    const validGPUs = ENHANCED_GPU_HARDWARE
      .filter(gpu => {
        const validation = gpuDataValidator.validateGPUData(gpu);
        return validation.isValid && validation.confidence > 0.5;
      })
      .map(gpu => gpuEfficiencyUpdater.updateGPUEfficiency(gpu, workloadType));

    // 生成推荐
    const recommendations = validGPUs.map(gpu => {
      return this.createRecommendation(gpu, totalMemoryNeededBytes, totalMemoryNeededGB);
    }).filter(rec => {
      // 预算筛选
      if (budget > 0 && rec.price > budget) return false;
      return true;
    }).sort((a, b) => {
      // 排序
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'memory':
          return b.memorySize - a.memorySize;
        case 'efficiency':
        default:
          return b.efficiencyScore - a.efficiencyScore;
      }
    }).slice(0, maxResults);

    const compatibleCount = recommendations.filter(r => r.suitable).length;
    const bestRecommendation = recommendations.find(r => r.suitable) || recommendations[0] || null;

    return {
      recommendations,
      compatibleCount,
      totalCount: recommendations.length,
      bestRecommendation
    };
  }

  /**
   * 获取最佳推荐GPU（用于MemoryWarnings组件）
   */
  getBestRecommendation(
    result: MemoryCalculationResult,
    mode: CalculationMode
  ): ExtendedHardwareRecommendation | null {
    const recommendationResult = this.generateRecommendations(result, mode, { maxResults: 1 });
    return recommendationResult.bestRecommendation;
  }

  /**
   * 获取兼容的GPU列表（用于MemoryWarnings组件）
   */
  getCompatibleGPUs(
    result: MemoryCalculationResult,
    mode: CalculationMode,
    maxCount: number = 5
  ): ExtendedHardwareRecommendation[] {
    const recommendationResult = this.generateRecommendations(result, mode, { maxResults: maxCount });
    return recommendationResult.recommendations.filter(r => r.suitable);
  }

  /**
   * 获取不兼容的GPU列表（用于MemoryWarnings组件）
   */
  getIncompatibleGPUs(
    result: MemoryCalculationResult,
    mode: CalculationMode,
    maxCount: number = 3
  ): ExtendedHardwareRecommendation[] {
    const recommendationResult = this.generateRecommendations(result, mode);
    return recommendationResult.recommendations.filter(r => !r.suitable).slice(0, maxCount);
  }

  /**
   * 创建单个GPU推荐
   */
  private createRecommendation(
    gpu: any,
    totalMemoryNeededBytes: number,
    totalMemoryNeededGB: number
  ): ExtendedHardwareRecommendation {
    const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(gpu.memorySize);

    // 使用标准化利用率计算
    const standardizedUtilization = UtilizationCalculator.calculateStandardizedUtilization(
      totalMemoryNeededBytes,
      gpuMemoryBytes,
      DEFAULT_UTILIZATION_CONFIG
    );

    // 判断是否适合
    const theoreticallyEnough = gpu.memorySize >= totalMemoryNeededGB;
    const practicallyFeasible = !standardizedUtilization.isOverCapacity;
    const suitable = theoreticallyEnough && practicallyFeasible;

    const multiCardRequired = suitable ? 1 : Math.ceil(totalMemoryNeededGB / gpu.memorySize);
    const totalCost = gpu.price.currentPrice * multiCardRequired;

    // 计算利用率
    let memoryUtilization: number;
    let finalUtilizationResult: any;
    let multiCardResult: any;

    if (suitable) {
      memoryUtilization = standardizedUtilization.utilizationPercentage;
      finalUtilizationResult = this.utilizationCalculator.calculateRealUtilization(
        totalMemoryNeededGB,
        gpu.memorySize
      );
    } else {
      multiCardResult = this.utilizationCalculator.calculateMultiCardEfficiency(
        totalMemoryNeededGB,
        gpu.memorySize,
        multiCardRequired
      );
      
      const perCardMemoryBytes = totalMemoryNeededBytes / multiCardRequired;
      const perCardUtilization = UtilizationCalculator.calculateStandardizedUtilization(
        perCardMemoryBytes,
        gpuMemoryBytes,
        DEFAULT_UTILIZATION_CONFIG
      );
      
      memoryUtilization = perCardUtilization.utilizationPercentage;
    }

    // 计算效率评分
    const efficiencyRating = gpu.efficiency;
    let efficiencyScore = efficiencyRating.overall / 100;

    if (suitable) {
      const efficiencyBonus = standardizedUtilization.efficiencyRating === 'excellent' ? 0.1 :
                             standardizedUtilization.efficiencyRating === 'good' ? 0.05 :
                             standardizedUtilization.efficiencyRating === 'fair' ? 0.02 : 0;
      const singleCardBonus = multiCardRequired === 1 ? 0.05 : 0;
      efficiencyScore = Math.min(1, efficiencyScore + efficiencyBonus + singleCardBonus);
    } else {
      const multiCardPenalty = (multiCardRequired - 1) * 0.05;
      efficiencyScore = Math.max(0, efficiencyScore - multiCardPenalty);
    }

    // 转换为旧的效率格式以保持兼容性
    const legacyEfficiency: 'high' | 'medium' | 'low' = 
      gpu.efficiency.overall >= 85 ? 'high' : 
      gpu.efficiency.overall >= 70 ? 'medium' : 'low';

    return {
      id: gpu.id,
      name: gpu.name,
      memorySize: gpu.memorySize * multiCardRequired,
      price: totalCost,
      suitable,
      multiCardRequired,
      efficiency: legacyEfficiency,
      description: this.generateDescription(gpu, multiCardRequired, suitable, memoryUtilization, totalMemoryNeededBytes),
      memoryUtilization,
      efficiencyScore,
      costPerGB: totalCost / (gpu.memorySize * multiCardRequired),
      utilizationDetails: finalUtilizationResult,
      multiCardDetails: multiCardResult,
      standardizedUtilization,
      enhancedData: {
        architecture: gpu.architecture,
        memoryBandwidth: gpu.memoryBandwidth,
        tdp: gpu.tdp,
        benchmarks: gpu.benchmarks,
        confidence: gpuDataValidator.validateGPUData(gpu).confidence,
        efficiencyRating: efficiencyRating
      }
    };
  }

  /**
   * 生成GPU描述
   */
  private generateDescription(
    gpu: any,
    multiCardRequired: number,
    suitable: boolean,
    memoryUtilization: number,
    totalMemoryNeededBytes: number
  ): string {
    const performanceInfo = gpu.benchmarks?.llmInference ? 
      ` (${gpu.benchmarks.llmInference.tokensPerSecond} tokens/s)` : '';
    
    const memoryNeededGB = MemoryUnitConverter.bytesToGB(totalMemoryNeededBytes);
    const formattedMemoryNeeded = `${memoryNeededGB.toFixed(1)} GB`;
    
    if (!suitable) {
      if (gpu.memorySize < memoryNeededGB) {
        return `单卡显存不足，需要 ${multiCardRequired} 张 ${gpu.name} 才能满足 ${formattedMemoryNeeded} 的内存需求。${performanceInfo}`;
      } else {
        return `单卡显存理论上够用，但考虑实际开销后利用率过高，建议使用 ${multiCardRequired} 张卡或更大显存的GPU。${performanceInfo}`;
      }
    }
    
    if (multiCardRequired === 1) {
      const architectureInfo = gpu.architecture ? ` (${gpu.architecture}架构)` : '';
      
      if (memoryUtilization > 90) {
        return `${gpu.name}${architectureInfo} 可以满足需求，但内存利用率较高 (${memoryUtilization.toFixed(1)}%)，建议考虑更大显存的选择。${performanceInfo}`;
      } else if (memoryUtilization > 70) {
        return `${gpu.name}${architectureInfo} 是很好的选择，内存利用率适中 (${memoryUtilization.toFixed(1)}%)，性价比较高。${performanceInfo}`;
      } else {
        return `${gpu.name}${architectureInfo} 显存充足，内存利用率 ${memoryUtilization.toFixed(1)}%，适合未来扩展需求。${performanceInfo}`;
      }
    } else {
      const totalMemoryGB = gpu.memorySize * multiCardRequired;
      const formattedTotalMemory = MemoryUnitConverter.formatMemorySize(MemoryUnitConverter.gbToBytes(totalMemoryGB));
      return `使用 ${multiCardRequired} 张 ${gpu.name} 组成多卡配置，总显存 ${formattedTotalMemory}。${performanceInfo}`;
    }
  }
}

// 创建单例实例
export const gpuRecommendationEngine = new GPURecommendationEngine();