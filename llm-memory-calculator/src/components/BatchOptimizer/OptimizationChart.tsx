import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { BATCH_OPTIMIZATION_DEFAULTS } from '../../constants';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface EnhancedOptimizationDataPoint {
  batchSize: number;
  memoryUsage: number;          // 内存使用量 (GB)
  utilizationRate: number;      // 内存利用率 (0-1)
  isOptimal: boolean;
  exceedsLimit: boolean;
  safetyMarginExceeded: boolean; // 是否超过安全边距
  estimatedThroughput?: number;  // 估算吞吐量 (tokens/s)
}

export interface OptimizationChartProps {
  data: EnhancedOptimizationDataPoint[];
  targetMemory: number;
  currentBatchSize: number;
  optimalBatchSize?: number;
  safetyMargin?: number;        // 安全边距 (0-1)
  showThroughputEstimate?: boolean; // 是否显示吞吐量估算
}

export const OptimizationChart: React.FC<OptimizationChartProps> = ({
  data,
  targetMemory,
  currentBatchSize,
  optimalBatchSize,
  safetyMargin = BATCH_OPTIMIZATION_DEFAULTS.SAFETY_MARGIN,
  showThroughputEstimate = true
}) => {
  // 验证图表数据点与计算结果的一致性
  const validatedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      // 确保内存使用量为正数且单位正确
      memoryUsage: Math.max(0, point.memoryUsage),
      // 验证利用率计算
      utilizationRate: point.memoryUsage / targetMemory,
      // 验证限制标记
      exceedsLimit: point.memoryUsage > targetMemory,
      safetyMarginExceeded: point.memoryUsage > (targetMemory * safetyMargin)
    }));
  }, [data, targetMemory, safetyMargin]);

  // 准备图表数据
  const chartData = useMemo(() => {
    const labels = validatedData.map(d => d.batchSize.toString());
    const memoryData = validatedData.map(d => d.memoryUsage);
    const throughputData = validatedData.map(d => d.estimatedThroughput || 0);
    
    // 安全边距线数据
    const safetyMarginLine = validatedData.map(() => targetMemory * safetyMargin);
    const memoryLimitLine = validatedData.map(() => targetMemory);

    const datasets: any[] = [
      // 内存使用量线
      {
        type: 'line' as const,
        label: '内存使用 (GB)',
        data: memoryData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
        pointBackgroundColor: validatedData.map(d => {
          if (d.batchSize === currentBatchSize) return '#ef4444';
          if (d.batchSize === optimalBatchSize) return '#10b981';
          if (d.exceedsLimit) return '#f59e0b';
          return '#3b82f6';
        }),
        pointBorderColor: validatedData.map(d => {
          if (d.batchSize === currentBatchSize) return '#dc2626';
          if (d.batchSize === optimalBatchSize) return '#059669';
          if (d.exceedsLimit) return '#d97706';
          return '#2563eb';
        }),
        pointRadius: validatedData.map(d => {
          if (d.batchSize === currentBatchSize || d.batchSize === optimalBatchSize) return 8;
          if (d.exceedsLimit) return 6;
          return 4;
        }),
        pointBorderWidth: validatedData.map(d => {
          if (d.batchSize === currentBatchSize || d.batchSize === optimalBatchSize) return 3;
          return 2;
        })
      },
      // 安全边距区域
      {
        type: 'line' as const,
        label: '安全边距区域',
        data: safetyMarginLine,
        borderColor: 'rgba(251, 191, 36, 0.8)',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: '+1',
        yAxisID: 'y',
        pointRadius: 0,
        pointHoverRadius: 0
      },
      // 内存限制线
      {
        type: 'line' as const,
        label: `内存限制 (${targetMemory}GB)`,
        data: memoryLimitLine,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        borderDash: [10, 5],
        fill: false,
        yAxisID: 'y',
        pointRadius: 0,
        pointHoverRadius: 0
      }
    ];

    // 如果启用吞吐量估算，添加吞吐量数据集
    if (showThroughputEstimate && throughputData.some(t => t > 0)) {
      datasets.push({
        type: 'bar' as const,
        label: '预估吞吐量 (tokens/s)',
        data: throughputData,
        backgroundColor: validatedData.map(d => {
          if (d.exceedsLimit) return 'rgba(239, 68, 68, 0.6)';
          if (d.batchSize === optimalBatchSize) return 'rgba(16, 185, 129, 0.6)';
          if (d.batchSize === currentBatchSize) return 'rgba(239, 68, 68, 0.6)';
          if (d.safetyMarginExceeded) return 'rgba(251, 191, 36, 0.6)';
          return 'rgba(156, 163, 175, 0.6)';
        }),
        borderColor: validatedData.map(d => {
          if (d.exceedsLimit) return '#dc2626';
          if (d.batchSize === optimalBatchSize) return '#059669';
          if (d.batchSize === currentBatchSize) return '#dc2626';
          if (d.safetyMarginExceeded) return '#d97706';
          return '#6b7280';
        }),
        borderWidth: 1,
        yAxisID: 'y1'
      });
    }

    return {
      labels,
      datasets
    };
  }, [validatedData, currentBatchSize, optimalBatchSize, targetMemory, safetyMargin, showThroughputEstimate]);

  // 图表配置
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: `批处理大小优化分析 (内存限制: ${targetMemory}GB)`,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      legend: {
        position: 'top' as const,
        labels: {
          filter: (legendItem: any) => {
            // 隐藏安全边距区域的图例，因为它只是视觉辅助
            return !legendItem.text.includes('安全边距区域');
          }
        }
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `批处理大小: ${context[0].label}`;
          },
          label: (context: any) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (datasetLabel.includes('内存使用')) {
              const utilizationRate = (value / targetMemory * 100).toFixed(1);
              return `${datasetLabel}: ${value.toFixed(2)} GB (${utilizationRate}%)`;
            } else if (datasetLabel.includes('内存限制')) {
              return `${datasetLabel}: ${value.toFixed(0)} GB`;
            } else if (datasetLabel.includes('吞吐量')) {
              return `${datasetLabel}: ${value.toFixed(1)}`;
            } else {
              return `${datasetLabel}: ${value.toFixed(2)}`;
            }
          },
          afterBody: (context: any) => {
            const batchSize = parseInt(context[0].label);
            const point = validatedData.find(d => d.batchSize === batchSize);
            
            if (!point) return [];
            
            const info = [];
            
            // 状态标识
            if (batchSize === currentBatchSize) {
              info.push('📍 当前批处理大小');
            }
            if (batchSize === optimalBatchSize) {
              info.push('✅ 推荐批处理大小');
            }
            
            // 内存状态
            if (point.exceedsLimit) {
              info.push('🚫 超出内存限制');
            } else if (point.safetyMarginExceeded) {
              info.push('⚠️ 超出安全边距');
            } else {
              info.push('✅ 在安全范围内');
            }
            
            // 内存利用率详情
            const utilizationRate = (point.memoryUsage / targetMemory * 100).toFixed(1);
            info.push(`内存利用率: ${utilizationRate}%`);
            
            // 安全边距状态
            const safetyUtilization = (point.memoryUsage / (targetMemory * safetyMargin) * 100).toFixed(1);
            info.push(`安全边距利用率: ${safetyUtilization}%`);
            
            return info;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: '批处理大小',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '内存使用 (GB)',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        min: 0,
        max: Math.max(targetMemory * 1.1, Math.max(...validatedData.map(d => d.memoryUsage)) * 1.1),
        grid: {
          drawOnChartArea: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return `${value} GB`;
          }
        }
      },
      y1: showThroughputEstimate ? {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '吞吐量 (tokens/s)',
          font: {
            size: 12,
            weight: 'bold' as const
          }
        },
        min: 0,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return `${value.toFixed(0)}`;
          }
        }
      } : undefined,
    }
  }), [validatedData, targetMemory, currentBatchSize, optimalBatchSize, safetyMargin, showThroughputEstimate]);

  return (
    <div className="optimization-chart">
      <div className="chart-container">
        <Line data={chartData as any} options={options} height={400} />
      </div>
      
      {/* 增强的图表说明 */}
      <div className="chart-legend">
        <div className="legend-section">
          <h5>批处理大小标识</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-marker current"></div>
              <span>当前批处理大小 ({currentBatchSize})</span>
            </div>
            {optimalBatchSize && (
              <div className="legend-item">
                <div className="legend-marker optimal"></div>
                <span>推荐批处理大小 ({optimalBatchSize})</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="legend-section">
          <h5>内存状态</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-marker safe"></div>
              <span>安全范围内 (≤{(targetMemory * safetyMargin).toFixed(0)}GB)</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker warning"></div>
              <span>超出安全边距 ({'>'}
{(targetMemory * safetyMargin).toFixed(0)}GB)</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker danger"></div>
              <span>超出内存限制 ({'>'}
{targetMemory}GB)</span>
            </div>
          </div>
        </div>
        
        <div className="legend-section">
          <h5>图表说明</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-line solid"></div>
              <span>内存使用量</span>
            </div>
            <div className="legend-item">
              <div className="legend-line dashed-red"></div>
              <span>内存限制线 ({targetMemory}GB)</span>
            </div>
            <div className="legend-item">
              <div className="legend-line dashed-yellow"></div>
              <span>安全边距线 ({(targetMemory * safetyMargin).toFixed(0)}GB)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 数据统计摘要 */}
      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">数据点总数:</span>
            <span className="stat-value">{validatedData.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">安全范围内:</span>
            <span className="stat-value">{validatedData.filter(d => !d.safetyMarginExceeded).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">超出限制:</span>
            <span className="stat-value">{validatedData.filter(d => d.exceedsLimit).length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">最大可用批处理大小:</span>
            <span className="stat-value">
              {Math.max(...validatedData.filter(d => !d.exceedsLimit).map(d => d.batchSize), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};