import {
  validateNumericField,
  validatePrecision,
  validateModelParameters,
  validateField,
  validateMemoryRequirement,
  formatValidationErrors,
  createErrorState
} from '../validation';
import { ModelParameters } from '../../types';

// 测试用的有效模型参数
const validParams: ModelParameters = {
  parameterCount: 7,
  precision: 'fp16',
  sequenceLength: 2048,
  batchSize: 1,
  hiddenSize: 4096,
  numLayers: 32,
  vocabularySize: 32000
};

describe('输入验证工具测试', () => {
  
  describe('validateNumericField', () => {
    test('应该验证有效的数值', () => {
      const result = validateNumericField(10, 1, 100, '测试字段');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('应该拒绝超出范围的数值', () => {
      const result = validateNumericField(150, 1, 100, '测试字段');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('必须在1到100之间');
    });

    test('应该拒绝NaN值', () => {
      const result = validateNumericField(NaN, 1, 100, '测试字段');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('必须是有效数字');
    });

    test('应该拒绝无穷大值', () => {
      const result = validateNumericField(Infinity, 1, 100, '测试字段');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('必须是有效数字');
    });
  });

  describe('validatePrecision', () => {
    test('应该验证有效的精度类型', () => {
      const validPrecisions = ['fp32', 'fp16', 'int8', 'int4'];
      validPrecisions.forEach(precision => {
        const result = validatePrecision(precision);
        expect(result.isValid).toBe(true);
      });
    });

    test('应该拒绝无效的精度类型', () => {
      const result = validatePrecision('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('精度类型必须是以下之一');
    });
  });

  describe('validateModelParameters', () => {
    test('应该验证有效的模型参数', () => {
      const result = validateModelParameters(validParams);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('应该检测参数数量错误', () => {
      const invalidParams = { ...validParams, parameterCount: -1 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'parameterCount')).toBe(true);
    });

    test('应该检测序列长度错误', () => {
      const invalidParams = { ...validParams, sequenceLength: 0 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'sequenceLength')).toBe(true);
    });

    test('应该检测批处理大小错误', () => {
      const invalidParams = { ...validParams, batchSize: 2000 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'batchSize')).toBe(true);
    });

    test('应该检测隐藏层维度错误', () => {
      const invalidParams = { ...validParams, hiddenSize: 0 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'hiddenSize')).toBe(true);
    });

    test('应该检测层数错误', () => {
      const invalidParams = { ...validParams, numLayers: 0 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'numLayers')).toBe(true);
    });

    test('应该检测词汇表大小错误', () => {
      const invalidParams = { ...validParams, vocabularySize: 0 };
      const result = validateModelParameters(invalidParams);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'vocabularySize')).toBe(true);
    });

    test('应该生成一致性警告', () => {
      const inconsistentParams = { 
        ...validParams, 
        sequenceLength: 16384, 
        batchSize: 8 
      };
      const result = validateModelParameters(inconsistentParams);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateField', () => {
    test('应该验证单个字段', () => {
      const result = validateField('parameterCount', 7, validParams);
      expect(result.isValid).toBe(true);
    });

    test('应该为大模型FP32精度生成警告', () => {
      const params = { ...validParams, precision: 'fp32' as const };
      const result = validateField('parameterCount', 150, params);
      expect(result.warning).toContain('建议使用FP16精度');
    });

    test('应该为长序列生成警告', () => {
      const params = { ...validParams, batchSize: 8 };
      const result = validateField('sequenceLength', 10000, params);
      expect(result.warning).toContain('长序列配合大批处理');
    });

    test('应该为大批处理生成警告', () => {
      const result = validateField('batchSize', 64, validParams);
      expect(result.warning).toContain('大批处理大小可能导致内存不足');
    });

    test('应该为非64倍数的隐藏层维度生成警告', () => {
      const result = validateField('hiddenSize', 4097, validParams);
      expect(result.warning).toContain('建议为64的倍数');
    });
  });

  describe('validateMemoryRequirement', () => {
    test('应该识别低内存需求', () => {
      const result = validateMemoryRequirement(4);
      expect(result.level).toBe('low');
      expect(result.isReasonable).toBe(true);
    });

    test('应该识别中等内存需求', () => {
      const result = validateMemoryRequirement(16);
      expect(result.level).toBe('medium');
      expect(result.isReasonable).toBe(true);
    });

    test('应该识别高内存需求', () => {
      const result = validateMemoryRequirement(40);
      expect(result.level).toBe('high');
      expect(result.isReasonable).toBe(true);
    });

    test('应该识别极高内存需求', () => {
      const result = validateMemoryRequirement(100);
      expect(result.level).toBe('extreme');
      expect(result.isReasonable).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    test('应该格式化单个错误', () => {
      const errors = [{ field: 'test', message: '测试错误' }];
      const result = formatValidationErrors(errors);
      expect(result).toBe('测试错误');
    });

    test('应该格式化多个错误', () => {
      const errors = [
        { field: 'field1', message: '错误1' },
        { field: 'field2', message: '错误2' }
      ];
      const result = formatValidationErrors(errors);
      expect(result).toContain('发现2个错误');
      expect(result).toContain('• 错误1');
      expect(result).toContain('• 错误2');
    });

    test('应该处理空错误数组', () => {
      const result = formatValidationErrors([]);
      expect(result).toBe('');
    });
  });

  describe('createErrorState', () => {
    test('应该创建错误状态', () => {
      const errorState = createErrorState(true, '测试错误', 'testField');
      expect(errorState.hasError).toBe(true);
      expect(errorState.errorMessage).toBe('测试错误');
      expect(errorState.errorField).toBe('testField');
    });

    test('应该创建无错误状态', () => {
      const errorState = createErrorState(false);
      expect(errorState.hasError).toBe(false);
      expect(errorState.errorMessage).toBe('');
      expect(errorState.errorField).toBeUndefined();
    });
  });
});

// 边界情况测试
describe('验证工具边界情况测试', () => {
  test('应该处理边界值', () => {
    const boundaryParams: ModelParameters = {
      parameterCount: 0.1, // 最小值
      precision: 'fp32',
      sequenceLength: 1, // 最小值
      batchSize: 1, // 最小值
      hiddenSize: 64, // 最小值
      numLayers: 1, // 最小值
      vocabularySize: 1000 // 最小值
    };

    const result = validateModelParameters(boundaryParams);
    expect(result.isValid).toBe(true);
  });

  test('应该处理最大边界值', () => {
    const maxBoundaryParams: ModelParameters = {
      parameterCount: 1000, // 最大值
      precision: 'int4',
      sequenceLength: 32768, // 最大值
      batchSize: 1024, // 最大值
      hiddenSize: 32768, // 最大值
      numLayers: 200, // 最大值
      vocabularySize: 200000 // 最大值
    };

    const result = validateModelParameters(maxBoundaryParams);
    expect(result.isValid).toBe(true);
  });

  test('应该处理超出边界的值', () => {
    const outOfBoundsParams: ModelParameters = {
      parameterCount: 2000, // 超出最大值
      precision: 'fp16',
      sequenceLength: 50000, // 超出最大值
      batchSize: 2000, // 超出最大值
      hiddenSize: 50000, // 超出最大值
      numLayers: 300, // 超出最大值
      vocabularySize: 300000 // 超出最大值
    };

    const result = validateModelParameters(outOfBoundsParams);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});