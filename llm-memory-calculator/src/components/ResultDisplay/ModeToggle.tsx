import React from 'react';
import { CalculationMode } from '../../types';

export interface ModeToggleProps {
  mode: CalculationMode;
  onModeChange: (mode: CalculationMode) => void;
  disabled?: boolean;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({
  mode,
  onModeChange,
  disabled = false
}) => {
  return (
    <div className="mode-toggle">
      <div className="toggle-label">计算模式</div>
      <div className="toggle-buttons">
        <button
          className={`toggle-button ${mode === 'inference' ? 'active' : ''}`}
          onClick={() => onModeChange('inference')}
          disabled={disabled}
        >
          <span className="button-icon">🔍</span>
          <span className="button-text">推理模式</span>
        </button>
        <button
          className={`toggle-button ${mode === 'training' ? 'active' : ''}`}
          onClick={() => onModeChange('training')}
          disabled={disabled}
        >
          <span className="button-icon">🎯</span>
          <span className="button-text">训练模式</span>
        </button>
      </div>
      
      {/* 模式说明 */}
      <div className="mode-description">
        {mode === 'inference' ? (
          <span>推理模式：只计算模型权重和激活值内存</span>
        ) : (
          <span>训练模式：包含权重、激活值、梯度和优化器状态内存</span>
        )}
      </div>
    </div>
  );
};