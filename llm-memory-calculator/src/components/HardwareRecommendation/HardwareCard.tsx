import React from 'react';
import { HardwareRecommendation } from '../../types';
import { formatMemorySize, formatPrice } from '../../utils/formatters';

export interface HardwareCardProps {
  hardware: HardwareRecommendation & { 
    memoryUtilization: number; 
    efficiencyScore: number; 
    costPerGB: number;
  };
  rank: number;
  isSelected: boolean;
  onSelect: (hardware: HardwareRecommendation) => void;
  memoryNeeded: number;
}

export const HardwareCard: React.FC<HardwareCardProps> = ({
  hardware,
  rank,
  isSelected,
  onSelect,
  memoryNeeded
}) => {
  const handleSelect = () => {
    onSelect(hardware);
  };

  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getEfficiencyLabel = (efficiency: string) => {
    switch (efficiency) {
      case 'high': return '高效';
      case 'medium': return '中等';
      case 'low': return '低效';
      default: return '未知';
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700'; // 金色
      case 2: return '#c0c0c0'; // 银色
      case 3: return '#cd7f32'; // 铜色
      default: return '#6b7280'; // 灰色
    }
  };

  return (
    <div 
      className={`hardware-card ${isSelected ? 'selected' : ''} ${hardware.suitable ? 'suitable' : 'insufficient'}`}
      onClick={handleSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      {/* 卡片头部 */}
      <div className="card-header">
        <div className="rank-badge" style={{ backgroundColor: getRankBadgeColor(rank) }}>
          #{rank}
        </div>
        
        <div className="hardware-title">
          <h4 className="hardware-name">{hardware.name}</h4>
          {hardware.multiCardRequired > 1 && (
            <span className="multi-card-badge">
              {hardware.multiCardRequired}x 配置
            </span>
          )}
        </div>
        
        <div className="suitability-indicator">
          {hardware.suitable ? (
            <span className="suitable-badge">✅ 适合</span>
          ) : (
            <span className="insufficient-badge">⚠️ 显存不足</span>
          )}
        </div>
      </div>

      {/* 关键指标 */}
      <div className="key-metrics">
        <div className="metric-item">
          <div className="metric-icon">💾</div>
          <div className="metric-content">
            <div className="metric-label">总显存</div>
            <div className="metric-value">{hardware.memorySize}GB</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">💰</div>
          <div className="metric-content">
            <div className="metric-label">价格</div>
            <div className="metric-value">{formatPrice(hardware.price)}</div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">⚡</div>
          <div className="metric-content">
            <div className="metric-label">效率</div>
            <div 
              className="metric-value efficiency"
              style={{ color: getEfficiencyColor(hardware.efficiency) }}
            >
              {getEfficiencyLabel(hardware.efficiency)}
            </div>
          </div>
        </div>
        
        <div className="metric-item">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-label">利用率</div>
            <div className="metric-value">
              {hardware.memoryUtilization.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 详细信息 */}
      <div className="hardware-details">
        <p className="hardware-description">{hardware.description}</p>
        
        <div className="detail-metrics">
          <div className="detail-item">
            <span className="detail-label">单位成本</span>
            <span className="detail-value">{formatPrice(hardware.costPerGB)}/GB</span>
          </div>
          
          <div className="detail-item">
            <span className="detail-label">推荐度</span>
            <span className="detail-value">
              {(hardware.efficiencyScore * 100).toFixed(0)}分
            </span>
          </div>
          
          {hardware.multiCardRequired > 1 && (
            <div className="detail-item">
              <span className="detail-label">单卡显存</span>
              <span className="detail-value">
                {(hardware.memorySize / hardware.multiCardRequired)}GB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 内存使用可视化 */}
      <div className="memory-visualization">
        <div className="memory-bar">
          <div 
            className="memory-used"
            style={{ 
              width: `${Math.min(hardware.memoryUtilization, 100)}%`,
              backgroundColor: hardware.memoryUtilization > 90 ? '#ef4444' : 
                              hardware.memoryUtilization > 70 ? '#f59e0b' : '#10b981'
            }}
          />
        </div>
        <div className="memory-labels">
          <span className="memory-needed">
            需求: {formatMemorySize(memoryNeeded)}
          </span>
          <span className="memory-total">
            总计: {hardware.memorySize}GB
          </span>
        </div>
      </div>

      {/* 优缺点分析 */}
      <div className="pros-cons">
        <div className="pros">
          <h5>✅ 优点</h5>
          <ul>
            {hardware.suitable && <li>显存充足，满足运行需求</li>}
            {hardware.efficiency === 'high' && <li>高性能GPU，计算效率优秀</li>}
            {hardware.multiCardRequired === 1 && <li>单卡配置，部署简单</li>}
            {hardware.memoryUtilization < 70 && <li>显存余量充足，支持扩展</li>}
            {hardware.costPerGB < 100 && <li>性价比较高</li>}
          </ul>
        </div>
        
        <div className="cons">
          <h5>❌ 缺点</h5>
          <ul>
            {!hardware.suitable && <li>显存不足，需要多卡配置</li>}
            {hardware.efficiency === 'low' && <li>计算效率较低</li>}
            {hardware.multiCardRequired > 1 && <li>需要多卡配置，增加复杂性</li>}
            {hardware.memoryUtilization > 90 && <li>显存利用率过高，缺乏余量</li>}
            {hardware.price > 10000 && <li>价格较高，成本投入大</li>}
          </ul>
        </div>
      </div>

      {/* 选择按钮 */}
      <div className="card-actions">
        <button
          className={`select-button ${isSelected ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect();
          }}
        >
          {isSelected ? '已选择' : '选择此配置'}
        </button>
        
        {hardware.suitable && (
          <div className="recommendation-score">
            <span className="score-label">推荐指数</span>
            <div className="score-stars">
              {Array.from({ length: 5 }, (_, i) => (
                <span
                  key={i}
                  className={`star ${i < Math.round(hardware.efficiencyScore * 5) ? 'filled' : ''}`}
                >
                  ⭐
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 选择指示器 */}
      {isSelected && (
        <div className="selection-indicator">
          <span className="checkmark">✓</span>
        </div>
      )}
    </div>
  );
};