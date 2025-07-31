import {
  demonstrateStandardizedUtilization,
  testMultipleScenarios,
  compareUtilizationMethods
} from '../standardizedUtilizationDemo';

describe('StandardizedUtilizationDemo', () => {
  describe('demonstrateStandardizedUtilization', () => {
    it('should provide comprehensive utilization analysis', () => {
      const result = demonstrateStandardizedUtilization(20, 24);

      // 验证结果结构
      expect(result.result).toHaveProperty('theoreticalUtilization');
      expect(result.result).toHaveProperty('practicalUtilization');
      expect(result.result).toHaveProperty('utilizationPercentage');
      expect(result.result).toHaveProperty('isOverCapacity');
      expect(result.result).toHaveProperty('efficiencyRating');

      // 验证显示信息
      expect(result.displayInfo).toHaveProperty('theoreticalUtilizationDisplay');
      expect(result.displayInfo).toHaveProperty('practicalUtilizationDisplay');
      expect(result.displayInfo).toHaveProperty('utilizationPercentageDisplay');
      expect(result.displayInfo).toHaveProperty('efficiencyRatingDisplay');
      expect(result.displayInfo).toHaveProperty('capacityStatusDisplay');
      expect(result.displayInfo).toHaveProperty('memoryBreakdown');

      // 验证显示格式
      expect(result.displayInfo.theoreticalUtilizationDisplay).toMatch(/^\d+\.\d%$/);
      expect(result.displayInfo.practicalUtilizationDisplay).toMatch(/^\d+\.\d%$/);
      expect(result.displayInfo.utilizationPercentageDisplay).toMatch(/^\d+\.\d%$/);
      expect(['🟢 优秀', '🟡 良好', '🟠 一般', '🔴 较差']).toContain(result.displayInfo.efficiencyRatingDisplay);
      expect(['⚠️ 超出容量', '✅ 容量充足']).toContain(result.displayInfo.capacityStatusDisplay);

      // 验证内存分解信息
      expect(result.displayInfo.memoryBreakdown.totalNeeded).toMatch(/\d+\.\d+ GB/);
      expect(result.displayInfo.memoryBreakdown.totalAvailable).toMatch(/\d+\.\d+ GB/);
      expect(result.displayInfo.memoryBreakdown.systemOverhead).toMatch(/\d+\.\d+ GB/);
      expect(result.displayInfo.memoryBreakdown.fragmentation).toMatch(/\d+\.\d+ MB|GB/);
    });

    it('should handle over capacity scenarios correctly', () => {
      const result = demonstrateStandardizedUtilization(30, 24); // 需要30GB，只有24GB

      expect(result.result.isOverCapacity).toBe(true);
      expect(result.displayInfo.capacityStatusDisplay).toBe('⚠️ 超出容量');
      expect(result.result.utilizationPercentage).toBeGreaterThan(100);
    });

    it('should handle low utilization scenarios correctly', () => {
      const result = demonstrateStandardizedUtilization(2, 24); // 只需要2GB，有24GB

      expect(result.result.isOverCapacity).toBe(false);
      expect(result.displayInfo.capacityStatusDisplay).toBe('✅ 容量充足');
      expect(result.result.theoreticalUtilization).toBeLessThan(0.1);
    });

    it('should provide accurate memory breakdown calculations', () => {
      const result = demonstrateStandardizedUtilization(10, 24);

      // 验证内存分解的逻辑一致性
      const breakdown = result.displayInfo.memoryBreakdown;
      
      // 所有内存大小都应该是正数
      expect(breakdown.totalNeeded).toMatch(/^\d+\.\d+ (MB|GB)$/);
      expect(breakdown.totalAvailable).toMatch(/^\d+\.\d+ (MB|GB)$/);
      expect(breakdown.systemOverhead).toMatch(/^\d+\.\d+ (MB|GB)$/);
      expect(breakdown.fragmentation).toMatch(/^\d+\.\d+ (MB|GB)$/);
    });
  });

  describe('testMultipleScenarios', () => {
    it('should test various utilization scenarios', () => {
      const scenarios = testMultipleScenarios();

      expect(scenarios).toHaveLength(6);
      
      scenarios.forEach(scenario => {
        expect(scenario).toHaveProperty('scenario');
        expect(scenario).toHaveProperty('memoryNeeded');
        expect(scenario).toHaveProperty('gpuMemory');
        expect(scenario).toHaveProperty('result');
        expect(scenario).toHaveProperty('summary');

        // 验证结果的合理性
        expect(scenario.result.theoreticalUtilization).toBeGreaterThanOrEqual(0);
        expect(scenario.result.practicalUtilization).toBeGreaterThanOrEqual(0);
        expect(scenario.result.utilizationPercentage).toBeGreaterThanOrEqual(0);
        expect(['excellent', 'good', 'fair', 'poor']).toContain(scenario.result.efficiencyRating);
        expect(typeof scenario.result.isOverCapacity).toBe('boolean');

        // 验证摘要格式
        expect(scenario.summary).toContain(scenario.scenario);
        expect(scenario.summary).toMatch(/\d+\.\d%/); // 包含百分比
        expect(scenario.summary).toMatch(/[🟢🟡🟠🔴]/); // 包含效率等级图标
        expect(scenario.summary).toMatch(/[⚠️✅]/); // 包含容量状态图标
      });
    });

    it('should show different efficiency ratings for different scenarios', () => {
      const scenarios = testMultipleScenarios();
      
      // 应该有不同的效率等级
      const efficiencyRatings = scenarios.map(s => s.result.efficiencyRating);
      const uniqueRatings = new Set(efficiencyRatings);
      
      expect(uniqueRatings.size).toBeGreaterThan(1); // 至少有两种不同的等级
    });

    it('should identify over capacity scenarios correctly', () => {
      const scenarios = testMultipleScenarios();
      
      // 超大模型场景应该超出容量
      const overCapacityScenario = scenarios.find(s => s.scenario === '超大模型场景');
      expect(overCapacityScenario?.result.isOverCapacity).toBe(true);
      
      // 小模型场景应该不超出容量
      const smallModelScenario = scenarios.find(s => s.scenario === '小模型场景');
      expect(smallModelScenario?.result.isOverCapacity).toBe(false);
    });
  });

  describe('compareUtilizationMethods', () => {
    it('should provide comparison between standardized and legacy methods', () => {
      const comparison = compareUtilizationMethods(15, 24);

      expect(comparison).toHaveProperty('standardized');
      expect(comparison).toHaveProperty('differences');

      // 验证标准化结果
      expect(comparison.standardized).toHaveProperty('theoreticalUtilization');
      expect(comparison.standardized).toHaveProperty('practicalUtilization');
      expect(comparison.standardized).toHaveProperty('utilizationPercentage');
      expect(comparison.standardized).toHaveProperty('isOverCapacity');
      expect(comparison.standardized).toHaveProperty('efficiencyRating');

      // 验证差异说明
      expect(comparison.differences).toBeInstanceOf(Array);
      expect(comparison.differences.length).toBeGreaterThan(0);
      
      comparison.differences.forEach(diff => {
        expect(typeof diff).toBe('string');
        expect(diff).toMatch(/^✅/); // 每个差异都应该以✅开头
      });
    });

    it('should provide meaningful improvement descriptions', () => {
      const comparison = compareUtilizationMethods(10, 24);

      const expectedImprovements = [
        '统一的字节单位',
        '标准化的效率等级',
        '边界条件处理',
        '一致的接口结构'
      ];

      expectedImprovements.forEach(improvement => {
        const hasImprovement = comparison.differences.some(diff => 
          diff.includes(improvement) || diff.includes(improvement.replace(/的/g, ''))
        );
        expect(hasImprovement).toBe(true);
      });
    });
  });

  describe('Integration with existing components', () => {
    it('should provide data compatible with UtilizationDisplay component', () => {
      const result = demonstrateStandardizedUtilization(16, 24);

      // 验证数据格式与UtilizationDisplay组件期望的格式兼容
      expect(typeof result.result.theoreticalUtilization).toBe('number');
      expect(typeof result.result.practicalUtilization).toBe('number');
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.result.efficiencyRating);

      // 验证百分比计算正确
      expect(result.result.utilizationPercentage).toBeCloseTo(
        result.result.practicalUtilization * 100, 
        1
      );

      // 验证内存格式化与现有组件兼容
      expect(result.displayInfo.memoryBreakdown.totalNeeded).toMatch(/\d+\.\d+ (MB|GB|TB)/);
    });

    it('should handle edge cases that components might encounter', () => {
      // 测试零内存需求
      const zeroResult = demonstrateStandardizedUtilization(0, 24);
      expect(zeroResult.result.theoreticalUtilization).toBe(0);
      expect(zeroResult.result.practicalUtilization).toBe(0);
      expect(zeroResult.result.isOverCapacity).toBe(false);

      // 测试极小GPU内存
      const smallGpuResult = demonstrateStandardizedUtilization(10, 2);
      expect(smallGpuResult.result.isOverCapacity).toBe(true);
      expect(smallGpuResult.result.efficiencyRating).toBe('poor');

      // 测试极大内存需求
      const largeMemoryResult = demonstrateStandardizedUtilization(100, 24);
      expect(largeMemoryResult.result.isOverCapacity).toBe(true);
      expect(largeMemoryResult.result.utilizationPercentage).toBeGreaterThan(100);
    });
  });
});