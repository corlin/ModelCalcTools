// Import types for utilization calculator
import { StandardizedUtilizationResult } from '../types/index';
import { MemoryUnitConverter } from './MemoryUnitConverter';

/**
 * 利用率配置接口
 */
export interface UtilizationConfig {
  memoryFragmentationFactor: number;    // 内存碎片化因子 0.05-0.15
  systemReservedMemory: number;         // 系统保留内存 (GB)
  driverOverhead: number;               // 驱动开销 (GB)
  safetyMargin: number;                 // 安全边距 0.1-0.2
  multiCardCommunicationOverhead: number; // 多卡通信开销 0.05-0.1
}

/**
 * 利用率计算结果接口
 */
export interface UtilizationResult {
  theoreticalUtilization: number;      // 理论利用率 0-1
  practicalUtilization: number;        // 实际可用利用率 0-1
  fragmentationLoss: number;           // 碎片化损失 (GB)
  systemOverhead: number;              // 系统开销 (GB)
  safetyBuffer: number;                // 安全缓冲 (GB)
  recommendations: string[];           // 优化建议
  efficiency: 'high' | 'medium' | 'low'; // 效率等级
  details: {
    totalMemoryNeeded: number;         // 总内存需求 (GB)
    availableMemory: number;           // 可用内存 (GB)
    wastedMemory: number;              // 浪费的内存 (GB)
    utilizationScore: number;          // 利用率评分 0-100
  };
}

/**
 * 多卡配置结果接口
 */
export interface MultiCardResult {
  totalEffectiveMemory: number;        // 有效总内存 (GB)
  communicationOverhead: number;       // 通信开销 (GB)
  loadBalancingEfficiency: number;     // 负载均衡效率 0-1
  scalingFactor: number;               // 扩展因子
  optimalCardCount: number;            // 最优卡数
  perCardUtilization: number[];        // 每卡利用率
  recommendations: string[];           // 多卡优化建议
  costEfficiency: number;              // 成本效率评分 0-100
}

/**
 * 内存分配请求接口
 */
export interface AllocationRequest {
  size: number;                        // 分配大小 (bytes)
  alignment: number;                   // 内存对齐要求 (bytes)
  type: 'weights' | 'activations' | 'gradients' | 'optimizer' | 'buffer';
  priority: 'high' | 'medium' | 'low';
}

/**
 * 内存分配结果接口
 */
export interface AllocationResult {
  successfulAllocations: {
    request: AllocationRequest;
    allocatedAddress: number;
    actualSize: number;
  }[];
  failedAllocations: AllocationRequest[];
  fragmentationRatio: number;          // 碎片化比率 0-1
  utilizationEfficiency: number;       // 利用效率 0-1
  totalAllocated: number;              // 总分配内存 (bytes)
  totalWasted: number;                 // 总浪费内存 (bytes)
}

/**
 * 内存模式接口
 */
export interface MemoryPattern {
  allocationSizes: number[];           // 分配大小模式
  allocationFrequency: number[];       // 分配频率
  deallocationPattern: 'sequential' | 'random' | 'lifo';
  peakMemoryRatio: number;             // 峰值内存比率
}

/**
 * 碎片化预测结果接口
 */
export interface FragmentationPrediction {
  expectedFragmentation: number;       // 预期碎片化率 0-1
  confidence: number;                  // 预测可信度 0-1
  mitigationStrategies: string[];      // 缓解策略
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 默认利用率配置
 */
export const DEFAULT_UTILIZATION_CONFIG: UtilizationConfig = {
  memoryFragmentationFactor: 0.08,     // 8% 碎片化损失
  systemReservedMemory: 1.0,           // 1GB 系统保留
  driverOverhead: 0.5,                 // 0.5GB 驱动开销
  safetyMargin: 0.15,                  // 15% 安全边距
  multiCardCommunicationOverhead: 0.07  // 7% 多卡通信开销
};

/**
 * 内存分配模拟器类
 */
export class MemoryAllocationSimulator {
  private memoryBlocks: Map<number, { size: number; free: boolean }> = new Map();

  constructor(totalMemory: number) {
    this.memoryBlocks.set(0, { size: totalMemory, free: true });
  }

