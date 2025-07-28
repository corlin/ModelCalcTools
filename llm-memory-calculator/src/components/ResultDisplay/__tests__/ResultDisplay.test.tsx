import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ResultDisplay, MemoryBreakdown, ModeToggle } from '../index';
import { MemoryCalculationResult, CalculationMode } from '../../../types';

// Mock formatters
jest.mock('../../../utils/formatters', () => ({
  formatMemorySize: (memoryGB: number) => `${memoryGB.toFixed(1)} GB`,
  formatNumber: (num: number) => num.toString(),
  formatPercentage: (value: number, total: number) => `${((value / total) * 100).toFixed(1)}%`
}));

describe('ResultDisplay Component', () => {
  const mockOnModeChange = jest.fn();

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
    onModeChange: mockOnModeChange
  };

  test('应该渲染空状态', () => {
    render(
      <ResultDisplay
        result={null}
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    expect(screen.getByText('等待计算结果')).toBeInTheDocument();
    expect(screen.getByText('请输入模型参数或选择预设模型来查看内存需求计算结果')).toBeInTheDocument();
  });

  test('应该渲染推理模式结果', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('内存需求计算结果')).toBeInTheDocument();
    expect(screen.getByText('总内存需求')).toBeInTheDocument();
    expect(screen.getAllByText('推理模式')).toHaveLength(2); // 按钮和模式显示
    expect(screen.getAllByText('模型权重')).toHaveLength(3); // 图例、列表和详细表格
    expect(screen.getAllByText('激活值')).toHaveLength(3); // 图例、列表和详细表格
  });

  test('应该渲染训练模式结果', () => {
    render(<ResultDisplay {...defaultProps} mode="training" />);

    expect(screen.getAllByText('训练模式')).toHaveLength(2); // 按钮和模式显示
    expect(screen.getAllByText('模型权重')).toHaveLength(3); // 图例、列表和详细表格
    expect(screen.getAllByText('激活值')).toHaveLength(3); // 图例、列表和详细表格
    expect(screen.getAllByText('梯度')).toHaveLength(3); // 图例、列表和详细表格
    expect(screen.getAllByText('优化器状态')).toHaveLength(3); // 图例、列表和详细表格
  });

  test('应该处理模式切换', async () => {
    const user = userEvent.setup();
    render(<ResultDisplay {...defaultProps} />);

    const trainingButton = screen.getByText('训练模式');
    await user.click(trainingButton);

    expect(mockOnModeChange).toHaveBeenCalledWith('training');
  });

  test('应该显示内存分解', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('内存分布')).toBeInTheDocument();
    
    // 检查是否有颜色指示器
    const colorIndicators = document.querySelectorAll('.color-indicator');
    expect(colorIndicators.length).toBeGreaterThan(0);
  });

  test('应该显示详细内存表格', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('详细内存分解')).toBeInTheDocument();
    expect(screen.getByText('内存类型')).toBeInTheDocument();
    expect(screen.getByText('大小')).toBeInTheDocument();
    expect(screen.getByText('占比')).toBeInTheDocument();
    expect(screen.getByText('说明')).toBeInTheDocument();
  });

  test('应该显示计算参数摘要', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('计算参数')).toBeInTheDocument();
    expect(screen.getByText('参数量')).toBeInTheDocument();
    expect(screen.getByText('批处理大小')).toBeInTheDocument();
    expect(screen.getByText('序列长度')).toBeInTheDocument();
    expect(screen.getByText('精度')).toBeInTheDocument();
    expect(screen.getByText('隐藏层维度')).toBeInTheDocument();
    expect(screen.getByText('层数')).toBeInTheDocument();
  });

  test('应该显示内存警告', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('内存分析和建议')).toBeInTheDocument();
  });

  test('应该支持隐藏警告', () => {
    render(<ResultDisplay {...defaultProps} showWarnings={false} />);

    expect(screen.queryByText('内存分析和建议')).not.toBeInTheDocument();
  });

  test('应该支持隐藏分解图', () => {
    render(<ResultDisplay {...defaultProps} showBreakdown={false} />);

    expect(screen.queryByText('内存分布')).not.toBeInTheDocument();
  });

  test('应该正确计算推理模式总内存', () => {
    render(<ResultDisplay {...defaultProps} mode="inference" />);

    // 推理模式：模型权重 + 激活值 = 14GB + 2GB = 16GB
    expect(screen.getAllByText('16.0 GB')).toHaveLength(2); // 总内存显示和分解总计
  });

  test('应该正确计算训练模式总内存', () => {
    render(<ResultDisplay {...defaultProps} mode="training" />);

    // 训练模式：模型权重 + 激活值 + 梯度 + 优化器状态 = 14GB + 4GB + 14GB + 28GB = 60GB
    expect(screen.getAllByText('60.0 GB')).toHaveLength(2); // 总内存显示和分解总计
  });

  test('应该显示模式描述', () => {
    render(<ResultDisplay {...defaultProps} mode="inference" />);

    expect(screen.getByText('推理模式：只计算模型权重和激活值内存')).toBeInTheDocument();
  });

  test('应该在训练模式显示正确描述', () => {
    render(<ResultDisplay {...defaultProps} mode="training" />);

    expect(screen.getByText('训练模式：包含权重、激活值、梯度和优化器状态内存')).toBeInTheDocument();
  });

  test('应该支持自定义className', () => {
    const { container } = render(
      <ResultDisplay {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('result-display', 'custom-class');
  });

  test('应该显示正确的内存类型描述', () => {
    render(<ResultDisplay {...defaultProps} />);

    expect(screen.getByText('存储模型参数的内存')).toBeInTheDocument();
    expect(screen.getByText('前向传播中间结果')).toBeInTheDocument();
  });

  test('应该在训练模式显示额外的内存类型描述', () => {
    render(<ResultDisplay {...defaultProps} mode="training" />);

    expect(screen.getByText('反向传播计算的参数梯度')).toBeInTheDocument();
    expect(screen.getByText('优化器（如Adam）维护的动量和方差信息')).toBeInTheDocument();
  });
});

