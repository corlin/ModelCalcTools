/**
 * 格式化内存大小显示（输入为GB）
 */
export const formatMemorySize = (memoryGB: number): string => {
  if (memoryGB === 0) return '0 GB';
  
  if (memoryGB >= 1024) {
    // 大于等于1024GB时显示为TB
    return `${(memoryGB / 1024).toFixed(1)} TB`;
  } else if (memoryGB >= 1) {
    // 大于等于1GB时显示为GB
    return `${memoryGB.toFixed(1)} GB`;
  } else {
    // 小于1GB时显示为MB
    return `${(memoryGB * 1024).toFixed(0)} MB`;
  }
};

/**
 * 格式化数字显示（添加千分位分隔符）
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
};

/**
 * 格式化百分比显示
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

/**
 * 格式化参数数量显示
 */
export const formatParameterCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}T`;
  } else if (count >= 1) {
    return `${count.toFixed(1)}B`;
  } else {
    return `${(count * 1000).toFixed(0)}M`;
  }
};

/**
 * 格式化时间显示
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`;
  } else if (seconds < 3600) {
    return `${(seconds / 60).toFixed(1)}分钟`;
  } else if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)}小时`;
  } else {
    return `${(seconds / 86400).toFixed(1)}天`;
  }
};

/**
 * 格式化价格显示
 */
export const formatPrice = (price: number, currency: string = '$'): string => {
  if (price >= 1000000) {
    return `${currency}${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `${currency}${(price / 1000).toFixed(1)}K`;
  } else {
    return `${currency}${price.toFixed(2)}`;
  }
};

/**
 * 格式化计算精度显示
 */
export const formatPrecision = (precision: string): string => {
  const precisionMap: Record<string, string> = {
    'fp32': 'FP32 (32位浮点)',
    'fp16': 'FP16 (16位浮点)',
    'bf16': 'BF16 (16位脑浮点)',
    'int8': 'INT8 (8位整数)',
    'int4': 'INT4 (4位整数)'
  };
  
  return precisionMap[precision.toLowerCase()] || precision.toUpperCase();
};

/**
 * 格式化GPU内存显示
 */
export const formatGPUMemory = (memoryGB: number): string => {
  if (memoryGB >= 1000) {
    return `${(memoryGB / 1000).toFixed(1)}TB`;
  } else {
    return `${memoryGB}GB`;
  }
};

/**
 * 格式化计算性能显示
 */
export const formatThroughput = (tokensPerSecond: number): string => {
  if (tokensPerSecond >= 1000000) {
    return `${(tokensPerSecond / 1000000).toFixed(1)}M tokens/s`;
  } else if (tokensPerSecond >= 1000) {
    return `${(tokensPerSecond / 1000).toFixed(1)}K tokens/s`;
  } else {
    return `${tokensPerSecond.toFixed(1)} tokens/s`;
  }
};