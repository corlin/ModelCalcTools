import React, { useState, useEffect, useCallback } from 'react';
import { ModelParameters, PrecisionType, ErrorState } from '../../types';
import { 
  DEFAULT_MODEL_PARAMS, 
  PRECISION_LABELS, 
  VALIDATION_RANGES 
} from '../../constants';
import { validateField, validateModelParameters } from '../../utils/validation';
import { debounce } from '../../utils/errorHandler';
import { InputField } from './InputField';
import { SelectField } from './SelectField';

export interface ModelInputProps {
  initialParams?: ModelParameters;
  onParametersChange: (params: ModelParameters, isValid: boolean) => void;
  onValidationChange?: (errors: ErrorState) => void;
  disabled?: boolean;
  className?: string;
}

const ModelInput: React.FC<ModelInputProps> = ({
  initialParams = DEFAULT_MODEL_PARAMS,
  onParametersChange,
  onValidationChange,
  disabled = false,
  className = ''
}) => {
  const [params, setParams] = useState<ModelParameters>(initialParams);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // 防抖验证函数
  const debouncedValidation = useCallback(
    debounce((newParams: ModelParameters) => {
      setIsValidating(true);
      
      const validation = validateModelParameters(newParams);
      const newErrors: Record<string, string> = {};
      
      validation.errors.forEach(error => {
        newErrors[error.field] = error.message;
      });
      
      setFieldErrors(newErrors);
      
      // 通知父组件验证状态
      if (onValidationChange) {
        onValidationChange({
          hasError: !validation.isValid,
          errorMessage: validation.errors.length > 0 ? validation.errors[0].message : '',
          errorField: validation.errors.length > 0 ? validation.errors[0].field : undefined
        });
      }
      
      // 通知父组件参数变化
      onParametersChange(newParams, validation.isValid);
      
      setIsValidating(false);
    }, 300),
    [onParametersChange, onValidationChange]
  );

  // 实时字段验证
  const validateSingleField = useCallback((
    fieldName: keyof ModelParameters,
    value: any,
    currentParams: ModelParameters
  ) => {
    const fieldValidation = validateField(fieldName, value, currentParams);
    
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: fieldValidation.error || ''
    }));
    
    setFieldWarnings(prev => ({
      ...prev,
      [fieldName]: fieldValidation.warning || ''
    }));
  }, []);

  // 处理参数变化
  const handleParameterChange = useCallback((
    field: keyof ModelParameters,
    value: string | number
  ) => {
    const newParams = { ...params, [field]: value };
    setParams(newParams);
    
    // 立即验证当前字段
    validateSingleField(field, value, newParams);
    
    // 防抖验证整体参数
    debouncedValidation(newParams);
  }, [params, validateSingleField, debouncedValidation]);

  // 当初始参数变化时更新状态
  useEffect(() => {
    setParams(initialParams);
    debouncedValidation(initialParams);
  }, [initialParams, debouncedValidation]);

  // 精度选项
  const precisionOptions = Object.entries(PRECISION_LABELS).map(([value, label]) => ({
    value: value as PrecisionType,
    label
  }));

  return (
    <div className={`model-input ${className}`}>
      <div className="model-input-header">
        <h3>模型参数配置</h3>
        {isValidating && (
          <div className="validation-indicator">
            <span className="loading-spinner"></span>
            验证中...
          </div>
        )}
      </div>

      <div className="model-input-grid">
        <div className="input-row">
          <InputField
            label="参数数量 (B)"
            type="number"
            value={params.parameterCount}
            onChange={(value) => handleParameterChange('parameterCount', parseFloat(value) || 0)}
            error={fieldErrors.parameterCount}
            warning={fieldWarnings.parameterCount}
            disabled={disabled}
            min={VALIDATION_RANGES.parameterCount.min}
            max={VALIDATION_RANGES.parameterCount.max}
            step={0.1}
            placeholder="例如: 7"
            helpText="模型的总参数数量，单位为十亿（Billion）"
          />

          <SelectField
            label="精度类型"
            value={params.precision}
            onChange={(value) => handleParameterChange('precision', value)}
            options={precisionOptions}
            error={fieldErrors.precision}
            warning={fieldWarnings.precision}
            disabled={disabled}
            helpText="模型权重的数值精度，影响内存占用"
          />
        </div>

        <div className="input-row">
          <InputField
            label="序列长度"
            type="number"
            value={params.sequenceLength}
            onChange={(value) => handleParameterChange('sequenceLength', parseInt(value) || 0)}
            error={fieldErrors.sequenceLength}
            warning={fieldWarnings.sequenceLength}
            disabled={disabled}
            min={VALIDATION_RANGES.sequenceLength.min}
            max={VALIDATION_RANGES.sequenceLength.max}
            step={1}
            placeholder="例如: 2048"
            helpText="模型能处理的最大序列长度"
          />

          <InputField
            label="批处理大小"
            type="number"
            value={params.batchSize}
            onChange={(value) => handleParameterChange('batchSize', parseInt(value) || 0)}
            error={fieldErrors.batchSize}
            warning={fieldWarnings.batchSize}
            disabled={disabled}
            min={VALIDATION_RANGES.batchSize.min}
            max={VALIDATION_RANGES.batchSize.max}
            step={1}
            placeholder="例如: 1"
            helpText="同时处理的样本数量"
          />
        </div>

        <div className="input-row">
          <InputField
            label="隐藏层维度"
            type="number"
            value={params.hiddenSize}
            onChange={(value) => handleParameterChange('hiddenSize', parseInt(value) || 0)}
            error={fieldErrors.hiddenSize}
            warning={fieldWarnings.hiddenSize}
            disabled={disabled}
            min={VALIDATION_RANGES.hiddenSize.min}
            max={VALIDATION_RANGES.hiddenSize.max}
            step={1}
            placeholder="例如: 4096"
            helpText="模型隐藏层的维度大小"
          />

          <InputField
            label="层数"
            type="number"
            value={params.numLayers}
            onChange={(value) => handleParameterChange('numLayers', parseInt(value) || 0)}
            error={fieldErrors.numLayers}
            warning={fieldWarnings.numLayers}
            disabled={disabled}
            min={VALIDATION_RANGES.numLayers.min}
            max={VALIDATION_RANGES.numLayers.max}
            step={1}
            placeholder="例如: 32"
            helpText="Transformer层的数量"
          />
        </div>

        <div className="input-row">
          <InputField
            label="词汇表大小"
            type="number"
            value={params.vocabularySize}
            onChange={(value) => handleParameterChange('vocabularySize', parseInt(value) || 0)}
            error={fieldErrors.vocabularySize}
            warning={fieldWarnings.vocabularySize}
            disabled={disabled}
            min={VALIDATION_RANGES.vocabularySize.min}
            max={VALIDATION_RANGES.vocabularySize.max}
            step={1}
            placeholder="例如: 32000"
            helpText="模型词汇表的大小"
          />
        </div>
      </div>

      {/* 验证摘要 */}
      {Object.keys(fieldErrors).some(key => fieldErrors[key]) && (
        <div className="validation-summary error">
          <h4>参数验证错误：</h4>
          <ul>
            {Object.entries(fieldErrors)
              .filter(([_, error]) => error)
              .map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
          </ul>
        </div>
      )}

      {Object.keys(fieldWarnings).some(key => fieldWarnings[key]) && (
        <div className="validation-summary warning">
          <h4>建议优化：</h4>
          <ul>
            {Object.entries(fieldWarnings)
              .filter(([_, warning]) => warning)
              .map(([field, warning]) => (
                <li key={field}>{warning}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ModelInput;