  /**
   * 模拟内存分配
   */
  simulateAllocation(
    totalMemory: number,
    allocations: AllocationRequest[]
  ): AllocationResult {
    this.reset(totalMemory);
    
    const successfulAllocations: AllocationResult['successfulAllocations'] = [];
    const failedAllocations: AllocationRequest[] = [];
    let totalAllocated = 0;
    let totalWasted = 0;

    // 按优先级排序分配请求
    const sortedAllocations = [...allocations].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const request of sortedAllocations) {
      const result = this.allocateMemory(request);
      
      if (result.success) {
        successfulAllocations.push({
          request,
          allocatedAddress: result.address!,
          actualSize: result.actualSize!
        });
        totalAllocated += result.actualSize!;
        totalWasted += result.actualSize! - request.size;
      } else {
        failedAllocations.push(request);
      }
    }

    const fragmentationRatio = this.calculateFragmentation();
    const utilizationEfficiency = totalAllocated / totalMemory;

    return {
      successfulAllocations,
      failedAllocations,
      fragmentationRatio,
      utilizationEfficiency,
      totalAllocated,
      totalWasted
    };
  }

  /**
   * 预测内存碎片化
   */
  predictFragmentation(pattern: MemoryPattern): FragmentationPrediction {
    const { allocationSizes, peakMemoryRatio } = pattern;
    
    // 基于历史模式预测碎片化
    const avgAllocationSize = allocationSizes.reduce((a, b) => a + b, 0) / allocationSizes.length;
    const sizeVariance = this.calculateVariance(allocationSizes);
    
    // 碎片化预测算法
    let expectedFragmentation = 0.05; // 基础碎片化率
    
    // 分配大小差异越大，碎片化越严重
    if (sizeVariance > avgAllocationSize * 0.5) {
      expectedFragmentation += 0.03;
    }
    
    // 峰值内存使用率影响
    if (peakMemoryRatio > 0.8) {
      expectedFragmentation += 0.02;
    }
    
    // 分配模式影响
    if (pattern.deallocationPattern === 'random') {
      expectedFragmentation += 0.02;
    }

    expectedFragmentation = Math.min(expectedFragmentation, 0.25); // 最大25%碎片化

    const confidence = this.calculatePredictionConfidence(pattern);
    const riskLevel = expectedFragmentation > 0.15 ? 'high' : 
                     expectedFragmentation > 0.08 ? 'medium' : 'low';

    const mitigationStrategies = this.generateMitigationStrategies(expectedFragmentation, pattern);

    return {
      expectedFragmentation,
      confidence,
      mitigationStrategies,
      riskLevel
    };
  }

  private reset(totalMemory: number): void {
    this.memoryBlocks.clear();
    this.memoryBlocks.set(0, { size: totalMemory, free: true });
  }

  private allocateMemory(request: AllocationRequest): {
    success: boolean;
    address?: number;
    actualSize?: number;
  } {
    const alignedSize = this.alignSize(request.size, request.alignment);
    
    // 寻找合适的内存块
    for (const [address, block] of this.memoryBlocks) {
      if (block.free && block.size >= alignedSize) {
        // 分配内存
        this.memoryBlocks.set(address, { size: alignedSize, free: false });
        
        // 如果有剩余空间，创建新的空闲块
        if (block.size > alignedSize) {
          this.memoryBlocks.set(address + alignedSize, {
            size: block.size - alignedSize,
            free: true
          });
        }
        
        return {
          success: true,
          address,
          actualSize: alignedSize
        };
      }
    }
    
    return { success: false };
  }

  private alignSize(size: number, alignment: number): number {
    return Math.ceil(size / alignment) * alignment;
  }

