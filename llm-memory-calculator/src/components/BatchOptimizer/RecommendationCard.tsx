import React from 'react';
import { BatchOptimizationResult } from '../../types';


export interface RecommendationCardProps {
  result: BatchOptimizationResult;
  currentBatchSize: number;
  onApply: (batchSize: number) => void;
  onAutoOptimize: () => void;
  isOptimizing: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  result,
  currentBatchSize,
  onApply,
  onAutoOptimize,
  isOptimizing
}) => {
  const isCurrentOptimal = currentBatchSize === result.optimalBatchSize;
  const memoryUtilization = result.memoryUsage / 24 * 100; // 假设24GB显存，result.memoryUsage已经是GB单位

  return (
    <div className="recommendation-card">
      <div className="card-header">
        <div className="header-icon">
          {isCurrentOptimal ? '✅' : '🎯'}
        </div>
        <div className="header-content">
          <h4>
            {isCurrentOptimal ? '当前配置已优化' : '优化建议'}
          </h4>
          <p>
            {isCurrentOptimal 
              ? '您的批处理大小已经是最优配置'
              : `建议将批处理大小调整为 ${result.optimalBatchSize}`
            }
          </p>
        </div>
      </div>

      <div className="card-metrics">
        <div className="metric-group">
          <div className="metric-item">
            <div className="metric-label">推荐批处理大小</div>
            <div className="metric-value optimal">
              {result.optimalBatchSize}
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">当前批处理大小</div>
            <div className={`metric-value ${isCurrentOptimal ? 'optimal' : 'current'}`}>
              {currentBatchSize}
            </div>
          </div>
        </div>

        <div className="metric-group">
          <div className="metric-item">
            <div className="metric-label">预估内存使用</div>
            <div className="metric-value">
              {result.memoryUsage.toFixed(1)} GB
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">内存利用率</div>
            <div className="metric-value">
              {memoryUtilization.toFixed(1)}%
            </div>
          </div>
        </div>

        {result.throughputEstimate && (
          <div className="metric-group">
            <div className="metric-item">
              <div className="metric-label">预估吞吐量</div>
              <div className="metric-value">
                {result.throughputEstimate.toFixed(1)} tokens/s
              </div>
            </div>
            
            <div className="metric-item">
              <div className="metric-label">性能提升</div>
              <div className="metric-value improvement">
                {currentBatchSize < result.optimalBatchSize 
                  ? `+${((result.optimalBatchSize / currentBatchSize - 1) * 100).toFixed(0)}%`
                  : '已优化'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {!isCurrentOptimal && (
        <div className="card-actions">
          <button
            onClick={() => onApply(result.optimalBatchSize)}
            className="apply-button"
            disabled={isOptimizing}
          >
            应用推荐设置
          </button>
          
          <button
            onClick={onAutoOptimize}
            className="auto-optimize-button"
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <>
                <span className="loading-spinner"></span>
                优化中...
              </>
            ) : (
              '自动优化'
            )}
          </button>
        </div>
      )}

      {/* 优化效果预览 */}
      <div className="optimization-preview">
        <h5>优化效果对比</h5>
        <div className="comparison-bars">
          <div className="comparison-item">
            <div className="comparison-label">当前配置</div>
            <div className="comparison-bar">
              <div 
                className="bar-fill current"
                style={{ width: `${(currentBatchSize / Math.max(currentBatchSize, result.optimalBatchSize)) * 100}%` }}
              />
            </div>
            <div className="comparison-value">{currentBatchSize}</div>
          </div>
          
          <div className="comparison-item">
            <div className="comparison-label">推荐配置</div>
            <div className="comparison-bar">
              <div 
                className="bar-fill optimal"
                style={{ width: `${(result.optimalBatchSize / Math.max(currentBatchSize, result.optimalBatchSize)) * 100}%` }}
              />
            </div>
            <div className="comparison-value">{result.optimalBatchSize}</div>
          </div>
        </div>
      </div>

      {/* 优化提示 */}
      <div className="optimization-tips">
        <h5>💡 优化提示</h5>
        <ul>
          <li>
            更大的批处理大小通常能提高GPU利用率，但需要更多内存
          </li>
          <li>
            如果内存不足，可以考虑使用梯度累积技术
          </li>
          <li>
            批处理大小的改变可能需要相应调整学习率
          </li>
          {result.optimalBatchSize > currentBatchSize * 2 && (
            <li className="warning">
              ⚠️ 批处理大小增加较多，建议逐步调整并监控训练稳定性
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};