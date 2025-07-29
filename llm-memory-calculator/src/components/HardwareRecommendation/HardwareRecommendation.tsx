import React, { useState, useMemo, useCallback } from 'react';
import { MemoryCalculationResult, CalculationMode, HardwareRecommendation as HardwareRec } from '../../types';
import { formatMemorySize, formatPrice } from '../../utils/formatters';
import { GPU_HARDWARE } from '../../constants';
import { HardwareCard } from './HardwareCard';
import { ComparisonTable } from './ComparisonTable';
import { CostAnalysis } from './CostAnalysis';
import './HardwareRecommendation.css';

export interface HardwareRecommendationProps {
  result: MemoryCalculationResult | null;
  mode: CalculationMode;
  budget?: number;
  onHardwareSelect?: (hardware: HardwareRec) => void;
  className?: string;
}

const HardwareRecommendation: React.FC<HardwareRecommendationProps> = ({
  result,
  mode,
  budget,
  onHardwareSelect,
  className = ''
}) => {
  const [selectedHardware, setSelectedHardware] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'memory' | 'efficiency'>('efficiency');
  const [filterBudget, setFilterBudget] = useState(budget || 0);

  // 计算总内存需求
  const totalMemoryNeeded = useMemo(() => {
    if (!result) return 0;
    return mode === 'inference' ? result.inference.total : result.training.total;
  }, [result, mode]);

  // 生成硬件推荐
  const recommendations = useMemo(() => {
    if (!result || totalMemoryNeeded === 0) return [];

    const memoryGB = totalMemoryNeeded / (1024 * 1024 * 1024);
    
    return GPU_HARDWARE.map(gpu => {
      const suitable = gpu.memorySize >= memoryGB;
      const multiCardRequired = suitable ? 1 : Math.ceil(memoryGB / gpu.memorySize);
      const totalCost = gpu.price * multiCardRequired;
      const memoryUtilization = Math.min((memoryGB / (gpu.memorySize * multiCardRequired)) * 100, 100);
      
      // 计算效率评分
      let efficiencyScore = 0;
      if (suitable) {
        efficiencyScore = (memoryUtilization / 100) * 0.4 + // 内存利用率权重40%
                         (gpu.efficiency === 'high' ? 1 : gpu.efficiency === 'medium' ? 0.7 : 0.4) * 0.3 + // 硬件效率权重30%
                         (1 / multiCardRequired) * 0.3; // 单卡优势权重30%
      }

      return {
        id: gpu.id,
        name: gpu.name,
        memorySize: gpu.memorySize * multiCardRequired,
        price: totalCost,
        suitable,
        multiCardRequired,
        efficiency: gpu.efficiency,
        description: generateDescription(gpu, multiCardRequired, suitable, memoryUtilization),
        memoryUtilization,
        efficiencyScore,
        costPerGB: totalCost / (gpu.memorySize * multiCardRequired)
      } as HardwareRec & { 
        memoryUtilization: number; 
        efficiencyScore: number; 
        costPerGB: number;
      };
    }).filter(rec => {
      if (filterBudget > 0 && rec.price > filterBudget) return false;
      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'memory':
          return b.memorySize - a.memorySize;
        case 'efficiency':
        default:
          return b.efficiencyScore - a.efficiencyScore;
      }
    });
  }, [result, totalMemoryNeeded, mode, filterBudget, sortBy]);

  // 处理硬件选择
  const handleHardwareSelect = useCallback((hardware: HardwareRec) => {
    setSelectedHardware(hardware.id);
    if (onHardwareSelect) {
      onHardwareSelect(hardware);
    }
  }, [onHardwareSelect]);

  if (!result) {
    return (
      <div className={`hardware-recommendation empty ${className}`}>
        <div className="empty-state">
          <div className="empty-icon">🖥️</div>
          <h3>硬件推荐</h3>
          <p>请先计算内存需求以获取硬件推荐</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`hardware-recommendation ${className}`}>
      {/* 头部控制区 */}
      <div className="recommendation-header">
        <div className="header-title">
          <h3>GPU硬件推荐</h3>
          <span className="header-subtitle">
            基于 {formatMemorySize(totalMemoryNeeded)} 内存需求的最佳硬件选择
          </span>
        </div>
        
        <div className="header-controls">
          <div className="filter-controls">
            <div className="budget-filter">
              <label htmlFor="budget-filter">预算上限 (¥)</label>
              <input
                id="budget-filter"
                type="number"
                min="0"
                value={filterBudget}
                onChange={(e) => setFilterBudget(Number(e.target.value) || 0)}
                placeholder="无限制"
                className="budget-input"
              />
            </div>
            
            <div className="sort-control">
              <label htmlFor="sort-by">排序方式</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'memory' | 'efficiency')}
                className="sort-select"
              >
                <option value="efficiency">推荐度</option>
                <option value="price">价格</option>
                <option value="memory">显存大小</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`toggle-comparison ${showComparison ? 'active' : ''}`}
            title={showComparison ? '隐藏对比表' : '显示对比表'}
          >
            📊 对比
          </button>
        </div>
      </div>

      {/* 推荐统计 */}
      <div className="recommendation-stats">
        <div className="stat-item">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <div className="stat-label">内存需求</div>
            <div className="stat-value">{formatMemorySize(totalMemoryNeeded)}</div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">适合的GPU</div>
            <div className="stat-value">
              {recommendations.filter(r => r.suitable).length} / {recommendations.length}
            </div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">最低成本</div>
            <div className="stat-value">
              {recommendations.length > 0 
                ? formatPrice(Math.min(...recommendations.filter(r => r.suitable).map(r => r.price)))
                : 'N/A'
              }
            </div>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <div className="stat-label">计算模式</div>
            <div className="stat-value">{mode === 'inference' ? '推理' : '训练'}</div>
          </div>
        </div>
      </div>

      {/* 硬件卡片列表 */}
      <div className="hardware-list">
        {recommendations.length === 0 ? (
          <div className="no-recommendations">
            <p>没有找到符合条件的硬件推荐</p>
            <button
              onClick={() => setFilterBudget(0)}
              className="clear-filters"
            >
              清除筛选条件
            </button>
          </div>
        ) : (
          recommendations.map((hardware, index) => (
            <HardwareCard
              key={hardware.id}
              hardware={hardware}
              rank={index + 1}
              isSelected={selectedHardware === hardware.id}
              onSelect={handleHardwareSelect}
              memoryNeeded={totalMemoryNeeded}
            />
          ))
        )}
      </div>

      {/* 对比表格 */}
      {showComparison && recommendations.length > 0 && (
        <ComparisonTable
          recommendations={recommendations.slice(0, 5)} // 只显示前5个
          memoryNeeded={totalMemoryNeeded}
        />
      )}

      {/* 成本分析 */}
      {recommendations.length > 0 && (
        <CostAnalysis
          recommendations={recommendations.filter(r => r.suitable)}
          mode={mode}
        />
      )}

      {/* 购买建议 */}
      <div className="purchase-advice">
        <h4>💡 购买建议</h4>
        <div className="advice-grid">
          <div className="advice-item">
            <div className="advice-icon">🎯</div>
            <div className="advice-content">
              <h5>性能优先</h5>
              <p>
                选择显存充足的高端GPU，如A100或H100，
                适合大规模模型训练和推理。
              </p>
            </div>
          </div>
          
          <div className="advice-item">
            <div className="advice-icon">💰</div>
            <div className="advice-content">
              <h5>成本优化</h5>
              <p>
                考虑使用多张中端GPU组合，如多张RTX 4090，
                在成本和性能间找到平衡。
              </p>
            </div>
          </div>
          
          <div className="advice-item">
            <div className="advice-icon">🔄</div>
            <div className="advice-content">
              <h5>扩展性</h5>
              <p>
                选择支持多卡并行的配置，便于后续根据需求
                增加GPU数量。
              </p>
            </div>
          </div>
          
          <div className="advice-item">
            <div className="advice-icon">⚡</div>
            <div className="advice-content">
              <h5>功耗考虑</h5>
              <p>
                注意GPU功耗和散热需求，确保电源和散热
                系统能够支持所选配置。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 生成硬件描述
function generateDescription(
  gpu: typeof GPU_HARDWARE[0], 
  multiCardRequired: number, 
  suitable: boolean, 
  memoryUtilization: number
): string {
  if (!suitable) {
    return `需要 ${multiCardRequired} 张 ${gpu.name} 才能满足内存需求，建议考虑更大显存的GPU。`;
  }
  
  if (multiCardRequired === 1) {
    if (memoryUtilization > 90) {
      return `${gpu.name} 可以满足需求，但内存利用率较高 (${memoryUtilization.toFixed(1)}%)，建议考虑更大显存的选择。`;
    } else if (memoryUtilization > 70) {
      return `${gpu.name} 是很好的选择，内存利用率适中 (${memoryUtilization.toFixed(1)}%)，性价比较高。`;
    } else {
      return `${gpu.name} 显存充足，内存利用率 ${memoryUtilization.toFixed(1)}%，适合未来扩展需求。`;
    }
  } else {
    return `使用 ${multiCardRequired} 张 ${gpu.name} 组成多卡配置，总显存 ${gpu.memorySize * multiCardRequired}GB。`;
  }
}

export default HardwareRecommendation;