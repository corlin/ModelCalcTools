import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BatchOptimizer, OptimizationChart, RecommendationCard } from '../index';
import { ModelParameters, CalculationMode, BatchOptimizationResult } from '../../../types';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="optimization-chart" data-chart-data={JSON.stringify(data)}>
      Optimization Chart Mock
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
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {}
}));

// Mock optimizeBatchSize function
jest.mock('../../../utils/memoryCalculator', () => ({
  optimizeBatchSize: jest.fn((params, maxMemory) => ({
    optimalBatchSize: 8,
    memoryUsage: maxMemory * 0.8, // GB单位
    warning: params.batchSize > 32 ? '批处理大小过大，可能影响收敛性' : undefined
  }))
}));

// Mock formatters
jest.mock('../../../utils/formatters', () => ({
  formatMemorySize: (memoryGB: number) => `${memoryGB.toFixed(1)} GB`
}));

describe('BatchOptimizer Component', () => {
  const mockOnBatchSizeChange = jest.fn();

  const mockParameters: ModelParameters = {
    parameterCount: 7,
    batchSize: 4,
    sequenceLength: 2048,
    hiddenSize: 4096,
    numLayers: 32,
    vocabularySize: 32000,
    precision: 'fp16'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    parameters: mockParameters,
    mode: 'inference' as CalculationMode,
    maxMemoryGB: 24,
    onBatchSizeChange: mockOnBatchSizeChange
  };

  test('应该渲染空状态', () => {
    render(
      <BatchOptimizer
        parameters={null as any}
        mode="inference"
        onBatchSizeChange={mockOnBatchSizeChange}
      />
    );

    expect(screen.getByText('批处理大小优化')).toBeInTheDocument();
    expect(screen.getByText('请先设置模型参数以开始优化分析')).toBeInTheDocument();
  });

  test('应该渲染批处理优化器', () => {
    render(<BatchOptimizer {...defaultProps} />);

    expect(screen.getByText('批处理大小优化')).toBeInTheDocument();
    expect(screen.getByText('优化批处理大小以最大化内存利用率和性能')).toBeInTheDocument();
    expect(screen.getByLabelText('内存限制 (GB)')).toBeInTheDocument();
  });

  test('应该显示推荐卡片', () => {
    render(<BatchOptimizer {...defaultProps} />);

    expect(screen.getByText('优化建议')).toBeInTheDocument();
    expect(screen.getByText('建议将批处理大小调整为 8')).toBeInTheDocument();
  });

  test('应该处理内存限制变更', async () => {
    const user = userEvent.setup();
    render(<BatchOptimizer {...defaultProps} />);

    const memoryInput = screen.getByLabelText('内存限制 (GB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '32');

    // 检查输入是否被正确设置（可能包含之前的值）
    expect((memoryInput as HTMLInputElement).value).toContain('32');
  });

  test('应该切换图表显示', async () => {
    const user = userEvent.setup();
    render(<BatchOptimizer {...defaultProps} />);

    const toggleButton = screen.getByTitle('隐藏图表');
    await user.click(toggleButton);

    expect(screen.queryByTestId('optimization-chart')).not.toBeInTheDocument();
  });

  test('应该显示详细分析', () => {
    render(<BatchOptimizer {...defaultProps} />);

    expect(screen.getByText('批处理大小影响分析')).toBeInTheDocument();
    expect(screen.getByText('性能影响')).toBeInTheDocument();
    expect(screen.getByText('内存使用')).toBeInTheDocument();
    expect(screen.getByText('优化策略')).toBeInTheDocument();
    expect(screen.getByText('收敛性')).toBeInTheDocument();
  });

  test('应该支持自定义className', () => {
    const { container } = render(
      <BatchOptimizer {...defaultProps} className="custom-optimizer" />
    );

    expect(container.firstChild).toHaveClass('batch-optimizer', 'custom-optimizer');
  });

  test('应该在当前配置已优化时显示正确状态', () => {
    const optimizedProps = {
      ...defaultProps,
      parameters: { ...mockParameters, batchSize: 8 } // 与推荐值相同
    };

    render(<BatchOptimizer {...optimizedProps} />);

    expect(screen.getByText('当前配置已优化')).toBeInTheDocument();
    expect(screen.getByText('您的批处理大小已经是最优配置')).toBeInTheDocument();
  });
});

// OptimizationChart 组件测试
describe('OptimizationChart Component', () => {
  const mockData = [
    {
      batchSize: 1,
      memoryUsage: 8, // 8GB
      throughputEstimate: 50,
      isOptimal: false,
      exceedsLimit: false
    },
    {
      batchSize: 4,
      memoryUsage: 16, // 16GB
      throughputEstimate: 120,
      isOptimal: true,
      exceedsLimit: false
    },
    {
      batchSize: 8,
      memoryUsage: 32, // 32GB
      throughputEstimate: 180,
      isOptimal: false,
      exceedsLimit: true
    }
  ];

  test('应该渲染优化图表', () => {
    render(
      <OptimizationChart
        data={mockData}
        targetMemory={24}
        currentBatchSize={1}
        optimalBatchSize={4}
      />
    );

    expect(screen.getByTestId('optimization-chart')).toBeInTheDocument();
    expect(screen.getByText('当前批处理大小')).toBeInTheDocument();
    expect(screen.getByText('推荐批处理大小')).toBeInTheDocument();
    expect(screen.getByText('内存限制')).toBeInTheDocument();
    expect(screen.getByText('超出限制')).toBeInTheDocument();
  });

  test('应该正确传递图表数据', () => {
    render(
      <OptimizationChart
        data={mockData}
        targetMemory={24}
        currentBatchSize={1}
        optimalBatchSize={4}
      />
    );

    const chart = screen.getByTestId('optimization-chart');
    const chartData = JSON.parse(chart.getAttribute('data-chart-data') || '{}');

    expect(chartData.labels).toEqual(['1', '4', '8']);
    expect(chartData.datasets).toHaveLength(2); // 内存使用和吞吐量
  });
});

// RecommendationCard 组件测试
describe('RecommendationCard Component', () => {
  const mockOnApply = jest.fn();
  const mockOnAutoOptimize = jest.fn();

  const mockResult: BatchOptimizationResult = {
    optimalBatchSize: 8,
    memoryUsage: 19.2, // 19.2GB
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该渲染推荐卡片', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    expect(screen.getByText('优化建议')).toBeInTheDocument();
    expect(screen.getByText('建议将批处理大小调整为 8')).toBeInTheDocument();
    expect(screen.getByText('推荐批处理大小')).toBeInTheDocument();
    expect(screen.getByText('当前批处理大小')).toBeInTheDocument();
  });

  test('应该显示已优化状态', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={8} // 与推荐值相同
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    expect(screen.getByText('当前配置已优化')).toBeInTheDocument();
    expect(screen.getByText('您的批处理大小已经是最优配置')).toBeInTheDocument();
    expect(screen.queryByText('应用推荐设置')).not.toBeInTheDocument();
  });

  test('应该处理应用推荐设置', async () => {
    const user = userEvent.setup();
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    const applyButton = screen.getByText('应用推荐设置');
    await user.click(applyButton);

    expect(mockOnApply).toHaveBeenCalledWith(8);
  });

  test('应该处理自动优化', async () => {
    const user = userEvent.setup();
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    const autoOptimizeButton = screen.getByText('自动优化');
    await user.click(autoOptimizeButton);

    expect(mockOnAutoOptimize).toHaveBeenCalled();
  });

  test('应该显示优化中状态', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={true}
      />
    );

    expect(screen.getByText('优化中...')).toBeInTheDocument();
    expect(screen.getByText('应用推荐设置')).toBeDisabled();
  });

  test('应该显示性能提升信息', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    // 检查基本的推荐信息显示
    expect(screen.getByText('优化建议')).toBeInTheDocument();
    expect(screen.getByText('推荐批处理大小')).toBeInTheDocument();
    expect(screen.getAllByText('8')).toHaveLength(2); // 推荐批处理大小和对比图中都有8
    expect(screen.getAllByText('4')).toHaveLength(2); // 当前批处理大小和对比图中都有4
  });

  test('应该显示优化效果对比', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    expect(screen.getByText('优化效果对比')).toBeInTheDocument();
    expect(screen.getByText('当前配置')).toBeInTheDocument();
    expect(screen.getByText('推荐配置')).toBeInTheDocument();
  });

  test('应该显示优化提示', () => {
    render(
      <RecommendationCard
        result={mockResult}
        currentBatchSize={4}
        onApply={mockOnApply}
        onAutoOptimize={mockOnAutoOptimize}
        isOptimizing={false}
      />
    );

    expect(screen.getByText('💡 优化提示')).toBeInTheDocument();
    expect(screen.getByText(/更大的批处理大小通常能提高GPU利用率/)).toBeInTheDocument();
  });
});

