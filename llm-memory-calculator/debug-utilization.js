// 调试利用率计算
const MemoryUnitConverter = {
  gbToBytes: (gb) => gb * 1024 * 1024 * 1024,
  bytesToGB: (bytes) => bytes / (1024 * 1024 * 1024),
  formatMemorySize: (bytes, precision = 1) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(precision)} GB`;
  },
  calculatePercentage: (value, total, precision = 1) => {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(precision);
  }
};

const DEFAULT_UTILIZATION_CONFIG = {
  memoryFragmentationFactor: 0.08,     // 8% 碎片化损失
  systemReservedMemory: 1.0,           // 1GB 系统保留
  driverOverhead: 0.5,                 // 0.5GB 驱动开销
  safetyMargin: 0.15,                  // 15% 安全边距
  multiCardCommunicationOverhead: 0.07  // 7% 多卡通信开销
};

function calculateStandardizedUtilization(memoryNeededBytes, gpuMemoryBytes, config) {
  // 输入验证
  if (memoryNeededBytes < 0 || gpuMemoryBytes <= 0) {
    throw new Error('内存参数必须为正数');
  }

  // 计算系统开销（转换为字节）
  const systemOverheadBytes = MemoryUnitConverter.gbToBytes(
    config.systemReservedMemory + config.driverOverhead
  );
  
  // 计算可用内存
  const availableBytes = Math.max(0, gpuMemoryBytes - systemOverheadBytes);
  
  // 计算碎片化损失
  const fragmentationBytes = memoryNeededBytes * config.memoryFragmentationFactor;
  const totalNeededBytes = memoryNeededBytes + fragmentationBytes;
  
  // 计算理论利用率（基于GPU总内存）
  const theoreticalUtilization = Math.max(0, memoryNeededBytes / gpuMemoryBytes);
  
  // 计算实际利用率（基于可用内存）
  const practicalUtilization = availableBytes > 0 ? 
    Math.max(0, totalNeededBytes / availableBytes) : 
    Number.POSITIVE_INFINITY;
  
  // 计算显示用的利用率百分比
  const utilizationPercentage = Math.max(0, practicalUtilization * 100);
  
  // 判断是否超出容量
  const isOverCapacity = practicalUtilization > 1.0;
  
  // 确保利用率在合理范围内
  const boundedTheoreticalUtilization = Math.min(10.0, theoreticalUtilization);
  const boundedPracticalUtilization = isFinite(practicalUtilization) ? 
    Math.min(10.0, practicalUtilization) : 10.0;
  
  // 计算效率等级
  function determineEfficiencyRating(utilization) {
    if (!isFinite(utilization) || utilization < 0) {
      return 'poor';
    }

    if (utilization >= 0.7 && utilization <= 0.85) {
      return 'excellent'; // 70-85% 为最佳利用率
    } else if (utilization >= 0.5 && utilization <= 0.95) {
      return 'good';      // 50-95% 为良好利用率（排除excellent范围）
    } else if (utilization >= 0.3 && utilization <= 1.0) {
      return 'fair';      // 30-100% 为一般利用率（排除good范围）
    } else {
      return 'poor';      // 其他情况为差
    }
  }
  
  const efficiencyRating = determineEfficiencyRating(boundedPracticalUtilization);

  return {
    theoreticalUtilization: boundedTheoreticalUtilization,
    practicalUtilization: boundedPracticalUtilization,
    utilizationPercentage: Math.min(1000, utilizationPercentage), // 限制最大显示为1000%
    isOverCapacity,
    efficiencyRating
  };
}

// 测试案例
console.log('=== 利用率计算测试 ===');

// 案例1: 17GB 内存需求，RTX 4090 (24GB)
const memoryNeeded1 = MemoryUnitConverter.gbToBytes(17); // 17GB 转换为字节
const rtx4090Memory = MemoryUnitConverter.gbToBytes(24); // 24GB 转换为字节

console.log('案例1: 17GB 需求 vs RTX 4090 (24GB)');
console.log('内存需求:', MemoryUnitConverter.formatMemorySize(memoryNeeded1));
console.log('GPU显存:', MemoryUnitConverter.formatMemorySize(rtx4090Memory));

const result1 = calculateStandardizedUtilization(memoryNeeded1, rtx4090Memory, DEFAULT_UTILIZATION_CONFIG);
console.log('计算结果:', result1);
console.log('显示利用率:', result1.utilizationPercentage.toFixed(1) + '%');
console.log('效率等级:', result1.efficiencyRating);
console.log('是否超容量:', result1.isOverCapacity);
console.log('');

// 案例2: 10GB 内存需求，RTX 4080 (16GB)
const memoryNeeded2 = MemoryUnitConverter.gbToBytes(10);
const rtx4080Memory = MemoryUnitConverter.gbToBytes(16);

console.log('案例2: 10GB 需求 vs RTX 4080 (16GB)');
console.log('内存需求:', MemoryUnitConverter.formatMemorySize(memoryNeeded2));
console.log('GPU显存:', MemoryUnitConverter.formatMemorySize(rtx4080Memory));

const result2 = calculateStandardizedUtilization(memoryNeeded2, rtx4080Memory, DEFAULT_UTILIZATION_CONFIG);
console.log('计算结果:', result2);
console.log('显示利用率:', result2.utilizationPercentage.toFixed(1) + '%');
console.log('效率等级:', result2.efficiencyRating);
console.log('是否超容量:', result2.isOverCapacity);
console.log('');

// 案例3: 30GB 内存需求，RTX 4090 (24GB) - 应该超容量
const memoryNeeded3 = MemoryUnitConverter.gbToBytes(30);

console.log('案例3: 30GB 需求 vs RTX 4090 (24GB) - 超容量测试');
console.log('内存需求:', MemoryUnitConverter.formatMemorySize(memoryNeeded3));
console.log('GPU显存:', MemoryUnitConverter.formatMemorySize(rtx4090Memory));

const result3 = calculateStandardizedUtilization(memoryNeeded3, rtx4090Memory, DEFAULT_UTILIZATION_CONFIG);
console.log('计算结果:', result3);
console.log('显示利用率:', result3.utilizationPercentage.toFixed(1) + '%');
console.log('效率等级:', result3.efficiencyRating);
console.log('是否超容量:', result3.isOverCapacity);