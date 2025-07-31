import { EnhancedGPUHardware } from '../types';
import { efficiencyRatingSystem, WorkloadType } from './efficiencyRatingSystem';

/**
 * GPU效率评级更新器
 * 用于更新GPU硬件数据中的效率评级
 */
export class GPUEfficiencyUpdater {
  /**
   * 更新单个GPU的效率评级
   */
  updateGPUEfficiency(
    gpu: EnhancedGPUHardware, 
    workload: WorkloadType = 'mixed'
  ): EnhancedGPUHardware {
    const newRating = efficiencyRatingSystem.calculateOverallRating(gpu, workload);
    
    return {
      ...gpu,
      efficiency: newRating
    };
  }
  
  /**
   * 批量更新GPU效率评级
   */
  updateBatchEfficiency(
    gpus: EnhancedGPUHardware[], 
    workload: WorkloadType = 'mixed'
  ): EnhancedGPUHardware[] {
    return gpus.map(gpu => this.updateGPUEfficiency(gpu, workload));
  }
  
  /**
   * 验证效率评级的一致性
   */
  validateEfficiencyConsistency(gpu: EnhancedGPUHardware): {
    isConsistent: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // 检查评分范围
    if (gpu.efficiency.overall < 0 || gpu.efficiency.overall > 100) {
      issues.push(`综合评分超出范围: ${gpu.efficiency.overall}`);
    }
    
    if (gpu.efficiency.confidence < 0 || gpu.efficiency.confidence > 1) {
      issues.push(`可信度超出范围: ${gpu.efficiency.confidence}`);
    }
    
    // 检查评分逻辑一致性
    if (gpu.efficiency.overall > 90 && gpu.efficiency.confidence < 0.7) {
      issues.push('高评分但低可信度，可能存在数据质量问题');
      recommendations.push('建议验证基准测试数据的准确性');
    }
    
    // 检查性能与价格的合理性
    if (gpu.efficiency.costEffectiveness < 50 && gpu.price.currentPrice < 2000) {
      issues.push('低价GPU的成本效益评分过低');
      recommendations.push('检查价格数据和性能基准的匹配度');
    }
    
    // 检查功耗效率与TDP的一致性
    if (gpu.efficiency.powerEfficiency > 90 && gpu.tdp > 500) {
      issues.push('高功耗GPU的功耗效率评分过高');
      recommendations.push('重新评估功耗效率计算算法');
    }
    
    return {
      isConsistent: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  /**
   * 生成效率评级报告
   */
  generateEfficiencyReport(gpus: EnhancedGPUHardware[]): {
    summary: {
      totalGPUs: number;
      averageRating: number;
      highPerformanceCount: number;
      consistencyIssues: number;
    };
    topPerformers: Array<{
      gpu: EnhancedGPUHardware;
      rating: number;
      strengths: string[];
    }>;
    improvementSuggestions: string[];
  } {
    const totalGPUs = gpus.length;
    const averageRating = gpus.reduce((sum, gpu) => sum + gpu.efficiency.overall, 0) / totalGPUs;
    const highPerformanceCount = gpus.filter(gpu => gpu.efficiency.overall >= 85).length;
    
    let consistencyIssues = 0;
    const improvementSuggestions: string[] = [];
    
    // 检查一致性问题
    gpus.forEach(gpu => {
      const validation = this.validateEfficiencyConsistency(gpu);
      if (!validation.isConsistent) {
        consistencyIssues++;
        improvementSuggestions.push(...validation.recommendations);
      }
    });
    
    // 找出表现最好的GPU
    const topPerformers = gpus
      .sort((a, b) => b.efficiency.overall - a.efficiency.overall)
      .slice(0, 5)
      .map(gpu => ({
        gpu,
        rating: gpu.efficiency.overall,
        strengths: this.identifyStrengths(gpu)
      }));
    
    // 去重改进建议
    const uniqueSuggestions = Array.from(new Set(improvementSuggestions));
    
    return {
      summary: {
        totalGPUs,
        averageRating: Math.round(averageRating * 100) / 100,
        highPerformanceCount,
        consistencyIssues
      },
      topPerformers,
      improvementSuggestions: uniqueSuggestions
    };
  }
  
  /**
   * 识别GPU的优势特点
   */
  private identifyStrengths(gpu: EnhancedGPUHardware): string[] {
    const strengths: string[] = [];
    
    if (gpu.efficiency.performance >= 90) {
      strengths.push('卓越性能');
    }
    
    if (gpu.efficiency.powerEfficiency >= 85) {
      strengths.push('优秀功耗效率');
    }
    
    if (gpu.efficiency.costEffectiveness >= 80) {
      strengths.push('良好成本效益');
    }
    
    if (gpu.efficiency.reliability >= 90) {
      strengths.push('高可靠性');
    }
    
    if (gpu.efficiency.confidence >= 0.9) {
      strengths.push('数据可信度高');
    }
    
    // 基于架构的优势
    if (gpu.architecture === 'Hopper') {
      strengths.push('最新Hopper架构');
    } else if (gpu.architecture === 'Ada Lovelace') {
      strengths.push('先进Ada Lovelace架构');
    }
    
    // 基于内存的优势
    if (gpu.memorySize >= 80) {
      strengths.push('超大显存容量');
    } else if (gpu.memorySize >= 40) {
      strengths.push('大显存容量');
    }
    
    if (gpu.memoryBandwidth >= 2000) {
      strengths.push('超高内存带宽');
    }
    
    return strengths;
  }
  
  /**
   * 比较两个GPU的效率差异
   */
  compareGPUEfficiency(gpu1: EnhancedGPUHardware, gpu2: EnhancedGPUHardware): {
    winner: EnhancedGPUHardware;
    comparison: {
      overall: { gpu1: number; gpu2: number; difference: number };
      performance: { gpu1: number; gpu2: number; difference: number };
      efficiency: { gpu1: number; gpu2: number; difference: number };
      powerEfficiency: { gpu1: number; gpu2: number; difference: number };
      costEffectiveness: { gpu1: number; gpu2: number; difference: number };
    };
    recommendation: string;
  } {
    const winner = gpu1.efficiency.overall >= gpu2.efficiency.overall ? gpu1 : gpu2;
    
    const comparison = {
      overall: {
        gpu1: gpu1.efficiency.overall,
        gpu2: gpu2.efficiency.overall,
        difference: gpu1.efficiency.overall - gpu2.efficiency.overall
      },
      performance: {
        gpu1: gpu1.efficiency.performance,
        gpu2: gpu2.efficiency.performance,
        difference: gpu1.efficiency.performance - gpu2.efficiency.performance
      },
      efficiency: {
        gpu1: gpu1.efficiency.efficiency,
        gpu2: gpu2.efficiency.efficiency,
        difference: gpu1.efficiency.efficiency - gpu2.efficiency.efficiency
      },
      powerEfficiency: {
        gpu1: gpu1.efficiency.powerEfficiency,
        gpu2: gpu2.efficiency.powerEfficiency,
        difference: gpu1.efficiency.powerEfficiency - gpu2.efficiency.powerEfficiency
      },
      costEffectiveness: {
        gpu1: gpu1.efficiency.costEffectiveness,
        gpu2: gpu2.efficiency.costEffectiveness,
        difference: gpu1.efficiency.costEffectiveness - gpu2.efficiency.costEffectiveness
      }
    };
    
    // 生成推荐说明
    let recommendation = `${winner.name} 在综合评分上`;
    if (Math.abs(comparison.overall.difference) < 5) {
      recommendation += '略胜一筹';
    } else if (Math.abs(comparison.overall.difference) < 15) {
      recommendation += '明显更优';
    } else {
      recommendation += '显著领先';
    }
    
    // 添加具体优势说明
    const advantages: string[] = [];
    if (Math.abs(comparison.performance.difference) >= 10) {
      advantages.push(comparison.performance.difference > 0 ? 
        `${gpu1.name}性能更强` : `${gpu2.name}性能更强`);
    }
    if (Math.abs(comparison.powerEfficiency.difference) >= 10) {
      advantages.push(comparison.powerEfficiency.difference > 0 ? 
        `${gpu1.name}功耗效率更高` : `${gpu2.name}功耗效率更高`);
    }
    if (Math.abs(comparison.costEffectiveness.difference) >= 10) {
      advantages.push(comparison.costEffectiveness.difference > 0 ? 
        `${gpu1.name}成本效益更好` : `${gpu2.name}成本效益更好`);
    }
    
    if (advantages.length > 0) {
      recommendation += `，主要体现在：${advantages.join('、')}`;
    }
    
    return {
      winner,
      comparison,
      recommendation
    };
  }
}

// 导出单例实例
export const gpuEfficiencyUpdater = new GPUEfficiencyUpdater();