import React from 'react';
import { HardwareRecommendation } from '../../types';
import { MemoryBreakdownCalculator } from '../../utils/MemoryBreakdownCalculator';
import { MemoryUnitConverter } from '../../utils/MemoryUnitConverter';
import { FallbackDisplayManager } from '../../utils/FallbackDisplayManager';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import './UtilizationDisplay.css';

export interface UtilizationDisplayProps {
  hardware: HardwareRecommendation;
  className?: string;
  isLoading?: boolean;
  error?: Error | null;
}

export const UtilizationDisplay: React.FC<UtilizationDisplayProps> = ({
  hardware,
  className = '',
  isLoading = false,
  error = null
}) => {
  const { utilizationDetails, multiCardDetails } = hardware;

  // 处理加载状态
  if (isLoading) {
    return (
      <div className={`utilization-display loading ${className}`}>
        <LoadingState 
          message="正在分析内存利用率和硬件兼容性..."
          size="medium"
          type="dots"
          showProgress={true}
          progress={65}
        />
      </div>
    );
  }

  // 处理错误状态
  if (error) {
    return (
      <div className={`utilization-display error ${className}`}>
        <ErrorState
          title="利用率分析失败"
          message={error.message || '无法分析内存利用率，请检查输入参数'}
          suggestions={[
            '确认模型参数设置正确（参数量、批大小、序列长度）',
            '检查GPU硬件配置是否有效',
            '验证内存计算结果是否在合理范围内',
            '尝试使用默认配置重新计算',
            '如问题持续，请联系技术支持'
          ]}
          onRetry={() => window.location.reload()}
          onReset={() => {
            localStorage.clear();
            window.location.reload();
          }}
          type="warning"
          retryText="重新分析"
          resetText="重置配置"
          showProgress={true}
        />
      </div>
    );
  }

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
                  {MemoryUnitConverter.calculatePercentage(
                    utilizationDetails.theoreticalUtilization, 
                    1, 
                    1
                  )}%
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">实际利用率</div>
                <div className={`metric-value ${getUtilizationClass(utilizationDetails.practicalUtilization)}`}>
                  {MemoryUnitConverter.calculatePercentage(
                    utilizationDetails.practicalUtilization, 
                    1, 
                    1
                  )}%
                  {utilizationDetails.practicalUtilization > 1.0 && (
                    <div className="utilization-warning-badge critical">
                      <span className="warning-icon">🚨</span>
                      <span className="warning-text">超载</span>
                    </div>
                  )}
                  {utilizationDetails.practicalUtilization > 0.95 && utilizationDetails.practicalUtilization <= 1.0 && (
                    <div className="utilization-warning-badge high">
                      <span className="warning-icon">⚠️</span>
                      <span className="warning-text">过高</span>
                    </div>
                  )}
                  {utilizationDetails.practicalUtilization > 0.85 && utilizationDetails.practicalUtilization <= 0.95 && (
                    <div className="utilization-warning-badge medium">
                      <span className="warning-icon">📊</span>
                      <span className="warning-text">适中</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">效率评分</div>
                <div className={`metric-value efficiency-${utilizationDetails.efficiency}`}>
                  {Math.round(utilizationDetails.details.utilizationScore)}分
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
                    FallbackDisplayManager.logFallbackEvent('breakdown_display', new Error('Breakdown validation failed'), {
                      errors: validation.errors,
                      gpuTotalMemoryBytes,
                      usedMemoryBytes
                    });
                  }
                  if (validation.warnings.length > 0) {
                    console.info('Memory breakdown warnings:', validation.warnings);
                  }

                  // 如果验证失败，使用降级显示
                  if (!validation.isValid && breakdownItems.length === 0) {
                    const fallbackError = new Error('Memory breakdown calculation failed');
                    const fallbackItems = FallbackDisplayManager.getMemoryBreakdownFallback(fallbackError, gpuTotalMemoryBytes);
                    
                    return (
                      <div className="breakdown-fallback">
                        <div className="fallback-warning">
                          <div className="warning-icon">⚠️</div>
                          <div className="warning-message">
                            内存分解数据暂时不可用，显示简化信息
                          </div>
                          <div className="warning-actions">
                            <button 
                              onClick={() => window.location.reload()}
                              className="retry-button-small"
                            >
                              重新加载
                            </button>
                          </div>
                        </div>
                        {fallbackItems.map((item, index) => (
                          <div key={index} className="breakdown-item fallback">
                            <div className="breakdown-label">{item.label}</div>
                            <div className="breakdown-bar">
                              <div 
                                className="breakdown-fill fallback"
                                style={{ 
                                  width: `${item.percentage}%`,
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
                        <div className="capacity-warning enhanced">
                          <div className="warning-header">
                            <span className="warning-icon-large">🚨</span>
                            <span className="warning-title">内存不足警告</span>
                          </div>
                          <div className="warning-details">
                            <p>总需求 <strong>{MemoryUnitConverter.calculatePercentage(totalUsedPercentage, 100, 1)}%</strong> 超过GPU容量</p>
                            <div className="memory-progress-indicator">
                              <div className="memory-progress-bar">
                                <div 
                                  className="memory-progress-fill critical" 
                                  style={{ width: `${Math.min(totalUsedPercentage, 100)}%` }}
                                ></div>
                              </div>
                              <div className="memory-progress-text">{totalUsedPercentage.toFixed(1)}%</div>
                            </div>
                            <div className="warning-solutions">
                              <h6>立即解决方案：</h6>
                              <ul>
                                <li>🔧 使用多卡并行配置</li>
                                <li>📉 减少批处理大小（建议减少30-50%）</li>
                                <li>🚀 使用更大显存的GPU（推荐24GB+）</li>
                                <li>⚡ 启用梯度检查点技术（节省30-50%内存）</li>
                                <li>🎯 切换到FP16混合精度（节省50%内存）</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                } catch (error) {
                  console.error('Error calculating memory breakdown:', error);
                  FallbackDisplayManager.logFallbackEvent('breakdown_display', error as Error, {
                    hardwareId: hardware.id,
                    utilizationDetails: utilizationDetails ? 'present' : 'missing'
                  });
                  
                  // 使用降级显示管理器
                  const fallbackDisplay = FallbackDisplayManager.getUtilizationDisplayFallback(error as Error);
                  
                  return (
                    <div className="breakdown-error enhanced">
                      <div className="error-header">
                        <div className="error-icon">⚠️</div>
                        <div className="error-title">数据加载失败</div>
                      </div>
                      <div className="error-content">
                        <div className="error-message">
                          {fallbackDisplay.message}
                        </div>
                        <div className="error-suggestions">
                          <p>可能的原因：</p>
                          <ul>
                            <li>计算参数超出合理范围</li>
                            <li>网络连接不稳定</li>
                            <li>浏览器内存不足</li>
                          </ul>
                        </div>
                        <div className="error-actions">
                          <button 
                            onClick={() => window.location.reload()}
                            className="retry-button primary"
                          >
                            重新加载
                          </button>
                          <button 
                            onClick={() => {
                              // 清除本地存储并重置
                              localStorage.clear();
                              window.location.reload();
                            }}
                            className="retry-button secondary"
                          >
                            重置应用
                          </button>
                        </div>
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
                  {MemoryUnitConverter.calculatePercentage(
                    multiCardDetails.loadBalancingEfficiency, 
                    1, 
                    1
                  )}%
                </div>
              </div>
              
              <div className="metric-item">
                <div className="metric-label">成本效率</div>
                <div className={`metric-value ${getCostEfficiencyClass(multiCardDetails.costEfficiency)}`}>
                  {Math.round(multiCardDetails.costEfficiency)}分
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
                    {MemoryUnitConverter.calculatePercentage(util, 1, 1)}%
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