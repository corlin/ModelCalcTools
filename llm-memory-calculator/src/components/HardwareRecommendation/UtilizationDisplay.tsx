import React from 'react';
import { HardwareRecommendation } from '../../types';
import { MemoryBreakdownCalculator } from '../../utils/MemoryBreakdownCalculator';
import { MemoryUnitConverter } from '../../utils/MemoryUnitConverter';
import './UtilizationDisplay.css';

export interface UtilizationDisplayProps {
  hardware: HardwareRecommendation;
  className?: string;
}

export const UtilizationDisplay: React.FC<UtilizationDisplayProps> = ({
  hardware,
  className = ''
}) => {
  const { utilizationDetails, multiCardDetails } = hardware;

  if (!utilizationDetails && !multiCardDetails) {
    return null;
  }

  return (
    <div className={`utilization-display ${className}`}>
      {/* 单卡利用率信息 */}
      {utilizationDetails && (
        <div className="single-card-utilization">
          <h4>内存利用率分析</h4>
          
          <div className="utilization-metrics">
            <div className="metric-row">
              <div className="metric-item">
                <div className="metric-label">理论利用率</div>
                <div className="metric-value">
                  {(utilizationDetails.theoreticalUtilization * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">实际利用率</div>
                <div className={`metric-value ${getUtilizationClass(utilizationDetails.practicalUtilization)}`}>
                  {(utilizationDetails.practicalUtilization * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">效率评分</div>
                <div className={`metric-value efficiency-${utilizationDetails.efficiency}`}>
                  {utilizationDetails.details.utilizationScore.toFixed(0)}分
                </div>
              </div>
            </div>
          </div>

          {/* 内存分解 */}
          <div className="memory-breakdown">
            <h5>内存使用分解</h5>
            <div className="breakdown-chart">
              {(() => {
                try {
                  // 修正GPU总显存和可用显存的计算方式
                  const gpuTotalMemoryGB = utilizationDetails.details.availableMemory + utilizationDetails.systemOverhead;
                  const gpuTotalMemoryBytes = MemoryUnitConverter.gbToBytes(gpuTotalMemoryGB);
                  
                  // 确保所有内存值都是有效的正数
                  const totalMemoryNeeded = Math.max(0, utilizationDetails.details.totalMemoryNeeded);
                  const systemOverhead = Math.max(0, utilizationDetails.systemOverhead);
                  const fragmentationLoss = Math.max(0, utilizationDetails.fragmentationLoss);
                  const safetyBuffer = Math.max(0, utilizationDetails.safetyBuffer);
                  
                  const usedMemoryBytes = MemoryUnitConverter.gbToBytes(totalMemoryNeeded);
                  const systemOverheadBytes = MemoryUnitConverter.gbToBytes(systemOverhead);
                  const fragmentationBytes = MemoryUnitConverter.gbToBytes(fragmentationLoss);
                  const safetyBufferBytes = MemoryUnitConverter.gbToBytes(safetyBuffer);
                  
                  // 使用标准化的内存分解计算器
                  const breakdownItems = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(
                    gpuTotalMemoryBytes,
                    usedMemoryBytes,
                    systemOverheadBytes,
                    fragmentationBytes,
                    safetyBufferBytes
                  );

                  // 验证分解数据
                  const validation = MemoryBreakdownCalculator.validateBreakdown(breakdownItems, gpuTotalMemoryBytes);
                  if (!validation.isValid) {
                    console.warn('Memory breakdown validation failed:', validation.errors);
                  }
                  if (validation.warnings.length > 0) {
                    console.info('Memory breakdown warnings:', validation.warnings);
                  }

                  // 如果验证失败，显示错误状态
                  if (!validation.isValid && breakdownItems.length === 0) {
                    return (
                      <div className="breakdown-error">
                        <div className="error-icon">⚠️</div>
                        <div className="error-message">
                          内存分解数据计算失败，请检查输入参数
                        </div>
                      </div>
                    );
                  }

                  const totalUsedPercentage = breakdownItems
                    .filter(item => item.label !== '可用内存')
                    .reduce((sum, item) => sum + item.percentage, 0);
                  const isOverCapacity = totalUsedPercentage > 100;
                  
                  return (
                    <>
                      {breakdownItems.map((item, index) => (
                        <div key={index} className="breakdown-item">
                          <div className="breakdown-label">{item.label}</div>
                          <div className="breakdown-bar">
                            <div 
                              className={`breakdown-fill ${getBreakdownItemClass(item.label)}`}
                              style={{ 
                                width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                                backgroundColor: item.color
                              }}
                            />
                          </div>
                          <div className="breakdown-value">
                            {MemoryUnitConverter.formatMemorySize(item.valueBytes, 1)}
                            <span className="breakdown-percentage">({item.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                      
                      {isOverCapacity && (
                        <div className="capacity-warning">
                          ⚠️ 总需求 ({totalUsedPercentage.toFixed(1)}%) 超过GPU容量，需要多卡配置
                        </div>
                      )}
                    </>
                  );
                } catch (error) {
                  console.error('Error calculating memory breakdown:', error);
                  return (
                    <div className="breakdown-error">
                      <div className="error-icon">⚠️</div>
                      <div className="error-message">
                        内存分解显示暂时不可用
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
            
            {/* 添加总计信息 */}
            <div className="breakdown-summary">
              <div className="summary-item">
                <span className="summary-label">GPU总显存:</span>
                <span className="summary-value">
                  {MemoryUnitConverter.formatMemorySize(
                    MemoryUnitConverter.gbToBytes(
                      Math.max(0, utilizationDetails.details.availableMemory + utilizationDetails.systemOverhead)
                    ),
                    1
                  )}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">可用显存:</span>
                <span className="summary-value">
                  {MemoryUnitConverter.formatMemorySize(
                    MemoryUnitConverter.gbToBytes(Math.max(0, utilizationDetails.details.availableMemory)),
                    1
                  )}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">实际占用:</span>
                <span className="summary-value">
                  {MemoryUnitConverter.formatMemorySize(
                    MemoryUnitConverter.gbToBytes(Math.max(0, utilizationDetails.details.totalMemoryNeeded)),
                    1
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 优化建议 */}
          {utilizationDetails.recommendations.length > 0 && (
            <div className="utilization-recommendations">
              <h5>优化建议</h5>
              <ul className="recommendation-list">
                {utilizationDetails.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    <span className="recommendation-icon">💡</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 多卡配置信息 */}
      {multiCardDetails && (
        <div className="multi-card-utilization">
          <h4>多卡配置分析</h4>
          
          <div className="multi-card-metrics">
            <div className="metric-row">
              <div className="metric-item">
                <div className="metric-label">扩展因子</div>
                <div className="metric-value">
                  {multiCardDetails.scalingFactor.toFixed(2)}x
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">负载均衡效率</div>
                <div className="metric-value">
                  {(multiCardDetails.loadBalancingEfficiency * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">成本效率</div>
                <div className={`metric-value ${getCostEfficiencyClass(multiCardDetails.costEfficiency)}`}>
                  {multiCardDetails.costEfficiency.toFixed(0)}分
                </div>
              </div>
            </div>
          </div>

          {/* 通信开销 */}
          <div className="communication-overhead">
            <h5>多卡开销分析</h5>
            <div className="overhead-item">
              <div className="overhead-label">原始总内存</div>
              <div className="overhead-value">
                {MemoryUnitConverter.formatMemorySize(
                  MemoryUnitConverter.gbToBytes(
                    Math.max(0, multiCardDetails.totalEffectiveMemory + multiCardDetails.communicationOverhead)
                  ),
                  1
                )}
              </div>
            </div>
            
            <div className="overhead-item">
              <div className="overhead-label">通信开销</div>
              <div className="overhead-value">
                {MemoryUnitConverter.formatMemorySize(
                  MemoryUnitConverter.gbToBytes(Math.max(0, multiCardDetails.communicationOverhead)),
                  1
                )}
                <span className="overhead-percentage">
                  ({MemoryUnitConverter.calculatePercentage(
                    MemoryUnitConverter.gbToBytes(Math.max(0, multiCardDetails.communicationOverhead)),
                    MemoryUnitConverter.gbToBytes(
                      Math.max(1, multiCardDetails.totalEffectiveMemory + multiCardDetails.communicationOverhead)
                    ),
                    1
                  )}%)
                </span>
              </div>
            </div>
            
            <div className="overhead-item">
              <div className="overhead-label">有效总内存</div>
              <div className="overhead-value">
                {MemoryUnitConverter.formatMemorySize(
                  MemoryUnitConverter.gbToBytes(Math.max(0, multiCardDetails.totalEffectiveMemory)),
                  1
                )}
                <span className="overhead-percentage">
                  ({MemoryUnitConverter.calculatePercentage(
                    MemoryUnitConverter.gbToBytes(Math.max(0, multiCardDetails.totalEffectiveMemory)),
                    MemoryUnitConverter.gbToBytes(
                      Math.max(1, multiCardDetails.totalEffectiveMemory + multiCardDetails.communicationOverhead)
                    ),
                    1
                  )}%)
                </span>
              </div>
            </div>
          </div>

          {/* 每卡利用率 */}
          <div className="per-card-utilization">
            <h5>各卡利用率分布</h5>
            <div className="card-utilization-chart">
              {multiCardDetails.perCardUtilization.map((util, index) => (
                <div key={index} className="card-util-item">
                  <div className="card-label">卡 {index + 1}</div>
                  <div className="card-util-bar">
                    <div 
                      className={`card-util-fill ${getUtilizationClass(util)}`}
                      style={{ width: `${Math.min(util * 100, 100)}%` }}
                    />
                  </div>
                  <div className="card-util-value">
                    {(util * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 多卡建议 */}
          {multiCardDetails.recommendations.length > 0 && (
            <div className="multi-card-recommendations">
              <h5>多卡优化建议</h5>
              <ul className="recommendation-list">
                {multiCardDetails.recommendations.map((rec, index) => (
                  <li key={index} className="recommendation-item">
                    <span className="recommendation-icon">🔧</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 最优配置建议 */}
          {multiCardDetails.optimalCardCount !== hardware.multiCardRequired && (
            <div className="optimal-config-suggestion">
              <div className="suggestion-icon">⚡</div>
              <div className="suggestion-content">
                <div className="suggestion-title">最优配置建议</div>
                <div className="suggestion-text">
                  建议使用 {multiCardDetails.optimalCardCount} 张卡，
                  而不是当前的 {hardware.multiCardRequired} 张卡，
                  以获得更好的成本效率。
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 获取利用率的CSS类名
 */
function getUtilizationClass(utilization: number): string {
  if (utilization >= 0.7 && utilization <= 0.85) {
    return 'optimal';
  } else if (utilization < 0.5) {
    return 'low';
  } else if (utilization > 0.95) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * 获取成本效率的CSS类名
 */
function getCostEfficiencyClass(efficiency: number): string {
  if (efficiency >= 80) {
    return 'excellent';
  } else if (efficiency >= 60) {
    return 'good';
  } else if (efficiency >= 40) {
    return 'fair';
  } else {
    return 'poor';
  }
}

/**
 * 获取内存分解项的CSS类名
 */
function getBreakdownItemClass(label: string): string {
  switch (label) {
    case '基础需求':
      return 'needed';
    case '碎片化损失':
      return 'fragmentation';
    case '系统开销':
      return 'system';
    case '安全缓冲':
      return 'safety';
    case '可用内存':
      return 'available';
    default:
      return 'default';
  }
}

export default UtilizationDisplay;