import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  warning?: string;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  error,
  warning,
  disabled = false,
  placeholder = '请选择...',
  helpText,
  className = ''
}) => {
  const hasError = Boolean(error);
  const hasWarning = Boolean(warning && !error);

  const selectClassName = [
    'select-field-control',
    hasError && 'error',
    hasWarning && 'warning',
    disabled && 'disabled'
  ].filter(Boolean).join(' ');

  return (
    <div className={`select-field ${className}`}>
      <label className="select-field-label" htmlFor={`select-${label}`}>
        {label}
        {helpText && (
          <span className="help-icon" title={helpText}>
            ℹ️
          </span>
        )}
      </label>
      
      <div className="select-field-wrapper">
        <select
          id={`select-${label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={selectClassName}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${label}-error` : 
            hasWarning ? `${label}-warning` : 
            helpText ? `${label}-help` : undefined
          }
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* 下拉箭头 */}
        <div className="select-arrow">
          <span>▼</span>
        </div>
        
        {/* 状态指示器 */}
        <div className="select-status-indicator">
          {hasError && <span className="error-icon">❌</span>}
          {hasWarning && !hasError && <span className="warning-icon">⚠️</span>}
          {!hasError && !hasWarning && value && <span className="success-icon">✅</span>}
        </div>
      </div>

      {/* 错误消息 */}
      {hasError && (
        <div id={`${label}-error`} className="select-field-message error">
          {error}
        </div>
      )}

      {/* 警告消息 */}
      {hasWarning && (
        <div id={`${label}-warning`} className="select-field-message warning">
          {warning}
        </div>
      )}

      {/* 帮助文本 */}
      {helpText && !hasError && !hasWarning && (
        <div id={`${label}-help`} className="select-field-message help">
          {helpText}
        </div>
      )}

      {/* 选项数量提示 */}
      {options.length > 0 && !hasError && (
        <div className="select-field-info">
          {options.length} 个选项可用
        </div>
      )}
    </div>
  );
};