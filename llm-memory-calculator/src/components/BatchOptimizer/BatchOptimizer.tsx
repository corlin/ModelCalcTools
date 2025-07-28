import React, { useState, useMemo, useCallback } from 'react';
import { ModelParameters, CalculationMode } from '../../types';
import { optimizeBatchSize } from '../../utils/memoryCalculator';
import { OptimizationChart } from './OptimizationChart';
import { RecommendationCard } from './RecommendationCard';
import './BatchOptimizer.css';

export interface BatchOptimizerProps {
  parameters: ModelParameters;
  mode: CalculationMode;
  maxMemoryGB?: number;
  onBatchSizeChange?: (batchSize: number) => void;
  className?: string;
}

const BatchOptimizer: React.FC<BatchOptimizerProps> = ({
  parameters,
  mode,
  maxMemoryGB = 24, // 默认24GB显存
  onBatchSizeChange,
  className = ''
}) => {
  const [targetMemory, setTargetMemory] = useState(maxMemoryGB);
  const [showChart, setShowChart] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 计算优化结果
  const optimizationResult = useMemo(() => {
    if (!parameters) return null;
    
    try {
      return optimizeBatchSize(parameters, targetMemory, mode);
    } catch (error) {
      console.error('批处理大小优化失败:', error);
      return null;
    }
  }, [parameters, mode, targetMemory]);

  // 生成批处理大小分析数据
  const analysisData = useMemo(() => {
    if (!parameters) return [];

    const data = [];
    const maxBatchSize = Math.min(128, targetMemory * 2); // 限制最大批处理大小

    for (let batchSize = 1; batchSize <= maxBatchSize; batchSize *= 2) {
      try {
        const testParams = { ...parameters, batchSize };
        const result = optimizeBatchSize(testParams, targetMemory, mode);
        
        data.push({
          batchSize,
          memoryUsage: result.memoryUsage,
          throughputEstimate: 0, // Remove throughputEstimate as it's not in the return type
          isOptimal: result.optimalBatchSize === batchSize,
          exceedsLimit: result.memoryUsage > targetMemory
        });
      } catch (error) {
        // 跳过错误的批处理大小
        continue;
      }
    }

    return data;
  }, [parameters, mode, targetMemory]);

  // 处理批处理大小应用
  const handleApplyBatchSize = useCallback((batchSize: number) => {
    if (onBatchSizeChange) {
      onBatchSizeChange(batchSize);
    }
  }, [onBatchSizeChange]);

  // 处理自动优化
  const handleAutoOptimize = useCallback(async () => {
    if (!optimizationResult) return;

    setIsOptimizing(true);
    
    // 模拟优化过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    handleApplyBatchSize(optimizationResult.optimalBatchSize);
    setIsOptimizing(false);
  }, [optimizationResult, handleApplyBatchSize]);

  if (!parameters) {
    return (
      <div className={`batch-optimizer empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <h3>批处理大小优化</h3>
          <p>请先设置模型参数以开始优化分析</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`batch-optimizer ${className}`}>
      {/* 头部控制区 */}
      <div className="optimizer-header">
        <div className="header-title">
          <h3>批处理大小优化</h3>
          <span className="header-subtitle">
            优化批处理大小以最大化内存利用率和性能
          </span>
        </div>
        
        <div className="header-controls">
          <div className="memory-limit-control">
            <label htmlFor="memory-limit">内存限制 (GB)</label>
            <input
              id="memory-limit"
              type="number"
              min="1"
              max="1000"
              value={targetMemory}
              onChange={(e) => setTargetMemory(Number(e.target.value) || 24)}
              className="memory-input"
            />
          </div>
          
          <button
            onClick={() => setShowChart(!showChart)}
            className={`toggle-chart ${showChart ? 'active' : ''}`}
            title={showChart ? '隐藏图表' : '显示图表'}
          >
            📊
          </button>
        </div>
      </div>

      {/* 优化结果卡片 */}
      {optimizationResult && (
        <RecommendationCard
          result={optimizationResult}
          currentBatchSize={parameters.batchSize}
          onApply={handleApplyBatchSize}
          onAutoOptimize={handleAutoOptimize}
          isOptimizing={isOptimizing}
        />
      )}

      {/* 分析图表 */}
      {showChart && analysisData.length > 0 && (
        <OptimizationChart
          data={analysisData}
          targetMemory={targetMemory}
          currentBatchSize={parameters.batchSize}
          optimalBatchSize={optimizationResult?.optimalBatchSize}
        />
      )}

      {/* 详细分析 */}
      <div className="detailed-analysis">
        <h4>批处理大小影响分析</h4>
        
        <div className="analysis-grid">
          <div className="analysis-item">
            <div className="analysis-icon">🚀</div>
            <div className="analysis-content">
              <h5>性能影响</h5>
              <p>
                更大的批处理大小通常能提高GPU利用率和训练速度，
                但会增加内存需求。找到平衡点是关键。
              </p>
            </div>
          </div>
          
          <div className="analysis-item">
            <div className="analysis-icon">💾</div>
            <div className="analysis-content">
              <h5>内存使用</h5>
              <p>
                批处理大小与内存使用呈线性关系。激活值内存会随着
                批处理大小成比例增长。
              </p>
            </div>
          </div>
          
          <div className="analysis-item">
            <div className="analysis-icon">⚖️</div>
            <div className="analysis-content">
              <h5>优化策略</h5>
              <p>
                在内存限制下选择最大可能的批处理大小，
                或使用梯度累积技术模拟更大的批处理。
              </p>
            </div>
          </div>
          
          <div className="analysis-item">
            <div className="analysis-icon">📈</div>
            <div className="analysis-content">
              <h5>收敛性</h5>
              <p>
                过大的批处理大小可能影响模型收敛性，
                需要调整学习率等超参数。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 优化建议 */}
      {optimizationResult?.warning && (
        <div className="optimization-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h5>优化建议</h5>
            <p>{optimizationResult.warning}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchOptimizer;