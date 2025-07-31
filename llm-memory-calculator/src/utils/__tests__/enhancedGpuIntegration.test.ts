import { ENHANCED_GPU_HARDWARE } from '../../constants';
import { gpuDataValidator } from '../gpuDataValidator';

describe('Enhanced GPU Data Integration', () => {
  describe('ENHANCED_GPU_HARDWARE validation', () => {
    it('should have all GPUs pass validation', () => {
      const results = ENHANCED_GPU_HARDWARE.map(gpu => ({
        gpu: gpu.name,
        validation: gpuDataValidator.validateGPUData(gpu)
      }));

      results.forEach(({ gpu, validation }) => {
        expect(validation.isValid).toBe(true);
        expect(validation.confidence).toBeGreaterThan(0.5);
        expect(validation.errors.filter(e => e.severity === 'error')).toHaveLength(0);
        
        // Log GPU name for debugging if needed
        if (!validation.isValid) {
          console.log(`GPU ${gpu} failed validation`);
        }
      });
    });

    it('should have high confidence for all GPUs', () => {
      const results = ENHANCED_GPU_HARDWARE.map(gpu => 
        gpuDataValidator.validateGPUData(gpu)
      );

      const averageConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
      expect(averageConfidence).toBeGreaterThan(0.75);
    });

    it('should have complete enhanced data structure', () => {
      ENHANCED_GPU_HARDWARE.forEach(gpu => {
        // 验证基本字段
        expect(gpu.id).toBeDefined();
        expect(gpu.name).toBeDefined();
        expect(gpu.manufacturer).toBeDefined();
        expect(gpu.architecture).toBeDefined();
        
        // 验证硬件规格
        expect(gpu.memorySize).toBeGreaterThan(0);
        expect(gpu.memoryBandwidth).toBeGreaterThan(0);
        expect(gpu.computeUnits).toBeGreaterThan(0);
        expect(gpu.tdp).toBeGreaterThan(0);
        
        // 验证价格信息
        expect(gpu.price).toBeDefined();
        expect(gpu.price.currentPrice).toBeGreaterThan(0);
        expect(gpu.price.msrp).toBeGreaterThan(0);
        
        // 验证基准测试数据
        expect(gpu.benchmarks).toBeDefined();
        expect(gpu.benchmarks.llmInference).toBeDefined();
        expect(gpu.benchmarks.syntheticBenchmarks).toBeDefined();
        
        // 验证效率评级
        expect(gpu.efficiency).toBeDefined();
        expect(gpu.efficiency.overall).toBeGreaterThanOrEqual(0);
        expect(gpu.efficiency.overall).toBeLessThanOrEqual(100);
        expect(gpu.efficiency.confidence).toBeGreaterThan(0);
        expect(gpu.efficiency.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should have consistent data across all GPUs', () => {
      ENHANCED_GPU_HARDWARE.forEach(gpu => {
        // 验证频率关系
        expect(gpu.boostClock).toBeGreaterThanOrEqual(gpu.baseClock);
        
        // 验证效率评级一致性
        expect(gpu.efficiency.overall).toBeLessThanOrEqual(
          Math.max(
            gpu.efficiency.performance,
            gpu.efficiency.powerEfficiency,
            gpu.efficiency.costEffectiveness
          ) + 5 // 允许5分的综合评分提升
        );
        
        // 验证价格合理性
        expect(gpu.price.currentPrice).toBeGreaterThan(gpu.price.msrp * 0.5); // 不低于MSRP的50%
        expect(gpu.price.currentPrice).toBeLessThan(gpu.price.msrp * 5); // 不高于MSRP的5倍
        
        // 验证基准测试数据合理性
        expect(gpu.benchmarks.llmInference.memoryEfficiency).toBeGreaterThan(0);
        expect(gpu.benchmarks.llmInference.memoryEfficiency).toBeLessThanOrEqual(1);
        expect(gpu.benchmarks.syntheticBenchmarks.memoryBandwidthUtilization).toBeGreaterThan(0);
        expect(gpu.benchmarks.syntheticBenchmarks.memoryBandwidthUtilization).toBeLessThanOrEqual(1);
      });
    });

    it('should support batch validation', () => {
      const batchResult = gpuDataValidator.validateBatch(ENHANCED_GPU_HARDWARE);
      
      expect(batchResult.summary.total).toBe(ENHANCED_GPU_HARDWARE.length);
      expect(batchResult.summary.valid).toBe(ENHANCED_GPU_HARDWARE.length);
      expect(batchResult.summary.invalid).toBe(0);
      expect(batchResult.summary.averageConfidence).toBeGreaterThan(0.75);
    });
  });

  describe('GPU data completeness', () => {
    it('should have all required manufacturers represented', () => {
      const manufacturers = new Set(ENHANCED_GPU_HARDWARE.map(gpu => gpu.manufacturer));
      expect(manufacturers.has('nvidia')).toBe(true);
      // 可以添加其他制造商的检查
    });

    it('should have diverse memory sizes', () => {
      const memorySizes = ENHANCED_GPU_HARDWARE.map(gpu => gpu.memorySize);
      const uniqueSizes = new Set(memorySizes);
      
      expect(uniqueSizes.size).toBeGreaterThan(1); // 至少有2种不同的显存大小
      expect(Math.max(...memorySizes)).toBeGreaterThan(Math.min(...memorySizes));
    });

    it('should have recent data updates', () => {
      const twoYearsAgo = new Date('2023-01-01');
      
      ENHANCED_GPU_HARDWARE.forEach(gpu => {
        expect(gpu.lastUpdated).toBeInstanceOf(Date);
        expect(gpu.lastUpdated.getTime()).toBeGreaterThan(twoYearsAgo.getTime());
      });
    });
  });

  describe('Performance benchmarks', () => {
    it('should have realistic performance data', () => {
      ENHANCED_GPU_HARDWARE.forEach(gpu => {
        const { llmInference, syntheticBenchmarks } = gpu.benchmarks;
        
        // LLM推理性能应该合理
        expect(llmInference.tokensPerSecond).toBeGreaterThan(100);
        expect(llmInference.tokensPerSecond).toBeLessThan(50000);
        
        // 合成基准性能应该合理
        expect(syntheticBenchmarks.fp16Performance).toBeGreaterThan(10);
        expect(syntheticBenchmarks.fp16Performance).toBeLessThan(2000);
        
        // 功耗效率应该合理
        expect(llmInference.powerEfficiency).toBeGreaterThan(0.5);
        expect(llmInference.powerEfficiency).toBeLessThan(50);
      });
    });

    it('should have consistent performance scaling', () => {
      // 按显存大小排序
      const sortedGPUs = [...ENHANCED_GPU_HARDWARE].sort((a, b) => a.memorySize - b.memorySize);
      
      // 一般来说，显存更大的GPU性能也更好（但不是绝对的）
      for (let i = 1; i < sortedGPUs.length; i++) {
        const current = sortedGPUs[i];
        const previous = sortedGPUs[i - 1];
        
        // 如果显存大很多，性能通常也会更好
        if (current.memorySize > previous.memorySize * 2) {
          expect(current.benchmarks.llmInference.tokensPerSecond)
            .toBeGreaterThanOrEqual(previous.benchmarks.llmInference.tokensPerSecond * 0.8);
        }
      }
    });
  });
});