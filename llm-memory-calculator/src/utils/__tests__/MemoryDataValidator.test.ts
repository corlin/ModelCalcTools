import { MemoryDataValidator } from '../MemoryDataValidator';
import { StandardizedMemoryData, MemoryCalculationResult } from '../../types';
import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('MemoryDataValidator', () => {
  describe('validateMemoryData', () => {
    it('should validate correct memory data', () => {
      const validData: StandardizedMemoryData = {
        totalBytes: MemoryUnitConverter.gbToBytes(10),
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(6),
          activationsBytes: MemoryUnitConverter.gbToBytes(4),
        },
        utilization: {
          theoreticalUtilization: 0.8,
          practicalUtilization: 0.85,
          utilizationPercentage: 85,
          isOverCapacity: false,
          efficiencyRating: 'good'
        },
        metadata: {
          calculationMode: 'inference',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const result = MemoryDataValidator.validateMemoryData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid total memory', () => {
      const invalidData: StandardizedMemoryData = {
        totalBytes: -100,
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(6),
          activationsBytes: MemoryUnitConverter.gbToBytes(4),
        },
        utilization: {
          theoreticalUtilization: 0.8,
          practicalUtilization: 0.85,
          utilizationPercentage: 85,
          isOverCapacity: false,
          efficiencyRating: 'good'
        },
        metadata: {
          calculationMode: 'inference',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const result = MemoryDataValidator.validateMemoryData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('总内存必须是大于0的有限数值');
    });

    it('should detect breakdown inconsistency', () => {
      const inconsistentData: StandardizedMemoryData = {
        totalBytes: MemoryUnitConverter.gbToBytes(10),
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(20), // 超过总内存
          activationsBytes: MemoryUnitConverter.gbToBytes(4),
        },
        utilization: {
          theoreticalUtilization: 0.8,
          practicalUtilization: 0.85,
          utilizationPercentage: 85,
          isOverCapacity: false,
          efficiencyRating: 'good'
        },
        metadata: {
          calculationMode: 'inference',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const result = MemoryDataValidator.validateMemoryData(inconsistentData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('差异过大'))).toBe(true);
    });

    it('should validate training mode data completeness', () => {
      const trainingData: StandardizedMemoryData = {
        totalBytes: MemoryUnitConverter.gbToBytes(20),
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(6),
          activationsBytes: MemoryUnitConverter.gbToBytes(8),
          gradientsBytes: MemoryUnitConverter.gbToBytes(6),
          // 缺少优化器状态
        },
        utilization: {
          theoreticalUtilization: 0.8,
          practicalUtilization: 0.85,
          utilizationPercentage: 85,
          isOverCapacity: false,
          efficiencyRating: 'good'
        },
        metadata: {
          calculationMode: 'training',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const result = MemoryDataValidator.validateMemoryData(trainingData);
      expect(result.warnings).toContain('训练模式下缺少优化器状态内存数据');
    });

    it('should validate utilization data ranges', () => {
      const invalidUtilizationData: StandardizedMemoryData = {
        totalBytes: MemoryUnitConverter.gbToBytes(10),
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(6),
          activationsBytes: MemoryUnitConverter.gbToBytes(4),
        },
        utilization: {
          theoreticalUtilization: -0.5, // 无效值
          practicalUtilization: 15, // 超出常见范围
          utilizationPercentage: -10, // 无效值
          isOverCapacity: false,
          efficiencyRating: 'invalid' as any // 无效评级
        },
        metadata: {
          calculationMode: 'inference',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      const result = MemoryDataValidator.validateMemoryData(invalidUtilizationData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('理论利用率不能小于0');
      expect(result.errors).toContain('利用率百分比不能小于0');
      expect(result.errors).toContain('无效的效率评级: invalid');
    });
  });

  describe('validateCalculationResult', () => {
    it('should validate correct calculation result', () => {
      const validResult: MemoryCalculationResult = {
        parameters: {
          parameterCount: 7,
          precision: 'fp16',
          sequenceLength: 2048,
          batchSize: 1,
          hiddenSize: 4096,
          numLayers: 32,
          vocabularySize: 50000
        },
        inference: {
          modelWeights: 14,
          activations: 2,
          total: 16
        },
        training: {
          modelWeights: 14,
          activations: 4,
          gradients: 14,
          optimizerStates: 28,
          total: 60
        }
      };

      const result = MemoryDataValidator.validateCalculationResult(validResult, 'inference');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidResult = {
        // 缺少parameters
        inference: {
          modelWeights: 14,
          activations: 2,
          total: 16
        },
        training: {
          modelWeights: 14,
          activations: 4,
          gradients: 14,
          optimizerStates: 28,
          total: 60
        }
      } as any;

      const result = MemoryDataValidator.validateCalculationResult(invalidResult, 'inference');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('缺少模型参数');
    });

    it('should detect inconsistent memory totals', () => {
      const inconsistentResult: MemoryCalculationResult = {
        parameters: {
          parameterCount: 7,
          precision: 'fp16',
          sequenceLength: 2048,
          batchSize: 1,
          hiddenSize: 4096,
          numLayers: 32,
          vocabularySize: 50000
        },
        inference: {
          modelWeights: 14,
          activations: 2,
          total: 100 // 不匹配的总和
        },
        training: {
          modelWeights: 14,
          activations: 4,
          gradients: 14,
          optimizerStates: 28,
          total: 60
        }
      };

      const result = MemoryDataValidator.validateCalculationResult(inconsistentResult, 'inference');
      expect(result.warnings).toContain('inference模式的总内存与各项之和不一致');
    });
  });

  describe('isValidMemoryData', () => {
    it('should quickly validate basic memory data structure', () => {
      const validData: StandardizedMemoryData = {
        totalBytes: MemoryUnitConverter.gbToBytes(10),
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(6),
          activationsBytes: MemoryUnitConverter.gbToBytes(4),
        },
        utilization: {
          theoreticalUtilization: 0.8,
          practicalUtilization: 0.85,
          utilizationPercentage: 85,
          isOverCapacity: false,
          efficiencyRating: 'good'
        },
        metadata: {
          calculationMode: 'inference',
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      expect(MemoryDataValidator.isValidMemoryData(validData)).toBe(true);
    });

    it('should return false for invalid data structure', () => {
      const invalidData = {
        totalBytes: 'invalid',
        breakdown: null
      } as any;

      expect(MemoryDataValidator.isValidMemoryData(invalidData)).toBe(false);
    });
  });

  describe('createValidationSummary', () => {
    it('should create readable validation summary', () => {
      const validationResult = {
        isValid: false,
        errors: ['错误1', '错误2'],
        warnings: ['警告1']
      };

      const summary = MemoryDataValidator.createValidationSummary(validationResult);
      expect(summary).toContain('验证结果: 失败');
      expect(summary).toContain('错误 (2)');
      expect(summary).toContain('警告 (1)');
      expect(summary).toContain('1. 错误1');
      expect(summary).toContain('2. 错误2');
      expect(summary).toContain('1. 警告1');
    });

    it('should create summary for successful validation', () => {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      const summary = MemoryDataValidator.createValidationSummary(validationResult);
      expect(summary).toContain('验证结果: 通过');
      expect(summary).not.toContain('错误');
      expect(summary).not.toContain('警告');
    });
  });
});