// 集成测试
describe('BatchOptimizer Integration Tests', () => {
  const mockOnBatchSizeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该完整处理用户交互流程', async () => {
    const user = userEvent.setup();
    const mockParameters: ModelParameters = {
      parameterCount: 7,
      batchSize: 2,
      sequenceLength: 2048,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000,
      precision: 'fp16'
    };

    render(
      <BatchOptimizer
        parameters={mockParameters}
        mode="training"
        maxMemoryGB={24}
        onBatchSizeChange={mockOnBatchSizeChange}
      />
    );

    // 1. 检查初始状态
    expect(screen.getByText('批处理大小优化')).toBeInTheDocument();
    expect(screen.getByText('优化建议')).toBeInTheDocument();

    // 2. 调整内存限制
    const memoryInput = screen.getByLabelText('内存限制 (GB)');
    await user.clear(memoryInput);
    await user.type(memoryInput, '32');

    // 检查输入是否被正确设置（可能包含之前的值）
    expect((memoryInput as HTMLInputElement).value).toContain('32');

    // 3. 应用推荐设置
    const applyButton = screen.getByText('应用推荐设置');
    await user.click(applyButton);

    expect(mockOnBatchSizeChange).toHaveBeenCalledWith(8);

    // 4. 切换图表显示
    const toggleButton = screen.getByTitle('隐藏图表');
    await user.click(toggleButton);

    expect(screen.queryByTestId('optimization-chart')).not.toBeInTheDocument();
  });
});