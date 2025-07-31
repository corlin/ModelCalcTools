import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('MemoryUnitConverter', () => {
  describe('基础转换方法', () => {
    describe('bytesToXX 方法', () => {
      test('bytesToKB 应该正确转换', () => {
        expect(MemoryUnitConverter.bytesToKB(1024)).toBe(1);
        expect(MemoryUnitConverter.bytesToKB(2048)).toBe(2);
        expect(MemoryUnitConverter.bytesToKB(512)).toBe(0.5);
        expect(MemoryUnitConverter.bytesToKB(0)).toBe(0);
      });

      test('bytesToMB 应该正确转换', () => {
        expect(MemoryUnitConverter.bytesToMB(1024 * 1024)).toBe(1);
        expect(MemoryUnitConverter.bytesToMB(2 * 1024 * 1024)).toBe(2);
        expect(MemoryUnitConverter.bytesToMB(512 * 1024)).toBe(0.5);
        expect(MemoryUnitConverter.bytesToMB(0)).toBe(0);
      });

      test('bytesToGB 应该正确转换', () => {
        expect(MemoryUnitConverter.bytesToGB(1024 * 1024 * 1024)).toBe(1);
        expect(MemoryUnitConverter.bytesToGB(2 * 1024 * 1024 * 1024)).toBe(2);
        expect(MemoryUnitConverter.bytesToGB(512 * 1024 * 1024)).toBe(0.5);
        expect(MemoryUnitConverter.bytesToGB(0)).toBe(0);
      });

      test('bytesToTB 应该正确转换', () => {
        const oneTB = 1024 * 1024 * 1024 * 1024;
        expect(MemoryUnitConverter.bytesToTB(oneTB)).toBe(1);
        expect(MemoryUnitConverter.bytesToTB(2 * oneTB)).toBe(2);
        expect(MemoryUnitConverter.bytesToTB(512 * 1024 * 1024 * 1024)).toBe(0.5);
        expect(MemoryUnitConverter.bytesToTB(0)).toBe(0);
      });

      test('负数输入应该抛出错误', () => {
        expect(() => MemoryUnitConverter.bytesToKB(-1)).toThrow('字节数不能为负数');
        expect(() => MemoryUnitConverter.bytesToMB(-1)).toThrow('字节数不能为负数');
        expect(() => MemoryUnitConverter.bytesToGB(-1)).toThrow('字节数不能为负数');
        expect(() => MemoryUnitConverter.bytesToTB(-1)).toThrow('字节数不能为负数');
      });
    });

    describe('xxToBytes 方法', () => {
      test('kbToBytes 应该正确转换', () => {
        expect(MemoryUnitConverter.kbToBytes(1)).toBe(1024);
        expect(MemoryUnitConverter.kbToBytes(2)).toBe(2048);
        expect(MemoryUnitConverter.kbToBytes(0.5)).toBe(512);
        expect(MemoryUnitConverter.kbToBytes(0)).toBe(0);
      });

      test('mbToBytes 应该正确转换', () => {
        expect(MemoryUnitConverter.mbToBytes(1)).toBe(1024 * 1024);
        expect(MemoryUnitConverter.mbToBytes(2)).toBe(2 * 1024 * 1024);
        expect(MemoryUnitConverter.mbToBytes(0.5)).toBe(512 * 1024);
        expect(MemoryUnitConverter.mbToBytes(0)).toBe(0);
      });

      test('gbToBytes 应该正确转换', () => {
        expect(MemoryUnitConverter.gbToBytes(1)).toBe(1024 * 1024 * 1024);
        expect(MemoryUnitConverter.gbToBytes(2)).toBe(2 * 1024 * 1024 * 1024);
        expect(MemoryUnitConverter.gbToBytes(0.5)).toBe(512 * 1024 * 1024);
        expect(MemoryUnitConverter.gbToBytes(0)).toBe(0);
      });

      test('tbToBytes 应该正确转换', () => {
        const oneTB = 1024 * 1024 * 1024 * 1024;
        expect(MemoryUnitConverter.tbToBytes(1)).toBe(oneTB);
        expect(MemoryUnitConverter.tbToBytes(2)).toBe(2 * oneTB);
        expect(MemoryUnitConverter.tbToBytes(0.5)).toBe(512 * 1024 * 1024 * 1024);
        expect(MemoryUnitConverter.tbToBytes(0)).toBe(0);
      });

      test('负数输入应该抛出错误', () => {
        expect(() => MemoryUnitConverter.kbToBytes(-1)).toThrow('KB数不能为负数');
        expect(() => MemoryUnitConverter.mbToBytes(-1)).toThrow('MB数不能为负数');
        expect(() => MemoryUnitConverter.gbToBytes(-1)).toThrow('GB数不能为负数');
        expect(() => MemoryUnitConverter.tbToBytes(-1)).toThrow('TB数不能为负数');
      });
    });

    describe('GB和MB互转', () => {
      test('gbToMB 应该正确转换', () => {
        expect(MemoryUnitConverter.gbToMB(1)).toBe(1024);
        expect(MemoryUnitConverter.gbToMB(2)).toBe(2048);
        expect(MemoryUnitConverter.gbToMB(0.5)).toBe(512);
        expect(MemoryUnitConverter.gbToMB(0)).toBe(0);
      });

      test('mbToGB 应该正确转换', () => {
        expect(MemoryUnitConverter.mbToGB(1024)).toBe(1);
        expect(MemoryUnitConverter.mbToGB(2048)).toBe(2);
        expect(MemoryUnitConverter.mbToGB(512)).toBe(0.5);
        expect(MemoryUnitConverter.mbToGB(0)).toBe(0);
      });

      test('负数输入应该抛出错误', () => {
        expect(() => MemoryUnitConverter.gbToMB(-1)).toThrow('GB数不能为负数');
        expect(() => MemoryUnitConverter.mbToGB(-1)).toThrow('MB数不能为负数');
      });
    });
  });

  describe('转换精度测试', () => {
    test('双向转换应该保持精度', () => {
      const originalBytes = 1536; // 1.5 KB
      const kb = MemoryUnitConverter.bytesToKB(originalBytes);
      const backToBytes = MemoryUnitConverter.kbToBytes(kb);
      expect(backToBytes).toBe(originalBytes);
    });

    test('大数值转换应该保持精度', () => {
      const largeBytes = 1024 * 1024 * 1024 * 1.5; // 1.5 GB
      const gb = MemoryUnitConverter.bytesToGB(largeBytes);
      const backToBytes = MemoryUnitConverter.gbToBytes(gb);
      expect(Math.abs(backToBytes - largeBytes)).toBeLessThan(1); // 允许1字节的浮点误差
    });

    test('小数转换应该保持精度', () => {
      const fractionalGB = 0.25; // 0.25 GB
      const bytes = MemoryUnitConverter.gbToBytes(fractionalGB);
      const backToGB = MemoryUnitConverter.bytesToGB(bytes);
      expect(backToGB).toBe(fractionalGB);
    });
  });

  describe('formatMemorySize 方法', () => {
    test('应该正确格式化不同大小的内存', () => {
      expect(MemoryUnitConverter.formatMemorySize(0)).toBe('0 B');
      expect(MemoryUnitConverter.formatMemorySize(512)).toBe('512 B');
      expect(MemoryUnitConverter.formatMemorySize(1024)).toBe('1.00 KB');
      expect(MemoryUnitConverter.formatMemorySize(1536)).toBe('1.50 KB');
      expect(MemoryUnitConverter.formatMemorySize(1024 * 1024)).toBe('1.00 MB');
      expect(MemoryUnitConverter.formatMemorySize(1.5 * 1024 * 1024)).toBe('1.50 MB');
      expect(MemoryUnitConverter.formatMemorySize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(MemoryUnitConverter.formatMemorySize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB');
      expect(MemoryUnitConverter.formatMemorySize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    test('应该支持自定义精度', () => {
      const bytes = 1536; // 1.5 KB
      expect(MemoryUnitConverter.formatMemorySize(bytes, 0)).toBe('2 KB');
      expect(MemoryUnitConverter.formatMemorySize(bytes, 1)).toBe('1.5 KB');
      expect(MemoryUnitConverter.formatMemorySize(bytes, 2)).toBe('1.50 KB');
      expect(MemoryUnitConverter.formatMemorySize(bytes, 3)).toBe('1.500 KB');
    });

    test('应该处理边界精度值', () => {
      const bytes = 1536;
      expect(MemoryUnitConverter.formatMemorySize(bytes, -1)).toBe('2 KB'); // 负数精度应该变为0
      expect(MemoryUnitConverter.formatMemorySize(bytes, 15)).toBe('1.5000000000 KB'); // 超大精度应该被限制
    });

    test('负数输入应该抛出错误', () => {
      expect(() => MemoryUnitConverter.formatMemorySize(-1)).toThrow('字节数不能为负数');
    });
  });

  describe('formatMemorySizeIntelligent 方法', () => {
    test('应该使用智能精度格式化', () => {
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(0)).toBe('0 B');
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(512)).toBe('512 B');
      
      // KB范围
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(1024)).toBe('1.00 KB'); // < 10, 2位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(10 * 1024)).toBe('10.0 KB'); // >= 10, 1位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(100 * 1024)).toBe('100 KB'); // >= 100, 0位小数
      
      // MB范围
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(1024 * 1024)).toBe('1.00 MB'); // < 10, 2位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(10 * 1024 * 1024)).toBe('10.0 MB'); // >= 10, 1位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(100 * 1024 * 1024)).toBe('100 MB'); // >= 100, 0位小数
      
      // GB范围
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(1024 * 1024 * 1024)).toBe('1.00 GB'); // < 10, 2位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(10 * 1024 * 1024 * 1024)).toBe('10.0 GB'); // >= 10, 1位小数
      
      // TB范围
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB'); // < 10, 2位小数
      expect(MemoryUnitConverter.formatMemorySizeIntelligent(10 * 1024 * 1024 * 1024 * 1024)).toBe('10.0 TB'); // >= 10, 1位小数
    });

    test('负数输入应该抛出错误', () => {
      expect(() => MemoryUnitConverter.formatMemorySizeIntelligent(-1)).toThrow('字节数不能为负数');
    });
  });

  describe('parseMemoryString 方法', () => {
    test('应该正确解析各种格式的内存字符串', () => {
      expect(MemoryUnitConverter.parseMemoryString('1024 B')).toBe(1024);
      expect(MemoryUnitConverter.parseMemoryString('1 KB')).toBe(1024);
      expect(MemoryUnitConverter.parseMemoryString('1.5 KB')).toBe(1536);
      expect(MemoryUnitConverter.parseMemoryString('1 MB')).toBe(1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('2.5 MB')).toBe(2.5 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('1 GB')).toBe(1024 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('1.5 GB')).toBe(1.5 * 1024 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('1 TB')).toBe(1024 * 1024 * 1024 * 1024);
    });

    test('应该忽略大小写和空格', () => {
      expect(MemoryUnitConverter.parseMemoryString('1 gb')).toBe(1024 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('1gb')).toBe(1024 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('  1.5  GB  ')).toBe(1.5 * 1024 * 1024 * 1024);
      expect(MemoryUnitConverter.parseMemoryString('2mb')).toBe(2 * 1024 * 1024);
    });

    test('应该处理无效输入', () => {
      expect(() => MemoryUnitConverter.parseMemoryString('')).toThrow('无效的内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString('invalid')).toThrow('无法解析内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString('1.5')).toThrow('无法解析内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString('GB')).toThrow('无法解析内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString('1 XB')).toThrow('无法解析内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString('-1 GB')).toThrow('无效的数值');
      expect(() => MemoryUnitConverter.parseMemoryString('abc GB')).toThrow('无法解析内存字符串');
    });

    test('应该处理null和undefined输入', () => {
      expect(() => MemoryUnitConverter.parseMemoryString(null as any)).toThrow('无效的内存字符串');
      expect(() => MemoryUnitConverter.parseMemoryString(undefined as any)).toThrow('无效的内存字符串');
    });
  });

  describe('compareMemorySize 方法', () => {
    test('应该正确比较内存大小', () => {
      expect(MemoryUnitConverter.compareMemorySize(1024, 2048)).toBe(-1);
      expect(MemoryUnitConverter.compareMemorySize(2048, 1024)).toBe(1);
      expect(MemoryUnitConverter.compareMemorySize(1024, 1024)).toBe(0);
      expect(MemoryUnitConverter.compareMemorySize(0, 0)).toBe(0);
    });

    test('负数输入应该抛出错误', () => {
      expect(() => MemoryUnitConverter.compareMemorySize(-1, 1024)).toThrow('字节数不能为负数');
      expect(() => MemoryUnitConverter.compareMemorySize(1024, -1)).toThrow('字节数不能为负数');
    });
  });

  describe('calculatePercentage 方法', () => {
    test('应该正确计算百分比', () => {
      expect(MemoryUnitConverter.calculatePercentage(512, 1024)).toBe(50);
      expect(MemoryUnitConverter.calculatePercentage(1024, 1024)).toBe(100);
      expect(MemoryUnitConverter.calculatePercentage(0, 1024)).toBe(0);
      expect(MemoryUnitConverter.calculatePercentage(256, 1024)).toBe(25);
    });

    test('应该支持自定义精度', () => {
      expect(MemoryUnitConverter.calculatePercentage(333, 1000, 0)).toBe(33);
      expect(MemoryUnitConverter.calculatePercentage(333, 1000, 1)).toBe(33.3);
      expect(MemoryUnitConverter.calculatePercentage(333, 1000, 2)).toBe(33.3);
      expect(MemoryUnitConverter.calculatePercentage(333, 1000, 3)).toBe(33.3);
    });

    test('应该处理总数为0的情况', () => {
      expect(MemoryUnitConverter.calculatePercentage(100, 0)).toBe(0);
    });

    test('负数输入应该抛出错误', () => {
      expect(() => MemoryUnitConverter.calculatePercentage(-1, 1024)).toThrow('字节数不能为负数');
      expect(() => MemoryUnitConverter.calculatePercentage(512, -1)).toThrow('字节数不能为负数');
    });
  });

  describe('validateMemorySize 方法', () => {
    test('应该验证有效的内存大小', () => {
      expect(MemoryUnitConverter.validateMemorySize(0)).toBe(true);
      expect(MemoryUnitConverter.validateMemorySize(1024)).toBe(true);
      expect(MemoryUnitConverter.validateMemorySize(1024 * 1024 * 1024)).toBe(true);
    });

    test('应该拒绝无效的内存大小', () => {
      expect(MemoryUnitConverter.validateMemorySize(-1)).toBe(false);
      expect(MemoryUnitConverter.validateMemorySize(Infinity)).toBe(false);
      expect(MemoryUnitConverter.validateMemorySize(NaN)).toBe(false);
    });

    test('应该支持自定义最大值', () => {
      const maxBytes = 1024 * 1024; // 1MB
      expect(MemoryUnitConverter.validateMemorySize(512 * 1024, maxBytes)).toBe(true);
      expect(MemoryUnitConverter.validateMemorySize(2 * 1024 * 1024, maxBytes)).toBe(false);
    });
  });

  describe('getConversionConstants 方法', () => {
    test('应该返回正确的转换常量', () => {
      const constants = MemoryUnitConverter.getConversionConstants();
      expect(constants.BYTES_PER_KB).toBe(1024);
      expect(constants.BYTES_PER_MB).toBe(1024 * 1024);
      expect(constants.BYTES_PER_GB).toBe(1024 * 1024 * 1024);
      expect(constants.BYTES_PER_TB).toBe(1024 * 1024 * 1024 * 1024);
    });
  });

  describe('边界条件和错误处理', () => {
    test('应该处理极大数值', () => {
      const veryLargeBytes = Number.MAX_SAFE_INTEGER;
      expect(() => MemoryUnitConverter.formatMemorySize(veryLargeBytes)).not.toThrow();
      expect(MemoryUnitConverter.validateMemorySize(veryLargeBytes)).toBe(true);
    });

    test('应该处理极小数值', () => {
      const verySmallBytes = Number.MIN_VALUE;
      expect(() => MemoryUnitConverter.formatMemorySize(verySmallBytes)).not.toThrow();
      expect(MemoryUnitConverter.validateMemorySize(verySmallBytes)).toBe(true);
    });

    test('应该处理浮点精度问题', () => {
      // 测试可能导致浮点精度问题的数值
      const problematicBytes = 0.1 + 0.2; // JavaScript浮点精度问题
      expect(() => MemoryUnitConverter.formatMemorySize(problematicBytes)).not.toThrow();
    });
  });

  describe('实际使用场景测试', () => {
    test('应该正确处理GPU内存大小', () => {
      // RTX 4090: 24GB
      const rtx4090Memory = MemoryUnitConverter.gbToBytes(24);
      expect(MemoryUnitConverter.formatMemorySize(rtx4090Memory)).toBe('24.00 GB');
      
      // A100: 80GB
      const a100Memory = MemoryUnitConverter.gbToBytes(80);
      expect(MemoryUnitConverter.formatMemorySize(a100Memory)).toBe('80.00 GB');
    });

    test('应该正确处理模型权重大小', () => {
      // 7B模型，FP16精度：约14GB
      const model7BBytes = 7 * 1000000000 * 2; // 7B参数 * 2字节
      const formatted = MemoryUnitConverter.formatMemorySize(model7BBytes);
      expect(formatted).toContain('GB');
      
      // 验证转换精度
      const gb = MemoryUnitConverter.bytesToGB(model7BBytes);
      expect(gb).toBeCloseTo(13.04, 2); // 约13.04GB
    });

    test('应该正确处理内存利用率计算', () => {
      const totalMemory = MemoryUnitConverter.gbToBytes(24); // 24GB GPU
      const usedMemory = MemoryUnitConverter.gbToBytes(18);  // 使用18GB
      
      const utilization = MemoryUnitConverter.calculatePercentage(usedMemory, totalMemory, 1);
      expect(utilization).toBe(75.0); // 75%利用率
    });
  });
});