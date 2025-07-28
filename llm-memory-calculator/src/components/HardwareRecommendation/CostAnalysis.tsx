import React, { useMemo } from 'react';
import { HardwareRecommendation, CalculationMode } from '../../types';
import { formatPrice } from '../../utils/formatters';

export interface CostAnalysisProps {
  recommendations: Array<HardwareRecommendation & { 
    memoryUtilization: number; 
    efficiencyScore: number; 
    costPerGB: number;
  }>;
  mode: CalculationMode;
}

export const CostAnalysis: React.FC<CostAnalysisProps> = ({
  recommendations,
  mode
}) => {
  // 成本分析数据
  const costAnalysis = useMemo(() => {
    if (recommendations.length === 0) return null;

    const prices = recommendations.map(r => r.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    // 找到最佳性价比选项
    const bestValueOption = recommendations.reduce((best, current) => {
      const bestRatio = best.efficiencyScore / (best.price / 1000);
      const currentRatio = current.efficiencyScore / (current.price / 1000);
      return currentRatio > bestRatio ? current : best;
    });

    // 找到最经济选项
    const cheapestOption = recommendations.find(r => r.price === minPrice)!;

    // 找到最高性能选项
    const highestPerformanceOption = recommendations.reduce((best, current) => {
      return current.efficiencyScore > best.efficiencyScore ? current : best;
    });

    return {
      minPrice,
      maxPrice,
      avgPrice,
      priceRange: maxPrice - minPrice,
      bestValueOption,
      cheapestOption,
      highestPerformanceOption,
      totalOptions: recommendations.length
    };
  }, [recommendations]);

  // 预算建议
  const budgetRecommendations = useMemo(() => {
    if (!costAnalysis) return [];

    const budgetRanges = [
      { max: 2000, label: '入门级预算', description: '适合小规模实验和学习' },
      { max: 5000, label: '中等预算', description: '适合中小型项目和原型开发' },
      { max: 15000, label: '专业预算', description: '适合商业项目和大规模训练' },
      { max: Infinity, label: '企业级预算', description: '适合大规模生产环境' }
    ];

    return budgetRanges.map(range => {
      const suitableOptions = recommendations.filter(r => r.price <= range.max);
      const bestOption = suitableOptions.length > 0 
        ? suitableOptions.reduce((best, current) => 
            current.efficiencyScore > best.efficiencyScore ? current : best
          )
        : null;

      return {
        ...range,
        optionsCount: suitableOptions.length,
        bestOption,
        avgPrice: suitableOptions.length > 0 
          ? suitableOptions.reduce((sum, r) => sum + r.price, 0) / suitableOptions.length 
          : 0
      };
    });
  }, [recommendations, costAnalysis]);

  if (!costAnalysis) {
    return (
      <div className="cost-analysis">
        <h4>💰 成本分析</h4>
        <p>暂无适合的硬件推荐进行成本分析</p>
      </div>
    );
  }

  return (
    <div className="cost-analysis">
      <div className="analysis-header">
        <h4>💰 成本分析</h4>
        <p>基于 {costAnalysis.totalOptions} 个适合的硬件配置进行成本效益分析</p>
      </div>

      {/* 成本概览 */}
      <div className="cost-overview">
        <div className="overview-cards">
          <div className="overview-card">
            <div className="card-icon">💵</div>
            <div className="card-content">
              <div className="card-label">最低成本</div>
              <div className="card-value">{formatPrice(costAnalysis.minPrice)}</div>
              <div className="card-subtitle">{costAnalysis.cheapestOption.name}</div>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon">💎</div>
            <div className="card-content">
              <div className="card-label">最高成本</div>
              <div className="card-value">{formatPrice(costAnalysis.maxPrice)}</div>
              <div className="card-subtitle">企业级配置</div>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon">📊</div>
            <div className="card-content">
              <div className="card-label">平均成本</div>
              <div className="card-value">{formatPrice(costAnalysis.avgPrice)}</div>
              <div className="card-subtitle">市场平均水平</div>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon">🎯</div>
            <div className="card-content">
              <div className="card-label">最佳性价比</div>
              <div className="card-value">{formatPrice(costAnalysis.bestValueOption.price)}</div>
              <div className="card-subtitle">{costAnalysis.bestValueOption.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 成本分布图 */}
      <div className="cost-distribution">
        <h5>成本分布</h5>
        <div className="distribution-chart">
          {recommendations.map((rec) => {
            const percentage = ((rec.price - costAnalysis.minPrice) / costAnalysis.priceRange) * 100;
            return (
              <div key={rec.id} className="distribution-bar">
                <div className="bar-info">
                  <span className="bar-label">{rec.name}</span>
                  <span className="bar-price">{formatPrice(rec.price)}</span>
                </div>
                <div className="bar-container">
                  <div 
                    className="bar-fill"
                    style={{ 
                      width: `${Math.max(percentage, 5)}%`,
                      backgroundColor: rec === costAnalysis.bestValueOption ? '#10b981' :
                                     rec === costAnalysis.cheapestOption ? '#3b82f6' :
                                     rec === costAnalysis.highestPerformanceOption ? '#f59e0b' : '#6b7280'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 预算建议 */}
      <div className="budget-recommendations">
        <h5>预算建议</h5>
        <div className="budget-grid">
          {budgetRecommendations.map((budget, index) => (
            <div key={index} className="budget-card">
              <div className="budget-header">
                <h6>{budget.label}</h6>
                <span className="budget-range">
                  {index === 0 ? '< ' : ''}
                  {budget.max === Infinity ? '> $15,000' : formatPrice(budget.max)}
                </span>
              </div>
              
              <p className="budget-description">{budget.description}</p>
              
              <div className="budget-stats">
                <div className="stat">
                  <span className="stat-label">可选配置</span>
                  <span className="stat-value">{budget.optionsCount} 个</span>
                </div>
                
                {budget.bestOption && (
                  <div className="stat">
                    <span className="stat-label">推荐配置</span>
                    <span className="stat-value">{budget.bestOption.name}</span>
                  </div>
                )}
                
                {budget.avgPrice > 0 && (
                  <div className="stat">
                    <span className="stat-label">平均价格</span>
                    <span className="stat-value">{formatPrice(budget.avgPrice)}</span>
                  </div>
                )}
              </div>

              {budget.bestOption && (
                <div className="budget-recommendation">
                  <strong>推荐：</strong> {budget.bestOption.name}
                  <br />
                  <small>
                    {formatPrice(budget.bestOption.price)} - 
                    推荐度 {(budget.bestOption.efficiencyScore * 100).toFixed(0)}分
                  </small>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 成本优化建议 */}
      <div className="cost-optimization">
        <h5>💡 成本优化建议</h5>
        <div className="optimization-tips">
          <div className="tip-item">
            <div className="tip-icon">🎯</div>
            <div className="tip-content">
              <h6>性价比优选</h6>
              <p>
                推荐选择 <strong>{costAnalysis.bestValueOption.name}</strong>，
                在 {formatPrice(costAnalysis.bestValueOption.price)} 的价位提供最佳性价比。
              </p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">💰</div>
            <div className="tip-content">
              <h6>预算控制</h6>
              <p>
                如果预算有限，{costAnalysis.cheapestOption.name} 
                ({formatPrice(costAnalysis.cheapestOption.price)}) 是最经济的选择。
              </p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">🚀</div>
            <div className="tip-content">
              <h6>性能优先</h6>
              <p>
                追求最佳性能可选择 {costAnalysis.highestPerformanceOption.name}，
                虽然价格较高但性能表现最优。
              </p>
            </div>
          </div>

          <div className="tip-item">
            <div className="tip-icon">📈</div>
            <div className="tip-content">
              <h6>未来扩展</h6>
              <p>
                {mode === 'training' ? 
                  '训练任务建议选择显存充足的配置，为模型规模扩展预留空间。' :
                  '推理任务可选择内存利用率较高的配置，提高成本效率。'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 总拥有成本分析 */}
      <div className="tco-analysis">
        <h5>📊 总拥有成本考虑</h5>
        <div className="tco-factors">
          <div className="factor-item">
            <span className="factor-label">硬件成本</span>
            <span className="factor-description">GPU购买价格，占总成本的60-70%</span>
          </div>
          <div className="factor-item">
            <span className="factor-label">电力成本</span>
            <span className="factor-description">长期运行的电费，约占总成本的15-20%</span>
          </div>
          <div className="factor-item">
            <span className="factor-label">维护成本</span>
            <span className="factor-description">散热、维修等费用，约占总成本的5-10%</span>
          </div>
          <div className="factor-item">
            <span className="factor-label">机会成本</span>
            <span className="factor-description">性能不足导致的时间损失，难以量化但很重要</span>
          </div>
        </div>
      </div>
    </div>
  );
};