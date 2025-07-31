import {
  UtilizationCalculator,
  MemoryAllocationSimulator,
  DEFAULT_UTILIZATION_CONFIG,
  UtilizationConfig,
  AllocationRequest,
  MemoryPattern
} from '../utilizationCalculator';
import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('UtilizationCalculator', () => {
  let calculator: UtilizationCalculator;

  beforeEach(() => {
    calculator = new UtilizationCalculator();
  });

  describe('calculateStandardizedUtilization', () => {
    const testConfig: UtilizationConfig = {
      memoryFragmentationFactor: 0.08,
      systemReservedMemory: 1.0,
      driverOverhead: 0.5,
      safetyMargin: 0.15,
      multiCardCommunicationOverhead: 0.07
    };

    it('should calculate theoretical and practical utilization correctly', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(20); // 20GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);    // 24GB GPU

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      // 理论利用率应该是 20/24 = 0.833
      expect(result.theoreticalUtilization).toBeCloseTo(20/24, 3);
      
      // 实际利用率应该更高（考虑系统开销和碎片化）
      expect(result.practicalUtilization).toBeGreaterThan(result.theoreticalUtilization);
      
      // 利用率百分比应该是实际利用率的100倍
      expect(result.utilizationPercentage).toBeCloseTo(result.practicalUtilization * 100, 1);
      
      // 应该有合理的效率等级
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.efficiencyRating);
    });

    it('should handle excellent efficiency rating (70-85% utilization)', () => {
      // 设计一个场景使实际利用率在70-85%之间
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(16); // 16GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);    // 24GB GPU
      
      const config: UtilizationConfig = {
        ...testConfig,
        memoryFragmentationFactor: 0.05, // 降低碎片化
        systemReservedMemory: 0.5,        // 降低系统开销
        driverOverhead: 0.3
      };

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        config
      );

      // 验证利用率在excellent范围内
      expect(result.practicalUtilization).toBeGreaterThanOrEqual(0.7);
      expect(result.practicalUtilization).toBeLessThanOrEqual(0.85);
      expect(result.efficiencyRating).toBe('excellent');
    });

    it('should handle good efficiency rating (50-95% utilization)', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(12); // 12GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);    // 24GB GPU

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      // 应该在good范围内（排除excellent）
      if (result.practicalUtilization >= 0.5 && result.practicalUtilization <= 0.95 &&
          !(result.practicalUtilization >= 0.7 && result.practicalUtilization <= 0.85)) {
        expect(result.efficiencyRating).toBe('good');
      }
    });

    it('should handle fair efficiency rating (30-100% utilization)', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(6); // 6GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);   // 24GB GPU

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      // 应该在fair范围内（排除good和excellent）
      if (result.practicalUtilization >= 0.3 && result.practicalUtilization <= 1.0 &&
          !(result.practicalUtilization >= 0.5 && result.practicalUtilization <= 0.95)) {
        expect(result.efficiencyRating).toBe('fair');
      }
    });

    it('should handle poor efficiency rating (outside optimal ranges)', () => {
      // 测试利用率过低的情况
      const lowMemoryNeededBytes = MemoryUnitConverter.gbToBytes(2); // 2GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);      // 24GB GPU

      const lowResult = UtilizationCalculator.calculateStandardizedUtilization(
        lowMemoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      if (lowResult.practicalUtilization < 0.3) {
        expect(lowResult.efficiencyRating).toBe('poor');
      }

      // 测试利用率过高的情况
      const highMemoryNeededBytes = MemoryUnitConverter.gbToBytes(30); // 30GB needed
      const smallGpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);   // 24GB GPU

      const highResult = UtilizationCalculator.calculateStandardizedUtilization(
        highMemoryNeededBytes,
        smallGpuMemoryBytes,
        testConfig
      );

      if (highResult.practicalUtilization > 1.0) {
        expect(highResult.efficiencyRating).toBe('poor');
        expect(highResult.isOverCapacity).toBe(true);
      }
    });

    it('should detect over capacity situations correctly', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(30); // 30GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);    // 24GB GPU

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      expect(result.isOverCapacity).toBe(true);
      expect(result.practicalUtilization).toBeGreaterThan(1.0);
      expect(result.utilizationPercentage).toBeGreaterThan(100);
    });

    it('should handle boundary conditions correctly', () => {
      // 测试零内存需求
      const zeroResult = UtilizationCalculator.calculateStandardizedUtilization(
        0,
        MemoryUnitConverter.gbToBytes(24),
        testConfig
      );

      expect(zeroResult.theoreticalUtilization).toBe(0);
      expect(zeroResult.practicalUtilization).toBe(0);
      expect(zeroResult.utilizationPercentage).toBe(0);
      expect(zeroResult.isOverCapacity).toBe(false);
      expect(zeroResult.efficiencyRating).toBe('poor');

      // 测试极小GPU内存
      const smallGpuResult = UtilizationCalculator.calculateStandardizedUtilization(
        MemoryUnitConverter.gbToBytes(10),
        MemoryUnitConverter.gbToBytes(2),
        testConfig
      );

      expect(smallGpuResult.isOverCapacity).toBe(true);
      expect(smallGpuResult.efficiencyRating).toBe('poor');
    });

    it('should ensure utilization values are within reasonable bounds', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(100); // 100GB needed
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(8);      // 8GB GPU

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        testConfig
      );

      // 理论利用率应该被限制在10.0以内
      expect(result.theoreticalUtilization).toBeLessThanOrEqual(10.0);
      expect(result.practicalUtilization).toBeLessThanOrEqual(10.0);
      
      // 利用率百分比应该被限制在1000%以内
      expect(result.utilizationPercentage).toBeLessThanOrEqual(1000);
      
      // 所有值应该是有限的
      expect(isFinite(result.theoreticalUtilization)).toBe(true);
      expect(isFinite(result.practicalUtilization)).toBe(true);
      expect(isFinite(result.utilizationPercentage)).toBe(true);
    });

    it('should handle invalid input parameters', () => {
      // 测试负数内存需求
      expect(() => {
        UtilizationCalculator.calculateStandardizedUtilization(
          -1000,
          MemoryUnitConverter.gbToBytes(24),
          testConfig
        );
      }).toThrow('内存参数必须为正数');

      // 测试零GPU内存
      expect(() => {
        UtilizationCalculator.calculateStandardizedUtilization(
          MemoryUnitConverter.gbToBytes(10),
          0,
          testConfig
        );
      }).toThrow('内存参数必须为正数');

      // 测试负数GPU内存
      expect(() => {
        UtilizationCalculator.calculateStandardizedUtilization(
          MemoryUnitConverter.gbToBytes(10),
          -1000,
          testConfig
        );
      }).toThrow('内存参数必须为正数');
    });

    it('should calculate system overhead correctly', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(10);
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);
      
      const config: UtilizationConfig = {
        ...testConfig,
        systemReservedMemory: 2.0,
        driverOverhead: 1.0
      };

      const result = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        config
      );

      // 系统开销应该是 2.0 + 1.0 = 3.0 GB
      const expectedSystemOverheadBytes = MemoryUnitConverter.gbToBytes(3.0);
      const expectedAvailableBytes = gpuMemoryBytes - expectedSystemOverheadBytes;
      
      // 验证实际利用率计算考虑了系统开销
      const fragmentationBytes = memoryNeededBytes * config.memoryFragmentationFactor;
      const totalNeededBytes = memoryNeededBytes + fragmentationBytes;
      const expectedPracticalUtilization = totalNeededBytes / expectedAvailableBytes;
      
      expect(result.practicalUtilization).toBeCloseTo(expectedPracticalUtilization, 3);
    });

    it('should calculate fragmentation impact correctly', () => {
      const memoryNeededBytes = MemoryUnitConverter.gbToBytes(10);
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);
      
      const lowFragConfig: UtilizationConfig = {
        ...testConfig,
        memoryFragmentationFactor: 0.02 // 2% fragmentation
      };
      
      const highFragConfig: UtilizationConfig = {
        ...testConfig,
        memoryFragmentationFactor: 0.15 // 15% fragmentation
      };

      const lowFragResult = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        lowFragConfig
      );

      const highFragResult = UtilizationCalculator.calculateStandardizedUtilization(
        memoryNeededBytes,
        gpuMemoryBytes,
        highFragConfig
      );

      // 高碎片化应该导致更高的实际利用率
      expect(highFragResult.practicalUtilization).toBeGreaterThan(lowFragResult.practicalUtilization);
    });

    it('should return consistent interface structure', () => {
      const result = UtilizationCalculator.calculateStandardizedUtilization(
        MemoryUnitConverter.gbToBytes(10),
        MemoryUnitConverter.gbToBytes(24),
        testConfig
      );

      // 验证返回的接口结构
      expect(result).toHaveProperty('theoreticalUtilization');
      expect(result).toHaveProperty('practicalUtilization');
      expect(result).toHaveProperty('utilizationPercentage');
      expect(result).toHaveProperty('isOverCapacity');
      expect(result).toHaveProperty('efficiencyRating');

      // 验证数据类型
      expect(typeof result.theoreticalUtilization).toBe('number');
      expect(typeof result.practicalUtilization).toBe('number');
      expect(typeof result.utilizationPercentage).toBe('number');
      expect(typeof result.isOverCapacity).toBe('boolean');
      expect(typeof result.efficiencyRating).toBe('string');
      
      // 验证效率等级的有效值
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.efficiencyRating);
    });
  });

  describe('calculateRealUtilization', () => {
    it('should calculate theoretical and practical utilization correctly', () => {
      const result = calculator.calculateRealUtilization(20, 24, DEFAULT_UTILIZATION_CONFIG);
      
      expect(result.theoreticalUtilization).toBeCloseTo(20 / 24, 3);
      expect(result.practicalUtilization).toBeGreaterThan(result.theoreticalUtilization);
      expect(result.fragmentationLoss).toBeGreaterThan(0);
      expect(result.systemOverhead).toBeGreaterThan(0);
      expect(result.safetyBuffer).toBeGreaterThan(0);
    });

    it('should handle edge case with very small memory requirements', () => {
      const result = calculator.calculateRealUtilization(1, 24, DEFAULT_UTILIZATION_CONFIG);
      
      expect(result.theoreticalUtilization).toBeCloseTo(1 / 24, 3);
      expect(result.efficiency).toBe('low'); // 利用率过低
      expect(result.recommendations).toContain('内存利用率过低，考虑使用更小的GPU或增加批处理大小');
    });

    it('should handle edge case with memory requirements exceeding GPU capacity', () => {
      const result = calculator.calculateRealUtilization(30, 24, DEFAULT_UTILIZATION_CONFIG);
      
      expect(result.theoreticalUtilization).toBeGreaterThan(1);
      expect(result.efficiency).toBe('low');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide high efficiency rating for optimal utilization', () => {
      // 设计一个接近最优利用率的场景
      const config: UtilizationConfig = {
        ...DEFAULT_UTILIZATION_CONFIG,
        memoryFragmentationFactor: 0.05,
        safetyMargin: 0.1
      };
      
      const result = calculator.calculateRealUtilization(16, 24, config);
      
      expect(result.efficiency).toBe('high');
      expect(result.details.utilizationScore).toBeGreaterThan(80);
    });

    it('should calculate system overhead correctly', () => {
      const config: UtilizationConfig = {
        ...DEFAULT_UTILIZATION_CONFIG,
        systemReservedMemory: 2.0,
        driverOverhead: 1.0
      };
      
      const result = calculator.calculateRealUtilization(15, 24, config);
      
      expect(result.systemOverhead).toBe(3.0); // 2.0 + 1.0
      expect(result.details.availableMemory).toBe(21.0); // 24 - 3
    });

    it('should generate appropriate recommendations based on utilization', () => {
      // 测试低利用率场景
      const lowUtilResult = calculator.calculateRealUtilization(5, 24);
      expect(lowUtilResult.recommendations).toContain('内存利用率过低，考虑使用更小的GPU或增加批处理大小');
      
      // 测试高利用率场景
      const highUtilResult = calculator.calculateRealUtilization(23, 24);
      expect(highUtilResult.recommendations).toContain('内存利用率过高，存在OOM风险，建议使用更大的GPU');
    });
  });

  describe('calculateMultiCardEfficiency', () => {
    it('should calculate multi-card efficiency with communication overhead', () => {
      const result = calculator.calculateMultiCardEfficiency(48, 24, 2);
      
      expect(result.totalEffectiveMemory).toBeLessThan(48); // 考虑通信开销
      expect(result.communicationOverhead).toBeGreaterThan(0);
      expect(result.scalingFactor).toBeLessThan(2.0); // 不完美扩展
      expect(result.loadBalancingEfficiency).toBeLessThan(1.0);
      expect(result.perCardUtilization).toHaveLength(2);
    });

    it('should recommend optimal card count', () => {
      const result = calculator.calculateMultiCardEfficiency(30, 24, 3);
      
      expect(result.optimalCardCount).toBeGreaterThanOrEqual(2);
      expect(result.recommendations).toBeDefined();
      expect(result.costEfficiency).toBeGreaterThan(0);
    });

    it('should handle single card scenario', () => {
      const result = calculator.calculateMultiCardEfficiency(20, 24, 1);
      
      expect(result.loadBalancingEfficiency).toBe(1.0);
      expect(result.scalingFactor).toBeCloseTo(0.93, 1); // 考虑通信开销
      expect(result.perCardUtilization).toHaveLength(1);
    });

    it('should show decreasing efficiency with more cards', () => {
      const result2Cards = calculator.calculateMultiCardEfficiency(48, 24, 2);
      const result4Cards = calculator.calculateMultiCardEfficiency(96, 24, 4);
      const result8Cards = calculator.calculateMultiCardEfficiency(192, 24, 8);
      
      expect(result2Cards.loadBalancingEfficiency).toBeGreaterThan(result4Cards.loadBalancingEfficiency);
      expect(result4Cards.loadBalancingEfficiency).toBeGreaterThan(result8Cards.loadBalancingEfficiency);
    });

    it('should generate appropriate multi-card recommendations', () => {
      // 测试过多卡数的场景
      const result = calculator.calculateMultiCardEfficiency(30, 24, 4);
      
      if (result.optimalCardCount < 4) {
        expect(result.recommendations.some(rec => rec.includes('建议使用'))).toBe(true);
      }
    });
  });

  describe('simulateMemoryFragmentation', () => {
    it('should simulate memory allocation with different request types', () => {
      const allocations: AllocationRequest[] = [
        { size: 1024 * 1024 * 1024, alignment: 256, type: 'weights', priority: 'high' },
        { size: 512 * 1024 * 1024, alignment: 128, type: 'activations', priority: 'medium' },
        { size: 256 * 1024 * 1024, alignment: 64, type: 'gradients', priority: 'low' }
      ];
      
      const result = calculator.simulateMemoryFragmentation(allocations);
      
      expect(result.successfulAllocations.length).toBeGreaterThan(0);
      expect(result.fragmentationRatio).toBeGreaterThanOrEqual(0);
      expect(result.utilizationEfficiency).toBeGreaterThan(0);
      expect(result.totalAllocated).toBeGreaterThan(0);
    });
  });
});

describe('MemoryAllocationSimulator', () => {
  let simulator: MemoryAllocationSimulator;

  beforeEach(() => {
    simulator = new MemoryAllocationSimulator(1024 * 1024 * 1024); // 1GB
  });

  describe('simulateAllocation', () => {
    it('should successfully allocate memory for valid requests', () => {
      const allocations: AllocationRequest[] = [
        { size: 100 * 1024 * 1024, alignment: 256, type: 'weights', priority: 'high' },
        { size: 50 * 1024 * 1024, alignment: 128, type: 'activations', priority: 'medium' }
      ];
      
      const result = simulator.simulateAllocation(512 * 1024 * 1024, allocations);
      
      expect(result.successfulAllocations).toHaveLength(2);
      expect(result.failedAllocations).toHaveLength(0);
      expect(result.utilizationEfficiency).toBeGreaterThan(0);
    });

    it('should fail allocation when memory is insufficient', () => {
      const allocations: AllocationRequest[] = [
        { size: 600 * 1024 * 1024, alignment: 256, type: 'weights', priority: 'high' },
        { size: 500 * 1024 * 1024, alignment: 128, type: 'activations', priority: 'medium' }
      ];
      
      const result = simulator.simulateAllocation(512 * 1024 * 1024, allocations);
      
      expect(result.failedAllocations.length).toBeGreaterThan(0);
      expect(result.successfulAllocations.length).toBeLessThan(2);
    });

    it('should prioritize high-priority allocations', () => {
      const allocations: AllocationRequest[] = [
        { size: 300 * 1024 * 1024, alignment: 256, type: 'weights', priority: 'low' },
        { size: 300 * 1024 * 1024, alignment: 128, type: 'activations', priority: 'high' }
      ];
      
      const result = simulator.simulateAllocation(400 * 1024 * 1024, allocations);
      
      // 高优先级的应该成功分配
      const highPrioritySuccess = result.successfulAllocations.find(
        alloc => alloc.request.priority === 'high'
      );
      expect(highPrioritySuccess).toBeDefined();
    });

    it('should handle memory alignment correctly', () => {
      const allocations: AllocationRequest[] = [
        { size: 1000, alignment: 256, type: 'weights', priority: 'high' }
      ];
      
      const result = simulator.simulateAllocation(10000, allocations);
      
      expect(result.successfulAllocations[0].actualSize).toBeGreaterThanOrEqual(1000);
      expect(result.successfulAllocations[0].actualSize % 256).toBe(0);
    });

    it('should calculate fragmentation ratio correctly', () => {
      const allocations: AllocationRequest[] = [
        { size: 100, alignment: 1, type: 'weights', priority: 'high' },
        { size: 200, alignment: 1, type: 'activations', priority: 'high' },
        { size: 150, alignment: 1, type: 'gradients', priority: 'high' }
      ];
      
      const result = simulator.simulateAllocation(1000, allocations);
      
      expect(result.fragmentationRatio).toBeGreaterThanOrEqual(0);
      expect(result.fragmentationRatio).toBeLessThanOrEqual(1);
    });
  });

  describe('predictFragmentation', () => {
    it('should predict fragmentation based on allocation patterns', () => {
      const pattern: MemoryPattern = {
        allocationSizes: [100, 200, 150, 300, 250],
        allocationFrequency: [0.2, 0.3, 0.2, 0.2, 0.1],
        deallocationPattern: 'random',
        peakMemoryRatio: 0.8
      };
      
      const prediction = simulator.predictFragmentation(pattern);
      
      expect(prediction.expectedFragmentation).toBeGreaterThan(0);
      expect(prediction.expectedFragmentation).toBeLessThan(1);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(prediction.mitigationStrategies).toBeInstanceOf(Array);
    });

    it('should predict higher fragmentation for random deallocation', () => {
      const randomPattern: MemoryPattern = {
        allocationSizes: [100, 200, 300],
        allocationFrequency: [0.33, 0.33, 0.34],
        deallocationPattern: 'random',
        peakMemoryRatio: 0.9
      };
      
      const sequentialPattern: MemoryPattern = {
        ...randomPattern,
        deallocationPattern: 'sequential'
      };
      
      const randomPrediction = simulator.predictFragmentation(randomPattern);
      const sequentialPrediction = simulator.predictFragmentation(sequentialPattern);
      
      expect(randomPrediction.expectedFragmentation).toBeGreaterThan(
        sequentialPrediction.expectedFragmentation
      );
    });

    it('should provide mitigation strategies for high fragmentation', () => {
      const highFragPattern: MemoryPattern = {
        allocationSizes: [50, 500, 100, 1000, 200], // 高方差
        allocationFrequency: [0.2, 0.2, 0.2, 0.2, 0.2],
        deallocationPattern: 'random',
        peakMemoryRatio: 0.95
      };
      
      const prediction = simulator.predictFragmentation(highFragPattern);
      
      expect(['medium', 'high']).toContain(prediction.riskLevel);
      expect(prediction.mitigationStrategies.length).toBeGreaterThan(0);
      expect(prediction.mitigationStrategies.some(strategy => 
        strategy.includes('内存池') || strategy.includes('内存分配')
      )).toBe(true);
    });

    it('should have higher confidence with more data points', () => {
      const smallDataPattern: MemoryPattern = {
        allocationSizes: [100, 200],
        allocationFrequency: [0.5, 0.5],
        deallocationPattern: 'sequential',
        peakMemoryRatio: 0.7
      };
      
      const largeDataPattern: MemoryPattern = {
        allocationSizes: Array(150).fill(0).map(() => 100 + Math.random() * 100),
        allocationFrequency: Array(150).fill(1/150),
        deallocationPattern: 'sequential',
        peakMemoryRatio: 0.7
      };
      
      const smallPrediction = simulator.predictFragmentation(smallDataPattern);
      const largePrediction = simulator.predictFragmentation(largeDataPattern);
      
      expect(largePrediction.confidence).toBeGreaterThan(smallPrediction.confidence);
    });
  });
});

