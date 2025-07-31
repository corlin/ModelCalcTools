import React from 'react';
import { EfficiencyRating as EfficiencyRatingType } from '../../types';
import { efficiencyRatingSystem } from '../../utils/efficiencyRatingSystem';
import './EfficiencyRating.css';

interface EfficiencyRatingProps {
  rating: EfficiencyRatingType;
  showBreakdown?: boolean;
  compact?: boolean;
}

export const EfficiencyRating: React.FC<EfficiencyRatingProps> = ({
  rating,
  showBreakdown = false,
  compact = false
}) => {
  const getRatingColor = (score: number) => efficiencyRatingSystem.getRatingColor(score);
  const getRatingDescription = (score: number) => efficiencyRatingSystem.getRatingDescription(score);

  if (compact) {
    return (
      <div className="efficiency-rating-compact">
        <div 
          className="rating-badge"
          style={{ backgroundColor: getRatingColor(rating.overall) }}
        >
          {rating.overall}
        </div>
        <span className="rating-description">
          {getRatingDescription(rating.overall)}
        </span>
      </div>
    );
  }

  return (
    <div className="efficiency-rating">
      <div className="rating-header">
        <div className="overall-rating">
          <div 
            className="rating-circle"
            style={{ 
              background: `conic-gradient(${getRatingColor(rating.overall)} ${rating.overall * 3.6}deg, #e5e7eb 0deg)` 
            }}
          >
            <div className="rating-inner">
              <span className="rating-score">{rating.overall}</span>
              <span className="rating-label">综合评分</span>
            </div>
          </div>
        </div>
        
        <div className="rating-summary">
          <h4>效率评级：{getRatingDescription(rating.overall)}</h4>
          <div className="confidence-indicator">
            <span>可信度：</span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill"
                style={{ width: `${rating.confidence * 100}%` }}
              />
            </div>
            <span>{Math.round(rating.confidence * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="rating-metrics">
        <div className="metric-item">
          <div className="metric-header">
            <span className="metric-name">性能表现</span>
            <span className="metric-score">{rating.performance}</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${rating.performance}%`,
                backgroundColor: getRatingColor(rating.performance)
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-header">
            <span className="metric-name">运行效率</span>
            <span className="metric-score">{rating.efficiency}</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${rating.efficiency}%`,
                backgroundColor: getRatingColor(rating.efficiency)
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-header">
            <span className="metric-name">功耗效率</span>
            <span className="metric-score">{rating.powerEfficiency}</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${rating.powerEfficiency}%`,
                backgroundColor: getRatingColor(rating.powerEfficiency)
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-header">
            <span className="metric-name">成本效益</span>
            <span className="metric-score">{rating.costEffectiveness}</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${rating.costEffectiveness}%`,
                backgroundColor: getRatingColor(rating.costEffectiveness)
              }}
            />
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-header">
            <span className="metric-name">可靠性</span>
            <span className="metric-score">{rating.reliability}</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill"
              style={{ 
                width: `${rating.reliability}%`,
                backgroundColor: getRatingColor(rating.reliability)
              }}
            />
          </div>
        </div>
      </div>

      {showBreakdown && rating.breakdown && (
        <div className="rating-breakdown">
          <h5>评分详情</h5>
          <div className="breakdown-items">
            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>计算性能</span>
                <span className="breakdown-weight">权重: {Math.round(rating.breakdown.computePerformance.weight * 100)}%</span>
                <span className="breakdown-score">{rating.breakdown.computePerformance.score}</span>
              </div>
              <div className="breakdown-factors">
                {rating.breakdown.computePerformance.factors.map((factor, index) => (
                  <span key={index} className="factor-tag">{factor}</span>
                ))}
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>内存性能</span>
                <span className="breakdown-weight">权重: {Math.round(rating.breakdown.memoryPerformance.weight * 100)}%</span>
                <span className="breakdown-score">{rating.breakdown.memoryPerformance.score}</span>
              </div>
              <div className="breakdown-factors">
                {rating.breakdown.memoryPerformance.factors.map((factor, index) => (
                  <span key={index} className="factor-tag">{factor}</span>
                ))}
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>功耗效率</span>
                <span className="breakdown-weight">权重: {Math.round(rating.breakdown.powerEfficiency.weight * 100)}%</span>
                <span className="breakdown-score">{rating.breakdown.powerEfficiency.score}</span>
              </div>
              <div className="breakdown-factors">
                {rating.breakdown.powerEfficiency.factors.map((factor, index) => (
                  <span key={index} className="factor-tag">{factor}</span>
                ))}
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-header">
                <span>成本效益</span>
                <span className="breakdown-weight">权重: {Math.round(rating.breakdown.costEffectiveness.weight * 100)}%</span>
                <span className="breakdown-score">{rating.breakdown.costEffectiveness.score}</span>
              </div>
              <div className="breakdown-factors">
                {rating.breakdown.costEffectiveness.factors.map((factor, index) => (
                  <span key={index} className="factor-tag">{factor}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};