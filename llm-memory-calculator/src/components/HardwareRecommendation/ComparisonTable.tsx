import React from 'react';
import { HardwareRecommendation } from '../../types';
import { formatMemorySize, formatPrice } from '../../utils/formatters';

export interface ComparisonTableProps {
  recommendations: Array<HardwareRecommendation & { 
    memoryUtilization: number; 
    efficiencyScore: number; 
    costPerGB: number;
  }>;
  memoryNeeded: number;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  recommendations,
  memoryNeeded
}) => {
  const getEfficiencyLabel = (efficiency: string) => {
    switch (efficiency) {
      case 'high': return '高效';
      case 'medium': return '中等';
      case 'low': return '低效';
      default: return '未知';
    }
  };

  const getBestValueClass = (values: number[], currentValue: number, isLowerBetter: boolean = false) => {
    const bestValue = isLowerBetter ? Math.min(...values) : Math.max(...values);
    return currentValue === bestValue ? 'best-value' : '';
  };

  const prices = recommendations.map(r => r.price);
  const memoryUtilizations = recommendations.map(r => r.memoryUtilization);
  const efficiencyScores = recommendations.map(r => r.efficiencyScore);
  const costPerGBs = recommendations.map(r => r.costPerGB);

  return (
    <div className="comparison-table">
      <div className="table-header">
        <h4>硬件对比表</h4>
        <p>对比前 {recommendations.length} 个推荐配置的详细参数</p>
      </div>

      <div className="table-container">
        <table className="comparison-grid">
          <thead>
            <tr>
              <th className="row-header">对比项目</th>
              {recommendations.map((rec, index) => (
                <th key={rec.id} className="hardware-column">
                  <div className="column-header">
                    <div className="hardware-name">{rec.name}</div>
                    <div className="rank-indicator">#{index + 1}</div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* 基本信息 */}
            <tr className="section-header">
              <td colSpan={recommendations.length + 1}>
                <strong>基本信息</strong>
              </td>
            </tr>
            
            <tr>
              <td className="row-label">总显存</td>
              {recommendations.map(rec => (
                <td key={`memory-${rec.id}`} className="data-cell">
                  {rec.memorySize}GB
                  {rec.multiCardRequired > 1 && (
                    <div className="sub-info">({rec.multiCardRequired}x配置)</div>
                  )}
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">价格</td>
              {recommendations.map(rec => (
                <td key={`price-${rec.id}`} className={`data-cell ${getBestValueClass(prices, rec.price, true)}`}>
                  {formatPrice(rec.price)}
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">效率等级</td>
              {recommendations.map(rec => (
                <td key={`efficiency-${rec.id}`} className="data-cell">
                  <span className={`efficiency-badge ${rec.efficiency}`}>
                    {getEfficiencyLabel(rec.efficiency)}
                  </span>
                </td>
              ))}
            </tr>

            {/* 性能指标 */}
            <tr className="section-header">
              <td colSpan={recommendations.length + 1}>
                <strong>性能指标</strong>
              </td>
            </tr>
            
            <tr>
              <td className="row-label">内存利用率</td>
              {recommendations.map(rec => (
                <td key={`utilization-${rec.id}`} className={`data-cell ${getBestValueClass(memoryUtilizations, rec.memoryUtilization)}`}>
                  <div className="utilization-display">
                    <span className="percentage">{rec.memoryUtilization.toFixed(1)}%</span>
                    <div className="utilization-bar">
                      <div 
                        className="utilization-fill"
                        style={{ 
                          width: `${Math.min(rec.memoryUtilization, 100)}%`,
                          backgroundColor: rec.memoryUtilization > 90 ? '#ef4444' : 
                                          rec.memoryUtilization > 70 ? '#f59e0b' : '#10b981'
                        }}
                      />
                    </div>
                  </div>
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">推荐度评分</td>
              {recommendations.map(rec => (
                <td key={`score-${rec.id}`} className={`data-cell ${getBestValueClass(efficiencyScores, rec.efficiencyScore)}`}>
                  <div className="score-display">
                    <span className="score-number">{(rec.efficiencyScore * 100).toFixed(0)}分</span>
                    <div className="score-stars">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`star ${i < Math.round(rec.efficiencyScore * 5) ? 'filled' : ''}`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* 成本分析 */}
            <tr className="section-header">
              <td colSpan={recommendations.length + 1}>
                <strong>成本分析</strong>
              </td>
            </tr>
            
            <tr>
              <td className="row-label">单位成本</td>
              {recommendations.map(rec => (
                <td key={`cost-per-gb-${rec.id}`} className={`data-cell ${getBestValueClass(costPerGBs, rec.costPerGB, true)}`}>
                  {formatPrice(rec.costPerGB)}/GB
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">适用性</td>
              {recommendations.map(rec => (
                <td key={`suitable-${rec.id}`} className="data-cell">
                  {rec.suitable ? (
                    <span className="suitable-indicator">✅ 适合</span>
                  ) : (
                    <span className="unsuitable-indicator">❌ 显存不足</span>
                  )}
                </td>
              ))}
            </tr>

            {/* 详细规格 */}
            <tr className="section-header">
              <td colSpan={recommendations.length + 1}>
                <strong>详细规格</strong>
              </td>
            </tr>
            
            <tr>
              <td className="row-label">单卡显存</td>
              {recommendations.map(rec => (
                <td key={`single-memory-${rec.id}`} className="data-cell">
                  {(rec.memorySize / rec.multiCardRequired)}GB
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">所需卡数</td>
              {recommendations.map(rec => (
                <td key={`card-count-${rec.id}`} className="data-cell">
                  {rec.multiCardRequired}张
                  {rec.multiCardRequired === 1 && (
                    <div className="sub-info">单卡配置</div>
                  )}
                </td>
              ))}
            </tr>
            
            <tr>
              <td className="row-label">显存余量</td>
              {recommendations.map(rec => {
                const remainingMemoryBytes = rec.memorySize * 1024 * 1024 * 1024 - memoryNeeded;
                const remainingMemoryGB = remainingMemoryBytes / (1024 * 1024 * 1024);
                return (
                  <td key={`remaining-${rec.id}`} className="data-cell">
                    {remainingMemoryBytes > 0 ? (
                      <span className="positive-remaining">
                        +{formatMemorySize(remainingMemoryGB)}
                      </span>
                    ) : (
                      <span className="negative-remaining">
                        {formatMemorySize(Math.abs(remainingMemoryGB))}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 表格说明 */}
      <div className="table-legend">
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-marker best-value"></div>
            <span>最优值</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker efficiency-badge high"></div>
            <span>高效率</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker efficiency-badge medium"></div>
            <span>中等效率</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker efficiency-badge low"></div>
            <span>低效率</span>
          </div>
        </div>
        
        <div className="table-notes">
          <p><strong>说明：</strong></p>
          <ul>
            <li>推荐度评分综合考虑内存利用率、硬件效率和配置复杂度</li>
            <li>单位成本 = 总价格 / 总显存，越低越经济</li>
            <li>显存余量为正表示有剩余，为负表示不足</li>
          </ul>
        </div>
      </div>
    </div>
  );
};