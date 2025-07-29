import React, { useState, useMemo, useCallback } from 'react';
import { ModelParameters, CalculationMode } from '../../types';
import { optimizeBatchSize, calculateMemoryRequirements } from '../../utils/memoryCalculator';
import { BATCH_OPTIMIZATION_DEFAULTS } from '../../constants';
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
  maxMemoryGB = BATCH_OPTIMIZATION_DEFAULTS.MAX_MEMORY_GB, // 使用常量
  onBatchSizeChange,
  className = ''
}) => {
  const [targetMemory, setTargetMemory] = useState(maxMemoryGB);
  const [showChart, setShowChart] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // 计算优化结果
  const optimizationResult = useMemo(() => {
    if (!parameters) {
      return null;
    }
    
    try {
      const result = optimizeBatchSize(parameters, targetMemory, mode);
      
      // 验证结果的有效性
      if (!result || result.optimalBatchSize <= 0) {
        const errorMsg = '无法计算有效的优化结果';
        console.warn(errorMsg);
        
        return {
          optimalBatchSize: 1,
          memoryUsage: 0,
          utilizationRate: 0,
          analysisData: [],
          warnings: [errorMsg],
          recommendations: ['请检查模型参数设置'],
          validation: {
            isValid: false,
            errorMessage: '优化计算失败',
            warnings: [errorMsg],
            recommendations: ['请检查模型参数设置'],
            confidence: 'low' as const
          },
          safetyMargin: BATCH_OPTIMIZATION_DEFAULTS.SAFETY_MARGIN,
          maxMemoryLimit: targetMemory
        };
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '计算过程中发生未知错误';
      console.error('批处理大小优化失败:', error);
      
      // 返回错误状态的结果而不是null
      return {
        optimalBatchSize: 1,
        memoryUsage: 0,
        utilizationRate: 0,
        analysisData: [],
        warnings: [errorMsg],
        recommendations: ['请检查输入参数并重试', '如果问题持续，请刷新页面'],
        validation: {
          isValid: false,
          errorMessage: errorMsg,
          warnings: [errorMsg],
          recommendations: ['请检查输入参数并重试'],
          confidence: 'low' as const
        },
        safetyMargin: BATCH_OPTIMIZATION_DEFAULTS.SAFETY_MARGIN,
        maxMemoryLimit: targetMemory
      };
    }
  }, [parameters, mode, targetMemory]);

  // 生成批处理大小分析数据
  const analysisData = useMemo(() => {
    if (!parameters) return [];

    try {
      const data = [];
      const maxBatchSize = Math.min(BATCH_OPTIMIZATION_DEFAULTS.MAX_BATCH_SIZE, Math.floor(targetMemory * BATCH_OPTIMIZATION_DEFAULTS.MEMORY_STEP_SIZE));
      const safetyMargin = BATCH_OPTIMIZATION_DEFAULTS.SAFETY_MARGIN;

      // 使用线性步长而不是指数步长，以获得更详细的分析
      const stepSize = Math.max(1, Math.floor(maxBatchSize / 32)); // 最多32个数据点
      
      for (let batchSize = 1; batchSize <= maxBatchSize; batchSize += stepSize) {
        try {
          const testParams = { ...parameters, batchSize };
          const memoryResult = calculateMemoryRequirements(testParams, mode);
          
          const totalMemory = mode === 'inference' 
            ? memoryResult.inference.total 
            : memoryResult.training.total;
          
          const utilizationRate = totalMemory / targetMemory;
          const withinLimit = totalMemory <= targetMemory;
          const safetyMarginExceeded = totalMemory > (targetMemory * safetyMargin);
          
          data.push({
            batchSize,
            memoryUsage: totalMemory,
            utilizationRate,
            isOptimal: false, // 将在后面设置
            exceedsLimit: !withinLimit,
            safetyMarginExceeded,
            estimatedThroughput: 0, // 简化处理
            memoryBreakdown: mode === 'inference' 
              ? {
                  weights: memoryResult.inference.modelWeights,
                  activations: memoryResult.inference.activations
                }
              : {
                  weights: memoryResult.training.modelWeights,
                  activations: memoryResult.training.activations,
                  gradients: memoryResult.training.gradients,
                  optimizer: memoryResult.training.optimizerStates
                }
          });
          
          // 如果超出内存限制，停止生成更多数据点
          if (!withinLimit) {
            break;
          }
        } catch (error) {
          console.warn(`批处理大小 ${batchSize} 计算失败:`, error);
          continue;
        }
      }

      // 标记最优批处理大小
      if (optimizationResult && data.length > 0) {
        const optimalPoint = data.find(point => point.batchSize === optimizationResult.optimalBatchSize);
        if (optimalPoint) {
          optimalPoint.isOptimal = true;
        } else {
          // 如果没有找到精确匹配，标记最接近的点
          const closestPoint = data.reduce((prev, curr) => 
            Math.abs(curr.batchSize - optimizationResult.optimalBatchSize) < 
            Math.abs(prev.batchSize - optimizationResult.optimalBatchSize) ? curr : prev
          );
          closestPoint.isOptimal = true;
        }
      }

      return data;
    } catch (error) {
      console.error('生成批处理分析数据失败:', error);
      return [];
    }
  }, [parameters, mode, targetMemory, optimizationResult]);

  // 处理批处理大小应用
  const handleApplyBatchSize = useCallback((batchSize: number) => {
    if (onBatchSizeChange) {
      onBatchSizeChange(batchSize);
    }
  }, [onBatchSizeChange]);

  // 处理自动优化
  const handleAutoOptimize = useCallback(async () => {
    if (!optimizationResult || !optimizationResult.validation.isValid) {
      console.warn('无法执行自动优化：优化结果无效');
      return;
    }

    setIsOptimizing(true);
    
    try {
      // 模拟优化过程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 验证优化结果是否仍然有效
      if (optimizationResult.optimalBatchSize > 0) {
        handleApplyBatchSize(optimizationResult.optimalBatchSize);
      } else {
        console.warn('优化结果无效，无法应用');
      }
    } catch (error) {
      console.error('自动优化过程中发生错误:', error);
    } finally {
      setIsOptimizing(false);
    }
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
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value >= 1 && value <= 1000) {
                  setTargetMemory(value);
                } else if (value < 1) {
                  setTargetMemory(1);
                } else if (value > 1000) {
                  setTargetMemory(1000);
                } else {
                  setTargetMemory(BATCH_OPTIMIZATION_DEFAULTS.MAX_MEMORY_GB);
                }
              }}
              className="memory-input"
              placeholder="48"
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
        <>
          {/* 错误状态显示 */}
          {!optimizationResult.validation.isValid && (
            <div className="optimization-error">
              <div className="error-icon">⚠️</div>
              <div className="error-content">
                <h4>优化计算失败</h4>
                <p>{optimizationResult.validation.errorMessage}</p>
                {optimizationResult.warnings.length > 0 && (
                  <ul className="error-warnings">
                    {optimizationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                )}
                {optimizationResult.recommendations.length > 0 && (
                  <div className="error-recommendations">
                    <h5>建议解决方案：</h5>
                    <ul>
                      {optimizationResult.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 正常的推荐卡片 */}
          {optimizationResult.validation.isValid && (
            <RecommendationCard
              result={optimizationResult}
              currentBatchSize={parameters.batchSize}
              targetMemory={targetMemory}
              onApply={handleApplyBatchSize}
              onAutoOptimize={handleAutoOptimize}
              isOptimizing={isOptimizing}
            />
          )}
        </>
      )}

      {/* 分析图表 */}
      {showChart && analysisData.length > 0 && (
        <OptimizationChart
          data={analysisData}
          targetMemory={targetMemory}
          currentBatchSize={parameters.batchSize}
          optimalBatchSize={optimizationResult?.optimalBatchSize}
          safetyMargin={BATCH_OPTIMIZATION_DEFAULTS.SAFETY_MARGIN}
          showThroughputEstimate={true}
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
      {optimizationResult && (optimizationResult.warnings.length > 0 || optimizationResult.recommendations.length > 0) && (
        <div className="optimization-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <h5>优化建议</h5>
            {optimizationResult.warnings.map((warning, index) => (
              <p key={`warning-${index}`} className="warning-text">{warning}</p>
            ))}
            {optimizationResult.recommendations.map((recommendation, index) => (
              <p key={`recommendation-${index}`} className="recommendation-text">{recommendation}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchOptimizer;