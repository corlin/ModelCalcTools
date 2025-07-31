import { GPUEfficiencyUpdater } from '../gpuEfficiencyUpdater';
import { EnhancedGPUHardware } from '../../types';

describe('GPUEfficiencyUpdater', () => {
  let updater: GPUEfficiencyUpdater;
  let mockGPU: EnhancedGPUHardware;

  beforeEach(() => {
    updater = new GPUEfficiencyUpdater();
    
    mockGPU = {
      id: 'test-gpu',
      name: 'Test GPU',
      manufacturer: 'nvidia',
      architecture: 'Ada Lovelace',
      memorySize: 24,
      memoryType: 'GDDR6X',
      memoryBandwidth: 1008,
      computeUnits: 16384,
      baseClock: 2230,
      boostClock: 2520,
      tdp: 450,
      price: {
        msrp: 1599,
        currentPrice: 1699,
        regionPrices: { 'US': 1699 },
        currency: 'USD',
        lastUpdated: new Date('2024-01-15')
      },
      availability: {
        status: 'available',
        leadTime: 0,
        stockLevel: 'high',
        lastChecked: new Date('2024-01-15')
      },
      efficiency: {
        overall: 85, // 旧的评分，将被更新
        performance: 80,
        efficiency: 75,
        powerEfficiency: 70,
        costEffectiveness: 65,
        reliability: 90,
        confidence: 0.8
      },
      benchmarks: {
        llmInference: {
          tokensPerSecond: 2847,
          memoryEfficiency: 0.87,
          powerEfficiency: 6.33
        },
        llmTraining: {
          samplesPerSecond: 156,
          gradientThroughput: 1.2,
          memoryUtilization: 0.92
        },
        syntheticBenchmarks: {
          fp16Performance: 165.2,
          int8Performance: 660.8,
          memoryBandwidthUtilization: 0.85
        },
        testConditions: {
          modelSize: '7B',
          batchSize: 1,
          sequenceLength: 2048,
          precision: 'fp16',
          framework: 'PyTorch'
        }
      },
      lastUpdated: new Date('2024-01-15'),
      dataSource: 'manufacturer_official',
      verified: true
    };
  });

  describe('updateGPUEfficiency', () => {
    it('should update GPU efficiency rating', () => {
      const updatedGPU = updater.updateGPUEfficiency(mockGPU);
      
      expect(updatedGPU.efficiency.overall).toBeDefined();
      expect(updatedGPU.efficiency.overall).toBeGreaterThan(0);
      expect(updatedGPU.efficiency.overall).toBeLessThanOrEqual(100);
      
      // 其他属性应该保持不变
      expect(updatedGPU.id).toBe(mockGPU.id);
      expect(updatedGPU.name).toBe(mockGPU.name);
      expect(updatedGPU.benchmarks).toEqual(mockGPU.benchmarks);
    });

    it('should update efficiency with different workload types', () => {
      const inferenceGPU = updater.updateGPUEfficiency(mockGPU, 'inference');
      const trainingGPU = updater.updateGPUEfficiency(mockGPU, 'training');
      
      // 不同工作负载应该产生不同的评分
      expect(inferenceGPU.efficiency.overall).not.toBe(trainingGPU.efficiency.overall);
    });

    it('should include breakdown information', () => {
      const updatedGPU = updater.updateGPUEfficiency(mockGPU);
      
      expect(updatedGPU.efficiency.breakdown).toBeDefined();
      expect(updatedGPU.efficiency.breakdown?.computePerformance).toBeDefined();
      expect(updatedGPU.efficiency.breakdown?.memoryPerformance).toBeDefined();
      expect(updatedGPU.efficiency.breakdown?.powerEfficiency).toBeDefined();
      expect(updatedGPU.efficiency.breakdown?.costEffectiveness).toBeDefined();
    });
  });

  describe('updateBatchEfficiency', () => {
    it('should update efficiency for multiple GPUs', () => {
      const gpu2 = { ...mockGPU, id: 'gpu2', name: 'GPU 2' };
      const gpus = [mockGPU, gpu2];
      
      const updatedGPUs = updater.updateBatchEfficiency(gpus);
      
      expect(updatedGPUs).toHaveLength(2);
      updatedGPUs.forEach(gpu => {
        expect(gpu.efficiency.overall).toBeGreaterThan(0);
        expect(gpu.efficiency.overall).toBeLessThanOrEqual(100);
        expect(gpu.efficiency.confidence).toBeGreaterThan(0);
        expect(gpu.efficiency.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty array', () => {
      const updatedGPUs = updater.updateBatchEfficiency([]);
      expect(updatedGPUs).toHaveLength(0);
    });
  });

  describe('validateEfficiencyConsistency', () => {
    it('should validate consistent efficiency data', () => {
      const validation = updater.validateEfficiencyConsistency(mockGPU);
      
      expect(validation.isConsistent).toBeDefined();
      expect(validation.issues).toBeInstanceOf(Array);
      expect(validation.recommendations).toBeInstanceOf(Array);
    });

    it('should detect out-of-range values', () => {
      const invalidGPU = {
        ...mockGPU,
        efficiency: {
          ...mockGPU.efficiency,
          overall: 150, // 超出范围
          confidence: 1.5 // 超出范围
        }
      };
      
      const validation = updater.validateEfficiencyConsistency(invalidGPU);
      
      expect(validation.isConsistent).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues.some(issue => issue.includes('综合评分超出范围'))).toBe(true);
      expect(validation.issues.some(issue => issue.includes('可信度超出范围'))).toBe(true);
    });

    it('should detect logical inconsistencies', () => {
      const inconsistentGPU = {
        ...mockGPU,
        efficiency: {
          ...mockGPU.efficiency,
          overall: 95, // 高评分
          confidence: 0.3 // 但低可信度
        }
      };
      
      const validation = updater.validateEfficiencyConsistency(inconsistentGPU);
      
      expect(validation.isConsistent).toBe(false);
      expect(validation.issues.some(issue => issue.includes('高评分但低可信度'))).toBe(true);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect price-performance inconsistencies', () => {
      const inconsistentGPU = {
        ...mockGPU,
        price: { ...mockGPU.price, currentPrice: 1500 }, // 低价
        efficiency: {
          ...mockGPU.efficiency,
          costEffectiveness: 30 // 但成本效益评分很低
        }
      };
      
      const validation = updater.validateEfficiencyConsistency(inconsistentGPU);
      
      expect(validation.isConsistent).toBe(false);
      expect(validation.issues.some(issue => issue.includes('成本效益评分过低'))).toBe(true);
    });

    it('should detect power efficiency inconsistencies', () => {
      const inconsistentGPU = {
        ...mockGPU,
        tdp: 600, // 高功耗
        efficiency: {
          ...mockGPU.efficiency,
          powerEfficiency: 95 // 但功耗效率评分很高
        }
      };
      
      const validation = updater.validateEfficiencyConsistency(inconsistentGPU);
      
      expect(validation.isConsistent).toBe(false);
      expect(validation.issues.some(issue => issue.includes('功耗效率评分过高'))).toBe(true);
    });
  });

  describe('generateEfficiencyReport', () => {
    it('should generate comprehensive efficiency report', () => {
      const gpu2 = {
        ...mockGPU,
        id: 'gpu2',
        name: 'GPU 2',
        efficiency: { ...mockGPU.efficiency, overall: 75 }
      };
      const gpu3 = {
        ...mockGPU,
        id: 'gpu3',
        name: 'GPU 3',
        efficiency: { ...mockGPU.efficiency, overall: 95 }
      };
      
      const gpus = [mockGPU, gpu2, gpu3];
      const report = updater.generateEfficiencyReport(gpus);
      
      expect(report.summary).toBeDefined();
      expect(report.summary.totalGPUs).toBe(3);
      expect(report.summary.averageRating).toBeGreaterThan(0);
      expect(report.summary.highPerformanceCount).toBeGreaterThanOrEqual(0);
      expect(report.summary.consistencyIssues).toBeGreaterThanOrEqual(0);
      
      expect(report.topPerformers).toBeInstanceOf(Array);
      expect(report.topPerformers.length).toBeLessThanOrEqual(5);
      expect(report.topPerformers.length).toBeLessThanOrEqual(gpus.length);
      
      expect(report.improvementSuggestions).toBeInstanceOf(Array);
    });

    it('should identify high performance GPUs correctly', () => {
      const highPerfGPU = {
        ...mockGPU,
        id: 'high-perf',
        efficiency: { ...mockGPU.efficiency, overall: 90 }
      };
      const lowPerfGPU = {
        ...mockGPU,
        id: 'low-perf',
        efficiency: { ...mockGPU.efficiency, overall: 70 }
      };
      
      const gpus = [highPerfGPU, lowPerfGPU];
      const report = updater.generateEfficiencyReport(gpus);
      
      expect(report.summary.highPerformanceCount).toBe(1);
      expect(report.topPerformers[0].gpu.id).toBe('high-perf');
    });

    it('should sort top performers correctly', () => {
      const gpus = [
        { ...mockGPU, id: 'gpu1', efficiency: { ...mockGPU.efficiency, overall: 70 } },
        { ...mockGPU, id: 'gpu2', efficiency: { ...mockGPU.efficiency, overall: 90 } },
        { ...mockGPU, id: 'gpu3', efficiency: { ...mockGPU.efficiency, overall: 80 } }
      ];
      
      const report = updater.generateEfficiencyReport(gpus);
      
      expect(report.topPerformers[0].gpu.id).toBe('gpu2'); // 最高分
      expect(report.topPerformers[1].gpu.id).toBe('gpu3'); // 中等分
      expect(report.topPerformers[2].gpu.id).toBe('gpu1'); // 最低分
    });
  });

  describe('compareGPUEfficiency', () => {
    it('should compare two GPUs correctly', () => {
      const gpu2 = {
        ...mockGPU,
        id: 'gpu2',
        name: 'GPU 2',
        efficiency: {
          ...mockGPU.efficiency,
          overall: 75,
          performance: 70,
          powerEfficiency: 80
        }
      };
      
      const comparison = updater.compareGPUEfficiency(mockGPU, gpu2);
      
      expect(comparison.winner).toBeDefined();
      expect(comparison.winner.efficiency.overall).toBeGreaterThanOrEqual(
        Math.min(mockGPU.efficiency.overall, gpu2.efficiency.overall)
      );
      
      expect(comparison.comparison).toBeDefined();
      expect(comparison.comparison.overall.gpu1).toBe(mockGPU.efficiency.overall);
      expect(comparison.comparison.overall.gpu2).toBe(gpu2.efficiency.overall);
      expect(comparison.comparison.overall.difference).toBe(
        mockGPU.efficiency.overall - gpu2.efficiency.overall
      );
      
      expect(comparison.recommendation).toBeDefined();
      expect(comparison.recommendation.length).toBeGreaterThan(0);
    });

    it('should identify winner correctly', () => {
      const strongerGPU = {
        ...mockGPU,
        efficiency: { ...mockGPU.efficiency, overall: 90 }
      };
      const weakerGPU = {
        ...mockGPU,
        id: 'weaker',
        name: 'Weaker GPU',
        efficiency: { ...mockGPU.efficiency, overall: 70 }
      };
      
      const comparison = updater.compareGPUEfficiency(strongerGPU, weakerGPU);
      
      expect(comparison.winner.id).toBe(strongerGPU.id);
      expect(comparison.comparison.overall.difference).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', () => {
      const gpu1 = {
        ...mockGPU,
        name: 'GPU A',
        efficiency: {
          ...mockGPU.efficiency,
          overall: 85,
          performance: 90,
          powerEfficiency: 70
        }
      };
      const gpu2 = {
        ...mockGPU,
        id: 'gpu2',
        name: 'GPU B',
        efficiency: {
          ...mockGPU.efficiency,
          overall: 80,
          performance: 70,
          powerEfficiency: 90
        }
      };
      
      const comparison = updater.compareGPUEfficiency(gpu1, gpu2);
      
      expect(comparison.recommendation).toContain('GPU A');
      expect(comparison.recommendation.length).toBeGreaterThan(10);
    });

    it('should handle close scores appropriately', () => {
      const gpu2 = {
        ...mockGPU,
        id: 'gpu2',
        name: 'GPU 2',
        efficiency: {
          ...mockGPU.efficiency,
          overall: mockGPU.efficiency.overall + 2 // 很接近的分数
        }
      };
      
      const comparison = updater.compareGPUEfficiency(mockGPU, gpu2);
      
      expect(comparison.recommendation).toContain('略胜一筹');
    });
  });

  describe('identifyStrengths', () => {
    it('should identify performance strengths', () => {
      const highPerfGPU = {
        ...mockGPU,
        efficiency: { ...mockGPU.efficiency, performance: 95 }
      };
      
      // 使用反射访问私有方法进行测试
      const strengths = (updater as any).identifyStrengths(highPerfGPU);
      
      expect(strengths).toContain('卓越性能');
    });

    it('should identify architecture strengths', () => {
      const hopperGPU = { ...mockGPU, architecture: 'Hopper' };
      const adaGPU = { ...mockGPU, architecture: 'Ada Lovelace' };
      
      const hopperStrengths = (updater as any).identifyStrengths(hopperGPU);
      const adaStrengths = (updater as any).identifyStrengths(adaGPU);
      
      expect(hopperStrengths).toContain('最新Hopper架构');
      expect(adaStrengths).toContain('先进Ada Lovelace架构');
    });

    it('should identify memory strengths', () => {
      const largeMemoryGPU = { ...mockGPU, memorySize: 80 };
      const highBandwidthGPU = { ...mockGPU, memoryBandwidth: 2500 };
      
      const largeMemoryStrengths = (updater as any).identifyStrengths(largeMemoryGPU);
      const highBandwidthStrengths = (updater as any).identifyStrengths(highBandwidthGPU);
      
      expect(largeMemoryStrengths).toContain('超大显存容量');
      expect(highBandwidthStrengths).toContain('超高内存带宽');
    });
  });
});