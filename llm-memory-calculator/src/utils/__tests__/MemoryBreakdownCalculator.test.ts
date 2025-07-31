import { MemoryBreakdownCalculator } from '../MemoryBreakdownCalculator';
import { MemoryCalculationResult, MemoryBreakdownItem } from '../../types';
import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('MemoryBreakdownCalculator', () => {
  // 创建测试用的内存计算结果
  const createTestResult = (): MemoryCalculationResult => ({
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000
    },
    inference: {
      modelWeights: 14.0,
      activations: 2.0,
      total: 16.0
    },
    training: {
      modelWeights: 14.0,
      activations: 4.0,
      gradients: 14.0,
      optimizerStates: 28.0,
      total: 60.0
    }
  });

  describe('calculateBreakdown', () => {
    it('should calculate breakdown for inference mode correctly', () => {
      const result = createTestResult();
      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'inference');

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].label).toBe('模型权重');
      expect(breakdown[1].label).toBe('激活值');

      // 验证字节数转换
      expect(breakdown[0].valueBytes).toBe(MemoryUnitConverter.gbToBytes(14.0));
      expect(breakdown[1].valueBytes).toBe(MemoryUnitConverter.gbToBytes(2.0));

      // 验证百分比总和为100%
      const totalPercentage = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // 验证百分比计算正确
      expect(breakdown[0].percentage).toBeCloseTo(87.5, 1); // 14/16 * 100
      expect(breakdown[1].percentage).toBeCloseTo(12.5, 1); // 2/16 * 100
    });

    it('should calculate breakdown for training mode correctly', () => {
      const result = createTestResult();
      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'training');

      expect(breakdown).toHaveLength(4);
      expect(breakdown[0].label).toBe('模型权重');
      expect(breakdown[1].label).toBe('激活值');
      expect(breakdown[2].label).toBe('梯度');
      expect(breakdown[3].label).toBe('优化器状态');

      // 验证字节数转换
      expect(breakdown[0].valueBytes).toBe(MemoryUnitConverter.gbToBytes(14.0));
      expect(breakdown[1].valueBytes).toBe(MemoryUnitConverter.gbToBytes(4.0));
      expect(breakdown[2].valueBytes).toBe(MemoryUnitConverter.gbToBytes(14.0));
      expect(breakdown[3].valueBytes).toBe(MemoryUnitConverter.gbToBytes(28.0));

      // 验证百分比总和为100%
      const totalPercentage = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // 验证百分比计算正确
      expect(breakdown[0].percentage).toBeCloseTo(23.33, 1); // 14/60 * 100
      expect(breakdown[1].percentage).toBeCloseTo(6.67, 1);  // 4/60 * 100
      expect(breakdown[2].percentage).toBeCloseTo(23.33, 1); // 14/60 * 100
      expect(breakdown[3].percentage).toBeCloseTo(46.67, 1); // 28/60 * 100
    });

    it('should handle zero total memory gracefully', () => {
      const result = createTestResult();
      result.inference.total = 0;
      result.inference.modelWeights = 0;
      result.inference.activations = 0;

      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'inference');
      expect(breakdown).toHaveLength(0);
    });

    it('should include correct descriptions for each item', () => {
      const result = createTestResult();
      const inferenceBreakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'inference');
      const trainingBreakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'training');

      expect(inferenceBreakdown[0].description).toBe('存储模型参数的内存');
      expect(inferenceBreakdown[1].description).toBe('前向传播中间结果');

      expect(trainingBreakdown[1].description).toBe('前向传播中间结果（需保存用于反向传播）');
      expect(trainingBreakdown[2].description).toBe('反向传播计算的参数梯度');
      expect(trainingBreakdown[3].description).toBe('优化器（如Adam）维护的动量和方差信息');
    });

    it('should assign correct colors to each item', () => {
      const result = createTestResult();
      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(result, 'training');

      expect(breakdown[0].color).toBe('#3b82f6'); // 蓝色 - 模型权重
      expect(breakdown[1].color).toBe('#10b981'); // 绿色 - 激活值
      expect(breakdown[2].color).toBe('#f59e0b'); // 橙色 - 梯度
      expect(breakdown[3].color).toBe('#ef4444'); // 红色 - 优化器状态
    });
  });

  describe('normalizePercentages', () => {
    it('should normalize percentages to sum to 100%', () => {
      // 创建百分比总和不为100%的测试数据
      const items: MemoryBreakdownItem[] = [
        {
          label: 'Item 1',
          valueBytes: 1000,
          percentage: 30,
          color: '#000000',
          description: 'Test item 1'
        },
        {
          label: 'Item 2',
          valueBytes: 2000,
          percentage: 60,
          color: '#000000',
          description: 'Test item 2'
        },
        {
          label: 'Item 3',
          valueBytes: 1500,
          percentage: 45, // 总和为135%
          color: '#000000',
          description: 'Test item 3'
        }
      ];

      // 使用反射访问私有方法进行测试
      const normalizedItems = (MemoryBreakdownCalculator as any).normalizePercentages(items);
      const totalPercentage = normalizedItems.reduce((sum: number, item: MemoryBreakdownItem) => sum + item.percentage, 0);

      expect(totalPercentage).toBeCloseTo(100, 2);
      expect(normalizedItems[0].percentage).toBeCloseTo(22.22, 1); // 30/135 * 100
      expect(normalizedItems[1].percentage).toBeCloseTo(44.44, 1); // 60/135 * 100
      expect(normalizedItems[2].percentage).toBeCloseTo(33.33, 1); // 45/135 * 100
    });

    it('should handle empty array', () => {
      const items: MemoryBreakdownItem[] = [];
      const normalizedItems = (MemoryBreakdownCalculator as any).normalizePercentages(items);
      expect(normalizedItems).toHaveLength(0);
    });

    it('should handle zero percentages', () => {
      const items: MemoryBreakdownItem[] = [
        {
          label: 'Item 1',
          valueBytes: 0,
          percentage: 0,
          color: '#000000',
          description: 'Test item 1'
        }
      ];

      const normalizedItems = (MemoryBreakdownCalculator as any).normalizePercentages(items);
      expect(normalizedItems[0].percentage).toBe(0);
    });
  });

  describe('validateBreakdown', () => {
    it('should validate correct breakdown data', () => {
      const items: MemoryBreakdownItem[] = [
        {
          label: 'Item 1',
          valueBytes: 1000,
          percentage: 50,
          color: '#000000',
          description: 'Test item 1'
        },
        {
          label: 'Item 2',
          valueBytes: 1000,
          percentage: 50,
          color: '#000000',
          description: 'Test item 2'
        }
      ];

      const validation = MemoryBreakdownCalculator.validateBreakdown(items, 2000);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid percentage sum', () => {
      const items: MemoryBreakdownItem[] = [
        {
          label: 'Item 1',
          valueBytes: 1000,
          percentage: 60,
          color: '#000000',
          description: 'Test item 1'
        },
        {
          label: 'Item 2',
          valueBytes: 1000,
          percentage: 60, // 总和为120%
          color: '#000000',
          description: 'Test item 2'
        }
      ];

      const validation = MemoryBreakdownCalculator.validateBreakdown(items, 2000);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('百分比总和');
    });

    it('should detect negative values', () => {
      const items: MemoryBreakdownItem[] = [
        {
          label: 'Item 1',
          valueBytes: -1000,
          percentage: 50,
          color: '#000000',
          description: 'Test item 1'
        }
      ];

      const validation = MemoryBreakdownCalculator.validateBreakdown(items, 1000);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('字节数为负数');
    });

    it('should detect empty labels', () => {
      const items: MemoryBreakdownItem[] = [
        {
          label: '',
          valueBytes: 1000,
          percentage: 100,
          color: '#000000',
          description: 'Test item 1'
        }
      ];

      const validation = MemoryBreakdownCalculator.validateBreakdown(items, 1000);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('缺少标签');
    });

    it('should handle empty breakdown array', () => {
      const validation = MemoryBreakdownCalculator.validateBreakdown([], 1000);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toBe('内存分解项为空');
    });
  });

  describe('calculateGPUMemoryBreakdown', () => {
    it('should calculate GPU memory breakdown correctly', () => {
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24); // 24GB GPU
      const usedMemoryBytes = MemoryUnitConverter.gbToBytes(16); // 16GB used
      const systemOverheadBytes = MemoryUnitConverter.gbToBytes(2); // 2GB system
      const fragmentationBytes = MemoryUnitConverter.gbToBytes(1); // 1GB fragmentation
      const safetyBufferBytes = MemoryUnitConverter.gbToBytes(1); // 1GB safety

      const breakdown = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(
        gpuMemoryBytes,
        usedMemoryBytes,
        systemOverheadBytes,
        fragmentationBytes,
        safetyBufferBytes
      );

      expect(breakdown).toHaveLength(5);
      
      // 验证标签
      const labels = breakdown.map(item => item.label);
      expect(labels).toContain('基础需求');
      expect(labels).toContain('碎片化损失');
      expect(labels).toContain('系统开销');
      expect(labels).toContain('安全缓冲');
      expect(labels).toContain('可用内存');

      // 验证基础需求计算 (16 - 2 - 1 - 1 = 12GB)
      const baseItem = breakdown.find(item => item.label === '基础需求');
      expect(baseItem?.valueBytes).toBe(MemoryUnitConverter.gbToBytes(12));
      expect(baseItem?.percentage).toBeCloseTo(50, 1); // 12/24 * 100

      // 验证可用内存计算 (24 - 16 = 8GB)
      const availableItem = breakdown.find(item => item.label === '可用内存');
      expect(availableItem?.valueBytes).toBe(MemoryUnitConverter.gbToBytes(8));
      expect(availableItem?.percentage).toBeCloseTo(33.33, 1); // 8/24 * 100
    });

    it('should handle zero GPU memory gracefully', () => {
      const breakdown = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(0, 0);
      expect(breakdown).toHaveLength(0);
    });

    it('should filter out zero-value items except available memory', () => {
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(24);
      const usedMemoryBytes = MemoryUnitConverter.gbToBytes(16);
      
      const breakdown = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(
        gpuMemoryBytes,
        usedMemoryBytes,
        0, // no system overhead
        0, // no fragmentation
        0  // no safety buffer
      );

      // 应该只包含基础需求和可用内存
      expect(breakdown.length).toBeLessThanOrEqual(5);
      const labels = breakdown.map(item => item.label);
      expect(labels).toContain('基础需求');
      expect(labels).toContain('可用内存');
    });
  });

  describe('getDefaultColors', () => {
    it('should return an array of color strings', () => {
      const colors = MemoryBreakdownCalculator.getDefaultColors();
      expect(colors).toBeInstanceOf(Array);
      expect(colors.length).toBeGreaterThan(0);
      
      colors.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/); // 验证十六进制颜色格式
      });
    });

    it('should have enough colors for typical breakdown items', () => {
      const colors = MemoryBreakdownCalculator.getDefaultColors();
      expect(colors.length).toBeGreaterThanOrEqual(4); // 至少支持训练模式的4个项目
    });
  });

  describe('formatBreakdownItem', () => {
    const testItem: MemoryBreakdownItem = {
      label: '模型权重',
      valueBytes: MemoryUnitConverter.gbToBytes(14),
      percentage: 87.5,
      color: '#3b82f6',
      description: '存储模型参数的内存'
    };

    it('should format item with both bytes and percentage', () => {
      const formatted = MemoryBreakdownCalculator.formatBreakdownItem(testItem, true, true);
      expect(formatted).toContain('模型权重');
      expect(formatted).toContain('14.00 GB');
      expect(formatted).toContain('(87.5%)');
    });

    it('should format item with only bytes', () => {
      const formatted = MemoryBreakdownCalculator.formatBreakdownItem(testItem, true, false);
      expect(formatted).toContain('模型权重');
      expect(formatted).toContain('14.00 GB');
      expect(formatted).not.toContain('(87.5%)');
    });

    it('should format item with only percentage', () => {
      const formatted = MemoryBreakdownCalculator.formatBreakdownItem(testItem, false, true);
      expect(formatted).toContain('模型权重');
      expect(formatted).not.toContain('14.00 GB');
      expect(formatted).toContain('(87.5%)');
    });

    it('should format item with only label', () => {
      const formatted = MemoryBreakdownCalculator.formatBreakdownItem(testItem, false, false);
      expect(formatted).toBe('模型权重');
    });
  });
});