import React, { useState, useMemo, useCallback } from 'react';
import { MemoryCalculationResult, CalculationMode, HardwareRecommendation as HardwareRec } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { MemoryUnitConverter } from '../../utils/MemoryUnitConverter';
import { MemoryDataValidator } from '../../utils/MemoryDataValidator';
import { FallbackDisplayManager } from '../../utils/FallbackDisplayManager';
import { gpuRecommendationEngine } from '../../utils/gpuRecommendationEngine';
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

  // 计算总内存需求（以GB为单位）
  const totalMemoryNeededGB = useMemo(() => {
    if (!result) return 0;
    return mode === 'inference' ? result.inference.total : result.training.total;
  }, [result, mode]);

  // 计算总内存需求（以字节为单位，用于标准化计算）
  const totalMemoryNeededBytes = useMemo(() => {
    return MemoryUnitConverter.gbToBytes(totalMemoryNeededGB);
  }, [totalMemoryNeededGB]);

  // 生成硬件推荐
  const recommendations = useMemo(() => {
    if (!result || totalMemoryNeededGB === 0) return [];

    try {
      // 验证计算结果数据
      const validationResult = MemoryDataValidator.validateCalculationResult(result, mode);
      if (!validationResult.isValid) {
        console.warn('Hardware recommendation validation failed:', validationResult.errors);
        FallbackDisplayManager.logFallbackEvent('memory_display', new Error('Validation failed'), {
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }

      // 使用统一的GPU推荐引擎
      const recommendationResult = gpuRecommendationEngine.generateRecommendations(result, mode, {
        budget: filterBudget,
        sortBy,
        maxResults: 20
      });

      return recommendationResult.recommendations;

    } catch (error) {
      console.error('Error generating hardware recommendations:', error);
      FallbackDisplayManager.logFallbackEvent('memory_display', error as Error, {
        totalMemoryNeededGB,
        mode,
        filterBudget,
        sortBy
      });
      
      // 返回空数组，让组件显示错误状态
      return [];
    }
  }, [result, totalMemoryNeededGB, mode, filterBudget, sortBy]);

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
            基于 {totalMemoryNeededGB.toFixed(1)} GB 内存需求的最佳硬件选择
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
            <div className="stat-value">{totalMemoryNeededGB.toFixed(1)} GB</div>
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
            <div className="stat-label">估算模式</div>
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
              memoryNeeded={totalMemoryNeededBytes}
            />
          ))
        )}
      </div>

      {/* 对比表格 */}
      {showComparison && recommendations.length > 0 && (
        <ComparisonTable
          recommendations={recommendations.slice(0, 5)} // 只显示前5个
          memoryNeeded={totalMemoryNeededBytes}
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



export default HardwareRecommendation;