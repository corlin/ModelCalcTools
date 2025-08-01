import React, { useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { gpuRecommendationEngine } from '../../utils/gpuRecommendationEngine';
import { formatPrice } from '../../utils/formatters';
import './GPURecommendationSummary.css';

export interface GPURecommendationSummaryProps {
  result: MemoryCalculationResult;
  mode: CalculationMode;
  onViewFullRecommendations?: () => void;
}

export const GPURecommendationSummary: React.FC<GPURecommendationSummaryProps> = ({
  result,
  mode,
  onViewFullRecommendations
}) => {
  const recommendationData = useMemo(() => {
    const recommendationResult = gpuRecommendationEngine.generateRecommendations(result, mode, {
      maxResults: 3
    });

    return {
      bestRecommendation: recommendationResult.bestRecommendation,
      topRecommendations: recommendationResult.recommendations.slice(0, 3),
      compatibleCount: recommendationResult.compatibleCount,
      totalCount: recommendationResult.totalCount
    };
  }, [result, mode]);

  const { bestRecommendation, topRecommendations, compatibleCount, totalCount } = recommendationData;

  if (!bestRecommendation) {
    return (
      <div className="gpu-recommendation-summary">
        <div className="summary-header">
          <h4>🖥️ GPU推荐</h4>
          <span className="summary-subtitle">基于当前内存需求的硬件建议</span>
        </div>
        
        <div className="no-compatible-gpus">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h5>内存需求超出GPU容量</h5>
            <p>当前配置的内存需求超过了所有可用GPU的显存容量，建议优化模型参数或考虑多卡配置。</p>
            <button 
              className="view-full-button"
              onClick={onViewFullRecommendations}
            >
              查看详细分析
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gpu-recommendation-summary">
      <div className="summary-header">
        <h4>🖥️ GPU推荐</h4>
        <span className="summary-subtitle">
          找到 {compatibleCount} 个兼容GPU（共 {totalCount} 个）
        </span>
      </div>

      {/* 最佳推荐 */}
      <div className="best-recommendation">
        <div className="recommendation-badge">
          <span className="badge-icon">⭐</span>
          <span className="badge-text">最佳推荐</span>
        </div>
        
        <div className="gpu-card-compact">
          <div className="gpu-info">
            <div className="gpu-name">{bestRecommendation.name}</div>
            <div className="gpu-specs">
              {bestRecommendation.memorySize}GB 显存 • {formatPrice(bestRecommendation.price)}
            </div>
            <div className="gpu-description">{bestRecommendation.description}</div>
          </div>
          
          <div className="utilization-indicator">
            <div className="utilization-bar">
              <div 
                className={`utilization-fill ${bestRecommendation.standardizedUtilization.efficiencyRating}`}
                style={{ width: `${Math.min(bestRecommendation.memoryUtilization, 100)}%` }}
              />
            </div>
            <div className="utilization-text">
              {bestRecommendation.memoryUtilization.toFixed(1)}% 利用率
            </div>
          </div>
        </div>
      </div>

      {/* 其他推荐 */}
      {topRecommendations.length > 1 && (
        <div className="other-recommendations">
          <h5>其他选择</h5>
          <div className="recommendation-list">
            {topRecommendations.slice(1).map((gpu, index) => (
              <div key={gpu.id} className="gpu-item-compact">
                <div className="gpu-rank">#{index + 2}</div>
                <div className="gpu-info-mini">
                  <div className="gpu-name-mini">{gpu.name}</div>
                  <div className="gpu-price-mini">{formatPrice(gpu.price)}</div>
                </div>
                <div className="gpu-utilization-mini">
                  {gpu.memoryUtilization.toFixed(1)}%
                </div>
                <div className={`gpu-status ${gpu.suitable ? 'compatible' : 'incompatible'}`}>
                  {gpu.suitable ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="summary-actions">
        <button 
          className="view-full-button primary"
          onClick={onViewFullRecommendations}
        >
          查看完整硬件推荐
        </button>
        
        <div className="quick-stats">
          <span className="stat-item">
            <span className="stat-icon">💾</span>
            <span className="stat-text">
              {(mode === 'inference' ? result.inference.total : result.training.total).toFixed(1)}GB 需求
            </span>
          </span>
          <span className="stat-item">
            <span className="stat-icon">🎯</span>
            <span className="stat-text">{compatibleCount} 个兼容</span>
          </span>
        </div>
      </div>
    </div>
  );
};