import { 
  MemoryCalculationResult, 
  StandardizedMemoryData, 
  CalculationMode,
  ValidationResult
} from '../types';
import { MemoryDataValidator } from './MemoryDataValidator';
import { FallbackDisplayManager } from './FallbackDisplayManager';
import { MemoryUnitConverter } from './MemoryUnitConverter';

/**
 * 验证集成工具
 * 提供组件级别的验证和错误处理集成
 */
export class ValidationIntegration {
  /**
   * 验证并处理内存计算结果
   * @param result 内存计算结果
   * @param mode 计算模式
   * @param componentName 组件名称（用于日志）
   * @returns 验证结果和处理后的数据
   */
  static validateAndProcessCalculationResult(
    result: MemoryCalculationResult,
    mode: CalculationMode,
    componentName: string
  ): {
    isValid: boolean;
    validationResult: ValidationResult;
    processedResult: MemoryCalculationResult;
    shouldUseFallback: boolean;
  } {
    try {
      // 执行验证
      const validationResult = MemoryDataValidator.validateCalculationResult(result, mode);
      
      // 记录验证结果
      if (!validationResult.isValid) {
        console.warn(`${componentName}: Validation failed`, validationResult.errors);
        FallbackDisplayManager.logFallbackEvent('data_validation', new Error('Validation failed'), {
          component: componentName,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          mode
        });
      }
      
      if (validationResult.warnings.length > 0) {
        console.info(`${componentName}: Validation warnings`, validationResult.warnings);
      }

      // 决定是否需要使用降级策略
      const shouldUseFallback = !validationResult.isValid && validationResult.errors.length > 2;

      return {
        isValid: validationResult.isValid,
        validationResult,
        processedResult: result,
        shouldUseFallback
      };
    } catch (error) {
      console.error(`${componentName}: Validation error`, error);
      FallbackDisplayManager.logFallbackEvent('data_validation', error as Error, {
        component: componentName,
        mode
      });

      return {
        isValid: false,
        validationResult: {
          isValid: false,
          errors: ['验证过程中发生错误'],
          warnings: []
        },
        processedResult: result,
        shouldUseFallback: true
      };
    }
  }

  /**
   * 创建标准化内存数据并验证
   * @param result 内存计算结果
   * @param mode 计算模式
   * @param componentName 组件名称
   * @returns 标准化内存数据或降级数据
   */
  static createValidatedStandardizedMemoryData(
    result: MemoryCalculationResult,
    mode: CalculationMode,
    componentName: string
  ): StandardizedMemoryData {
    try {
      const modeData = mode === 'inference' ? result.inference : result.training;
      const totalBytes = MemoryUnitConverter.gbToBytes(modeData.total);

      const standardizedData: StandardizedMemoryData = {
        totalBytes,
        breakdown: {
          weightsBytes: MemoryUnitConverter.gbToBytes(modeData.modelWeights),
          activationsBytes: MemoryUnitConverter.gbToBytes(modeData.activations),
          gradientsBytes: mode === 'training' ? MemoryUnitConverter.gbToBytes(result.training.gradients) : undefined,
          optimizerBytes: mode === 'training' ? MemoryUnitConverter.gbToBytes(result.training.optimizerStates) : undefined
        },
        utilization: {
          theoreticalUtilization: 0, // 需要从其他地方获取
          practicalUtilization: 0,
          utilizationPercentage: 0,
          isOverCapacity: false,
          efficiencyRating: 'fair'
        },
        metadata: {
          calculationMode: mode,
          timestamp: new Date(),
          version: '1.0.0'
        }
      };

      // 验证标准化数据
      const validation = MemoryDataValidator.validateMemoryData(standardizedData);
      
      if (!validation.isValid) {
        console.warn(`${componentName}: Standardized data validation failed`, validation.errors);
        FallbackDisplayManager.logFallbackEvent('data_validation', new Error('Standardized data validation failed'), {
          component: componentName,
          errors: validation.errors,
          mode
        });
        
        // 返回降级数据
        return FallbackDisplayManager.getStandardizedMemoryDataFallback(
          new Error('Validation failed'),
          standardizedData
        );
      }

      return standardizedData;
    } catch (error) {
      console.error(`${componentName}: Error creating standardized data`, error);
      FallbackDisplayManager.logFallbackEvent('data_validation', error as Error, {
        component: componentName,
        mode
      });
      
      // 返回完全降级的数据
      return FallbackDisplayManager.getStandardizedMemoryDataFallback(error as Error);
    }
  }

