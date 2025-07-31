import React from 'react';
import './LoadingState.css';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'pulse';
  className?: string;
  showProgress?: boolean;
  progress?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = '加载中...',
  size = 'medium',
  type = 'spinner',
  className = '',
  showProgress = false,
  progress = 0
}) => {
  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return (
          <div className={`loading-dots ${size}`}>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`loading-pulse ${size}`}>
            <div className="pulse-circle"></div>
          </div>
        );
      
      default:
        return (
          <div className={`loading-spinner ${size}`}>
            <div className="spinner"></div>
          </div>
        );
    }
  };

  return (
    <div className={`loading-state ${className}`}>
      {renderLoader()}
      {message && (
        <div className="loading-message">
          {message}
        </div>
      )}
      {showProgress && (
        <div className="loading-progress">
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill" 
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          <div className="loading-progress-text">
            {Math.round(progress)}%
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingState;