import React from 'react';
import { formatMemorySize } from '../../utils/formatters';

export interface MemoryBreakdownItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface MemoryBreakdownProps {
  breakdown: MemoryBreakdownItem[];
  totalMemory: number;
  showPercentages?: boolean;
}

export const MemoryBreakdown: React.FC<MemoryBreakdownProps> = ({
  breakdown,
  totalMemory,
  showPercentages = true
}) => {
  return (
    <div className="memory-breakdown">
      <h4>内存分布</h4>
      
      {/* 可视化条形图 */}
      <div className="breakdown-chart">
        <div className="chart-bar">
          {breakdown.map((item, index) => (
            <div
              key={index}
              className="bar-segment"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color
              }}
              title={`${item.label}: ${formatMemorySize(item.value)} (${item.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>
        
        {/* 图例 */}
        <div className="chart-legend">
          {breakdown.map((item, index) => (
            <div key={index} className="legend-item">
              <div 
                className="legend-color"
                style={{ backgroundColor: item.color }}
              />
              <span className="legend-label">{item.label}</span>
              <span className="legend-value">
                {formatMemorySize(item.value)}
                {showPercentages && (
                  <span className="legend-percentage">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 数值列表 */}
      <div className="breakdown-list">
        {breakdown.map((item, index) => (
          <div key={index} className="breakdown-item">
            <div className="item-header">
              <div 
                className="item-color"
                style={{ backgroundColor: item.color }}
              />
              <span className="item-label">{item.label}</span>
            </div>
            <div className="item-values">
              <span className="item-size">{formatMemorySize(item.value)}</span>
              {showPercentages && (
                <span className="item-percentage">{item.percentage.toFixed(1)}%</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 总计 */}
      <div className="breakdown-total">
        <div className="total-label">总计</div>
        <div className="total-value">{formatMemorySize(totalMemory)}</div>
      </div>
    </div>
  );
};