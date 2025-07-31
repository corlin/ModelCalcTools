import { MemoryBreakdownCalculator } from '../MemoryBreakdownCalculator';
import { MemoryCalculationResult } from '../../types';
import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('MemoryBreakdownCalculator Integration Tests', () => {
  describe('Percentage calculation accuracy', () => {
    it('should ensure percentages always sum to exactly 100%', () => {
      const testResult: MemoryCalculationResult = {
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
      };

      // Test inference mode
      const inferenceBreakdown = MemoryBreakdownCalculator.calculateBreakdown(testResult, 'inference');
      const inferenceTotal = inferenceBreakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(inferenceTotal).toBeCloseTo(100, 2);

      // Test training mode
      const trainingBreakdown = MemoryBreakdownCalculator.calculateBreakdown(testResult, 'training');
      const trainingTotal = trainingBreakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(trainingTotal).toBeCloseTo(100, 2);
    });

    it('should handle edge cases with very small memory values', () => {
      const testResult: MemoryCalculationResult = {
        parameters: {
          parameterCount: 0.1,
          precision: 'fp16',
          sequenceLength: 512,
          batchSize: 1,
          hiddenSize: 512,
          numLayers: 6,
          vocabularySize: 10000
        },
        inference: {
          modelWeights: 0.2,
          activations: 0.05,
          total: 0.25
        },
        training: {
          modelWeights: 0.2,
          activations: 0.1,
          gradients: 0.2,
          optimizerStates: 0.4,
          total: 0.9
        }
      };

      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(testResult, 'training');
      const total = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(total).toBeCloseTo(100, 2);
      
      // Verify all percentages are positive
      breakdown.forEach(item => {
        expect(item.percentage).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle cases with uneven memory distribution', () => {
      const testResult: MemoryCalculationResult = {
        parameters: {
          parameterCount: 13,
          precision: 'fp16',
          sequenceLength: 4096,
          batchSize: 2,
          hiddenSize: 5120,
          numLayers: 40,
          vocabularySize: 50000
        },
        training: {
          modelWeights: 26.3,
          activations: 8.7,
          gradients: 26.3,
          optimizerStates: 52.6,
          total: 113.9
        },
        inference: {
          modelWeights: 26.3,
          activations: 4.35,
          total: 30.65
        }
      };

      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(testResult, 'training');
      const total = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(total).toBeCloseTo(100, 2);

      // Verify the largest component (optimizer states) has the highest percentage
      const optimizerItem = breakdown.find(item => item.label === '优化器状态');
      expect(optimizerItem).toBeDefined();
      expect(optimizerItem!.percentage).toBeGreaterThan(40); // Should be around 46%
    });
  });

  describe('GPU Memory Breakdown Integration', () => {
    it('should correctly calculate GPU memory breakdown with realistic values', () => {
      const gpuMemoryGB = 24; // RTX 4090
      const modelMemoryGB = 16;
      const systemOverheadGB = 2;
      const fragmentationGB = 1;
      const safetyBufferGB = 1;

      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(gpuMemoryGB);
      const usedMemoryBytes = MemoryUnitConverter.gbToBytes(modelMemoryGB);
      const systemOverheadBytes = MemoryUnitConverter.gbToBytes(systemOverheadGB);
      const fragmentationBytes = MemoryUnitConverter.gbToBytes(fragmentationGB);
      const safetyBufferBytes = MemoryUnitConverter.gbToBytes(safetyBufferGB);

      const breakdown = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(
        gpuMemoryBytes,
        usedMemoryBytes,
        systemOverheadBytes,
        fragmentationBytes,
        safetyBufferBytes
      );

      // Verify all items are present
      expect(breakdown.length).toBeGreaterThan(0);
      
      // Verify percentages sum to 100%
      const totalPercentage = breakdown.reduce((sum, item) => sum + item.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // Verify specific calculations
      const baseItem = breakdown.find(item => item.label === '基础需求');
      expect(baseItem).toBeDefined();
      expect(baseItem!.percentage).toBeCloseTo(50, 2); // 12GB / 24GB = 50%

      const availableItem = breakdown.find(item => item.label === '可用内存');
      expect(availableItem).toBeDefined();
      expect(availableItem!.percentage).toBeCloseTo(33.33, 1); // 8GB / 24GB = 33.33%
    });

    it('should validate breakdown data consistency', () => {
      const gpuMemoryBytes = MemoryUnitConverter.gbToBytes(32);
      const usedMemoryBytes = MemoryUnitConverter.gbToBytes(20);
      
      const breakdown = MemoryBreakdownCalculator.calculateGPUMemoryBreakdown(
        gpuMemoryBytes,
        usedMemoryBytes
      );

      const validation = MemoryBreakdownCalculator.validateBreakdown(breakdown, gpuMemoryBytes);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Memory unit consistency', () => {
    it('should maintain consistent memory units across calculations', () => {
      const testResult: MemoryCalculationResult = {
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
      };

      const breakdown = MemoryBreakdownCalculator.calculateBreakdown(testResult, 'training');
      
      // Verify all byte values are consistent with GB values
      const weightsItem = breakdown.find(item => item.label === '模型权重');
      expect(weightsItem).toBeDefined();
      expect(weightsItem!.valueBytes).toBe(MemoryUnitConverter.gbToBytes(14.0));

      const activationsItem = breakdown.find(item => item.label === '激活值');
      expect(activationsItem).toBeDefined();
      expect(activationsItem!.valueBytes).toBe(MemoryUnitConverter.gbToBytes(4.0));

      const gradientsItem = breakdown.find(item => item.label === '梯度');
      expect(gradientsItem).toBeDefined();
      expect(gradientsItem!.valueBytes).toBe(MemoryUnitConverter.gbToBytes(14.0));

      const optimizerItem = breakdown.find(item => item.label === '优化器状态');
      expect(optimizerItem).toBeDefined();
      expect(optimizerItem!.valueBytes).toBe(MemoryUnitConverter.gbToBytes(28.0));

      // Verify total bytes match expected total
      const totalBytes = breakdown.reduce((sum, item) => sum + item.valueBytes, 0);
      expect(totalBytes).toBe(MemoryUnitConverter.gbToBytes(60.0));
    });
  });
});