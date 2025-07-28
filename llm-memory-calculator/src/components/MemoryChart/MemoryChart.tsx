import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { formatMemorySize } from '../../utils/formatters';
import { CHART_COLORS } from '../../constants';
import { ChartTypeToggle, ChartType } from './ChartTypeToggle';
import { ChartLegend } from './ChartLegend';
import './MemoryChart.css';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);



export interface MemoryChartProps {
  result: MemoryCalculationResult;
  mode: CalculationMode;
  chartType?: ChartType;
  onChartTypeChange?: (type: ChartType) => void;
  showLegend?: boolean;
  showValues?: boolean;
  animated?: boolean;
  className?: string;
}

const MemoryChart: React.FC<MemoryChartProps> = ({
  result,
  mode,
  chartType = 'pie',
  onChartTypeChange,
  showLegend = true,
  showValues = true,
  animated = true,
  className = ''
}) => {
  // 准备图表数据
  const chartData = useMemo(() => {
    const data = mode === 'inference' ? result.inference : result.training;
    
    const labels: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];

    // 模型权重
    labels.push('模型权重');
    values.push(data.modelWeights);
    colors.push(CHART_COLORS.weights);

    // 激活值
    labels.push('激活值');
    values.push(data.activations);
    colors.push(CHART_COLORS.activations);

    // 训练模式额外数据
    if (mode === 'training' && 'gradients' in data && 'optimizerStates' in data) {
      labels.push('梯度');
      values.push(data.gradients as number);
      colors.push(CHART_COLORS.gradients);

      labels.push('优化器状态');
      values.push(data.optimizerStates as number);
      colors.push(CHART_COLORS.optimizer);
    }

    return {
      labels,
      datasets: [
        {
          label: '内存使用量',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(color => color + 'CC'),
          borderWidth: 2,
          hoverBackgroundColor: colors.map(color => color + 'DD'),
          hoverBorderColor: colors.map(color => color + 'FF'),
          hoverBorderWidth: 3
        }
      ]
    };
  }, [result, mode]);

  // 饼图配置
  const pieOptions: ChartOptions<'pie'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      animateRotate: true,
      animateScale: true,
      duration: 1000
    } : false,
    plugins: {
      legend: {
        display: false // 使用自定义图例
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: any) => a + (Number(b) || 0), 0) as number;
            const numValue = typeof value === 'number' ? value : 0;
            const percentage = total > 0 ? ((numValue / total) * 100).toFixed(1) : '0';
            return `${label}: ${formatMemorySize(numValue)} (${percentage}%)`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }), [animated]);

  // 柱状图配置
  const barOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: animated ? {
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatMemorySize(Number(value))
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed.y;
            const total = context.dataset.data.reduce((a: number, b: any) => a + (Number(b) || 0), 0) as number;
            const numValue = typeof value === 'number' ? value : 0;
            const percentage = total > 0 ? ((numValue / total) * 100).toFixed(1) : '0';
            return `${label}: ${formatMemorySize(numValue)} (${percentage}%)`;
          }
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  }), [animated]);

  // 计算总内存
  const totalMemory = useMemo(() => {
    return mode === 'inference' ? result.inference.total : result.training.total;
  }, [result, mode]);

  // 准备图例数据
  const legendData = useMemo(() => {
    return chartData.labels.map((label, index) => ({
      label,
      value: chartData.datasets[0].data[index],
      color: chartData.datasets[0].backgroundColor[index] as string,
      percentage: ((chartData.datasets[0].data[index] / totalMemory) * 100)
    }));
  }, [chartData, totalMemory]);

  return (
    <div className={`memory-chart ${className}`}>
      {/* 图表头部 */}
      <div className="chart-header">
        <div className="chart-title">
          <h4>内存分布图表</h4>
          <span className="chart-subtitle">
            {mode === 'inference' ? '推理模式' : '训练模式'} - 总计: {formatMemorySize(totalMemory)}
          </span>
        </div>
        
        {onChartTypeChange && (
          <ChartTypeToggle
            chartType={chartType}
            onTypeChange={onChartTypeChange}
          />
        )}
      </div>

      {/* 图表容器 */}
      <div className="chart-container">
        <div className="chart-wrapper">
          {chartType === 'pie' ? (
            <Pie data={chartData} options={pieOptions} />
          ) : (
            <Bar data={chartData} options={barOptions} />
          )}
        </div>

        {/* 自定义图例 */}
        {showLegend && (
          <ChartLegend
            data={legendData}
            showValues={showValues}
            totalMemory={totalMemory}
          />
        )}
      </div>

      {/* 图表统计信息 */}
      <div className="chart-stats">
        <div className="stat-item">
          <span className="stat-label">最大组件</span>
          <span className="stat-value">
            {legendData.reduce((max, item) => 
              item.value > max.value ? item : max
            ).label}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">组件数量</span>
          <span className="stat-value">{legendData.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">模式</span>
          <span className="stat-value">
            {mode === 'inference' ? '推理' : '训练'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MemoryChart;