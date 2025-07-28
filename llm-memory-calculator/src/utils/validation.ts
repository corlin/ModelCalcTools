import { ModelParameters, ErrorState } from '../types';
import { VALIDATION_RANGES, PRECISION_BYTES } from '../constants';

/**
 * 验证单个数值参数
 * @param value 要验证的值
 * @param min 最小值
 * @param max 最大值
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateNumericField(
  value: number,
  min: number,
  max: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (isNaN(value) || !isFinite(value)) {
    return {
      isValid: false,
      error: `${fieldName}必须是有效数字`
    };
  }

  if (value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName}必须在${min}到${max}之间`
    };
  }

  return { isValid: true };
}

/**
 * 验证精度类型
 * @param precision 精度类型
 * @returns 验证结果
 */
export function validatePrecision(precision: string): { isValid: boolean; error?: string } {
  const validPrecisions = Object.keys(PRECISION_BYTES);
  
  if (!validPrecisions.includes(precision)) {
    return {
      isValid: false,
      error: `精度类型必须是以下之一: ${validPrecisions.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * 验证模型参数的逻辑一致性
 * @param params 模型参数
 * @returns 验证结果
 */
export function validateParameterConsistency(params: ModelParameters): { 
  isValid: boolean; 
  warnings: string[] 
} {
  const warnings: string[] = [];

  // 检查参数数量与隐藏层维度的合理性
  const expectedParams = params.hiddenSize * params.hiddenSize * params.numLayers * 12; // 粗略估算
  const actualParams = params.parameterCount * 1e9;
  
  if (Math.abs(expectedParams - actualParams) / actualParams > 0.5) {
    warnings.push('参数数量与模型架构可能不匹配，请检查隐藏层维度和层数设置');
  }

  // 检查序列长度与批处理大小的组合
  if (params.sequenceLength > 8192 && params.batchSize > 4) {
    warnings.push('长序列与大批处理大小组合可能导致内存不足');
  }

  // 检查词汇表大小的合理性
  if (params.vocabularySize > 200000) {
    warnings.push('词汇表大小过大，可能影响性能');
  }

  // 检查精度与参数数量的匹配
  if (params.parameterCount > 100 && params.precision === 'fp32') {
    warnings.push('大模型建议使用FP16或更低精度以节省内存');
  }

  return {
    isValid: warnings.length === 0,
    warnings
  };
}

/**
 * 完整的模型参数验证
 * @param params 模型参数
 * @returns 详细的验证结果
 */
export function validateModelParameters(params: ModelParameters): {
  isValid: boolean;
  errors: { field: string; message: string }[];
  warnings: string[];
} {
  const errors: { field: string; message: string }[] = [];
  const warnings: string[] = [];

  // 验证参数数量
  const paramCountValidation = validateNumericField(
    params.parameterCount,
    VALIDATION_RANGES.parameterCount.min,
    VALIDATION_RANGES.parameterCount.max,
    '参数数量'
  );
  if (!paramCountValidation.isValid) {
    errors.push({ field: 'parameterCount', message: paramCountValidation.error! });
  }

  // 验证序列长度
  const seqLenValidation = validateNumericField(
    params.sequenceLength,
    VALIDATION_RANGES.sequenceLength.min,
    VALIDATION_RANGES.sequenceLength.max,
    '序列长度'
  );
  if (!seqLenValidation.isValid) {
    errors.push({ field: 'sequenceLength', message: seqLenValidation.error! });
  }

  // 验证批处理大小
  const batchSizeValidation = validateNumericField(
    params.batchSize,
    VALIDATION_RANGES.batchSize.min,
    VALIDATION_RANGES.batchSize.max,
    '批处理大小'
  );
  if (!batchSizeValidation.isValid) {
    errors.push({ field: 'batchSize', message: batchSizeValidation.error! });
  }

  // 验证隐藏层维度
  const hiddenSizeValidation = validateNumericField(
    params.hiddenSize,
    VALIDATION_RANGES.hiddenSize.min,
    VALIDATION_RANGES.hiddenSize.max,
    '隐藏层维度'
  );
  if (!hiddenSizeValidation.isValid) {
    errors.push({ field: 'hiddenSize', message: hiddenSizeValidation.error! });
  }

  // 验证层数
  const numLayersValidation = validateNumericField(
    params.numLayers,
    VALIDATION_RANGES.numLayers.min,
    VALIDATION_RANGES.numLayers.max,
    '层数'
  );
  if (!numLayersValidation.isValid) {
    errors.push({ field: 'numLayers', message: numLayersValidation.error! });
  }

  // 验证词汇表大小
  const vocabSizeValidation = validateNumericField(
    params.vocabularySize,
    VALIDATION_RANGES.vocabularySize.min,
    VALIDATION_RANGES.vocabularySize.max,
    '词汇表大小'
  );
  if (!vocabSizeValidation.isValid) {
    errors.push({ field: 'vocabularySize', message: vocabSizeValidation.error! });
  }

  // 验证精度类型
  const precisionValidation = validatePrecision(params.precision);
  if (!precisionValidation.isValid) {
    errors.push({ field: 'precision', message: precisionValidation.error! });
  }

  // 如果基础验证通过，进行一致性检查
  if (errors.length === 0) {
    const consistencyCheck = validateParameterConsistency(params);
    warnings.push(...consistencyCheck.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 创建错误状态对象
 * @param hasError 是否有错误
 * @param errorMessage 错误消息
 * @param errorField 错误字段
 * @returns 错误状态对象
 */
export function createErrorState(
  hasError: boolean,
  errorMessage: string = '',
  errorField?: string
): ErrorState {
  return {
    hasError,
    errorMessage,
    errorField
  };
}

/**
 * 格式化验证错误消息
 * @param errors 错误数组
 * @returns 格式化的错误消息
 */
export function formatValidationErrors(errors: { field: string; message: string }[]): string {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0].message;
  }

  return `发现${errors.length}个错误:\n${errors.map(e => `• ${e.message}`).join('\n')}`;
}

/**
 * 实时验证单个字段
 * @param fieldName 字段名
 * @param value 字段值
 * @param params 完整参数对象（用于上下文验证）
 * @returns 字段验证结果
 */
export function validateField(
  fieldName: keyof ModelParameters,
  value: any,
  params: ModelParameters
): { isValid: boolean; error?: string; warning?: string } {
  switch (fieldName) {
    case 'parameterCount':
      const paramValidation = validateNumericField(
        value,
        VALIDATION_RANGES.parameterCount.min,
        VALIDATION_RANGES.parameterCount.max,
        '参数数量'
      );
      return {
        isValid: paramValidation.isValid,
        error: paramValidation.error,
        warning: value > 100 && params.precision === 'fp32' 
          ? '大模型建议使用FP16精度' 
          : undefined
      };

    case 'sequenceLength':
      const seqValidation = validateNumericField(
        value,
        VALIDATION_RANGES.sequenceLength.min,
        VALIDATION_RANGES.sequenceLength.max,
        '序列长度'
      );
      return {
        isValid: seqValidation.isValid,
        error: seqValidation.error,
        warning: value > 8192 && params.batchSize > 4 
          ? '长序列配合大批处理可能导致内存不足' 
          : undefined
      };

    case 'batchSize':
      const batchValidation = validateNumericField(
        value,
        VALIDATION_RANGES.batchSize.min,
        VALIDATION_RANGES.batchSize.max,
        '批处理大小'
      );
      return {
        isValid: batchValidation.isValid,
        error: batchValidation.error,
        warning: value > 32 ? '大批处理大小可能导致内存不足' : undefined
      };

    case 'hiddenSize':
      const hiddenValidation = validateNumericField(
        value,
        VALIDATION_RANGES.hiddenSize.min,
        VALIDATION_RANGES.hiddenSize.max,
        '隐藏层维度'
      );
      return {
        isValid: hiddenValidation.isValid,
        error: hiddenValidation.error,
        warning: value % 64 !== 0 ? '隐藏层维度建议为64的倍数以优化性能' : undefined
      };

    case 'numLayers':
      const layersValidation = validateNumericField(
        value,
        VALIDATION_RANGES.numLayers.min,
        VALIDATION_RANGES.numLayers.max,
        '层数'
      );
      return {
        isValid: layersValidation.isValid,
        error: layersValidation.error
      };

    case 'vocabularySize':
      const vocabValidation = validateNumericField(
        value,
        VALIDATION_RANGES.vocabularySize.min,
        VALIDATION_RANGES.vocabularySize.max,
        '词汇表大小'
      );
      return {
        isValid: vocabValidation.isValid,
        error: vocabValidation.error,
        warning: value > 100000 ? '大词汇表可能影响性能' : undefined
      };

    case 'precision':
      const precisionValidation = validatePrecision(value);
      return {
        isValid: precisionValidation.isValid,
        error: precisionValidation.error
      };

    default:
      return { isValid: true };
  }
}

/**
 * 检查内存需求是否合理
 * @param totalMemory 总内存需求 (GB)
 * @returns 内存检查结果
 */
export function validateMemoryRequirement(totalMemory: number): {
  isReasonable: boolean;
  level: 'low' | 'medium' | 'high' | 'extreme';
  message: string;
} {
  if (totalMemory < 8) {
    return {
      isReasonable: true,
      level: 'low',
      message: '内存需求较低，大多数现代GPU都能满足'
    };
  } else if (totalMemory < 24) {
    return {
      isReasonable: true,
      level: 'medium',
      message: '内存需求适中，需要中高端GPU'
    };
  } else if (totalMemory < 80) {
    return {
      isReasonable: true,
      level: 'high',
      message: '内存需求较高，需要专业级GPU或多卡配置'
    };
  } else {
    return {
      isReasonable: false,
      level: 'extreme',
      message: '内存需求极高，建议考虑模型量化或分布式部署'
    };
  }
}