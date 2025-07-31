import { 
  StandardizedMemoryData, 
  ValidationResult, 
  MemoryCalculationResult,
  CalculationMode 
} from '../types';
import { MemoryUnitConverter } from './MemoryUnitConverter';

/**
 * 内存数据验证器
 * 负责验证内存数据的合理性和一致性
 */
export class MemoryDataValidator {
  // 验证阈值常量
  private static readonly MIN_MEMORY_BYTES = 1024; // 最小1KB
  private static readonly MAX_MEMORY_BYTES = MemoryUnitConverter.tbToBytes(10); // 最大10TB
  private static readonly MAX_PERCENTAGE_TOLERANCE = 0.1; // 百分比容差0.1%
  private static readonly MAX_BREAKDOWN_VARIANCE = 0.05; // 分解数据方差容差5%

  /**
   * 验证标准化内存数据
   * @param data 标准化内存数据
   * @returns 验证结果
   */
  static validateMemoryData(data: StandardizedMemoryData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 基础数据验证
      this.validateBasicData(data, errors, warnings);
      
      // 分解数据一致性验证
      this.validateBreakdownConsistency(data, errors, warnings);
      
      // 利用率数据验证
      this.validateUtilizationData(data, errors, warnings);
      
      // 元数据验证
      this.validateMetadata(data, errors, warnings);

    } catch (error) {
      errors.push(`验证过程中发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证基础数据
   * @param data 内存数据
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateBasicData(
    data: StandardizedMemoryData, 
    errors: string[], 
    warnings: string[]
  ): void {
    // 验证总内存
    if (!Number.isFinite(data.totalBytes) || data.totalBytes <= 0) {
      errors.push('总内存必须是大于0的有限数值');
      return; // 如果总内存无效，后续验证无意义
    }

    if (data.totalBytes < this.MIN_MEMORY_BYTES) {
      warnings.push(`总内存过小 (${MemoryUnitConverter.formatMemorySize(data.totalBytes)})，可能不合理`);
    }

    if (data.totalBytes > this.MAX_MEMORY_BYTES) {
      warnings.push(`总内存过大 (${MemoryUnitConverter.formatMemorySize(data.totalBytes)})，请确认是否正确`);
    }

    // 验证分解数据存在性
    if (!data.breakdown) {
      errors.push('缺少内存分解数据');
      return;
    }

    // 验证各分解项
    this.validateBreakdownItems(data.breakdown, errors, warnings);
  }

  /**
   * 验证分解项数据
   * @param breakdown 分解数据
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateBreakdownItems(
    breakdown: StandardizedMemoryData['breakdown'],
    errors: string[],
    warnings: string[]
  ): void {
    const items = [
      { name: '权重内存', value: breakdown.weightsBytes },
      { name: '激活值内存', value: breakdown.activationsBytes },
      { name: '梯度内存', value: breakdown.gradientsBytes },
      { name: '优化器内存', value: breakdown.optimizerBytes }
    ];

    items.forEach(item => {
      if (item.value !== undefined) {
        if (!Number.isFinite(item.value) || item.value < 0) {
          errors.push(`${item.name}必须是非负的有限数值`);
        } else if (item.value > this.MAX_MEMORY_BYTES) {
          warnings.push(`${item.name}过大 (${MemoryUnitConverter.formatMemorySize(item.value)})，请确认是否正确`);
        }
      }
    });

    // 验证必需项
    if (!Number.isFinite(breakdown.weightsBytes) || breakdown.weightsBytes <= 0) {
      errors.push('权重内存是必需的，且必须大于0');
    }

    if (!Number.isFinite(breakdown.activationsBytes) || breakdown.activationsBytes <= 0) {
      errors.push('激活值内存是必需的，且必须大于0');
    }
  }

  /**
   * 验证分解数据一致性
   * @param data 内存数据
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateBreakdownConsistency(
    data: StandardizedMemoryData,
    errors: string[],
    warnings: string[]
  ): void {
    const { breakdown, totalBytes } = data;

    // 计算分解项总和
    let breakdownTotal = breakdown.weightsBytes + breakdown.activationsBytes;
    
    if (breakdown.gradientsBytes !== undefined) {
      breakdownTotal += breakdown.gradientsBytes;
    }
    
    if (breakdown.optimizerBytes !== undefined) {
      breakdownTotal += breakdown.optimizerBytes;
    }

    // 检查总和一致性
    const difference = Math.abs(breakdownTotal - totalBytes);
    const tolerance = totalBytes * this.MAX_BREAKDOWN_VARIANCE;

    if (difference > tolerance) {
      const percentageDiff = (difference / totalBytes) * 100;
      if (percentageDiff > 10) {
        errors.push(
          `内存分解总和 (${MemoryUnitConverter.formatMemorySize(breakdownTotal)}) ` +
          `与总内存 (${MemoryUnitConverter.formatMemorySize(totalBytes)}) ` +
          `差异过大 (${percentageDiff.toFixed(1)}%)`
        );
      } else {
        warnings.push(
          `内存分解总和与总内存存在差异 ` +
          `(${MemoryUnitConverter.formatMemorySize(difference)}, ${percentageDiff.toFixed(1)}%)`
        );
      }
    }

    // 验证训练模式下的数据完整性
    if (data.metadata.calculationMode === 'training') {
      if (breakdown.gradientsBytes === undefined || breakdown.gradientsBytes <= 0) {
        warnings.push('训练模式下缺少梯度内存数据');
      }
      
      if (breakdown.optimizerBytes === undefined || breakdown.optimizerBytes <= 0) {
        warnings.push('训练模式下缺少优化器状态内存数据');
      }
    }
  }

  /**
   * 验证利用率数据
   * @param data 内存数据
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateUtilizationData(
    data: StandardizedMemoryData,
    errors: string[],
    warnings: string[]
  ): void {
    const { utilization } = data;

    if (!utilization) {
      errors.push('缺少利用率数据');
      return;
    }

    // 验证利用率数值范围
    const utilizationFields = [
      { name: '理论利用率', value: utilization.theoreticalUtilization, min: 0, max: 10 },
      { name: '实际利用率', value: utilization.practicalUtilization, min: 0, max: 10 },
      { name: '利用率百分比', value: utilization.utilizationPercentage, min: 0, max: 1000 }
    ];

    utilizationFields.forEach(field => {
      if (!Number.isFinite(field.value)) {
        errors.push(`${field.name}必须是有限数值`);
      } else if (field.value < field.min) {
        errors.push(`${field.name}不能小于${field.min}`);
      } else if (field.value > field.max) {
        warnings.push(`${field.name} (${field.value.toFixed(2)}) 超出常见范围，请确认是否正确`);
      }
    });

    // 验证利用率逻辑一致性
    const theoreticalPercent = utilization.theoreticalUtilization * 100;
    const percentageDiff = Math.abs(theoreticalPercent - utilization.utilizationPercentage);
    
    if (percentageDiff > this.MAX_PERCENTAGE_TOLERANCE && utilization.utilizationPercentage <= 100) {
      warnings.push(
        `理论利用率 (${theoreticalPercent.toFixed(1)}%) 与利用率百分比 ` +
        `(${utilization.utilizationPercentage.toFixed(1)}%) 不一致`
      );
    }

    // 验证超容量标志
    if (utilization.isOverCapacity && utilization.practicalUtilization <= 1.0) {
      warnings.push('标记为超容量但实际利用率未超过100%');
    } else if (!utilization.isOverCapacity && utilization.practicalUtilization > 1.0) {
      warnings.push('实际利用率超过100%但未标记为超容量');
    }

    // 验证效率评级
    const validRatings = ['excellent', 'good', 'fair', 'poor'];
    if (!validRatings.includes(utilization.efficiencyRating)) {
      errors.push(`无效的效率评级: ${utilization.efficiencyRating}`);
    }
  }

  /**
   * 验证元数据
   * @param data 内存数据
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateMetadata(
    data: StandardizedMemoryData,
    errors: string[],
    warnings: string[]
  ): void {
    const { metadata } = data;

    if (!metadata) {
      errors.push('缺少元数据');
      return;
    }

    // 验证计算模式
    const validModes: CalculationMode[] = ['inference', 'training'];
    if (!validModes.includes(metadata.calculationMode)) {
      errors.push(`无效的计算模式: ${metadata.calculationMode}`);
    }

    // 验证时间戳
    if (!metadata.timestamp || !(metadata.timestamp instanceof Date)) {
      errors.push('时间戳必须是有效的Date对象');
    } else {
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - metadata.timestamp.getTime());
      const oneHour = 60 * 60 * 1000;
      
      if (timeDiff > oneHour) {
        warnings.push(`数据时间戳较旧 (${metadata.timestamp.toLocaleString()})，可能需要更新`);
      }
    }

    // 验证版本
    if (!metadata.version || typeof metadata.version !== 'string') {
      warnings.push('缺少或无效的版本信息');
    }
  }

  /**
   * 验证内存计算结果
   * @param result 内存计算结果
   * @param mode 计算模式
   * @returns 验证结果
   */
  static validateCalculationResult(
    result: MemoryCalculationResult,
    mode: CalculationMode
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 验证基础结构
      if (!result.parameters) {
        errors.push('缺少模型参数');
      }

      if (!result.inference) {
        errors.push('缺少推理模式数据');
      }

      if (!result.training) {
        errors.push('缺少训练模式数据');
      }

      // 验证推理数据
      if (result.inference) {
        this.validateModeData(result.inference, 'inference', errors, warnings);
      }

      // 验证训练数据
      if (result.training) {
        this.validateModeData(result.training, 'training', errors, warnings);
      }

      // 验证模式一致性
      if (result.inference && result.training) {
        if (result.inference.modelWeights !== result.training.modelWeights) {
          warnings.push('推理和训练模式的模型权重不一致');
        }
      }

      // 验证当前模式的数据完整性
      const currentModeData = mode === 'inference' ? result.inference : result.training;
      if (!currentModeData) {
        errors.push(`缺少${mode === 'inference' ? '推理' : '训练'}模式数据`);
      }

    } catch (error) {
      errors.push(`验证计算结果时发生错误: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 验证特定模式的数据
   * @param modeData 模式数据
   * @param mode 模式名称
   * @param errors 错误数组
   * @param warnings 警告数组
   */
  private static validateModeData(
    modeData: any,
    mode: string,
    errors: string[],
    warnings: string[]
  ): void {
    const requiredFields = ['modelWeights', 'activations', 'total'];
    
    requiredFields.forEach(field => {
      if (typeof modeData[field] !== 'number' || !Number.isFinite(modeData[field])) {
        errors.push(`${mode}模式缺少有效的${field}数据`);
      } else if (modeData[field] < 0) {
        errors.push(`${mode}模式的${field}不能为负数`);
      }
    });

    // 验证总和一致性
    if (modeData.modelWeights && modeData.activations && modeData.total) {
      let expectedTotal = modeData.modelWeights + modeData.activations;
      
      if (mode === 'training' && modeData.gradients && modeData.optimizerStates) {
        expectedTotal += modeData.gradients + modeData.optimizerStates;
      }

      const difference = Math.abs(expectedTotal - modeData.total);
      const tolerance = modeData.total * 0.01; // 1%容差

      if (difference > tolerance) {
        warnings.push(`${mode}模式的总内存与各项之和不一致`);
      }
    }
  }

  /**
   * 快速验证内存数据的基本有效性
   * @param data 内存数据
   * @returns 是否有效
   */
  static isValidMemoryData(data: StandardizedMemoryData): boolean {
    try {
      return (
        data &&
        typeof data.totalBytes === 'number' &&
        data.totalBytes > 0 &&
        Number.isFinite(data.totalBytes) &&
        data.breakdown &&
        typeof data.breakdown.weightsBytes === 'number' &&
        data.breakdown.weightsBytes > 0 &&
        typeof data.breakdown.activationsBytes === 'number' &&
        data.breakdown.activationsBytes > 0 &&
        data.utilization &&
        typeof data.utilization.theoreticalUtilization === 'number' &&
        data.metadata &&
        data.metadata.calculationMode &&
        data.metadata.timestamp instanceof Date
      );
    } catch {
      return false;
    }
  }

  /**
   * 创建验证摘要报告
   * @param validationResult 验证结果
   * @returns 格式化的摘要报告
   */
  static createValidationSummary(validationResult: ValidationResult): string {
    const { isValid, errors, warnings } = validationResult;
    
    let summary = `验证结果: ${isValid ? '通过' : '失败'}\n`;
    
    if (errors.length > 0) {
      summary += `\n错误 (${errors.length}):\n`;
      errors.forEach((error, index) => {
        summary += `  ${index + 1}. ${error}\n`;
      });
    }
    
    if (warnings.length > 0) {
      summary += `\n警告 (${warnings.length}):\n`;
      warnings.forEach((warning, index) => {
        summary += `  ${index + 1}. ${warning}\n`;
      });
    }
    
    return summary;
  }
}