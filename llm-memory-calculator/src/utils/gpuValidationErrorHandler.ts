import { GPUValidationError, GPUValidationResult } from '../types';

/**
 * GPU验证错误处理器
 * 提供错误格式化、分类和处理建议
 */
export class GPUValidationErrorHandler {
  /**
   * 格式化验证错误消息
   * @param errors 错误数组
   * @returns 格式化的错误消息
   */
  formatErrors(errors: GPUValidationError[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
      return this.formatSingleError(errors[0]);
    }

    const errorsByField = this.groupErrorsByField(errors);
    const formattedGroups = Object.entries(errorsByField).map(([field, fieldErrors]) => {
      if (fieldErrors.length === 1) {
        return `• ${field}: ${fieldErrors[0].message}`;
      } else {
        return `• ${field}:\n${fieldErrors.map(e => `  - ${e.message}`).join('\n')}`;
      }
    });

    return `发现 ${errors.length} 个验证错误:\n${formattedGroups.join('\n')}`;
  }

  /**
   * 格式化单个错误
   */
  private formatSingleError(error: GPUValidationError): string {
    let message = `${error.field}: ${error.message}`;
    
    if (error.expectedRange && error.actualValue !== undefined) {
      message += ` (期望: ${error.expectedRange.min}-${error.expectedRange.max}, 实际: ${error.actualValue})`;
    }
    
    return message;
  }

  /**
   * 按字段分组错误
   */
  private groupErrorsByField(errors: GPUValidationError[]): Record<string, GPUValidationError[]> {
    return errors.reduce((groups, error) => {
      const field = error.field;
      if (!groups[field]) {
        groups[field] = [];
      }
      groups[field].push(error);
      return groups;
    }, {} as Record<string, GPUValidationError[]>);
  }

  /**
   * 按严重程度分类错误
   * @param errors 错误数组
   * @returns 分类后的错误
   */
  categorizeErrors(errors: GPUValidationError[]): {
    critical: GPUValidationError[];
    warnings: GPUValidationError[];
  } {
    return {
      critical: errors.filter(e => e.severity === 'error'),
      warnings: errors.filter(e => e.severity === 'warning')
    };
  }

