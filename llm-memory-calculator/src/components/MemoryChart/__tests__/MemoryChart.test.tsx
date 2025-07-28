import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryChart, ChartTypeToggle, ChartLegend } from '../index';
import { MemoryCalculationResult, CalculationMode } from '../../../types';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Pie: ({ data }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)}>
      Pie Chart Mock
    </div>
  ),
  Bar: ({ data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      Bar Chart Mock
    </div>
  )
}));

jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn()
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

// Mock formatters
jest.mock('../../../utils/formatters', () => ({
  formatMemorySize: (memoryGB: number) => `${memoryGB.toFixed(1)} GB`
}));

describe('MemoryChart Component', () => {
  const mockOnChartTypeChange = jest.fn();

  const mockResult: MemoryCalculationResult = {
    parameters: {
      parameterCount: 7,
      batchSize: 1,
      sequenceLength: 2048,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000,
      precision: 'fp16'
    },
    inference: {
      modelWeights: 14, // 14GB
      activations: 2,   // 2GB
      total: 16         // 16GB
    },
    training: {
      modelWeights: 14, // 14GB
      activations: 4,   // 4GB
      gradients: 14,    // 14GB
      optimizerStates: 28, // 28GB
      total: 60         // 60GB
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    result: mockResult,
    mode: 'inference' as CalculationMode,
    onChartTypeChange: mockOnChartTypeChange
  };

  test('应该渲染内存图表', () => {
    render(<MemoryChart {...defaultProps} />);

    expect(screen.getByText('内存分布图表')).toBeInTheDocument();
    expect(screen.getByText(/推理模式/)).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('应该显示正确的总内存', () => {
    render(<MemoryChart {...defaultProps} />);

    expect(screen.getByText(/总计: 16.0 GB/)).toBeInTheDocument();
  });

  test('应该在训练模式显示更多组件', () => {
    render(<MemoryChart {...defaultProps} mode="training" />);

    expect(screen.getByText(/训练模式/)).toBeInTheDocument();
    expect(screen.getByText(/总计: 60.0 GB/)).toBeInTheDocument();
  });

  test('应该支持图表类型切换', async () => {
    const user = userEvent.setup();
    render(<MemoryChart {...defaultProps} chartType="pie" />);

    // 初始显示饼图
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // 切换到柱状图
    const barButton = screen.getByTitle('柱状图');
    await user.click(barButton);

    expect(mockOnChartTypeChange).toHaveBeenCalledWith('bar');
  });

  test('应该显示柱状图', () => {
    render(<MemoryChart {...defaultProps} chartType="bar" />);

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  test('应该显示图例', () => {
    render(<MemoryChart {...defaultProps} showLegend={true} />);

    expect(screen.getByText('内存组件')).toBeInTheDocument();
    expect(screen.getAllByText('模型权重')).toHaveLength(2); // 图例和统计信息中都有
    expect(screen.getByText('激活值')).toBeInTheDocument();
  });

  test('应该隐藏图例', () => {
    render(<MemoryChart {...defaultProps} showLegend={false} />);

    expect(screen.queryByText('内存组件')).not.toBeInTheDocument();
  });

  test('应该显示图表统计信息', () => {
    render(<MemoryChart {...defaultProps} />);

    expect(screen.getByText('最大组件')).toBeInTheDocument();
    expect(screen.getByText('组件数量')).toBeInTheDocument();
    expect(screen.getByText('模式')).toBeInTheDocument();
  });

  test('应该支持自定义className', () => {
    const { container } = render(
      <MemoryChart {...defaultProps} className="custom-chart" />
    );

    expect(container.firstChild).toHaveClass('memory-chart', 'custom-chart');
  });

  test('应该正确传递图表数据', () => {
    render(<MemoryChart {...defaultProps} />);

    const pieChart = screen.getByTestId('pie-chart');
    const chartData = JSON.parse(pieChart.getAttribute('data-chart-data') || '{}');

    expect(chartData.labels).toContain('模型权重');
    expect(chartData.labels).toContain('激活值');
    expect(chartData.datasets[0].data).toHaveLength(2); // 推理模式只有2个组件
  });

  test('应该在训练模式显示4个组件', () => {
    render(<MemoryChart {...defaultProps} mode="training" />);

    const pieChart = screen.getByTestId('pie-chart');
    const chartData = JSON.parse(pieChart.getAttribute('data-chart-data') || '{}');

    expect(chartData.labels).toContain('模型权重');
    expect(chartData.labels).toContain('激活值');
    expect(chartData.labels).toContain('梯度');
    expect(chartData.labels).toContain('优化器状态');
    expect(chartData.datasets[0].data).toHaveLength(4); // 训练模式有4个组件
  });
});

// ChartTypeToggle 组件测试
describe('ChartTypeToggle Component', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该渲染图表类型切换', () => {
    render(
      <ChartTypeToggle
        chartType="pie"
        onTypeChange={mockOnTypeChange}
      />
    );

    expect(screen.getByTitle('饼图')).toBeInTheDocument();
    expect(screen.getByTitle('柱状图')).toBeInTheDocument();
  });

  test('应该显示活动状态', () => {
    render(
      <ChartTypeToggle
        chartType="pie"
        onTypeChange={mockOnTypeChange}
      />
    );

    const pieButton = screen.getByTitle('饼图');
    const barButton = screen.getByTitle('柱状图');

    expect(pieButton).toHaveClass('active');
    expect(barButton).not.toHaveClass('active');
  });

  test('应该处理类型切换', async () => {
    const user = userEvent.setup();
    render(
      <ChartTypeToggle
        chartType="pie"
        onTypeChange={mockOnTypeChange}
      />
    );

    const barButton = screen.getByTitle('柱状图');
    await user.click(barButton);

    expect(mockOnTypeChange).toHaveBeenCalledWith('bar');
  });

  test('应该支持禁用状态', () => {
    render(
      <ChartTypeToggle
        chartType="pie"
        onTypeChange={mockOnTypeChange}
        disabled={true}
      />
    );

    const pieButton = screen.getByTitle('饼图');
    const barButton = screen.getByTitle('柱状图');

    expect(pieButton).toBeDisabled();
    expect(barButton).toBeDisabled();
  });
});

// ChartLegend 组件测试
describe('ChartLegend Component', () => {
  const mockLegendData = [
    {
      label: '模型权重',
      value: 14, // 14GB
      color: '#3b82f6',
      percentage: 70
    },
    {
      label: '激活值',
      value: 6, // 6GB
      color: '#10b981',
      percentage: 30
    }
  ];

  test('应该渲染图例', () => {
    render(
      <ChartLegend
        data={mockLegendData}
        totalMemory={20 * 1024 * 1024 * 1024}
      />
    );

    expect(screen.getByText('内存组件')).toBeInTheDocument();
    expect(screen.getByText('模型权重')).toBeInTheDocument();
    expect(screen.getByText('激活值')).toBeInTheDocument();
    expect(screen.getByText('总计')).toBeInTheDocument();
  });

  test('应该显示数值', () => {
    render(
      <ChartLegend
        data={mockLegendData}
        totalMemory={20 * 1024 * 1024 * 1024}
        showValues={true}
      />
    );

    expect(screen.getByText('14.0 GB')).toBeInTheDocument();
    expect(screen.getByText('6.0 GB')).toBeInTheDocument();
    expect(screen.getByText('(70.0%)')).toBeInTheDocument();
    expect(screen.getByText('(30.0%)')).toBeInTheDocument();
  });

  test('应该隐藏数值', () => {
    render(
      <ChartLegend
        data={mockLegendData}
        totalMemory={20 * 1024 * 1024 * 1024}
        showValues={false}
      />
    );

    expect(screen.queryByText('14.0 GB')).not.toBeInTheDocument();
    expect(screen.queryByText('(70.0%)')).not.toBeInTheDocument();
  });

  test('应该支持水平布局', () => {
    const { container } = render(
      <ChartLegend
        data={mockLegendData}
        totalMemory={20 * 1024 * 1024 * 1024}
        orientation="horizontal"
      />
    );

    expect(container.firstChild).toHaveClass('horizontal');
  });

  test('应该显示正确的颜色', () => {
    render(
      <ChartLegend
        data={mockLegendData}
        totalMemory={20 * 1024 * 1024 * 1024}
      />
    );

    const colorDots = document.querySelectorAll('.color-dot');
    expect(colorDots[0]).toHaveStyle('background-color: #3b82f6');
    expect(colorDots[1]).toHaveStyle('background-color: #10b981');
  });
});

// 集成测试
describe('MemoryChart Integration Tests', () => {
  const mockOnChartTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该完整处理用户交互流程', async () => {
    const user = userEvent.setup();
    const mockResult: MemoryCalculationResult = {
      parameters: {
        parameterCount: 7,
        batchSize: 1,
        sequenceLength: 2048,
        hiddenSize: 4096,
        numLayers: 32,
        vocabularySize: 32000,
        precision: 'fp16'
      },
      inference: {
        modelWeights: 14 * 1024 * 1024 * 1024,
        activations: 2 * 1024 * 1024 * 1024,
        total: 16 * 1024 * 1024 * 1024
      },
      training: {
        modelWeights: 14 * 1024 * 1024 * 1024,
        activations: 4 * 1024 * 1024 * 1024,
        gradients: 14 * 1024 * 1024 * 1024,
        optimizerStates: 28 * 1024 * 1024 * 1024,
        total: 60 * 1024 * 1024 * 1024
      }
    };

    render(
      <MemoryChart
        result={mockResult}
        mode="inference"
        chartType="pie"
        onChartTypeChange={mockOnChartTypeChange}
        showLegend={true}
        showValues={true}
        animated={true}
      />
    );

    // 1. 检查初始状态
    expect(screen.getByText('内存分布图表')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText(/推理模式/)).toBeInTheDocument();

    // 2. 切换图表类型
    const barButton = screen.getByTitle('柱状图');
    await user.click(barButton);

    expect(mockOnChartTypeChange).toHaveBeenCalledWith('bar');

    // 3. 检查图例显示
    expect(screen.getByText('内存组件')).toBeInTheDocument();
    expect(screen.getAllByText('模型权重')).toHaveLength(2); // 图例和统计信息中都有
    expect(screen.getByText('激活值')).toBeInTheDocument();

    // 4. 检查统计信息
    expect(screen.getByText('最大组件')).toBeInTheDocument();
    expect(screen.getByText('组件数量')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 推理模式2个组件
  });
});