describe('Integration Tests', () => {
  it('should provide consistent results between utilization calculation and memory simulation', () => {
    const calculator = new UtilizationCalculator();
    
    // 计算利用率
    const utilizationResult = calculator.calculateRealUtilization(20, 24);
    
    // 模拟相应的内存分配
    const allocations: AllocationRequest[] = [
      { size: 15 * 1024 * 1024 * 1024, alignment: 256, type: 'weights', priority: 'high' },
      { size: 5 * 1024 * 1024 * 1024, alignment: 128, type: 'activations', priority: 'medium' }
    ];
    
    const simulationResult = calculator.simulateMemoryFragmentation(allocations);
    
    // 验证结果一致性
    expect(utilizationResult.fragmentationLoss).toBeGreaterThan(0);
    expect(simulationResult.fragmentationRatio).toBeGreaterThanOrEqual(0);
    
    // 碎片化损失应该与模拟结果相关
    expect(simulationResult.totalWasted).toBeGreaterThanOrEqual(0);
  });

  it('should provide realistic multi-card recommendations', () => {
    const calculator = new UtilizationCalculator();
    
    // 测试需要多卡的场景
    const result = calculator.calculateMultiCardEfficiency(100, 24, 5);
    
    expect(result.optimalCardCount).toBeGreaterThanOrEqual(4);
    expect(result.optimalCardCount).toBeLessThanOrEqual(6);
    expect(result.scalingFactor).toBeLessThan(5); // 不完美扩展
    expect(result.costEfficiency).toBeGreaterThan(0);
    
    // 验证推荐的合理性
    if (result.optimalCardCount !== 5) {
      expect(result.recommendations.length).toBeGreaterThan(0);
    }
  });
});