  private calculateFragmentation(): number {
    let totalFree = 0;
    let largestFreeBlock = 0;
    
    for (const block of this.memoryBlocks.values()) {
      if (block.free) {
        totalFree += block.size;
        largestFreeBlock = Math.max(largestFreeBlock, block.size);
      }
    }
    
    if (totalFree === 0) return 0;
    return 1 - (largestFreeBlock / totalFree);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculatePredictionConfidence(pattern: MemoryPattern): number {
    let confidence = 0.8; // 基础可信度
    
    // 数据点越多，可信度越高
    if (pattern.allocationSizes.length > 100) {
      confidence += 0.1;
    } else if (pattern.allocationSizes.length < 10) {
      confidence -= 0.2;
    }
    
    // 模式一致性影响可信度
    const variance = this.calculateVariance(pattern.allocationSizes);
    const mean = pattern.allocationSizes.reduce((a, b) => a + b, 0) / pattern.allocationSizes.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    if (coefficientOfVariation < 0.3) {
      confidence += 0.1; // 模式稳定
    } else if (coefficientOfVariation > 1.0) {
      confidence -= 0.1; // 模式不稳定
    }
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  private generateMitigationStrategies(fragmentation: number, pattern: MemoryPattern): string[] {
    const strategies: string[] = [];
    
    if (fragmentation > 0.15) {
      strategies.push('使用内存池管理减少碎片化');
      strategies.push('实施内存压缩和整理策略');
    }
    
    if (fragmentation > 0.1) {
      strategies.push('优化内存分配顺序');
      strategies.push('使用固定大小的内存块');
    }
    
    if (pattern.deallocationPattern === 'random') {
      strategies.push('改进内存释放策略，避免随机释放');
    }
    
    if (pattern.peakMemoryRatio > 0.9) {
      strategies.push('增加内存容量或使用内存交换');
    }
    
    return strategies;
  }
}

/**
 * 利用率计算器类
 */
export class UtilizationCalculator {
  private config: UtilizationConfig;
  private simulator: MemoryAllocationSimulator;

  constructor(config: UtilizationConfig = DEFAULT_UTILIZATION_CONFIG) {
    this.config = config;
    this.simulator = new MemoryAllocationSimulator(0);
  }

  /**
   * 计算标准化利用率
   * 统一理论利用率和实际利用率的计算公式
   * @param memoryNeededBytes 需要的内存（字节）
   * @param gpuMemoryBytes GPU总内存（字节）
   * @param config 利用率配置
   * @returns 标准化利用率结果
   */
  static calculateStandardizedUtilization(
    memoryNeededBytes: number,
    gpuMemoryBytes: number,
    config: UtilizationConfig
  ): StandardizedUtilizationResult {
    // 输入验证
    if (memoryNeededBytes < 0 || gpuMemoryBytes <= 0) {
      throw new Error('内存参数必须为正数');
    }

    // 计算系统开销（转换为字节）
    const systemOverheadBytes = MemoryUnitConverter.gbToBytes(
      config.systemReservedMemory + config.driverOverhead
    );
    
    // 计算可用内存
    const availableBytes = Math.max(0, gpuMemoryBytes - systemOverheadBytes);
    
    // 计算碎片化损失
    const fragmentationBytes = memoryNeededBytes * config.memoryFragmentationFactor;
    const totalNeededBytes = memoryNeededBytes + fragmentationBytes;
    
    // 计算理论利用率（基于GPU总内存）
    const theoreticalUtilization = Math.max(0, memoryNeededBytes / gpuMemoryBytes);
    
    // 计算实际利用率（基于可用内存）
    const practicalUtilization = availableBytes > 0 ? 
      Math.max(0, totalNeededBytes / availableBytes) : 
      Number.POSITIVE_INFINITY;
    
    // 计算显示用的利用率百分比
    const utilizationPercentage = Math.max(0, practicalUtilization * 100);
    
    // 判断是否超出容量
    const isOverCapacity = practicalUtilization > 1.0;
    
    // 确保利用率在合理范围内
    const boundedTheoreticalUtilization = Math.min(10.0, theoreticalUtilization);
    const boundedPracticalUtilization = isFinite(practicalUtilization) ? 
      Math.min(10.0, practicalUtilization) : 10.0;
    
    // 计算效率等级
    const efficiencyRating = this.determineEfficiencyRating(boundedPracticalUtilization);

    return {
      theoreticalUtilization: boundedTheoreticalUtilization,
      practicalUtilization: boundedPracticalUtilization,
      utilizationPercentage: Math.min(1000, utilizationPercentage), // 限制最大显示为1000%
      isOverCapacity,
      efficiencyRating
    };
  }

  /**
   * 确定效率等级评定
   * @param utilization 实际利用率
   * @returns 效率等级
   */
  private static determineEfficiencyRating(utilization: number): 'excellent' | 'good' | 'fair' | 'poor' {
    // 边界条件处理
    if (!isFinite(utilization) || utilization < 0) {
      return 'poor';
    }

    // 效率等级评定逻辑
    if (utilization >= 0.7 && utilization <= 0.85) {
      return 'excellent'; // 70-85% 为最佳利用率
    } else if (utilization >= 0.5 && utilization <= 0.95) {
      return 'good';      // 50-95% 为良好利用率（排除excellent范围）
    } else if (utilization >= 0.3 && utilization <= 1.0) {
      return 'fair';      // 30-100% 为一般利用率（排除good范围）
    } else {
      return 'poor';      // 其他情况为差
    }
  }

  /**
   * 计算真实内存利用率
   */
  calculateRealUtilization(
    memoryNeeded: number,
    gpuMemory: number,
    config: UtilizationConfig = this.config
  ): UtilizationResult {
    // 计算系统开销
    const systemOverhead = config.systemReservedMemory + config.driverOverhead;
    const availableMemory = gpuMemory - systemOverhead;
    
    // 计算碎片化损失
    const fragmentationLoss = memoryNeeded * config.memoryFragmentationFactor;
    
    // 计算安全缓冲
    const safetyBuffer = availableMemory * config.safetyMargin;
    
    // 计算实际需要的内存（包含开销）
    const totalMemoryNeeded = memoryNeeded + fragmentationLoss;
    
    // 计算利用率
    const theoreticalUtilization = memoryNeeded / gpuMemory;
    const practicalUtilization = totalMemoryNeeded / (availableMemory - safetyBuffer);
    
    // 计算浪费的内存
    const wastedMemory = systemOverhead + fragmentationLoss + safetyBuffer;
    
    // 计算利用率评分
    const utilizationScore = this.calculateUtilizationScore(practicalUtilization);
    
    // 生成效率等级
    const efficiency = this.determineEfficiency(practicalUtilization, utilizationScore);
    
    // 生成优化建议
    const recommendations = this.generateUtilizationRecommendations(
      practicalUtilization, theoreticalUtilization, config
    );

    return {
      theoreticalUtilization,
      practicalUtilization: Math.max(0, practicalUtilization),
      fragmentationLoss,
      systemOverhead,
      safetyBuffer,
      recommendations,
      efficiency,
      details: {
        totalMemoryNeeded,
        availableMemory,
        wastedMemory,
        utilizationScore
      }
    };
  }

  /**
   * 计算多卡配置效率
   */
  calculateMultiCardEfficiency(
    memoryNeeded: number,
    singleCardMemory: number,
    cardCount: number
  ): MultiCardResult {
    const totalRawMemory = singleCardMemory * cardCount;
    
    // 计算通信开销
    const communicationOverhead = totalRawMemory * this.config.multiCardCommunicationOverhead;
    const totalEffectiveMemory = totalRawMemory - communicationOverhead;
    
    // 计算负载均衡效率
    const loadBalancingEfficiency = this.calculateLoadBalancingEfficiency(cardCount);
    
    // 计算扩展因子
    const scalingFactor = (totalEffectiveMemory * loadBalancingEfficiency) / singleCardMemory;
    
    // 计算最优卡数（不使用递归调用）
    const optimalCardCount = this.calculateOptimalCardCountSimple(memoryNeeded, singleCardMemory);
    
    // 计算每卡利用率
    const perCardUtilization = this.calculatePerCardUtilization(
      memoryNeeded, singleCardMemory, cardCount, loadBalancingEfficiency
    );
    
    // 计算成本效率
    const costEfficiency = this.calculateCostEfficiency(
      memoryNeeded, singleCardMemory, cardCount, scalingFactor
    );
    
    // 生成多卡优化建议
    const recommendations = this.generateMultiCardRecommendations(
      cardCount, optimalCardCount, scalingFactor, loadBalancingEfficiency
    );

    return {
      totalEffectiveMemory,
      communicationOverhead,
      loadBalancingEfficiency,
      scalingFactor,
      optimalCardCount,
      perCardUtilization,
      recommendations,
      costEfficiency
    };
  }

  /**
   * 模拟内存分配过程
   */
  simulateMemoryFragmentation(
    allocations: AllocationRequest[]
  ): AllocationResult {
    return this.simulator.simulateAllocation(
      allocations.reduce((sum, req) => sum + req.size, 0) * 1.5, // 假设有50%额外空间
      allocations
    );
  }

  private calculateUtilizationScore(utilization: number): number {
    // 最优利用率在70-85%之间
    const optimalRange = { min: 0.7, max: 0.85 };
    
    if (utilization >= optimalRange.min && utilization <= optimalRange.max) {
      return 100;
    } else if (utilization < optimalRange.min) {
      // 利用率过低
      return Math.max(0, (utilization / optimalRange.min) * 80);
    } else {
      // 利用率过高
      const overUtilization = utilization - optimalRange.max;
      return Math.max(20, 80 - (overUtilization * 200));
    }
  }

  private determineEfficiency(
    practicalUtilization: number, 
    utilizationScore: number
  ): 'high' | 'medium' | 'low' {
    if (utilizationScore >= 80 && practicalUtilization <= 0.9) {
      return 'high';
    } else if (utilizationScore >= 50 && practicalUtilization <= 0.95) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateUtilizationRecommendations(
    practicalUtilization: number,
    theoreticalUtilization: number,
    config: UtilizationConfig
  ): string[] {
    const recommendations: string[] = [];
    
    if (practicalUtilization < 0.5) {
      recommendations.push('内存利用率过低，考虑使用更小的GPU或增加批处理大小');
    } else if (practicalUtilization > 0.95) {
      recommendations.push('内存利用率过高，存在OOM风险，建议使用更大的GPU');
    }
    
    const utilizationGap = practicalUtilization - theoreticalUtilization;
    if (utilizationGap > 0.2) {
      recommendations.push('系统开销较大，考虑优化内存分配策略');
    }
    
    if (config.memoryFragmentationFactor > 0.1) {
      recommendations.push('内存碎片化严重，建议使用内存池或预分配策略');
    }
    
    if (config.safetyMargin > 0.2) {
      recommendations.push('安全边距过大，可以适当降低以提高利用率');
    }
    
    return recommendations;
  }

  private calculateLoadBalancingEfficiency(cardCount: number): number {
    // 负载均衡效率随卡数递减
    if (cardCount === 1) return 1.0;
    if (cardCount === 2) return 0.95;
    if (cardCount <= 4) return 0.90;
    if (cardCount <= 8) return 0.85;
    return 0.80; // 8卡以上
  }

  private calculateOptimalCardCountSimple(memoryNeeded: number, singleCardMemory: number): number {
    // 简化的最优卡数计算，避免递归调用
    const baseCardCount = Math.ceil(memoryNeeded / singleCardMemory);
    
    // 基于经验公式计算最优卡数
    if (baseCardCount === 1) return 1;
    
    // 考虑通信开销和负载均衡效率的影响
    const communicationPenalty = this.config.multiCardCommunicationOverhead;
    const loadBalancingPenalty = 1 - this.calculateLoadBalancingEfficiency(baseCardCount);
    
    const totalPenalty = communicationPenalty + loadBalancingPenalty;
    
    // 如果惩罚过大，建议减少卡数
    if (totalPenalty > 0.3 && baseCardCount > 2) {
      return Math.max(2, baseCardCount - 1);
    }
    
    return baseCardCount;
  }

  private calculatePerCardUtilization(
    memoryNeeded: number,
    singleCardMemory: number,
    cardCount: number,
    loadBalancingEfficiency: number
  ): number[] {
    const perCardMemory = memoryNeeded / cardCount;
    const baseUtilization = perCardMemory / singleCardMemory;
    
    // 模拟负载不均衡
    const utilizations: number[] = [];
    for (let i = 0; i < cardCount; i++) {
      const imbalanceFactor = 1 + (Math.random() - 0.5) * (1 - loadBalancingEfficiency);
      utilizations.push(baseUtilization * imbalanceFactor);
    }
    
    return utilizations;
  }

  private calculateCostEfficiency(
    memoryNeeded: number,
    singleCardMemory: number,
    cardCount: number,
    scalingFactor: number
  ): number {
    const singleCardUtilization = memoryNeeded / singleCardMemory;
    
    // 成本效率 = 性能提升 / 成本增加
    const performanceGain = scalingFactor;
    const costIncrease = cardCount;
    
    const efficiency = (performanceGain / costIncrease) * 100;
    
    // 考虑单卡利用率的影响
    if (singleCardUtilization < 1.0) {
      return efficiency * 0.7; // 单卡就够用时，多卡效率降低
    }
    
    return Math.min(100, efficiency);
  }

  private generateMultiCardRecommendations(
    cardCount: number,
    optimalCardCount: number,
    scalingFactor: number,
    loadBalancingEfficiency: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (cardCount > optimalCardCount) {
      recommendations.push(`当前配置使用${cardCount}卡，建议使用${optimalCardCount}卡以获得更好的成本效率`);
    } else if (cardCount < optimalCardCount) {
      recommendations.push(`当前配置可能内存不足，建议增加到${optimalCardCount}卡`);
    }
    
    if (scalingFactor < cardCount * 0.8) {
      recommendations.push('多卡扩展效率较低，考虑使用更大显存的单卡');
    }
    
    if (loadBalancingEfficiency < 0.9) {
      recommendations.push('负载均衡效率较低，检查数据并行策略');
    }
    
    if (cardCount > 4) {
      recommendations.push('大规模多卡配置需要优化通信拓扑和带宽');
    }
    
    return recommendations;
  }
}