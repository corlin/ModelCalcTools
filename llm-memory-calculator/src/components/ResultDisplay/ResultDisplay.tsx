import React, { useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { formatMemorySize, formatNumber } from '../../utils/formatters';
import { MemoryBreakdown } from './MemoryBreakdown';
import { MemoryWarnings } from './MemoryWarnings';
import { GPURecommendationSummary } from './GPURecommendationSummary';
import { ModeToggle } from './ModeToggle';
import { MemoryBreakdownCalculator } from '../../utils/MemoryBreakdownCalculator';
import { MemoryDataValidator } from '../../utils/MemoryDataValidator';
import { FallbackDisplayManager } from '../../utils/FallbackDisplayManager';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import './ResultDisplay.css';

export interface ResultDisplayProps {
  result: MemoryCalculationResult | null;
  mode: CalculationMode;
  onModeChange: (mode: CalculationMode) => void;
  className?: string;
  showWarnings?: boolean;
  showBreakdown?: boolean;
  showGPURecommendation?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onViewHardwareRecommendations?: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  mode,
  onModeChange,
  className = '',
  showWarnings = true,
  showBreakdown = true,
  showGPURecommendation = true,
  isLoading = false,
  error = null,
  onViewHardwareRecommendations
}) => {
  // 使用预计算的总内存值，确保与计算器结果一致
  const totalMemory = useMemo(() => {
    if (!result) return 0;
    
    // 直接使用预计算的总内存值，而不是手动计算
    return mode === 'inference' ? result.inference.total : result.training.total;
  }, [result, mode]);

  // 内存分解数据 - 使用标准化的MemoryBreakdownCalculator
  const memoryBreakdown = useMemo(() => {
    if (!result) return [];

    try {
      // 验证计算结果数据
      const validationResult = MemoryDataValidator.validateCalculationResult(result, mode);
      if (!validationResult.isValid) {
        console.warn('Memory calculation result validation failed in ResultDisplay:', validationResult.errors);
        FallbackDisplayManager.logFallbackEvent('data_validation', new Error('Calculation result validation failed'), {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          mode
        });
      }

      // 使用标准化的内存分解计算器
      const breakdownItems = MemoryBreakdownCalculator.calculateBreakdown(result, mode);
      
      // 验证分解数据
      const validation = MemoryBreakdownCalculator.validateBreakdown(
        breakdownItems, 
        breakdownItems.reduce((sum, item) => sum + item.valueBytes, 0)
      );
      
      if (!validation.isValid) {
        console.warn('Memory breakdown validation failed in ResultDisplay:', validation.errors);
        FallbackDisplayManager.logFallbackEvent('breakdown_display', new Error('Breakdown validation failed'), {
          errors: validation.errors,
          mode,
          itemCount: breakdownItems.length
        });
        
        // 如果验证失败严重，使用降级数据
        if (breakdownItems.length === 0) {
          const fallbackError = new Error('Memory breakdown calculation failed');
          const fallbackItems = FallbackDisplayManager.getMemoryBreakdownFallback(fallbackError, totalMemory * 1024 * 1024 * 1024);
          
          return fallbackItems.map(item => ({
            label: item.label,
            value: item.valueBytes / (1024 * 1024 * 1024), // 转换回GB
            percentage: item.percentage,
            color: item.color
          }));
        }
      }
      
      if (validation.warnings.length > 0) {
        console.info('Memory breakdown warnings in ResultDisplay:', validation.warnings);
      }

      // 转换为ResultDisplay组件期望的格式
      return breakdownItems.map(item => ({
        label: item.label,
        value: item.valueBytes / (1024 * 1024 * 1024), // 转换回GB
        percentage: item.percentage,
        color: item.color
      }));
    } catch (error) {
      console.error('Error processing memory breakdown in ResultDisplay:', error);
      FallbackDisplayManager.logFallbackEvent('breakdown_display', error as Error, {
        mode,
        totalMemory
      });
      
      // 返回降级数据
      const fallbackItems = FallbackDisplayManager.getMemoryBreakdownFallback(error as Error, totalMemory * 1024 * 1024 * 1024);
      return fallbackItems.map(item => ({
        label: item.label,
        value: item.valueBytes / (1024 * 1024 * 1024), // 转换回GB
        percentage: item.percentage,
        color: item.color
      }));
    }
  }, [result, mode, totalMemory]);

  // 处理加载状态
  if (isLoading) {
    return (
      <div className={`result-display loading ${className}`}>
        <LoadingState 
          message="正在计算内存需求..."
          size="large"
          type="spinner"
        />
      </div>
    );
  }

  // 处理错误状态
  if (error) {
    return (
      <div className={`result-display error ${className}`}>
        <ErrorState
          title="计算失败"
          message={error.message || '内存需求估算过程中出现错误'}
          suggestions={[
            '检查输入参数是否在合理范围内',
            '尝试减少模型参数或批处理大小',
            '刷新页面重新开始计算'
          ]}
          onRetry={() => window.location.reload()}
          onReset={() => {
            localStorage.clear();
            window.location.reload();
          }}
          type="error"
        />
      </div>
    );
  }

  // 处理空结果状态
  if (!result) {
    return (
      <div className={`result-display empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>等待计算结果</h3>
          <p>请输入模型参数或选择预设模型来查看内存需求估算结果</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`result-display ${className}`}>
      {/* 头部控制区 */}
      <div className="result-header">
        <h3>内存需求估算结果</h3>
        <ModeToggle
          mode={mode}
          onModeChange={onModeChange}
        />
      </div>

      {/* 总内存显示 */}
      <div className="total-memory">
        <div className="total-memory-card">
          <div className="total-memory-label">总内存需求</div>
          <div className="total-memory-value">
            {formatMemorySize(totalMemory)}
          </div>
          <div className="total-memory-mode">
            {mode === 'inference' ? '推理模式' : '训练模式'}
          </div>
        </div>
      </div>

      {/* 内存分解表格 */}
      {showBreakdown && (
        <MemoryBreakdown
          breakdown={memoryBreakdown}
          totalMemory={totalMemory}
        />
      )}

      {/* 详细数值表格 */}
      <div className="memory-details">
        <h4>详细内存分解</h4>
        <div className="details-table">
          <div className="table-header">
            <div className="header-cell">内存类型</div>
            <div className="header-cell">大小</div>
            <div className="header-cell">占比</div>
            <div className="header-cell">说明</div>
          </div>
          
          {memoryBreakdown.map((item, index) => (
            <div key={index} className="table-row">
              <div className="cell">
                <div className="cell-label">
                  <div 
                    className="color-indicator"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </div>
              </div>
              <div className="cell">
                <span className="memory-size">
                  {formatMemorySize(item.value)}
                </span>
              </div>
              <div className="cell">
                <span className="percentage">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="cell">
                <span className="description">
                  {getMemoryTypeDescription(item.label, mode)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GPU推荐摘要 */}
      {showGPURecommendation && (
        <GPURecommendationSummary
          result={result}
          mode={mode}
          onViewFullRecommendations={onViewHardwareRecommendations}
        />
      )}

      {/* 内存警告和建议 */}
      {showWarnings && (
        <MemoryWarnings
          totalMemory={totalMemory}
          mode={mode}
          result={result}
        />
      )}

      {/* 计算参数摘要 */}
      <div className="calculation-summary">
        <h4>估算参数</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">参数量</span>
            <span className="summary-value">
              {formatNumber(result.parameters.parameterCount)}B
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">批处理大小</span>
            <span className="summary-value">
              {result.parameters.batchSize.toLocaleString()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">序列长度</span>
            <span className="summary-value">
              {result.parameters.sequenceLength.toLocaleString()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">精度</span>
            <span className="summary-value">
              {result.parameters.precision.toUpperCase()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">隐藏层维度</span>
            <span className="summary-value">
              {result.parameters.hiddenSize.toLocaleString()}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">层数</span>
            <span className="summary-value">
              {result.parameters.numLayers.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 获取内存类型描述
const getMemoryTypeDescription = (type: string, mode: CalculationMode): string => {
  switch (type) {
    case '模型权重':
      return '存储模型参数的内存';
    case '激活值':
      return mode === 'inference' ? '前向传播中间结果' : '前向传播中间结果（需保存用于反向传播）';
    case '梯度':
      return '反向传播计算的参数梯度';
    case '优化器状态':
      return '优化器（如Adam）维护的动量和方差信息';
    default:
      return '';
  }
};

export default ResultDisplay;