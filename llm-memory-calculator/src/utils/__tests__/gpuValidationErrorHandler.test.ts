import { GPUValidationErrorHandler } from '../gpuValidationErrorHandler';
import { GPUValidationError, GPUValidationResult } from '../../types';

describe('GPUValidationErrorHandler', () => {
  let errorHandler: GPUValidationErrorHandler;

  beforeEach(() => {
    errorHandler = new GPUValidationErrorHandler();
  });

  // 创建测试用的验证错误
  const createTestError = (
    field: string,
    message: string,
    severity: 'error' | 'warning' = 'error',
    expectedRange?: { min: number; max: number },
    actualValue?: any
  ): GPUValidationError => ({
    field,
    message,
    severity,
    expectedRange,
    actualValue
  });

  describe('formatErrors', () => {
    it('should return empty string for no errors', () => {
      const result = errorHandler.formatErrors([]);
      expect(result).toBe('');
    });

    it('should format single error correctly', () => {
      const error = createTestError('memorySize', '显存大小无效', 'error', { min: 1, max: 1000 }, 2000);
      const result = errorHandler.formatErrors([error]);
      
      expect(result).toContain('memorySize: 显存大小无效');
      expect(result).toContain('期望: 1-1000');
      expect(result).toContain('实际: 2000');
    });

    it('should format multiple errors correctly', () => {
      const errors = [
        createTestError('memorySize', '显存大小无效'),
        createTestError('price.msrp', '价格无效')
      ];
      const result = errorHandler.formatErrors(errors);
      
      expect(result).toContain('发现 2 个验证错误');
      expect(result).toContain('memorySize: 显存大小无效');
      expect(result).toContain('price.msrp: 价格无效');
    });

    it('should group errors by field', () => {
      const errors = [
        createTestError('price.msrp', '价格过低'),
        createTestError('price.currentPrice', '当前价格无效'),
        createTestError('memorySize', '显存大小无效')
      ];
      const result = errorHandler.formatErrors(errors);
      
      expect(result).toContain('price.msrp:');
      expect(result).toContain('price.currentPrice:');
      expect(result).toContain('memorySize:');
    });
  });

  describe('categorizeErrors', () => {
    it('should separate critical errors from warnings', () => {
      const errors = [
        createTestError('memorySize', '显存大小无效', 'error'),
        createTestError('price.msrp', '价格可能过高', 'warning'),
        createTestError('id', 'ID不能为空', 'error')
      ];

      const result = errorHandler.categorizeErrors(errors);

      expect(result.critical).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.critical[0].severity).toBe('error');
      expect(result.warnings[0].severity).toBe('warning');
    });

    it('should handle empty error array', () => {
      const result = errorHandler.categorizeErrors([]);
      
      expect(result.critical).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('generateFixSuggestions', () => {
    it('should generate suggestions for common errors', () => {
      const validation: GPUValidationResult = {
        isValid: false,
        errors: [
          createTestError('memorySize', '显存大小超出范围'),
          createTestError('price.currentPrice', '当前价格无效')
        ],
        warnings: [],
        confidence: 0.8
      };

      const suggestions = errorHandler.generateFixSuggestions(validation);

      expect(suggestions).toContain('检查GPU官方规格表确认显存大小');
      expect(suggestions).toContain('从可靠的价格监控网站获取当前市场价格');
    });

    it('should suggest data source verification for low confidence', () => {
      const validation: GPUValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 0.5
      };

      const suggestions = errorHandler.generateFixSuggestions(validation);

      expect(suggestions).toContain('数据可信度较低，建议从官方来源重新获取数据');
    });

    it('should suggest comprehensive check for many warnings', () => {
      const validation: GPUValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['警告1', '警告2', '警告3', '警告4'],
        confidence: 0.9
      };

      const suggestions = errorHandler.generateFixSuggestions(validation);

      expect(suggestions).toContain('存在多个数据质量问题，建议全面检查数据来源');
    });

    it('should not duplicate suggestions', () => {
      const validation: GPUValidationResult = {
        isValid: false,
        errors: [
          createTestError('memorySize', '显存大小无效1'),
          createTestError('memorySize', '显存大小无效2')
        ],
        warnings: [],
        confidence: 0.8
      };

      const suggestions = errorHandler.generateFixSuggestions(validation);
      const memoryRelatedSuggestions = suggestions.filter(s => s.includes('显存大小'));
      
      expect(memoryRelatedSuggestions).toHaveLength(1);
    });
  });

  describe('isCriticalError', () => {
    it('should identify critical errors correctly', () => {
      const criticalError = createTestError('id', 'ID不能为空', 'error');
      const nonCriticalError = createTestError('efficiency.overall', '评分无效', 'error');

      expect(errorHandler.isCriticalError(criticalError)).toBe(true);
      expect(errorHandler.isCriticalError(nonCriticalError)).toBe(false);
    });

    it('should not consider warnings as critical', () => {
      const warningError = createTestError('id', 'ID格式建议改进', 'warning');
      
      expect(errorHandler.isCriticalError(warningError)).toBe(false);
    });
  });

  describe('getErrorPriority', () => {
    it('should assign correct priorities', () => {
      const criticalError = createTestError('id', 'ID不能为空', 'error');
      const regularError = createTestError('tdp', 'TDP无效', 'error');
      const priceError = createTestError('price.msrp', '价格无效', 'error');
      const efficiencyError = createTestError('efficiency.overall', '评分无效', 'error');
      const warningError = createTestError('memorySize', '显存大小建议', 'warning');

      expect(errorHandler.getErrorPriority(criticalError)).toBe(1);
      expect(errorHandler.getErrorPriority(regularError)).toBe(2);
      expect(errorHandler.getErrorPriority(priceError)).toBe(3);
      expect(errorHandler.getErrorPriority(efficiencyError)).toBe(4);
      expect(errorHandler.getErrorPriority(warningError)).toBe(5);
    });
  });

  describe('sortErrorsByPriority', () => {
    it('should sort errors by priority correctly', () => {
      const errors = [
        createTestError('efficiency.overall', '评分无效', 'error'),
        createTestError('id', 'ID不能为空', 'error'),
        createTestError('price.msrp', '价格无效', 'error'),
        createTestError('tdp', 'TDP无效', 'error')
      ];

      const sorted = errorHandler.sortErrorsByPriority(errors);

      expect(sorted[0].field).toBe('id'); // 优先级1 (critical)
      expect(sorted[1].field).toBe('tdp'); // 优先级2 (regular error)
      expect(sorted[2].field).toBe('price.msrp'); // 优先级3 (price error)
      expect(sorted[3].field).toBe('efficiency.overall'); // 优先级4 (efficiency error)
    });

    it('should maintain original array', () => {
      const errors = [
        createTestError('efficiency.overall', '评分无效', 'error'),
        createTestError('id', 'ID不能为空', 'error')
      ];
      const originalLength = errors.length;
      const originalFirstField = errors[0].field;

      errorHandler.sortErrorsByPriority(errors);

      expect(errors).toHaveLength(originalLength);
      expect(errors[0].field).toBe(originalFirstField);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive report for failed validation', () => {
      const validation: GPUValidationResult = {
        isValid: false,
        errors: [
          createTestError('id', 'ID不能为空', 'error'),
          createTestError('price.msrp', '价格可能过高', 'warning')
        ],
        warnings: ['数据可能过期'],
        confidence: 0.7
      };

      const report = errorHandler.generateValidationReport(validation, 'test-gpu');

      expect(report).toContain('GPU数据验证报告: test-gpu');
      expect(report).toContain('验证状态: ❌ 失败');
      expect(report).toContain('数据可信度: 70.0%');
      expect(report).toContain('🚨 严重错误:');
      expect(report).toContain('⚠️  警告:');
      expect(report).toContain('💡 数据质量警告:');
      expect(report).toContain('🔧 修复建议:');
      expect(report).toContain('❌ 数据验证失败');
    });

    it('should generate report for successful validation', () => {
      const validation: GPUValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        confidence: 0.95
      };

      const report = errorHandler.generateValidationReport(validation, 'test-gpu');

      expect(report).toContain('验证状态: ✅ 通过');
      expect(report).toContain('数据可信度: 95.0%');
      expect(report).toContain('✅ 数据验证通过');
    });

    it('should handle validation with only warnings', () => {
      const validation: GPUValidationResult = {
        isValid: true,
        errors: [
          createTestError('price.msrp', '价格可能过高', 'warning')
        ],
        warnings: ['数据可能需要更新'],
        confidence: 0.85
      };

      const report = errorHandler.generateValidationReport(validation, 'test-gpu');

      expect(report).toContain('验证状态: ✅ 通过');
      expect(report).toContain('⚠️  警告:');
      expect(report).toContain('💡 数据质量警告:');
      expect(report).not.toContain('🚨 严重错误:');
    });
  });

  describe('generateErrorStatistics', () => {
    it('should generate correct statistics for multiple validations', () => {
      const validations: GPUValidationResult[] = [
        {
          isValid: false,
          errors: [
            createTestError('memorySize', '显存大小无效', 'error'),
            createTestError('price.msrp', '价格无效', 'error')
          ],
          warnings: [],
          confidence: 0.8
        },
        {
          isValid: false,
          errors: [
            createTestError('memorySize', '显存大小无效', 'error'),
            createTestError('id', 'ID不能为空', 'warning')
          ],
          warnings: [],
          confidence: 0.7
        }
      ];

      const stats = errorHandler.generateErrorStatistics(validations);

      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByField['memorySize']).toBe(2);
      expect(stats.errorsByField['price.msrp']).toBe(1);
      expect(stats.errorsByField['id']).toBe(1);
      expect(stats.errorsBySeverity['error']).toBe(3);
      expect(stats.errorsBySeverity['warning']).toBe(1);
      expect(stats.mostCommonErrors[0].field).toBe('memorySize');
      expect(stats.mostCommonErrors[0].count).toBe(2);
    });

    it('should handle empty validations array', () => {
      const stats = errorHandler.generateErrorStatistics([]);

      expect(stats.totalErrors).toBe(0);
      expect(Object.keys(stats.errorsByField)).toHaveLength(0);
      expect(Object.keys(stats.errorsBySeverity)).toHaveLength(0);
      expect(stats.mostCommonErrors).toHaveLength(0);
    });

    it('should limit most common errors to 5', () => {
      const validations: GPUValidationResult[] = [
        {
          isValid: false,
          errors: [
            createTestError('field1', '错误1', 'error'),
            createTestError('field2', '错误2', 'error'),
            createTestError('field3', '错误3', 'error'),
            createTestError('field4', '错误4', 'error'),
            createTestError('field5', '错误5', 'error'),
            createTestError('field6', '错误6', 'error'),
            createTestError('field7', '错误7', 'error')
          ],
          warnings: [],
          confidence: 0.5
        }
      ];

      const stats = errorHandler.generateErrorStatistics(validations);

      expect(stats.mostCommonErrors).toHaveLength(5);
    });
  });

  describe('edge cases', () => {
    it('should handle errors without expected range', () => {
      const error = createTestError('id', 'ID不能为空', 'error');
      const result = errorHandler.formatErrors([error]);
      
      expect(result).toBe('id: ID不能为空');
    });

    it('should handle errors with undefined actual value', () => {
      const error = createTestError('memorySize', '显存大小无效', 'error', { min: 1, max: 1000 });
      const result = errorHandler.formatErrors([error]);
      
      expect(result).toContain('memorySize: 显存大小无效');
      expect(result).not.toContain('实际: undefined');
    });

    it('should handle complex field names', () => {
      const error = createTestError('benchmarks.llmInference.tokensPerSecond', '性能数据无效', 'error');
      const suggestions = errorHandler.generateFixSuggestions({
        isValid: false,
        errors: [error],
        warnings: [],
        confidence: 0.8
      });
      
      expect(suggestions.some(s => s.includes('标准化的LLM推理基准测试'))).toBe(true);
    });
  });
});