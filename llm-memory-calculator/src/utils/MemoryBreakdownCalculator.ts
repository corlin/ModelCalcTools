import { MemoryBreakdownItem, MemoryCalculationResult, CalculationMode } from '../types';
import { MemoryUnitConverter } from './MemoryUnitConverter';

/**
 * 内存分解显示计算器
 * 负责计算和标准化内存使用分解，确保百分比总和为100%
 */
export class MemoryBreakdownCalculator {
  /**
   * 计算内存使用分解
   * @param result 内存计算结果
   * @param mode 计算模式（推理或训练）
   * @returns 内存分解项数组
   */
  static calculateBreakdown(
    result: MemoryCalculationResult,
    mode: CalculationMode
  ): MemoryBreakdownItem[] {
    const modeData = mode === 'inference' ? result.inference : result.training;
    const totalBytes = MemoryUnitConverter.gbToBytes(modeData.total);
    
    if (totalBytes <= 0) {
      console.warn('Total memory is zero or negative, returning empty breakdown');
      return [];
    }

    const items: MemoryBreakdownItem[] = [
      {
        label: '模型权重',
        valueBytes: MemoryUnitConverter.gbToBytes(modeData.modelWeights),
        percentage: 0, // 将在后面计算
        color: '#3b82f6',
        description: '存储模型参数的内存'
      },
      {
        label: '激活值',
        valueBytes: MemoryUnitConverter.gbToBytes(modeData.activations),
        percentage: 0, // 将在后面计算
        color: '#10b981',
        description: mode === 'inference' ? '前向传播中间结果' : '前向传播中间结果（需保存用于反向传播）'
      }
    ];

    // 训练模式下添加额外的内存项
    if (mode === 'training') {
      const trainingData = result.training;
      items.push(
        {
          label: '梯度',
          valueBytes: MemoryUnitConverter.gbToBytes(trainingData.gradients),
          percentage: 0, // 将在后面计算
          color: '#f59e0b',
          description: '反向传播计算的参数梯度'
        },
        {
          label: '优化器状态',
          valueBytes: MemoryUnitConverter.gbToBytes(trainingData.optimizerStates),
          percentage: 0, // 将在后面计算
          color: '#ef4444',
          description: '优化器（如Adam）维护的动量和方差信息'
        }
      );
    }

    // 计算初始百分比
    items.forEach(item => {
      item.percentage = MemoryUnitConverter.calculatePercentage(item.valueBytes, totalBytes, 2);
    });

    // 标准化百分比，确保总和为100%
    const normalizedItems = this.normalizePercentages(items);

    return normalizedItems;
  }

  /**
   * 标准化百分比，确保总和为100%
   * @param items 内存分解项数组
   * @returns 标准化后的内存分解项数组
   */
  private static normalizePercentages(items: MemoryBreakdownItem[]): MemoryBreakdownItem[] {
    if (items.length === 0) {
      return items;
    }

    // 计算当前百分比总和
    const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);

    if (totalPercentage === 0) {
      console.warn('All percentages are zero, cannot normalize');
      return items;
    }

    // 标准化百分比 - 使用更高精度的计算
    const normalizedItems = items.map(item => ({
      ...item,
      percentage: (item.percentage / totalPercentage) * 100
    }));

    // 使用更精确的四舍五入和调整算法
    // 首先将所有百分比四舍五入到2位小数
    const roundedItems = normalizedItems.map(item => ({
      ...item,
      percentage: Math.round(item.percentage * 100) / 100
    }));

    // 计算四舍五入后的总和
    const roundedTotal = roundedItems.reduce((sum, item) => sum + item.percentage, 0);
    const difference = 100 - roundedTotal;

    // 如果存在差异，需要调整
    if (Math.abs(difference) > 0.001) {
      // 找到需要调整的项目数量
      const adjustmentCount = Math.abs(Math.round(difference * 100));
      const adjustmentStep = difference > 0 ? 0.01 : -0.01;

      // 按照原始百分比大小排序，优先调整较大的项目
      const sortedIndices = roundedItems
        .map((_, index) => ({ index, percentage: normalizedItems[index].percentage }))
        .sort((a, b) => b.percentage - a.percentage)
        .map(item => item.index);

      // 分配调整量
      for (let i = 0; i < adjustmentCount && i < sortedIndices.length; i++) {
        const index = sortedIndices[i];
        roundedItems[index].percentage = Math.round((roundedItems[index].percentage + adjustmentStep) * 100) / 100;
      }
    }