// MemoryBreakdown 组件测试
describe('MemoryBreakdown Component', () => {
  const mockBreakdown = [
    {
      label: '模型权重',
      value: 14, // 14GB
      percentage: 70,
      color: '#3b82f6'
    },
    {
      label: '激活值',
      value: 6, // 6GB
      percentage: 30,
      color: '#10b981'
    }
  ];

  test('应该渲染内存分解', () => {
    render(
      <MemoryBreakdown
        breakdown={mockBreakdown}
        totalMemory={20}
      />
    );

    expect(screen.getByText('内存分布')).toBeInTheDocument();
    expect(screen.getAllByText('模型权重')).toHaveLength(2); // 图例和列表
    expect(screen.getAllByText('激活值')).toHaveLength(2); // 图例和列表
  });

  test('应该显示百分比', () => {
    render(
      <MemoryBreakdown
        breakdown={mockBreakdown}
        totalMemory={20}
        showPercentages={true}
      />
    );

    expect(screen.getByText('(70.0%)')).toBeInTheDocument();
    expect(screen.getByText('(30.0%)')).toBeInTheDocument();
  });

  test('应该隐藏百分比', () => {
    render(
      <MemoryBreakdown
        breakdown={mockBreakdown}
        totalMemory={20}
        showPercentages={false}
      />
    );

    expect(screen.queryByText('(70.0%)')).not.toBeInTheDocument();
    expect(screen.queryByText('(30.0%)')).not.toBeInTheDocument();
  });
});

// ModeToggle 组件测试
describe('ModeToggle Component', () => {
  const mockOnModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该渲染模式切换', () => {
    render(
      <ModeToggle
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    expect(screen.getByText('计算模式')).toBeInTheDocument();
    expect(screen.getByText('推理模式')).toBeInTheDocument();
    expect(screen.getByText('训练模式')).toBeInTheDocument();
  });

  test('应该显示活动状态', () => {
    render(
      <ModeToggle
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    const inferenceButton = screen.getByText('推理模式').closest('button');
    const trainingButton = screen.getByText('训练模式').closest('button');

    expect(inferenceButton).toHaveClass('active');
    expect(trainingButton).not.toHaveClass('active');
  });

  test('应该处理模式切换', async () => {
    const user = userEvent.setup();
    render(
      <ModeToggle
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    const trainingButton = screen.getByText('训练模式');
    await user.click(trainingButton);

    expect(mockOnModeChange).toHaveBeenCalledWith('training');
  });

  test('应该支持禁用状态', () => {
    render(
      <ModeToggle
        mode="inference"
        onModeChange={mockOnModeChange}
        disabled={true}
      />
    );

    const inferenceButton = screen.getByText('推理模式').closest('button');
    const trainingButton = screen.getByText('训练模式').closest('button');

    expect(inferenceButton).toBeDisabled();
    expect(trainingButton).toBeDisabled();
  });

  test('应该显示模式描述', () => {
    render(
      <ModeToggle
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    expect(screen.getByText('推理模式：只计算模型权重和激活值内存')).toBeInTheDocument();
  });
});

// 集成测试
describe('ResultDisplay Integration Tests', () => {
  const mockOnModeChange = jest.fn();

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

    render(
      <ResultDisplay
        result={mockResult}
        mode="inference"
        onModeChange={mockOnModeChange}
      />
    );

    // 1. 检查初始推理模式显示
    expect(screen.getAllByText('推理模式')).toHaveLength(2); // 按钮和模式显示
    expect(screen.getAllByText('16.0 GB')).toHaveLength(2); // 总内存和分解总计

    // 2. 切换到训练模式
    const trainingButton = screen.getByRole('button', { name: /训练模式/ });
    await user.click(trainingButton);

    expect(mockOnModeChange).toHaveBeenCalledWith('training');
  });
});