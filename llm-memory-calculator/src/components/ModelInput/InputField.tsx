import React from 'react';

export interface InputFieldProps {
  label: string;
  type: 'text' | 'number' | 'email' | 'password';
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  warning?: string;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  type,
  value,
  onChange,
  error,
  warning,
  disabled = false,
  placeholder,
  helpText,
  min,
  max,
  step,
  className = ''
}) => {
  const hasError = Boolean(error);
  const hasWarning = Boolean(warning && !error);

  const inputClassName = [
    'input-field-control',
    hasError && 'error',
    hasWarning && 'warning',
    disabled && 'disabled'
  ].filter(Boolean).join(' ');

  return (
    <div className={`input-field ${className}`}>
      <label className="input-field-label" htmlFor={`input-${label}`}>
        {label}
        {helpText && (
          <span className="help-icon" title={helpText}>
            ℹ️
          </span>
        )}
      </label>
      
      <div className="input-field-wrapper">
        <input
          id={`input-${label}`}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className={inputClassName}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${label}-error` : 
            hasWarning ? `${label}-warning` : 
            helpText ? `${label}-help` : undefined
          }
        />
        
        {/* 输入状态指示器 */}
        <div className="input-status-indicator">
          {hasError && <span className="error-icon">❌</span>}
          {hasWarning && !hasError && <span className="warning-icon">⚠️</span>}
          {!hasError && !hasWarning && value && <span className="success-icon">✅</span>}
        </div>
      </div>

      {/* 错误消息 */}
      {hasError && (
        <div id={`${label}-error`} className="input-field-message error">
          {error}
        </div>
      )}

      {/* 警告消息 */}
      {hasWarning && (
        <div id={`${label}-warning`} className="input-field-message warning">
          {warning}
        </div>
      )}

      {/* 帮助文本 */}
      {helpText && !hasError && !hasWarning && (
        <div id={`${label}-help`} className="input-field-message help">
          {helpText}
        </div>
      )}

      {/* 数值范围提示 */}
      {type === 'number' && (min !== undefined || max !== undefined) && !hasError && (
        <div className="input-field-range">
          范围: {min !== undefined ? min : '无限制'} - {max !== undefined ? max : '无限制'}
        </div>
      )}
    </div>
  );
};