    // 最终验证 - 确保总和精确为100%
    const finalTotal = roundedItems.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(finalTotal - 100) > 0.001) {
      // 如果仍有微小差异，调整最大项
      const maxIndex = roundedItems.reduce((maxIdx, item, index) => 
        item.percentage > roundedItems[maxIdx].percentage ? index : maxIdx, 0
      );
      const finalAdjustment = 100 - finalTotal;
      roundedItems[maxIndex].percentage = Math.round((roundedItems[maxIndex].percentage + finalAdjustment) * 100) / 100;
    }

    // 记录标准化信息
    if (Math.abs(totalPercentage - 100) > 0.01) {
      console.info(`Memory breakdown percentages normalized from ${totalPercentage.toFixed(2)}% to 100%`);
    }

    return roundedItems;
  }

  /**
   * 验证内存分解数据的一致性
   * @param items 内存分解项数组
   * @param expectedTotalBytes 期望的总字节数
   * @returns 验证结果
   */
  static validateBreakdown(items: MemoryBreakdownItem[], expectedTotalBytes: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (items.length === 0) {
      errors.push('内存分解项为空');
      return { isValid: false, errors, warnings };
    }

    // 验证百分比总和
    const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      warnings.push(`百分比总和为 ${totalPercentage.toFixed(2)}%，不等于100%`);
    }

    // 验证字节数总和
    const totalBytes = items.reduce((sum, item) => sum + item.valueBytes, 0);
    const byteDifference = Math.abs(totalBytes - expectedTotalBytes);
    const toleranceBytes = expectedTotalBytes * 0.01; // 1%容差

    if (byteDifference > toleranceBytes) {
      warnings.push(`字节数总和与期望值相差 ${MemoryUnitConverter.formatMemorySize(byteDifference)}`);
    }

    // 验证每个项的数据
    items.forEach((item, index) => {
      if (item.valueBytes < 0) {
        errors.push(`项 ${index + 1} (${item.label}) 的字节数为负数`);
      }
      if (item.percentage < 0 || item.percentage > 100) {
        errors.push(`项 ${index + 1} (${item.label}) 的百分比超出有效范围 (0-100%)`);
      }
      if (!item.label || item.label.trim() === '') {
        errors.push(`项 ${index + 1} 缺少标签`);
      }
      if (!item.color || item.color.trim() === '') {
        warnings.push(`项 ${index + 1} (${item.label}) 缺少颜色定义`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 创建用于GPU利用率分析的内存分解
   * @param gpuMemoryBytes GPU总内存（字节）
   * @param usedMemoryBytes 已使用内存（字节）
   * @param systemOverheadBytes 系统开销（字节）
   * @param fragmentationBytes 碎片化损失（字节）
   * @param safetyBufferBytes 安全缓冲（字节）
   * @returns GPU内存分解项数组
   */
  static calculateGPUMemoryBreakdown(
    gpuMemoryBytes: number,
    usedMemoryBytes: number,
    systemOverheadBytes: number = 0,
    fragmentationBytes: number = 0,
    safetyBufferBytes: number = 0
  ): MemoryBreakdownItem[] {
    if (gpuMemoryBytes <= 0) {
      console.warn('GPU memory is zero or negative, returning empty breakdown');
      return [];
    }

    const baseMemoryBytes = usedMemoryBytes - fragmentationBytes - systemOverheadBytes - safetyBufferBytes;
    const availableMemoryBytes = gpuMemoryBytes - usedMemoryBytes;

    const items: MemoryBreakdownItem[] = [
      {
        label: '基础需求',
        valueBytes: Math.max(0, baseMemoryBytes),
        percentage: 0,
        color: '#3b82f6',
        description: '模型运行所需的基础内存'
      },
      {
        label: '碎片化损失',
        valueBytes: Math.max(0, fragmentationBytes),
        percentage: 0,
        color: '#f59e0b',
        description: '内存分配碎片化导致的损失'
      },
      {
        label: '系统开销',
        valueBytes: Math.max(0, systemOverheadBytes),
        percentage: 0,
        color: '#ef4444',
        description: '驱动和系统保留的内存'
      },
      {
        label: '安全缓冲',
        valueBytes: Math.max(0, safetyBufferBytes),
        percentage: 0,
        color: '#8b5cf6',
        description: '预留的安全缓冲内存'
      },
      {
        label: '可用内存',
        valueBytes: Math.max(0, availableMemoryBytes),
        percentage: 0,
        color: '#10b981',
        description: '剩余可用的GPU内存'
      }
    ];

    // 过滤掉值为0的项（除了可用内存）
    const filteredItems = items.filter((item) => 
      item.valueBytes > 0 || item.label === '可用内存'
    );

    // 计算百分比
    filteredItems.forEach(item => {
      item.percentage = MemoryUnitConverter.calculatePercentage(item.valueBytes, gpuMemoryBytes, 2);
    });

    return filteredItems;
  }

  /**
   * 获取默认的内存分解颜色方案
   * @returns 颜色数组
   */
  static getDefaultColors(): string[] {
    return [
      '#3b82f6', // 蓝色 - 模型权重
      '#10b981', // 绿色 - 激活值
      '#f59e0b', // 橙色 - 梯度
      '#ef4444', // 红色 - 优化器状态
      '#8b5cf6', // 紫色 - 其他
      '#06b6d4', // 青色
      '#84cc16', // 黄绿色
      '#f97316', // 深橙色
    ];
  }

  /**
   * 格式化内存分解项为显示文本
   * @param item 内存分解项
   * @param showBytes 是否显示字节数
   * @param showPercentage 是否显示百分比
   * @returns 格式化的显示文本
   */
  static formatBreakdownItem(
    item: MemoryBreakdownItem,
    showBytes: boolean = true,
    showPercentage: boolean = true
  ): string {
    const parts: string[] = [item.label];

    if (showBytes) {
      parts.push(MemoryUnitConverter.formatMemorySize(item.valueBytes));
    }

    if (showPercentage) {
      parts.push(`(${item.percentage.toFixed(1)}%)`);
    }

    return parts.join(' ');
  }
}