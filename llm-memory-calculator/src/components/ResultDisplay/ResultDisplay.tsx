import React, { useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { formatMemorySize, formatNumber } from '../../utils/formatters';
import { MemoryBreakdown } from './MemoryBreakdown';
import { MemoryWarnings } from './MemoryWarnings';
import { ModeToggle } from './ModeToggle';
import './ResultDisplay.css';

export interface ResultDisplayProps {
  result: MemoryCalculationResult | null;
  mode: CalculationMode;
  onModeChange: (mode: CalculationMode) => void;
  className?: string;
  showWarnings?: boolean;
  showBreakdown?: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  mode,
  onModeChange,
  className = '',
  showWarnings = true,
  showBreakdown = true
}) => {
  // 使用预计算的总内存值，确保与计算器结果一致
  const totalMemory = useMemo(() => {
    if (!result) return 0;
    
    // 直接使用预计算的总内存值，而不是手动计算
    return mode === 'inference' ? result.inference.total : result.training.total;
  }, [result, mode]);

  // 内存分解数据
  const memoryBreakdown = useMemo(() => {
    if (!result) return [];

    if (mode === 'inference') {
      return [
        {
          label: '模型权重',
          value: result.inference.modelWeights,
          percentage: (result.inference.modelWeights / totalMemory) * 100,
          color: '#3b82f6'
        },
        {
          label: '激活值',
          value: result.inference.activations,
          percentage: (result.inference.activations / totalMemory) * 100,
          color: '#10b981'
        }
      ];
    } else {
      return [
        {
          label: '模型权重',
          value: result.training.modelWeights,
          percentage: (result.training.modelWeights / totalMemory) * 100,
          color: '#3b82f6'
        },
        {
          label: '激活值',
          value: result.training.activations,
          percentage: (result.training.activations / totalMemory) * 100,
          color: '#10b981'
        },
        {
          label: '梯度',
          value: result.training.gradients,
          percentage: (result.training.gradients / totalMemory) * 100,
          color: '#f59e0b'
        },
        {
          label: '优化器状态',
          value: result.training.optimizerStates,
          percentage: (result.training.optimizerStates / totalMemory) * 100,
          color: '#ef4444'
        }
      ];
    }
  }, [result, mode, totalMemory]);

  if (!result) {
    return (
      <div className={`result-display empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>等待计算结果</h3>
          <p>请输入模型参数或选择预设模型来查看内存需求计算结果</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`result-display ${className}`}>
      {/* 头部控制区 */}
      <div className="result-header">
        <h3>内存需求计算结果</h3>
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
        <h4>计算参数</h4>
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
              {result.parameters.batchSize}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">序列长度</span>
            <span className="summary-value">
              {formatNumber(result.parameters.sequenceLength)}
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
              {formatNumber(result.parameters.hiddenSize)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">层数</span>
            <span className="summary-value">
              {result.parameters.numLayers}
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