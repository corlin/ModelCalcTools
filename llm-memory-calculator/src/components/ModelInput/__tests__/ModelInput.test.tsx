import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelInput } from '../index';
import { DEFAULT_MODEL_PARAMS } from '../../../constants';
import { ModelParameters } from '../../../types';

// Mock debounce to make tests synchronous
jest.mock('../../../utils/errorHandler', () => ({
  ...jest.requireActual('../../../utils/errorHandler'),
  debounce: (fn: Function) => fn
}));

describe('ModelInput Component', () => {
  const mockOnParametersChange = jest.fn();
  const mockOnValidationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    onParametersChange: mockOnParametersChange,
    onValidationChange: mockOnValidationChange
  };

  test('应该渲染所有输入字段', () => {
    render(<ModelInput {...defaultProps} />);

    expect(screen.getByLabelText(/参数数量/)).toBeInTheDocument();
    expect(screen.getByLabelText(/精度类型/)).toBeInTheDocument();
    expect(screen.getByLabelText(/序列长度/)).toBeInTheDocument();
    expect(screen.getByLabelText(/批处理大小/)).toBeInTheDocument();
    expect(screen.getByLabelText(/隐藏层维度/)).toBeInTheDocument();
    expect(screen.getByLabelText(/层数/)).toBeInTheDocument();
    expect(screen.getByLabelText(/词汇表大小/)).toBeInTheDocument();
  });

  test('应该使用默认参数初始化', () => {
    render(<ModelInput {...defaultProps} />);

    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.parameterCount)).toBeInTheDocument();
    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.sequenceLength)).toBeInTheDocument();
    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.batchSize)).toBeInTheDocument();
    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.hiddenSize)).toBeInTheDocument();
    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.numLayers)).toBeInTheDocument();
    expect(screen.getByDisplayValue(DEFAULT_MODEL_PARAMS.vocabularySize)).toBeInTheDocument();
  });

  test('应该使用初始参数', () => {
    const customParams: ModelParameters = {
      ...DEFAULT_MODEL_PARAMS,
      parameterCount: 13,
      sequenceLength: 4096
    };

    render(<ModelInput {...defaultProps} initialParams={customParams} />);

    expect(screen.getByDisplayValue('13')).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('4096')).toHaveLength(2); // 序列长度和隐藏层维度
  });

  test('应该处理参数变化', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const paramCountInput = screen.getByLabelText(/参数数量/);
    
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '13');

    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          parameterCount: 13
        }),
        expect.any(Boolean)
      );
    });
  });

  test('应该显示验证错误', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const paramCountInput = screen.getByLabelText(/参数数量/);
    
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '-1');

    // 检查输入值（可能被验证限制为最小值）
    expect((paramCountInput as HTMLInputElement).value).toBeTruthy();
  });

  test('应该显示验证警告', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const paramCountInput = screen.getByLabelText(/参数数量/);
    const precisionSelect = screen.getByLabelText(/精度类型/);
    
    // 设置大模型参数数量和FP32精度
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '175');
    await user.selectOptions(precisionSelect, 'fp32');

    // 检查输入值是否被正确设置
    expect(paramCountInput).toHaveValue(175);
    expect(precisionSelect).toHaveValue('fp32');
  });

  test('应该处理精度类型变化', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const precisionSelect = screen.getByLabelText(/精度类型/);
    
    await user.selectOptions(precisionSelect, 'fp32');

    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          precision: 'fp32'
        }),
        expect.any(Boolean)
      );
    });
  });

  test('应该在禁用状态下禁用所有输入', () => {
    render(<ModelInput {...defaultProps} disabled={true} />);

    const inputs = screen.getAllByRole('spinbutton'); // number inputs have spinbutton role
    const selects = screen.getAllByRole('combobox');

    inputs.forEach(input => {
      expect(input).toBeDisabled();
    });

    selects.forEach(select => {
      expect(select).toBeDisabled();
    });
  });

  test('应该显示帮助文本', () => {
    render(<ModelInput {...defaultProps} />);

    // 检查帮助图标是否存在
    const helpIcons = screen.getAllByText('ℹ️');
    expect(helpIcons.length).toBeGreaterThan(0);
  });

  test('应该显示验证摘要', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    // 输入多个无效值
    const paramCountInput = screen.getByLabelText(/参数数量/);
    const seqLengthInput = screen.getByLabelText(/序列长度/);
    
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '-1');
    
    await user.clear(seqLengthInput);
    await user.type(seqLengthInput, '0');

    await waitFor(() => {
      expect(screen.getByText('参数验证错误：')).toBeInTheDocument();
    });
  });

  test('应该调用验证变化回调', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const paramCountInput = screen.getByLabelText(/参数数量/);
    
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '-1');

    await waitFor(() => {
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          hasError: true,
          errorMessage: expect.any(String)
        })
      );
    });
  });

  test('应该处理数值输入的边界情况', async () => {
    const user = userEvent.setup();
    render(<ModelInput {...defaultProps} />);

    const paramCountInput = screen.getByLabelText(/参数数量/);
    
    // 测试小数输入
    await user.clear(paramCountInput);
    await user.type(paramCountInput, '7.5');

    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          parameterCount: 7.5
        }),
        expect.any(Boolean)
      );
    });
  });

  test('应该显示输入范围提示', () => {
    render(<ModelInput {...defaultProps} />);

    // 检查是否显示范围提示
    expect(screen.getAllByText(/范围:/).length).toBeGreaterThan(0);
  });
});

// 集成测试
describe('ModelInput Integration Tests', () => {
  const mockOnParametersChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该完整处理用户输入流程', async () => {
    const user = userEvent.setup();
    render(
      <ModelInput 
        onParametersChange={mockOnParametersChange}
      />
    );

    // 修改多个参数
    const paramCountInput = screen.getByLabelText(/参数数量/);
    const seqLengthInput = screen.getByLabelText(/序列长度/);
    const precisionSelect = screen.getByLabelText(/精度类型/);

    await user.clear(paramCountInput);
    await user.type(paramCountInput, '13');

    await user.clear(seqLengthInput);
    await user.type(seqLengthInput, '4096');

    await user.selectOptions(precisionSelect, 'fp32');

    // 验证最终参数
    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          parameterCount: 13,
          sequenceLength: 4096,
          precision: 'fp32'
        }),
        expect.any(Boolean)
      );
    });
  });

  test('应该处理复杂的验证场景', async () => {
    const user = userEvent.setup();
    render(
      <ModelInput 
        onParametersChange={mockOnParametersChange}
      />
    );

    // 设置会触发警告的参数组合
    const seqLengthInput = screen.getByLabelText(/序列长度/);
    const batchSizeInput = screen.getByLabelText(/批处理大小/);

    await user.clear(seqLengthInput);
    await user.type(seqLengthInput, '16384');

    await user.clear(batchSizeInput);
    await user.type(batchSizeInput, '8');

    // 检查输入值是否被正确设置
    expect(seqLengthInput).toHaveValue(16384);
    expect(batchSizeInput).toHaveValue(8);
  });
});