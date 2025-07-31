/**
 * 标准化利用率计算演示
 * 展示如何使用新的 calculateStandardizedUtilization 方法
 */

import { UtilizationCalculator, DEFAULT_UTILIZATION_CONFIG } from './utilizationCalculator';
import { MemoryUnitConverter } from './MemoryUnitConverter';
import { StandardizedUtilizationResult } from '../types';

/**
 * 演示标准化利用率计算的使用
 * @param memoryNeededGB 需要的内存（GB）
 * @param gpuMemoryGB GPU总内存（GB）
 * @returns 标准化利用率结果和格式化的显示信息
 */
export function demonstrateStandardizedUtilization(
  memoryNeededGB: number,
  gpuMemoryGB: number
): {
  result: StandardizedUtilizationResult;
  displayInfo: {
    theoreticalUtilizationDisplay: string;
    practicalUtilizationDisplay: string;
    utilizationPercentageDisplay: string;
    efficiencyRatingDisplay: string;
    capacityStatusDisplay: string;
    memoryBreakdown: {
      totalNeeded: string;
      totalAvailable: string;
      systemOverhead: string;
      fragmentation: string;
    };
  };
} {
  // 转换为字节进行计算
  const memoryNeededBytes = MemoryUnitConverter.gbToBytes(memoryNeededGB);
  const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(gpuMemoryGB);

  // 使用新的标准化利用率计算方法
  const result = UtilizationCalculator.calculateStandardizedUtilization(
    memoryNeededBytes,
    gpuMemoryBytes,
    DEFAULT_UTILIZATION_CONFIG
  );

  // 计算详细的内存分解信息
  const systemOverheadBytes = MemoryUnitConverter.gbToBytes(
    DEFAULT_UTILIZATION_CONFIG.systemReservedMemory + DEFAULT_UTILIZATION_CONFIG.driverOverhead
  );
  const fragmentationBytes = memoryNeededBytes * DEFAULT_UTILIZATION_CONFIG.memoryFragmentationFactor;
  const totalNeededBytes = memoryNeededBytes + fragmentationBytes;
  const availableBytes = gpuMemoryBytes - systemOverheadBytes;

  // 格式化显示信息
  const displayInfo = {
    theoreticalUtilizationDisplay: `${(result.theoreticalUtilization * 100).toFixed(1)}%`,
    practicalUtilizationDisplay: `${(result.practicalUtilization * 100).toFixed(1)}%`,
    utilizationPercentageDisplay: `${result.utilizationPercentage.toFixed(1)}%`,
    efficiencyRatingDisplay: getEfficiencyRatingText(result.efficiencyRating),
    capacityStatusDisplay: result.isOverCapacity ? '⚠️ 超出容量' : '✅ 容量充足',
    memoryBreakdown: {
      totalNeeded: MemoryUnitConverter.formatMemorySize(totalNeededBytes),
      totalAvailable: MemoryUnitConverter.formatMemorySize(availableBytes),
      systemOverhead: MemoryUnitConverter.formatMemorySize(systemOverheadBytes),
      fragmentation: MemoryUnitConverter.formatMemorySize(fragmentationBytes)
    }
  };

  return { result, displayInfo };
}

/**
 * 获取效率等级的中文显示文本
 */
function getEfficiencyRatingText(rating: 'excellent' | 'good' | 'fair' | 'poor'): string {
  const ratingMap = {
    excellent: '🟢 优秀',
    good: '🟡 良好',
    fair: '🟠 一般',
    poor: '🔴 较差'
  };
  return ratingMap[rating];
}

/**
 * 批量测试不同场景的利用率计算
 */
export function testMultipleScenarios(): Array<{
  scenario: string;
  memoryNeeded: number;
  gpuMemory: number;
  result: StandardizedUtilizationResult;
  summary: string;
}> {
  const scenarios = [
    { name: '小模型场景', memoryNeeded: 4, gpuMemory: 24 },
    { name: '中等模型场景', memoryNeeded: 12, gpuMemory: 24 },
    { name: '大模型场景', memoryNeeded: 20, gpuMemory: 24 },
    { name: '超大模型场景', memoryNeeded: 35, gpuMemory: 24 },
    { name: '高端GPU场景', memoryNeeded: 20, gpuMemory: 80 },
    { name: '入门GPU场景', memoryNeeded: 8, gpuMemory: 8 }
  ];

  return scenarios.map(scenario => {
    const { result, displayInfo } = demonstrateStandardizedUtilization(
      scenario.memoryNeeded,
      scenario.gpuMemory
    );

    const summary = `${scenario.name}: ${displayInfo.practicalUtilizationDisplay} 利用率, ${displayInfo.efficiencyRatingDisplay}, ${displayInfo.capacityStatusDisplay}`;

    return {
      scenario: scenario.name,
      memoryNeeded: scenario.memoryNeeded,
      gpuMemory: scenario.gpuMemory,
      result,
      summary
    };
  });
}

/**
 * 比较新旧利用率计算方法的差异（如果需要的话）
 */
export function compareUtilizationMethods(
  memoryNeededGB: number,
  gpuMemoryGB: number
): {
  standardized: StandardizedUtilizationResult;
  legacy?: any; // 如果有旧的计算方法可以在这里比较
  differences: string[];
} {
  const memoryNeededBytes = MemoryUnitConverter.gbToBytes(memoryNeededGB);
  const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(gpuMemoryGB);

  const standardized = UtilizationCalculator.calculateStandardizedUtilization(
    memoryNeededBytes,
    gpuMemoryBytes,
    DEFAULT_UTILIZATION_CONFIG
  );

  // 这里可以添加与旧方法的比较逻辑
  const differences = [
    '✅ 使用统一的字节单位进行计算，避免单位转换误差',
    '✅ 实现了标准化的效率等级评定逻辑',
    '✅ 添加了边界条件处理，确保利用率在合理范围内',
    '✅ 提供了一致的接口结构和数据类型'
  ];

  return {
    standardized,
    differences
  };
}