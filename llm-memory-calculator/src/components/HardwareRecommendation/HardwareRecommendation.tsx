import React, { useState, useMemo, useCallback } from 'react';
import { MemoryCalculationResult, CalculationMode, HardwareRecommendation as HardwareRec } from '../../types';
import { formatPrice } from '../../utils/formatters';
import { MemoryUnitConverter } from '../../utils/MemoryUnitConverter';
import { ENHANCED_GPU_HARDWARE } from '../../constants';
import { gpuDataValidator } from '../../utils/gpuDataValidator';
import { HardwareCard } from './HardwareCard';
import { WorkloadType } from '../../utils/efficiencyRatingSystem';
import { gpuEfficiencyUpdater } from '../../utils/gpuEfficiencyUpdater';
import { UtilizationCalculator, UtilizationResult, MultiCardResult, DEFAULT_UTILIZATION_CONFIG } from '../../utils/utilizationCalculator';
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
  
  // 创建利用率计算器实例
  const utilizationCalculator = useMemo(() => new UtilizationCalculator(), []);

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

    // 使用已经计算好的GB值
    const memoryGB = totalMemoryNeededGB;
    const gpuMemoryBytes = (gpu: any) => MemoryUnitConverter.gbToBytes(gpu.memorySize);
    
    // 验证并过滤有效的GPU数据，同时更新效率评级
    const workloadType: WorkloadType = mode === 'inference' ? 'inference' : 'training';
    const validGPUs = ENHANCED_GPU_HARDWARE
      .filter(gpu => {
        const validation = gpuDataValidator.validateGPUData(gpu);
        return validation.isValid && validation.confidence > 0.5; // 只使用可信度大于50%的数据
      })
      .map(gpu => gpuEfficiencyUpdater.updateGPUEfficiency(gpu, workloadType));
    
    return validGPUs.map(gpu => {
      // 使用标准化利用率计算
      const standardizedUtilization = UtilizationCalculator.calculateStandardizedUtilization(
        totalMemoryNeededBytes,
        gpuMemoryBytes(gpu),
        DEFAULT_UTILIZATION_CONFIG
      );
      
      // 重新定义"suitable"：基于标准化利用率计算
      const theoreticallyEnough = gpu.memorySize >= memoryGB;
      const practicallyFeasible = !standardizedUtilization.isOverCapacity;
      const suitable = theoreticallyEnough && practicallyFeasible;
      
      const multiCardRequired = suitable ? 1 : Math.ceil(memoryGB / gpu.memorySize);
      const totalCost = gpu.price.currentPrice * multiCardRequired;
      
      // 计算利用率和相关详情
      let finalUtilizationResult: UtilizationResult | undefined;
      let multiCardResult: MultiCardResult | undefined;
      let memoryUtilization: number;
      
      if (suitable) {
        // 单卡配置：使用标准化利用率
        memoryUtilization = standardizedUtilization.utilizationPercentage;
        
        // 为了兼容性，也计算传统的利用率结果
        finalUtilizationResult = utilizationCalculator.calculateRealUtilization(
          memoryGB,
          gpu.memorySize
        );
      } else {
        // 多卡配置：计算多卡效率和利用率
        multiCardResult = utilizationCalculator.calculateMultiCardEfficiency(
          memoryGB,
          gpu.memorySize,
          multiCardRequired
        );
        
        // 对于多卡配置，计算每卡的标准化利用率
        const perCardMemoryBytes = totalMemoryNeededBytes / multiCardRequired;
        const perCardUtilization = UtilizationCalculator.calculateStandardizedUtilization(
          perCardMemoryBytes,
          gpuMemoryBytes(gpu),
          DEFAULT_UTILIZATION_CONFIG
        );
        
        memoryUtilization = perCardUtilization.utilizationPercentage;
      }
      
      // 使用新的效率评级系统计算综合评分
      const efficiencyRating = gpu.efficiency; // 已经通过gpuEfficiencyUpdater更新
      let efficiencyScore = efficiencyRating.overall / 100; // 转换为0-1范围
      
      // 根据标准化利用率和多卡配置调整评分
      if (suitable) {
        // 基于标准化效率等级调整评分
        const efficiencyBonus = standardizedUtilization.efficiencyRating === 'excellent' ? 0.1 :
                               standardizedUtilization.efficiencyRating === 'good' ? 0.05 :
                               standardizedUtilization.efficiencyRating === 'fair' ? 0.02 : 0;
        const singleCardBonus = multiCardRequired === 1 ? 0.05 : 0; // 单卡配置加成
        efficiencyScore = Math.min(1, efficiencyScore + efficiencyBonus + singleCardBonus);
      } else {
        // 多卡配置的效率惩罚
        const multiCardPenalty = (multiCardRequired - 1) * 0.05;
        efficiencyScore = Math.max(0, efficiencyScore - multiCardPenalty);
      }

      // 转换为旧的效率格式以保持兼容性
      const legacyEfficiency: 'high' | 'medium' | 'low' = 
        gpu.efficiency.overall >= 85 ? 'high' : 
        gpu.efficiency.overall >= 70 ? 'medium' : 'low';

      return {
        id: gpu.id,
        name: gpu.name,
        memorySize: gpu.memorySize * multiCardRequired,
        price: totalCost,
        suitable,
        multiCardRequired,
        efficiency: legacyEfficiency,
        description: generateEnhancedDescription(gpu, multiCardRequired, suitable, memoryUtilization, totalMemoryNeededBytes),
        memoryUtilization,
        efficiencyScore,
        costPerGB: totalCost / (gpu.memorySize * multiCardRequired),
        // 添加利用率详情
        utilizationDetails: finalUtilizationResult,
        multiCardDetails: multiCardResult,
        standardizedUtilization, // 添加标准化利用率信息
        
        // 添加增强信息
        enhancedData: {
          architecture: gpu.architecture,
          memoryBandwidth: gpu.memoryBandwidth,
          tdp: gpu.tdp,
          benchmarks: gpu.benchmarks,
          confidence: gpuDataValidator.validateGPUData(gpu).confidence,
          efficiencyRating: efficiencyRating
        }
      } as HardwareRec & { 
        memoryUtilization: number; 
        efficiencyScore: number; 
        costPerGB: number;
        enhancedData: any;
        standardizedUtilization: any;
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
  }, [result, totalMemoryNeededGB, totalMemoryNeededBytes, mode, filterBudget, sortBy, utilizationCalculator]);

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

// 生成增强的硬件描述
function generateEnhancedDescription(
  gpu: any, 
  multiCardRequired: number, 
  suitable: boolean, 
  memoryUtilization: number,
  totalMemoryNeededBytes: number
): string {
  const performanceInfo = gpu.benchmarks?.llmInference ? 
    ` (${gpu.benchmarks.llmInference.tokensPerSecond} tokens/s)` : '';
  
  // 内存需求已经是GB单位
  const memoryNeededGB = MemoryUnitConverter.bytesToGB(totalMemoryNeededBytes);
  const formattedMemoryNeeded = `${memoryNeededGB.toFixed(1)} GB`;
  
  if (!suitable) {
    if (gpu.memorySize < memoryNeededGB) {
      return `单卡显存不足，需要 ${multiCardRequired} 张 ${gpu.name} 才能满足 ${formattedMemoryNeeded} 的内存需求。${performanceInfo}`;
    } else {
      return `单卡显存理论上够用，但考虑实际开销后利用率过高，建议使用 ${multiCardRequired} 张卡或更大显存的GPU。${performanceInfo}`;
    }
  }
  
  if (multiCardRequired === 1) {
    const architectureInfo = gpu.architecture ? ` (${gpu.architecture}架构)` : '';
    
    if (memoryUtilization > 90) {
      return `${gpu.name}${architectureInfo} 可以满足需求，但内存利用率较高 (${memoryUtilization.toFixed(1)}%)，建议考虑更大显存的选择。${performanceInfo}`;
    } else if (memoryUtilization > 70) {
      return `${gpu.name}${architectureInfo} 是很好的选择，内存利用率适中 (${memoryUtilization.toFixed(1)}%)，性价比较高。${performanceInfo}`;
    } else {
      return `${gpu.name}${architectureInfo} 显存充足，内存利用率 ${memoryUtilization.toFixed(1)}%，适合未来扩展需求。${performanceInfo}`;
    }
  } else {
    const totalMemoryGB = gpu.memorySize * multiCardRequired;
    const formattedTotalMemory = MemoryUnitConverter.formatMemorySize(MemoryUnitConverter.gbToBytes(totalMemoryGB));
    return `使用 ${multiCardRequired} 张 ${gpu.name} 组成多卡配置，总显存 ${formattedTotalMemory}。${performanceInfo}`;
  }
}

export default HardwareRecommendation;