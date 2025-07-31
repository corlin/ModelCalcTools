import { GPUDataValidator } from '../gpuDataValidator';
import { EnhancedGPUHardware } from '../../types';

describe('GPUDataValidator', () => {
  let validator: GPUDataValidator;

  beforeEach(() => {
    validator = new GPUDataValidator();
  });

  // 创建有效的测试GPU数据
  const createValidGPU = (): EnhancedGPUHardware => ({
    id: 'test-gpu',
    name: 'Test GPU',
    manufacturer: 'nvidia',
    architecture: 'Test Architecture',
    memorySize: 24,
    memoryType: 'GDDR6X',
    memoryBandwidth: 1000,
    computeUnits: 10000,
    baseClock: 1500,
    boostClock: 1800,
    tdp: 300,
    price: {
      msrp: 1000,
      currentPrice: 1100,
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
      overall: 85,
      performance: 90,
      efficiency: 88,
      powerEfficiency: 80,
      costEffectiveness: 85,
      reliability: 90,
      confidence: 0.9
    },
    benchmarks: {
      llmInference: {
        tokensPerSecond: 2000,
        memoryEfficiency: 0.85,
        powerEfficiency: 6.5
      },
      llmTraining: {
        samplesPerSecond: 100,
        gradientThroughput: 1.0,
        memoryUtilization: 0.9
      },
      syntheticBenchmarks: {
        fp16Performance: 100,
        int8Performance: 400,
        memoryBandwidthUtilization: 0.8
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
  });

  describe('validateGPUData', () => {
    it('should validate a correct GPU data structure', () => {
      const gpu = createValidGPU();
      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(true);
      expect(result.errors.filter(e => e.severity === 'error')).toHaveLength(0);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect missing required fields', () => {
      const gpu = createValidGPU();
      // @ts-ignore - 故意设置无效值进行测试
      gpu.id = '';

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'id',
          message: 'GPU ID不能为空',
          severity: 'error'
        })
      );
    });

    it('should validate memory size within range', () => {
      const gpu = createValidGPU();
      gpu.memorySize = 2000; // 超出范围

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'memorySize',
          severity: 'error',
          expectedRange: { min: 1, max: 1000 }
        })
      );
    });

    it('should validate manufacturer field', () => {
      const gpu = createValidGPU();
      // @ts-ignore - 故意设置无效值进行测试
      gpu.manufacturer = 'invalid_manufacturer';

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'manufacturer',
          severity: 'error'
        })
      );
    });

    it('should validate price information', () => {
      const gpu = createValidGPU();
      gpu.price.msrp = -100; // 无效价格

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'price.msrp',
          severity: 'error'
        })
      );
    });

    it('should validate benchmark data', () => {
      const gpu = createValidGPU();
      gpu.benchmarks.llmInference.tokensPerSecond = -1; // 无效值

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'benchmarks.llmInference.tokensPerSecond',
          severity: 'error'
        })
      );
    });

    it('should validate efficiency ratings', () => {
      const gpu = createValidGPU();
      gpu.efficiency.overall = 150; // 超出范围

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'efficiency.overall',
          severity: 'error'
        })
      );
    });

    it('should generate warnings for data inconsistencies', () => {
      const gpu = createValidGPU();
      gpu.boostClock = 1000; // 低于基础频率
      gpu.baseClock = 1500;

      const result = validator.validateGPUData(gpu);

      expect(result.warnings).toContain('加速频率应该高于基础频率');
    });

    it('should warn about outdated price data', () => {
      const gpu = createValidGPU();
      gpu.price.lastUpdated = new Date('2023-01-01'); // 过期数据

      const result = validator.validateGPUData(gpu);

      expect(result.warnings.some(w => w.includes('价格数据已过期'))).toBe(true);
    });

    it('should calculate confidence based on data quality', () => {
      const gpu = createValidGPU();
      gpu.dataSource = 'community_reported'; // 较低可信度来源

      const result = validator.validateGPUData(gpu);

      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should handle missing benchmark data', () => {
      const gpu = createValidGPU();
      // @ts-ignore - 故意设置无效值进行测试
      gpu.benchmarks = null;

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'benchmarks',
          message: '基准测试数据不能为空',
          severity: 'error'
        })
      );
    });

    it('should validate numeric field types', () => {
      const gpu = createValidGPU();
      // @ts-ignore - 故意设置无效值进行测试
      gpu.memorySize = 'invalid';

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'memorySize',
          message: 'memorySize必须是有效数字',
          severity: 'error'
        })
      );
    });

    it('should validate clock frequency relationships', () => {
      const gpu = createValidGPU();
      gpu.baseClock = 2000;
      gpu.boostClock = 1500; // 加速频率低于基础频率

      const result = validator.validateGPUData(gpu);

      expect(result.warnings).toContain('加速频率应该高于基础频率');
    });

    it('should validate memory efficiency range', () => {
      const gpu = createValidGPU();
      gpu.benchmarks.llmInference.memoryEfficiency = 1.5; // 超出0-1范围

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'benchmarks.llmInference.memoryEfficiency',
          severity: 'error'
        })
      );
    });

    it('should validate test conditions completeness', () => {
      const gpu = createValidGPU();
      gpu.benchmarks.testConditions.modelSize = '';

      const result = validator.validateGPUData(gpu);

      expect(result.warnings).toContain('基准测试条件信息不完整');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple GPUs and provide summary', () => {
      const validGPU = createValidGPU();
      const invalidGPU = createValidGPU();
      invalidGPU.id = ''; // 使其无效

      const result = validator.validateBatch([validGPU, invalidGPU]);

      expect(result.results).toHaveLength(2);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(1);
      expect(result.summary.invalid).toBe(1);
      expect(result.summary.averageConfidence).toBeGreaterThan(0);
    });

    it('should handle empty batch', () => {
      const result = validator.validateBatch([]);

      expect(result.results).toHaveLength(0);
      expect(result.summary.total).toBe(0);
      expect(result.summary.valid).toBe(0);
      expect(result.summary.invalid).toBe(0);
      expect(result.summary.averageConfidence).toBe(0);
    });

    it('should calculate correct average confidence', () => {
      const gpu1 = createValidGPU();
      gpu1.efficiency.confidence = 0.9;
      
      const gpu2 = createValidGPU();
      gpu2.id = 'gpu2';
      gpu2.efficiency.confidence = 0.7;

      const result = validator.validateBatch([gpu1, gpu2]);

      // 平均可信度应该在0.7-0.9之间
      expect(result.summary.averageConfidence).toBeGreaterThan(0.7);
      expect(result.summary.averageConfidence).toBeLessThan(0.9);
    });
  });

  describe('edge cases', () => {
    it('should handle GPU with minimal valid data', () => {
      const minimalGPU: EnhancedGPUHardware = {
        id: 'minimal-gpu',
        name: 'Minimal GPU',
        manufacturer: 'nvidia',
        architecture: 'Test',
        memorySize: 8,
        memoryType: 'GDDR6',
        memoryBandwidth: 500,
        computeUnits: 2000,
        baseClock: 1000,
        boostClock: 1200,
        tdp: 200,
        price: {
          msrp: 500,
          currentPrice: 550,
          currency: 'USD',
          lastUpdated: new Date()
        },
        availability: {
          status: 'available',
          leadTime: 0,
          stockLevel: 'medium'
        },
        efficiency: {
          overall: 70,
          performance: 70,
          efficiency: 70,
          powerEfficiency: 70,
          costEffectiveness: 70,
          reliability: 70,
          confidence: 0.8
        },
        benchmarks: {
          llmInference: {
            tokensPerSecond: 1000,
            memoryEfficiency: 0.7,
            powerEfficiency: 5.0
          },
          llmTraining: {
            samplesPerSecond: 50,
            gradientThroughput: 0.5,
            memoryUtilization: 0.8
          },
          syntheticBenchmarks: {
            fp16Performance: 50,
            int8Performance: 200,
            memoryBandwidthUtilization: 0.7
          },
          testConditions: {
            modelSize: '7B',
            batchSize: 1,
            sequenceLength: 2048,
            precision: 'fp16',
            framework: 'PyTorch'
          }
        },
        lastUpdated: new Date(),
        dataSource: 'manufacturer_official',
        verified: true
      };

      const result = validator.validateGPUData(minimalGPU);

      expect(result.isValid).toBe(true);
    });

    it('should handle extreme values gracefully', () => {
      const gpu = createValidGPU();
      gpu.memorySize = Number.MAX_SAFE_INTEGER;

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'memorySize')).toBe(true);
    });

    it('should handle NaN and Infinity values', () => {
      const gpu = createValidGPU();
      gpu.memoryBandwidth = NaN;
      gpu.tdp = Infinity;

      const result = validator.validateGPUData(gpu);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'memoryBandwidth')).toBe(true);
      expect(result.errors.some(e => e.field === 'tdp')).toBe(true);
    });
  });

  describe('confidence calculation', () => {
    it('should give high confidence to official verified data', () => {
      const gpu = createValidGPU();
      gpu.dataSource = 'manufacturer_official';
      gpu.verified = true;
      gpu.lastUpdated = new Date(); // 最新数据

      const result = validator.validateGPUData(gpu);

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should reduce confidence for community data', () => {
      const gpu = createValidGPU();
      gpu.dataSource = 'community_reported';
      gpu.verified = false;

      const result = validator.validateGPUData(gpu);

      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should reduce confidence for old data', () => {
      const gpu = createValidGPU();
      gpu.lastUpdated = new Date('2020-01-01'); // 很旧的数据

      const result = validator.validateGPUData(gpu);

      expect(result.confidence).toBeLessThan(0.9);
    });
  });
});