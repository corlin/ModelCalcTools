import React from 'react';
import { ModelPreset } from '../../types';
import { PRECISION_LABELS } from '../../constants';

export interface ModelCardProps {
  model: ModelPreset;
  isSelected: boolean;
  showDetails: boolean;
  onSelect: (model: ModelPreset) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected,
  showDetails,
  onSelect
}) => {
  const handleClick = () => {
    onSelect(model);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gpt': return '#10b981'; // 绿色
      case 'llama': return '#3b82f6'; // 蓝色
      case 'bert': return '#f59e0b'; // 橙色
      case 'other': return '#8b5cf6'; // 紫色
      default: return '#6b7280'; // 灰色
    }
  };

  const formatParameterCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}T`;
    } else if (count >= 1) {
      return `${count}B`;
    } else {
      return `${(count * 1000).toFixed(0)}M`;
    }
  };

  return (
    <div
      className={`model-card ${isSelected ? 'selected' : ''} ${model.popular ? 'popular' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* 卡片头部 */}
      <div className="model-card-header">
        <div className="model-title">
          <h5 className="model-name">{model.name}</h5>
          {model.popular && (
            <span className="popular-badge" title="热门模型">
              🔥
            </span>
          )}
        </div>
        <div
          className="category-badge"
          style={{ backgroundColor: getCategoryColor(model.category) }}
        >
          {model.category.toUpperCase()}
        </div>
      </div>

      {/* 模型描述 */}
      <p className="model-description">{model.description}</p>

      {/* 关键参数 */}
      <div className="model-key-params">
        <div className="param-item">
          <span className="param-label">参数量</span>
          <span className="param-value">
            {formatParameterCount(model.parameters.parameterCount)}
          </span>
        </div>
        <div className="param-item">
          <span className="param-label">精度</span>
          <span className="param-value">
            {model.parameters.precision.toUpperCase()}
          </span>
        </div>
        <div className="param-item">
          <span className="param-label">序列长度</span>
          <span className="param-value">
            {model.parameters.sequenceLength.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 详细参数（可展开） */}
      {showDetails && (
        <div className="model-details">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">批处理大小</span>
              <span className="detail-value">{model.parameters.batchSize}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">隐藏层维度</span>
              <span className="detail-value">{model.parameters.hiddenSize.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">层数</span>
              <span className="detail-value">{model.parameters.numLayers}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">词汇表大小</span>
              <span className="detail-value">{model.parameters.vocabularySize.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">精度类型</span>
              <span className="detail-value">{PRECISION_LABELS[model.parameters.precision]}</span>
            </div>
          </div>
        </div>
      )}

      {/* 选择指示器 */}
      {isSelected && (
        <div className="selection-indicator">
          <span className="checkmark">✓</span>
        </div>
      )}

      {/* 悬停效果指示 */}
      <div className="hover-overlay">
        <span className="select-text">点击选择</span>
      </div>
    </div>
  );
};