import React, { useState, useCallback, useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import MemoryChart from './MemoryChart';
import { ChartType } from './ChartTypeToggle';
import { formatMemorySize } from '../../utils/formatters';

export interface InteractiveChartProps {
  result: MemoryCalculationResult;
  mode: CalculationMode;
  onModeChange?: (mode: CalculationMode) => void;
  className?: string;
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({
  result,
  mode,
  onModeChange,
  className = ''
}) => {
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [showValues, setShowValues] = useState(true);
  const [animated, setAnimated] = useState(true);
  // const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);

  // 处理图表类型切换
  const handleChartTypeChange = useCallback((type: ChartType) => {
    setChartType(type);
  }, []);

  // 处理模式切换
  const handleModeToggle = useCallback(() => {
    if (onModeChange) {
      onModeChange(mode === 'inference' ? 'training' : 'inference');
    }
  }, [mode, onModeChange]);

  // 计算对比数据
  const comparisonData = useMemo(() => {
    const inferenceTotal = result.inference.total;
    const trainingTotal = result.training.total;
    const ratio = trainingTotal / inferenceTotal;

    return {
      inferenceTotal,
      trainingTotal,
      ratio,
      difference: trainingTotal - inferenceTotal
    };
  }, [result]);

  return (
    <div className={`interactive-chart ${className}`}>
      {/* 控制面板 */}
      <div className="chart-controls">
        <div className="control-group">
          <label className="control-label">显示选项</label>
          <div className="control-buttons">
            <button
              className={`control-btn ${showValues ? 'active' : ''}`}
              onClick={() => setShowValues(!showValues)}
            >
              显示数值
            </button>
            <button
              className={`control-btn ${animated ? 'active' : ''}`}
              onClick={() => setAnimated(!animated)}
            >
              动画效果
            </button>
          </div>
        </div>

        {onModeChange && (
          <div className="control-group">
            <label className="control-label">估算模式</label>
            <button
              className="mode-switch"
              onClick={handleModeToggle}
            >
              <span className={`mode-option ${mode === 'inference' ? 'active' : ''}`}>
                推理
              </span>
              <span className={`mode-option ${mode === 'training' ? 'active' : ''}`}>
                训练
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 主图表 */}
      <MemoryChart
        result={result}
        mode={mode}
        chartType={chartType}
        onChartTypeChange={handleChartTypeChange}
        showValues={showValues}
        animated={animated}
      />

      {/* 对比分析 */}
      <div className="comparison-analysis">
        <h5>模式对比分析</h5>
        <div className="comparison-grid">
          <div className="comparison-item">
            <div className="comparison-label">推理模式内存</div>
            <div className="comparison-value">
              {formatMemorySize(comparisonData.inferenceTotal)}
            </div>
          </div>
          <div className="comparison-item">
            <div className="comparison-label">训练模式内存</div>
            <div className="comparison-value">
              {formatMemorySize(comparisonData.trainingTotal)}
            </div>
          </div>
          <div className="comparison-item">
            <div className="comparison-label">内存倍数</div>
            <div className="comparison-value">
              {comparisonData.ratio.toFixed(1)}x
            </div>
          </div>
          <div className="comparison-item">
            <div className="comparison-label">额外需求</div>
            <div className="comparison-value">
              {formatMemorySize(comparisonData.difference)}
            </div>
          </div>
        </div>
      </div>

      {/* 内存效率分析 */}
      <div className="efficiency-analysis">
        <h5>内存效率分析</h5>
        <div className="efficiency-metrics">
          <div className="metric-item">
            <span className="metric-label">每参数内存</span>
            <span className="metric-value">
              {(comparisonData[mode === 'inference' ? 'inferenceTotal' : 'trainingTotal'] / 
                (result.parameters.parameterCount * 1e9) * 1024 * 1024 * 1024).toFixed(2)} bytes/param
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">内存利用率</span>
            <span className="metric-value">
              {mode === 'inference' ? '高效' : '标准'}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">优化建议</span>
            <span className="metric-value">
              {mode === 'training' && comparisonData.ratio > 4 ? '考虑梯度检查点' : '配置合理'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveChart;