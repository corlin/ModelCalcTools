import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PresetSelector } from '../index';
import { MODEL_PRESETS } from '../../../utils/modelPresets';

// Mock debounce to make tests synchronous
jest.mock('../../../utils/errorHandler', () => ({
  ...jest.requireActual('../../../utils/errorHandler'),
  debounce: (fn: Function) => fn
}));

describe('PresetSelector Component', () => {
  const mockOnPresetSelect = jest.fn();
  const mockOnCustomMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onPresetSelect: mockOnPresetSelect,
    onCustomMode: mockOnCustomMode
  };

  test('应该渲染预设选择器', () => {
    render(<PresetSelector {...defaultProps} />);

    expect(screen.getByText('选择预设模型')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('搜索模型...')).toBeInTheDocument();
    expect(screen.getByText('⚙️ 自定义')).toBeInTheDocument();
  });

  test('应该显示所有类别标签', () => {
    render(<PresetSelector {...defaultProps} />);

    expect(screen.getByText('全部')).toBeInTheDocument();
    expect(screen.getAllByText('GPT系列')).toHaveLength(2); // 标签页和分类标题
    expect(screen.getAllByText('LLaMA系列')).toHaveLength(2); // 标签页和分类标题
    expect(screen.getAllByText('BERT系列')).toHaveLength(2); // 标签页和分类标题
    expect(screen.getAllByText('其他模型')).toHaveLength(2); // 标签页和分类标题
  });

  test('应该显示模型卡片', () => {
    render(<PresetSelector {...defaultProps} />);

    // 检查是否显示了一些预设模型
    expect(screen.getAllByText('LLaMA 7B')).toHaveLength(2); // 卡片和快速选择
    expect(screen.getAllByText('GPT-3.5 Turbo')).toHaveLength(2); // 卡片和快速选择
  });

  test('应该处理模型选择', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const llamaCards = screen.getAllByText('LLaMA 7B');
    const llamaCard = llamaCards[0].closest('.model-card');
    expect(llamaCard).toBeInTheDocument();

    await user.click(llamaCard!);

    expect(mockOnPresetSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'llama-7b',
        name: 'LLaMA 7B'
      })
    );
  });

  test('应该处理自定义模式', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const customButton = screen.getByText('⚙️ 自定义');
    await user.click(customButton);

    expect(mockOnCustomMode).toHaveBeenCalled();
  });

  test('应该支持搜索功能', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('搜索模型...');
    await user.type(searchInput, 'GPT');

    await waitFor(() => {
      expect(screen.getByText('GPT-3.5 Turbo')).toBeInTheDocument();
      expect(screen.queryByText('LLaMA 7B')).not.toBeInTheDocument();
    });
  });

  test('应该支持类别过滤', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const llamaTabs = screen.getAllByText('LLaMA系列');
    const llamaTab = llamaTabs[0]; // 使用第一个（标签页）
    await user.click(llamaTab);

    await waitFor(() => {
      expect(screen.getAllByText('LLaMA 7B').length).toBeGreaterThan(0); // 至少有一个LLaMA 7B
      expect(screen.queryByText('GPT-3.5 Turbo')).not.toBeInTheDocument();
    });
  });

  test('应该切换详情显示', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const toggleButton = screen.getByTitle('显示详情');
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getAllByText('批处理大小').length).toBeGreaterThan(0);
      expect(screen.getAllByText('隐藏层维度').length).toBeGreaterThan(0);
    });
  });

  test('应该显示选中状态', () => {
    render(<PresetSelector {...defaultProps} selectedPreset="llama-7b" />);

    const llamaCards = screen.getAllByText('LLaMA 7B');
    const llamaCard = llamaCards[0].closest('.model-card');
    expect(llamaCard).toHaveClass('selected');
  });

  test('应该显示热门模型标识', () => {
    render(<PresetSelector {...defaultProps} />);

    // 查找热门模型标识
    const popularBadges = screen.getAllByText('🔥');
    expect(popularBadges.length).toBeGreaterThan(0);
  });

  test('应该显示模型统计信息', () => {
    render(<PresetSelector {...defaultProps} />);

    expect(screen.getByText(/找到 \d+ 个模型/)).toBeInTheDocument();
  });

  test('应该处理空搜索结果', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('搜索模型...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('没有找到匹配的模型')).toBeInTheDocument();
      expect(screen.getByText('清除搜索')).toBeInTheDocument();
    });
  });

  test('应该清除搜索', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('搜索模型...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText('清除搜索')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('清除搜索');
    await user.click(clearButton);

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
      expect(screen.queryByText('没有找到匹配的模型')).not.toBeInTheDocument();
    });
  });

  test('应该支持键盘导航', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const llamaCards = screen.getAllByText('LLaMA 7B');
    const llamaCard = llamaCards[0].closest('.model-card');
    expect(llamaCard).toBeInTheDocument();

    (llamaCard as HTMLElement).focus();
    await user.keyboard('{Enter}');

    expect(mockOnPresetSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'llama-7b'
      })
    );
  });

  test('应该显示热门模型快速选择', () => {
    render(<PresetSelector {...defaultProps} />);

    expect(screen.getByText('热门模型')).toBeInTheDocument();
    
    // 检查热门模型芯片
    const popularModels = MODEL_PRESETS.filter(model => model.popular);
    popularModels.forEach(model => {
      expect(screen.getAllByText(model.name).length).toBeGreaterThan(0);
    });
  });

  test('应该在仅显示热门模型模式下工作', () => {
    render(<PresetSelector {...defaultProps} showPopularOnly={true} />);

    // 应该只显示热门模型
    const popularModels = MODEL_PRESETS.filter(model => model.popular);
    const allModels = MODEL_PRESETS;

    expect(popularModels.length).toBeLessThan(allModels.length);
    
    // 检查是否只显示热门模型
    popularModels.forEach(model => {
      expect(screen.getByText(model.name)).toBeInTheDocument();
    });
  });

  test('应该显示类别描述', async () => {
    const user = userEvent.setup();
    render(<PresetSelector {...defaultProps} />);

    const gptTabs = screen.getAllByText('GPT系列');
    const gptTab = gptTabs[0]; // 使用第一个（标签页）
    await user.click(gptTab);

    await waitFor(() => {
      expect(screen.getByText(/GPT系列模型，擅长文本生成和对话任务/)).toBeInTheDocument();
    });
  });

  test('应该正确格式化参数数量', () => {
    render(<PresetSelector {...defaultProps} />);

    // 检查不同规模的参数格式化
    expect(screen.getAllByText('7B').length).toBeGreaterThan(0); // 7B参数
    expect(screen.getAllByText('175B').length).toBeGreaterThan(0); // 175B参数
  });
});

// 集成测试
describe('PresetSelector Integration Tests', () => {
  const mockOnPresetSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该完整处理用户交互流程', async () => {
    const user = userEvent.setup();
    render(
      <PresetSelector 
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 1. 搜索模型
    const searchInput = screen.getByPlaceholderText('搜索模型...');
    await user.type(searchInput, 'LLaMA');

    await waitFor(() => {
      expect(screen.getAllByText('LLaMA 7B').length).toBeGreaterThan(0);
    });

    // 2. 选择模型
    const llamaCards = screen.getAllByText('LLaMA 7B');
    const llamaCard = llamaCards[0].closest('.model-card');
    await user.click(llamaCard!);

    expect(mockOnPresetSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'llama-7b',
        name: 'LLaMA 7B'
      })
    );

    // 3. 清除搜索
    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getAllByText('GPT-3.5 Turbo').length).toBeGreaterThan(0);
    });
  });

  test('应该处理复杂的过滤场景', async () => {
    const user = userEvent.setup();
    render(
      <PresetSelector 
        onPresetSelect={mockOnPresetSelect}
      />
    );

    // 1. 选择类别
    const llamaTabs = screen.getAllByText('LLaMA系列');
    const llamaTab = llamaTabs[0]; // 使用第一个（标签页）
    await user.click(llamaTab);

    // 2. 在类别内搜索
    const searchInput = screen.getByPlaceholderText('搜索模型...');
    await user.type(searchInput, '7B');

    await waitFor(() => {
      expect(screen.getByText('LLaMA 7B')).toBeInTheDocument();
      expect(screen.queryByText('LLaMA 13B')).not.toBeInTheDocument();
    });

    // 3. 切换到全部类别
    const allTab = screen.getByText('全部');
    await user.click(allTab);

    await waitFor(() => {
      // 应该显示所有包含7B的模型
      expect(screen.getByText('LLaMA 7B')).toBeInTheDocument();
    });
  });
});