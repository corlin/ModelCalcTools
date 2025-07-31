import React from 'react';
import './ErrorState.css';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  suggestions?: string[];
  onRetry?: () => void;
  onReset?: () => void;
  type?: 'error' | 'warning' | 'info';
  className?: string;
  showActions?: boolean;
  retryText?: string;
  resetText?: string;
  showProgress?: boolean;
  isRetrying?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '出现错误',
  message = '数据加载失败，请重试',
  suggestions = [],
  onRetry,
  onReset,
  type = 'error',
  className = '',
  showActions = true,
  retryText = '重试',
  resetText = '重置',
  showProgress = false,
  isRetrying = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'error';
    }
  };

  return (
    <div className={`error-state ${getTypeClass()} ${className}`}>
      <div className="error-header">
        <div className="error-icon">{getIcon()}</div>
        <div className="error-title">{title}</div>
      </div>
      
      <div className="error-content">
        <div className="error-message">{message}</div>
        
        {suggestions.length > 0 && (
          <div className="error-suggestions">
            <p>建议解决方案：</p>
            <ul>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        {showActions && (onRetry || onReset) && (
          <div className="error-actions">
            {onRetry && (
              <button 
                onClick={onRetry}
                className={`error-button primary ${isRetrying ? 'loading' : ''}`}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <span className="button-spinner"></span>
                    重试中...
                  </>
                ) : (
                  <>
                    🔄 {retryText}
                  </>
                )}
              </button>
            )}
            {onReset && (
              <button 
                onClick={onReset}
                className="error-button secondary"
                disabled={isRetrying}
              >
                🔧 {resetText}
              </button>
            )}
          </div>
        )}
        
        {showProgress && isRetrying && (
          <div className="error-progress">
            <div className="error-progress-bar">
              <div className="error-progress-fill"></div>
            </div>
            <div className="error-progress-text">正在重试...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorState;