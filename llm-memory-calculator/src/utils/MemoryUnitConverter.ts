/**
 * 标准化内存单位转换工具
 * 提供统一的bytes、GB、MB转换方法，避免精度丢失
 */
export class MemoryUnitConverter {
  // 标准转换常量：使用二进制单位（1024）
  private static readonly BYTES_PER_KB = 1024;
  private static readonly BYTES_PER_MB = 1024 * 1024;
  private static readonly BYTES_PER_GB = 1024 * 1024 * 1024;
  private static readonly BYTES_PER_TB = 1024 * 1024 * 1024 * 1024;

  /**
   * 将字节转换为KB
   * @param bytes 字节数
   * @returns KB数值
   */
  static bytesToKB(bytes: number): number {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }
    return bytes / this.BYTES_PER_KB;
  }

  /**
   * 将字节转换为MB
   * @param bytes 字节数
   * @returns MB数值
   */
  static bytesToMB(bytes: number): number {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }
    return bytes / this.BYTES_PER_MB;
  }

  /**
   * 将字节转换为GB
   * @param bytes 字节数
   * @returns GB数值
   */
  static bytesToGB(bytes: number): number {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }
    return bytes / this.BYTES_PER_GB;
  }

  /**
   * 将字节转换为TB
   * @param bytes 字节数
   * @returns TB数值
   */
  static bytesToTB(bytes: number): number {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }
    return bytes / this.BYTES_PER_TB;
  }

  /**
   * 将KB转换为字节
   * @param kb KB数值
   * @returns 字节数
   */
  static kbToBytes(kb: number): number {
    if (kb < 0) {
      throw new Error('KB数不能为负数');
    }
    return kb * this.BYTES_PER_KB;
  }

  /**
   * 将MB转换为字节
   * @param mb MB数值
   * @returns 字节数
   */
  static mbToBytes(mb: number): number {
    if (mb < 0) {
      throw new Error('MB数不能为负数');
    }
    return mb * this.BYTES_PER_MB;
  }

  /**
   * 将GB转换为字节
   * @param gb GB数值
   * @returns 字节数
   */
  static gbToBytes(gb: number): number {
    if (gb < 0) {
      throw new Error('GB数不能为负数');
    }
    return gb * this.BYTES_PER_GB;
  }

  /**
   * 将TB转换为字节
   * @param tb TB数值
   * @returns 字节数
   */
  static tbToBytes(tb: number): number {
    if (tb < 0) {
      throw new Error('TB数不能为负数');
    }
    return tb * this.BYTES_PER_TB;
  }

  /**
   * 将GB转换为MB
   * @param gb GB数值
   * @returns MB数值
   */
  static gbToMB(gb: number): number {
    if (gb < 0) {
      throw new Error('GB数不能为负数');
    }
    return gb * 1024;
  }

  /**
   * 将MB转换为GB
   * @param mb MB数值
   * @returns GB数值
   */
  static mbToGB(mb: number): number {
    if (mb < 0) {
      throw new Error('MB数不能为负数');
    }
    return mb / 1024;
  }

  /**
   * 统一内存大小格式化显示
   * 自动选择最合适的单位进行显示
   * @param bytes 字节数
   * @param precision 小数位数，默认为2
   * @returns 格式化后的字符串
   */
  static formatMemorySize(bytes: number, precision: number = 2): string {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }

    if (bytes === 0) {
      return '0 B';
    }

    // 确保精度在合理范围内
    const safePrecision = Math.max(0, Math.min(10, Math.floor(precision)));

    if (bytes >= this.BYTES_PER_TB) {
      const tb = this.bytesToTB(bytes);
      return `${tb.toFixed(safePrecision)} TB`;
    } else if (bytes >= this.BYTES_PER_GB) {
      const gb = this.bytesToGB(bytes);
      return `${gb.toFixed(safePrecision)} GB`;
    } else if (bytes >= this.BYTES_PER_MB) {
      const mb = this.bytesToMB(bytes);
      return `${mb.toFixed(safePrecision)} MB`;
    } else if (bytes >= this.BYTES_PER_KB) {
      const kb = this.bytesToKB(bytes);
      return `${kb.toFixed(safePrecision)} KB`;
    } else {
      return `${Math.round(bytes)} B`;
    }
  }

  /**
   * 格式化内存大小，使用智能精度
   * 根据数值大小自动调整小数位数
   * @param bytes 字节数
   * @returns 格式化后的字符串
   */
  static formatMemorySizeIntelligent(bytes: number): string {
    if (bytes < 0) {
      throw new Error('字节数不能为负数');
    }

    if (bytes === 0) {
      return '0 B';
    }

    if (bytes >= this.BYTES_PER_TB) {
      const tb = this.bytesToTB(bytes);
      const precision = tb >= 10 ? 1 : 2;
      return `${tb.toFixed(precision)} TB`;
    } else if (bytes >= this.BYTES_PER_GB) {
      const gb = this.bytesToGB(bytes);
      const precision = gb >= 10 ? 1 : 2;
      return `${gb.toFixed(precision)} GB`;
    } else if (bytes >= this.BYTES_PER_MB) {
      const mb = this.bytesToMB(bytes);
      const precision = mb >= 100 ? 0 : mb >= 10 ? 1 : 2;
      return `${mb.toFixed(precision)} MB`;
    } else if (bytes >= this.BYTES_PER_KB) {
      const kb = this.bytesToKB(bytes);
      const precision = kb >= 100 ? 0 : kb >= 10 ? 1 : 2;
      return `${kb.toFixed(precision)} KB`;
    } else {
      return `${Math.round(bytes)} B`;
    }
  }

  /**
   * 解析内存大小字符串为字节数
   * 支持格式：'1.5 GB', '512 MB', '2048 KB', '1024 B'
   * @param memoryString 内存大小字符串
   * @returns 字节数
   */
  static parseMemoryString(memoryString: string): number {
    if (!memoryString || typeof memoryString !== 'string') {
      throw new Error('无效的内存字符串');
    }

    const trimmed = memoryString.trim().toUpperCase();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(TB|GB|MB|KB|B)$/);

    if (!match) {
      throw new Error(`无法解析内存字符串: ${memoryString}`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2];

    if (isNaN(value) || value < 0) {
      throw new Error(`无效的数值: ${match[1]}`);
    }

    switch (unit) {
      case 'TB':
        return this.tbToBytes(value);
      case 'GB':
        return this.gbToBytes(value);
      case 'MB':
        return this.mbToBytes(value);
      case 'KB':
        return this.kbToBytes(value);
      case 'B':
        return value;
      default:
        throw new Error(`不支持的单位: ${unit}`);
    }
  }

  /**
   * 比较两个内存大小
   * @param bytes1 第一个内存大小（字节）
   * @param bytes2 第二个内存大小（字节）
   * @returns -1 如果bytes1 < bytes2, 0 如果相等, 1 如果bytes1 > bytes2
   */
  static compareMemorySize(bytes1: number, bytes2: number): number {
    if (bytes1 < 0 || bytes2 < 0) {
      throw new Error('字节数不能为负数');
    }

    if (bytes1 < bytes2) return -1;
    if (bytes1 > bytes2) return 1;
    return 0;
  }

  /**
   * 计算内存大小的百分比
   * @param partBytes 部分内存大小（字节）
   * @param totalBytes 总内存大小（字节）
   * @param precision 小数位数，默认为2
   * @returns 百分比数值（0-100）
   */
  static calculatePercentage(partBytes: number, totalBytes: number, precision: number = 2): number {
    if (partBytes < 0 || totalBytes < 0) {
      throw new Error('字节数不能为负数');
    }

    if (totalBytes === 0) {
      return 0;
    }

    const percentage = (partBytes / totalBytes) * 100;
    const safePrecision = Math.max(0, Math.min(10, Math.floor(precision)));
    
    return parseFloat(percentage.toFixed(safePrecision));
  }

  /**
   * 获取转换常量（用于测试和调试）
   * @returns 转换常量对象
   */
  static getConversionConstants() {
    return {
      BYTES_PER_KB: this.BYTES_PER_KB,
      BYTES_PER_MB: this.BYTES_PER_MB,
      BYTES_PER_GB: this.BYTES_PER_GB,
      BYTES_PER_TB: this.BYTES_PER_TB,
    };
  }

  /**
   * 验证内存大小是否在合理范围内
   * @param bytes 字节数
   * @param maxBytes 最大允许字节数，默认为Number.MAX_SAFE_INTEGER
   * @returns 验证结果
   */
  static validateMemorySize(bytes: number, maxBytes: number = Number.MAX_SAFE_INTEGER): boolean {
    return bytes >= 0 && bytes <= maxBytes && Number.isFinite(bytes);
  }
}