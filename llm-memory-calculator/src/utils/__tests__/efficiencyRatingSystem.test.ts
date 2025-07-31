import { EfficiencyRatingSystem, RATING_WEIGHTS } from '../efficiencyRatingSystem';
import { EnhancedGPUHardware } from '../../types';

describe('EfficiencyRatingSystem', () => {
  let ratingSystem: EfficiencyRatingSystem;
  let mockGPU: EnhancedGPUHardware;

  beforeEach(() => {
    ratingSystem = new EfficiencyRatingSystem();
    
    // 创建模拟GPU数据
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
        overall: 92,
        performance: 95,
        efficiency: 90,
        powerEfficiency: 88,
        costEffectiveness: 89,
        reliability: 90,
        confidence: 0.95
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

  describe('calculateOverallRating', () => {
    it('should calculate overall rating with default mixed workload', () => {
      const rating = ratingSystem.calculateOverallRating(mockGPU);
      
      expect(rating.overall).toBeGreaterThan(0);
      expect(rating.overall).toBeLessThanOrEqual(100);
      expect(rating.confidence).toBeGreaterThan(0);
      expect(rating.confidence).toBeLessThanOrEqual(1);
      expect(rating.breakdown).toBeDefined();
    });

    it('should calculate different ratings for different workloads', () => {
      const inferenceRating = ratingSystem.calculateOverallRating(mockGPU, 'inference');
      const trainingRating = ratingSystem.calculateOverallRating(mockGPU, 'training');
      
      // 由于权重不同，评分应该有差异
      expect(inferenceRating.overall).not.toBe(trainingRating.overall);
      
      // 验证权重应用正确
      expect(inferenceRating.breakdown?.computePerformance.weight).toBe(RATING_WEIGHTS.inference.computePerformance);
      expect(trainingRating.breakdown?.computePerformance.weight).toBe(RATING_WEIGHTS.training.computePerformance);
    });

    it('should include detailed breakdown information', () => {
      const rating = ratingSystem.calculateOverallRating(mockGPU);
      
      expect(rating.breakdown).toBeDefined();
      expect(rating.breakdown?.computePerformance).toBeDefined();
      expect(rating.breakdown?.memoryPerformance).toBeDefined();
      expect(rating.breakdown?.powerEfficiency).toBeDefined();
      expect(rating.breakdown?.costEffectiveness).toBeDefined();
      
      // 验证每个分解项都有评分、权重和因素
      Object.values(rating.breakdown!).forEach(breakdown => {
        expect(breakdown.score).toBeGreaterThanOrEqual(0);
        expect(breakdown.score).toBeLessThanOrEqual(100);
        expect(breakdown.weight).toBeGreaterThan(0);
        expect(breakdown.factors).toBeInstanceOf(Array);
        expect(breakdown.factors.length).toBeGreaterThan(0);
      });
    });

    it('should handle edge cases gracefully', () => {
      // 测试极低性能GPU
      const lowPerformanceGPU = {
        ...mockGPU,
        benchmarks: {
          ...mockGPU.benchmarks,
          llmInference: {
            tokensPerSecond: 100,
            memoryEfficiency: 0.3,
            powerEfficiency: 1.0
          },
          syntheticBenchmarks: {
            fp16Performance: 10,
            int8Performance: 20,
            memoryBandwidthUtilization: 0.4
          }
        }
      };
      
      const rating = ratingSystem.calculateOverallRating(lowPerformanceGPU);
      expect(rating.overall).toBeGreaterThanOrEqual(0);
      expect(rating.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('getPerformanceScore', () => {
    it('should calculate performance score correctly', () => {
      const score = ratingSystem.getPerformanceScore(mockGPU.benchmarks);
      
      expect(score.normalizedScore).toBeGreaterThan(0);
      expect(score.normalizedScore).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeGreaterThan(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
      expect(score.factors).toBeInstanceOf(Array);
      expect(score.factors.length).toBeGreaterThan(0);
    });

    it('should include relevant performance factors', () => {
      const score = ratingSystem.getPerformanceScore(mockGPU.benchmarks);
      
      const factorsText = score.factors.join(' ');
      expect(factorsText).toContain('LLM推理');
      expect(factorsText).toContain('FP16计算');
      expect(factorsText).toContain('内存带宽');
    });

    it('should adjust confidence based on test conditions', () => {
      const standardBenchmarks = { ...mockGPU.benchmarks };
      const largeBenchmarks = {
        ...mockGPU.benchmarks,
        testConditions: {
          ...mockGPU.benchmarks.testConditions,
          modelSize: '70B'
        }
      };
      
      const standardScore = ratingSystem.getPerformanceScore(standardBenchmarks);
      const largeScore = ratingSystem.getPerformanceScore(largeBenchmarks);
      
      // 大模型测试的可信度应该稍低
      expect(largeScore.confidence).toBeLessThan(standardScore.confidence);
    });
  });

  describe('getEfficiencyScore', () => {
    it('should calculate efficiency score correctly', () => {
      const score = ratingSystem.getEfficiencyScore(mockGPU);
      
      expect(score.memoryEfficiency).toBeGreaterThan(0);
      expect(score.memoryEfficiency).toBeLessThanOrEqual(100);
      expect(score.computeEfficiency).toBeGreaterThan(0);
      expect(score.computeEfficiency).toBeLessThanOrEqual(100);
      expect(score.overallEfficiency).toBeGreaterThan(0);
      expect(score.overallEfficiency).toBeLessThanOrEqual(100);
      expect(score.confidence).toBeGreaterThan(0);
      expect(score.confidence).toBeLessThanOrEqual(1);
    });

    it('should apply architecture bonuses correctly', () => {
      const hopperGPU = { ...mockGPU, architecture: 'Hopper' };
      const ampereGPU = { ...mockGPU, architecture: 'Ampere' };
      const adaGPU = { ...mockGPU, architecture: 'Ada Lovelace' };
      
      const hopperScore = ratingSystem.getEfficiencyScore(hopperGPU);
      const ampereScore = ratingSystem.getEfficiencyScore(ampereGPU);
      const adaScore = ratingSystem.getEfficiencyScore(adaGPU);
      
      // Hopper应该有最高的架构加成
      expect(hopperScore.overallEfficiency).toBeGreaterThan(ampereScore.overallEfficiency);
      expect(adaScore.overallEfficiency).toBeGreaterThan(ampereScore.overallEfficiency);
      
      // 验证因素中包含架构信息
      expect(hopperScore.factors.some(f => f.includes('Hopper'))).toBe(true);
      expect(adaScore.factors.some(f => f.includes('Ada Lovelace'))).toBe(true);
    });
  });

  describe('getPowerEfficiencyScore', () => {
    it('should calculate power efficiency score correctly', () => {
      const score = ratingSystem.getPowerEfficiencyScore(mockGPU);
      
      expect(score.performancePerWatt).toBeGreaterThan(0);
      expect(score.performancePerWatt).toBeLessThanOrEqual(100);
      expect(score.thermalEfficiency).toBeGreaterThan(0);
      expect(score.thermalEfficiency).toBeLessThanOrEqual(100);
      expect(score.overallPowerScore).toBeGreaterThan(0);
      expect(score.overallPowerScore).toBeLessThanOrEqual(100);
    });

    it('should penalize high TDP GPUs', () => {
      const lowTdpGPU = { ...mockGPU, tdp: 200 };
      const highTdpGPU = { ...mockGPU, tdp: 600 };
      
      const lowTdpScore = ratingSystem.getPowerEfficiencyScore(lowTdpGPU);
      const highTdpScore = ratingSystem.getPowerEfficiencyScore(highTdpGPU);
      
      expect(lowTdpScore.thermalEfficiency).toBeGreaterThan(highTdpScore.thermalEfficiency);
    });

    it('should apply power optimization bonuses', () => {
      const hopperGPU = { ...mockGPU, architecture: 'Hopper' };
      const adaGPU = { ...mockGPU, architecture: 'Ada Lovelace' };
      
      const hopperScore = ratingSystem.getPowerEfficiencyScore(hopperGPU);
      const adaScore = ratingSystem.getPowerEfficiencyScore(adaGPU);
      
      // Ada Lovelace应该有更高的功耗优化加成
      expect(adaScore.overallPowerScore).toBeGreaterThan(hopperScore.overallPowerScore);
    });
  });

  describe('getCostEffectivenessScore', () => {
    it('should calculate cost effectiveness score correctly', () => {
      const score = ratingSystem.getCostEffectivenessScore(mockGPU);
      
      expect(score.performancePerDollar).toBeGreaterThan(0);
      expect(score.performancePerDollar).toBeLessThanOrEqual(100);
      expect(score.memoryPerDollar).toBeGreaterThan(0);
      expect(score.memoryPerDollar).toBeLessThanOrEqual(100);
      expect(score.overallCostScore).toBeGreaterThan(0);
      expect(score.overallCostScore).toBeLessThanOrEqual(100);
    });

    it('should apply price range adjustments', () => {
      const budgetGPU = {
        ...mockGPU,
        price: { ...mockGPU.price, currentPrice: 1500 }
      };
      const expensiveGPU = {
        ...mockGPU,
        price: { ...mockGPU.price, currentPrice: 25000 }
      };
      
      const budgetScore = ratingSystem.getCostEffectivenessScore(budgetGPU);
      const expensiveScore = ratingSystem.getCostEffectivenessScore(expensiveGPU);
      
      // 预算级GPU应该有价格优势
      expect(budgetScore.overallCostScore).toBeGreaterThan(expensiveScore.overallCostScore);
      
      // 验证因素中包含价格信息
      expect(budgetScore.factors.some(f => f.includes('消费级价格优势'))).toBe(true);
      expect(expensiveScore.factors.some(f => f.includes('企业级价格考量'))).toBe(true);
    });

    it('should consider availability impact', () => {
      const availableGPU = {
        ...mockGPU,
        availability: { ...mockGPU.availability, status: 'available' as const }
      };
      const limitedGPU = {
        ...mockGPU,
        availability: { ...mockGPU.availability, status: 'limited' as const }
      };
      const unavailableGPU = {
        ...mockGPU,
        availability: { ...mockGPU.availability, status: 'unavailable' as const }
      };
      
      const availableScore = ratingSystem.getCostEffectivenessScore(availableGPU);
      const limitedScore = ratingSystem.getCostEffectivenessScore(limitedGPU);
      const unavailableScore = ratingSystem.getCostEffectivenessScore(unavailableGPU);
      
      expect(availableScore.overallCostScore).toBeGreaterThan(limitedScore.overallCostScore);
      expect(limitedScore.overallCostScore).toBeGreaterThan(unavailableScore.overallCostScore);
    });
  });

  describe('calculateBatchRatings', () => {
    it('should calculate ratings for multiple GPUs', () => {
      const gpus = [mockGPU, { ...mockGPU, id: 'gpu2', name: 'GPU 2' }];
      const ratings = ratingSystem.calculateBatchRatings(gpus);
      
      expect(ratings).toHaveLength(2);
      ratings.forEach(result => {
        expect(result.gpu).toBeDefined();
        expect(result.rating).toBeDefined();
        expect(result.rating.overall).toBeGreaterThan(0);
        expect(result.rating.overall).toBeLessThanOrEqual(100);
      });
    });

    it('should handle empty GPU array', () => {
      const ratings = ratingSystem.calculateBatchRatings([]);
      expect(ratings).toHaveLength(0);
    });
  });

  describe('recommendBestGPU', () => {
    it('should recommend the best GPU from a list', () => {
      const lowPerformanceGPU = {
        ...mockGPU,
        id: 'low-gpu',
        benchmarks: {
          ...mockGPU.benchmarks,
          llmInference: {
            tokensPerSecond: 1000,
            memoryEfficiency: 0.5,
            powerEfficiency: 3.0
          }
        }
      };
      
      const gpus = [mockGPU, lowPerformanceGPU];
      const recommendation = ratingSystem.recommendBestGPU(gpus, 'inference');
      
      expect(recommendation).not.toBeNull();
      expect(recommendation!.gpu.id).toBe(mockGPU.id); // 应该推荐性能更好的GPU
      expect(recommendation!.rating).toBeDefined();
      expect(recommendation!.reason).toBeDefined();
      expect(recommendation!.reason.length).toBeGreaterThan(0);
    });

    it('should respect budget constraints', () => {
      const expensiveGPU = {
        ...mockGPU,
        id: 'expensive-gpu',
        price: { ...mockGPU.price, currentPrice: 5000 }
      };
      
      const gpus = [mockGPU, expensiveGPU];
      const recommendation = ratingSystem.recommendBestGPU(gpus, 'inference', 2000);
      
      expect(recommendation).not.toBeNull();
      expect(recommendation!.gpu.price.currentPrice).toBeLessThanOrEqual(2000);
    });

    it('should return null when no GPUs meet budget', () => {
      const gpus = [mockGPU];
      const recommendation = ratingSystem.recommendBestGPU(gpus, 'inference', 1000);
      
      expect(recommendation).toBeNull();
    });

    it('should return null for empty GPU list', () => {
      const recommendation = ratingSystem.recommendBestGPU([], 'inference');
      expect(recommendation).toBeNull();
    });
  });

  describe('utility methods', () => {
    it('should provide rating descriptions', () => {
      expect(ratingSystem.getRatingDescription(95)).toBe('优秀');
      expect(ratingSystem.getRatingDescription(85)).toBe('良好');
      expect(ratingSystem.getRatingDescription(75)).toBe('中等');
      expect(ratingSystem.getRatingDescription(65)).toBe('一般');
      expect(ratingSystem.getRatingDescription(55)).toBe('较差');
    });

    it('should provide rating colors', () => {
      expect(ratingSystem.getRatingColor(95)).toBe('#10b981');
      expect(ratingSystem.getRatingColor(85)).toBe('#3b82f6');
      expect(ratingSystem.getRatingColor(75)).toBe('#f59e0b');
      expect(ratingSystem.getRatingColor(65)).toBe('#ef4444');
      expect(ratingSystem.getRatingColor(55)).toBe('#6b7280');
    });
  });

  describe('rating weights', () => {
    it('should have valid weight configurations', () => {
      Object.values(RATING_WEIGHTS).forEach(weights => {
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 2); // 权重总和应该接近1.0
      });
    });

    it('should have different weights for different workloads', () => {
      const inferenceWeights = RATING_WEIGHTS.inference;
      const trainingWeights = RATING_WEIGHTS.training;
      
      // 推理应该更重视计算性能和功耗效率
      expect(inferenceWeights.computePerformance).toBeGreaterThan(trainingWeights.computePerformance);
      expect(inferenceWeights.powerEfficiency).toBeGreaterThan(trainingWeights.powerEfficiency);
      
      // 训练应该更重视内存性能
      expect(trainingWeights.memoryPerformance).toBeGreaterThan(inferenceWeights.memoryPerformance);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing benchmark data gracefully', () => {
      const incompleteGPU = {
        ...mockGPU,
        benchmarks: {
          ...mockGPU.benchmarks,
          llmInference: {
            tokensPerSecond: 0,
            memoryEfficiency: 0,
            powerEfficiency: 0
          }
        }
      };
      
      const rating = ratingSystem.calculateOverallRating(incompleteGPU);
      expect(rating.overall).toBeGreaterThanOrEqual(0);
      expect(rating.overall).toBeLessThanOrEqual(100);
    });

    it('should handle extreme values correctly', () => {
      const extremeGPU = {
        ...mockGPU,
        tdp: 1000,
        price: { ...mockGPU.price, currentPrice: 100000 },
        benchmarks: {
          ...mockGPU.benchmarks,
          llmInference: {
            tokensPerSecond: 10000,
            memoryEfficiency: 1.0,
            powerEfficiency: 20.0
          }
        }
      };
      
      const rating = ratingSystem.calculateOverallRating(extremeGPU);
      expect(rating.overall).toBeGreaterThanOrEqual(0);
      expect(rating.overall).toBeLessThanOrEqual(100);
    });
  });
});