  /**
   * 生成修复建议
   * @param validation 验证结果
   * @returns 修复建议数组
   */
  generateFixSuggestions(validation: GPUValidationResult): string[] {
    const suggestions: string[] = [];
    const { errors } = validation;

    // 按错误类型生成建议
    for (const error of errors) {
      const suggestion = this.getSuggestionForError(error);
      if (suggestion && !suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    }

    // 基于可信度生成建议
    if (validation.confidence < 0.7) {
      suggestions.push('数据可信度较低，建议从官方来源重新获取数据');
    }

    // 基于警告生成建议
    if (validation.warnings.length > 3) {
      suggestions.push('存在多个数据质量问题，建议全面检查数据来源');
    }

    return suggestions;
  }

  /**
   * 为特定错误生成建议
   */
  private getSuggestionForError(error: GPUValidationError): string | null {
    const fieldSuggestions: Record<string, string> = {
      'memorySize': '检查GPU官方规格表确认显存大小',
      'memoryBandwidth': '验证内存带宽是否与内存类型匹配',
      'computeUnits': '确认CUDA核心数或流处理器数量',
      'tdp': '检查GPU的热设计功耗规格',
      'price.msrp': '更新官方建议零售价',
      'price.currentPrice': '从可靠的价格监控网站获取当前市场价格',
      'benchmarks.llmInference.tokensPerSecond': '使用标准化的LLM推理基准测试',
      'benchmarks.syntheticBenchmarks.fp16Performance': '参考官方或第三方的FP16性能测试结果',
      'efficiency.overall': '重新计算综合效率评分',
      'dataSource': '指定明确的数据来源'
    };

    // 精确匹配
    if (fieldSuggestions[error.field]) {
      return fieldSuggestions[error.field];
    }

    // 模糊匹配
    for (const [field, suggestion] of Object.entries(fieldSuggestions)) {
      if (error.field.includes(field)) {
        return suggestion;
      }
    }

    // 基于错误类型的通用建议
    if (error.message.includes('不能为空')) {
      return '补充缺失的必填字段数据';
    }

    if (error.message.includes('必须在') && error.expectedRange) {
      return `调整数值到合理范围 (${error.expectedRange.min}-${error.expectedRange.max})`;
    }

    if (error.message.includes('日期')) {
      return '使用有效的日期格式更新时间戳';
    }

    return null;
  }

  /**
   * 生成验证报告
   * @param validation 验证结果
   * @param gpuId GPU标识符
   * @returns 格式化的验证报告
   */
  generateValidationReport(validation: GPUValidationResult, gpuId: string): string {
    const report: string[] = [];
    
    report.push(`=== GPU数据验证报告: ${gpuId} ===`);
    report.push(`验证状态: ${validation.isValid ? '✅ 通过' : '❌ 失败'}`);
    report.push(`数据可信度: ${(validation.confidence * 100).toFixed(1)}%`);
    report.push('');

    // 错误部分
    if (validation.errors.length > 0) {
      const categorized = this.categorizeErrors(validation.errors);
      
      if (categorized.critical.length > 0) {
        report.push('🚨 严重错误:');
        categorized.critical.forEach(error => {
          report.push(`  • ${this.formatSingleError(error)}`);
        });
        report.push('');
      }

      if (categorized.warnings.length > 0) {
        report.push('⚠️  警告:');
        categorized.warnings.forEach(error => {
          report.push(`  • ${this.formatSingleError(error)}`);
        });
        report.push('');
      }
    }

    // 警告部分
    if (validation.warnings.length > 0) {
      report.push('💡 数据质量警告:');
      validation.warnings.forEach(warning => {
        report.push(`  • ${warning}`);
      });
      report.push('');
    }

    // 修复建议
    const suggestions = this.generateFixSuggestions(validation);
    if (suggestions.length > 0) {
      report.push('🔧 修复建议:');
      suggestions.forEach(suggestion => {
        report.push(`  • ${suggestion}`);
      });
      report.push('');
    }

    // 总结
    if (validation.isValid) {
      report.push('✅ 数据验证通过，可以安全使用');
    } else {
      report.push('❌ 数据验证失败，请修复错误后重新验证');
    }

    return report.join('\n');
  }

  /**
   * 检查是否为关键错误
   * @param error 验证错误
   * @returns 是否为关键错误
   */
  isCriticalError(error: GPUValidationError): boolean {
    const criticalFields = [
      'id',
      'name',
      'memorySize',
      'price.currentPrice',
      'benchmarks.llmInference'
    ];

    return error.severity === 'error' && 
           criticalFields.some(field => error.field.startsWith(field));
  }

  /**
   * 获取错误优先级
   * @param error 验证错误
   * @returns 优先级 (1-5, 1为最高)
   */
  getErrorPriority(error: GPUValidationError): number {
    if (this.isCriticalError(error)) {
      return 1;
    }

    if (error.severity === 'error') {
      // 对于错误级别，进一步按字段类型分类
      if (error.field.includes('price') || error.field.includes('benchmark')) {
        return 3;
      }
      if (error.field.includes('efficiency')) {
        return 4;
      }
      return 2; // 其他错误
    }

    // 警告级别
    return 5;
  }

  /**
   * 排序错误（按优先级）
   * @param errors 错误数组
   * @returns 排序后的错误数组
   */
  sortErrorsByPriority(errors: GPUValidationError[]): GPUValidationError[] {
    return [...errors].sort((a, b) => {
      const priorityA = this.getErrorPriority(a);
      const priorityB = this.getErrorPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 相同优先级按字段名排序
      return a.field.localeCompare(b.field);
    });
  }

  /**
   * 生成错误统计
   * @param validations 多个验证结果
   * @returns 错误统计信息
   */
  generateErrorStatistics(validations: GPUValidationResult[]): {
    totalErrors: number;
    errorsByField: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    mostCommonErrors: Array<{ field: string; count: number; message: string }>;
  } {
    const allErrors = validations.flatMap(v => v.errors);
    
    const errorsByField = allErrors.reduce((acc, error) => {
      acc[error.field] = (acc[error.field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = allErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 找出最常见的错误
    const errorMessages = allErrors.reduce((acc, error) => {
      const key = `${error.field}:${error.message}`;
      if (!acc[key]) {
        acc[key] = { field: error.field, message: error.message, count: 0 };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { field: string; message: string; count: number }>);

    const mostCommonErrors = Object.values(errorMessages)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: allErrors.length,
      errorsByField,
      errorsBySeverity,
      mostCommonErrors
    };
  }
}

// 导出默认实例
export const gpuValidationErrorHandler = new GPUValidationErrorHandler();