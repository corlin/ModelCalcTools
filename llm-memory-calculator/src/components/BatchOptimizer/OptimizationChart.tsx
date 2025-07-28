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
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { formatMemorySize } from '../../utils/formatters';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface OptimizationDataPoint {
  batchSize: number;
  memoryUsage: number;          // 内存使用量 (GB)
  throughputEstimate: number;
  isOptimal: boolean;
  exceedsLimit: boolean;
}

export interface OptimizationChartProps {
  data: OptimizationDataPoint[];
  targetMemory: number;
  currentBatchSize: number;
  optimalBatchSize?: number;
}

export const OptimizationChart: React.FC<OptimizationChartProps> = ({
  data,
  targetMemory,
  currentBatchSize,
  optimalBatchSize
}) => {
  // 准备图表数据
  const chartData = useMemo(() => {
    const labels = data.map(d => d.batchSize.toString());
    const memoryData = data.map(d => d.memoryUsage); // 已经是GB单位，无需转换
    const throughputData = data.map(d => d.throughputEstimate);

    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: '内存使用 (GB)',
          data: memoryData,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          yAxisID: 'y',
          pointBackgroundColor: data.map(d => {
            if (d.batchSize === currentBatchSize) return '#ef4444';
            if (d.batchSize === optimalBatchSize) return '#10b981';
            return '#3b82f6';
          }),
          pointBorderColor: data.map(d => {
            if (d.batchSize === currentBatchSize) return '#dc2626';
            if (d.batchSize === optimalBatchSize) return '#059669';
            return '#2563eb';
          }),
          pointRadius: data.map(d => {
            if (d.batchSize === currentBatchSize || d.batchSize === optimalBatchSize) return 6;
            return 4;
          })
        },
        {
          type: 'bar' as const,
          label: '预估吞吐量',
          data: throughputData,
          backgroundColor: data.map(d => {
            if (d.exceedsLimit) return 'rgba(239, 68, 68, 0.6)';
            if (d.batchSize === optimalBatchSize) return 'rgba(16, 185, 129, 0.6)';
            return 'rgba(156, 163, 175, 0.6)';
          }),
          borderColor: data.map(d => {
            if (d.exceedsLimit) return '#dc2626';
            if (d.batchSize === optimalBatchSize) return '#059669';
            return '#6b7280';
          }),
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  }, [data, currentBatchSize, optimalBatchSize]);

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
        text: '批处理大小优化分析',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `批处理大小: ${context[0].label}`;
          },
          label: (context: any) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;
            
            if (datasetLabel.includes('内存')) {
              return `${datasetLabel}: ${formatMemorySize(value)}`;
            } else {
              return `${datasetLabel}: ${value.toFixed(1)} tokens/s`;
            }
          },
          afterBody: (context: any) => {
            const batchSize = parseInt(context[0].label);
            const point = data.find(d => d.batchSize === batchSize);
            
            if (!point) return [];
            
            const info = [];
            if (point.exceedsLimit) {
              info.push('⚠️ 超出内存限制');
            }
            if (point.isOptimal) {
              info.push('✅ 推荐批处理大小');
            }
            if (batchSize === currentBatchSize) {
              info.push('📍 当前批处理大小');
            }
            
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
          text: '批处理大小'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '内存使用 (GB)'
        },
        min: 0,
        max: targetMemory * 1.2, // 显示到目标内存的120%
        grid: {
          drawOnChartArea: true,
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '吞吐量 (tokens/s)'
        },
        min: 0,
        grid: {
          drawOnChartArea: false,
        },
      },
    }
  }), [data, targetMemory, currentBatchSize, optimalBatchSize]);

  return (
    <div className="optimization-chart">
      <div className="chart-container">
        <Line data={chartData as any} options={options} height={300} />
      </div>
      
      {/* 图表说明 */}
      <div className="chart-legend">
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-marker current"></div>
            <span>当前批处理大小</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker optimal"></div>
            <span>推荐批处理大小</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker limit"></div>
            <span>内存限制</span>
          </div>
          <div className="legend-item">
            <div className="legend-marker exceeded"></div>
            <span>超出限制</span>
          </div>
        </div>
      </div>
    </div>
  );
};