  /**
   * 安全执行函数，带有验证和错误处理
   * @param operation 要执行的操作
   * @param componentName 组件名称
   * @param fallbackValue 降级值
   * @returns 执行结果或降级值
   */
  static safeExecuteWithValidation<T>(
    operation: () => T,
    componentName: string,
    fallbackValue: T
  ): T {
    try {
      const result = operation();
      return result;
    } catch (error) {
      console.error(`${componentName}: Safe execution failed`, error);
      FallbackDisplayManager.logFallbackEvent('data_validation', error as Error, {
        component: componentName,
        operation: 'safeExecuteWithValidation'
      });
      
      return fallbackValue;
    }
  }

  /**
   * 验证数值的合理性
   * @param value 数值
   * @param fieldName 字段名称
   * @param min 最小值
   * @param max 最大值
   * @returns 验证结果
   */
  static validateNumericValue(
    value: number,
    fieldName: string,
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER
  ): { isValid: boolean; sanitizedValue: number; warning?: string } {
    if (!Number.isFinite(value)) {
      return {
        isValid: false,
        sanitizedValue: min,
        warning: `${fieldName}不是有效数值，已重置为${min}`
      };
    }

    if (value < min) {
      return {
        isValid: false,
        sanitizedValue: min,
        warning: `${fieldName}小于最小值${min}，已调整`
      };
    }

    if (value > max) {
      return {
        isValid: false,
        sanitizedValue: max,
        warning: `${fieldName}超过最大值${max}，已调整`
      };
    }

    return {
      isValid: true,
      sanitizedValue: value
    };
  }

  /**
   * 批量验证数值数组
   * @param values 数值数组
   * @param fieldName 字段名称
   * @param min 最小值
   * @param max 最大值
   * @returns 验证结果和清理后的数组
   */
  static validateNumericArray(
    values: number[],
    fieldName: string,
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER
  ): { isValid: boolean; sanitizedValues: number[]; warnings: string[] } {
    const warnings: string[] = [];
    const sanitizedValues: number[] = [];

    values.forEach((value, index) => {
      const validation = this.validateNumericValue(value, `${fieldName}[${index}]`, min, max);
      sanitizedValues.push(validation.sanitizedValue);
      
      if (!validation.isValid && validation.warning) {
        warnings.push(validation.warning);
      }
    });

    return {
      isValid: warnings.length === 0,
      sanitizedValues,
      warnings
    };
  }

  /**
   * 创建验证摘要用于UI显示
   * @param validationResult 验证结果
   * @param componentName 组件名称
   * @returns UI友好的验证摘要
   */
  static createUIValidationSummary(
    validationResult: ValidationResult,
    componentName: string
  ): {
    hasIssues: boolean;
    severity: 'error' | 'warning' | 'info';
    message: string;
    details: string[];
  } {
    const { isValid, errors, warnings } = validationResult;
    
    if (!isValid && errors.length > 0) {
      return {
        hasIssues: true,
        severity: 'error',
        message: `${componentName}数据验证失败`,
        details: errors
      };
    }
    
    if (warnings.length > 0) {
      return {
        hasIssues: true,
        severity: 'warning',
        message: `${componentName}数据存在警告`,
        details: warnings
      };
    }
    
    return {
      hasIssues: false,
      severity: 'info',
      message: `${componentName}数据验证通过`,
      details: []
    };
  }

  /**
   * 检查是否应该显示验证警告
   * @param validationResult 验证结果
   * @param showWarningsThreshold 显示警告的阈值
   * @returns 是否应该显示警告
   */
  static shouldShowValidationWarning(
    validationResult: ValidationResult,
    showWarningsThreshold: number = 1
  ): boolean {
    return !validationResult.isValid || validationResult.warnings.length >= showWarningsThreshold;
  }

  /**
   * 获取验证状态的CSS类名
   * @param validationResult 验证结果
   * @returns CSS类名
   */
  static getValidationStatusClass(validationResult: ValidationResult): string {
    if (!validationResult.isValid) {
      return 'validation-error';
    }
    
    if (validationResult.warnings.length > 0) {
      return 'validation-warning';
    }
    
    return 'validation-success';
  }
}