import React from 'react';
import { formatMemorySize } from '../../utils/formatters';

export interface LegendItem {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

export interface ChartLegendProps {
  data: LegendItem[];
  showValues?: boolean;
  totalMemory: number;
  orientation?: 'horizontal' | 'vertical';
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  data,
  showValues = true,
  totalMemory,
  orientation = 'vertical'
}) => {
  return (
    <div className={`chart-legend ${orientation}`}>
      <div className="legend-title">内存组件</div>
      <div className="legend-items">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <div className="legend-marker">
              <div 
                className="color-dot"
                style={{ backgroundColor: item.color }}
              />
            </div>
            <div className="legend-content">
              <div className="legend-label">{item.label}</div>
              {showValues && (
                <div className="legend-values">
                  <span className="memory-value">
                    {formatMemorySize(item.value)}
                  </span>
                  <span className="percentage-value">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="legend-bar">
              <div 
                className="bar-fill"
                style={{ 
                  width: `${item.percentage}%`,
                  backgroundColor: item.color + '40'
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* 总计 */}
      <div className="legend-total">
        <div className="total-label">总计</div>
        <div className="total-value">{formatMemorySize(totalMemory)}</div>
      </div>
    </div>
  );
};