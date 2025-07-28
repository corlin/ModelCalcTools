import React from 'react';

export type ChartType = 'pie' | 'bar';

export interface ChartTypeToggleProps {
  chartType: ChartType;
  onTypeChange: (type: ChartType) => void;
  disabled?: boolean;
}

export const ChartTypeToggle: React.FC<ChartTypeToggleProps> = ({
  chartType,
  onTypeChange,
  disabled = false
}) => {
  return (
    <div className="chart-type-toggle">
      <button
        className={`toggle-btn ${chartType === 'pie' ? 'active' : ''}`}
        onClick={() => onTypeChange('pie')}
        disabled={disabled}
        title="饼图"
      >
        <span className="btn-icon">🥧</span>
        <span className="btn-text">饼图</span>
      </button>
      <button
        className={`toggle-btn ${chartType === 'bar' ? 'active' : ''}`}
        onClick={() => onTypeChange('bar')}
        disabled={disabled}
        title="柱状图"
      >
        <span className="btn-icon">📊</span>
        <span className="btn-text">柱状图</span>
      </button>
    </div>
  );
};