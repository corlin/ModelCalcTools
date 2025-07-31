import BenchmarkProcessor, { 
  PerformancePrediction
} from '../benchmarkProcessor';
import { ModelParameters, ExtendedBenchmarkData, PrecisionType } from '../../types';
import { PERFORMANCE_BENCHMARKS } from '../../constants/performanceBenchmarks';

describe('BenchmarkProcessor', () => {
  const mockModelParams: ModelParameters = {
    parameterCount: 7,
    precision: 'fp16',
    sequenceLength: 2048,
    batchSize: 1,
    hiddenSize: 4096,
    numLayers: 32,
    vocabularySize: 32000
  };

  const mockBenchmarkData: ExtendedBenchmarkData = {
    llmInference: {
      tokensPerSecond: 2847,
      memoryEfficiency: 0.87,
      powerEfficiency: 6.33
    },
    llmTraining: {
      samplesPerSecond: 156,
      gradientThroughput: 1.2,
      memoryUtilization: 0.92
    },
    syntheticBenchmarks: {
      fp16Performance: 165.2,
      int8Performance: 660.8,
      memoryBandwidthUtilization: 0.85
    },
    testConditions: {
      modelSize: '7B',
      batchSize: 1,
      sequenceLength: 2048,
      precision: 'fp16',
      framework: 'PyTorch'
    },
    credibilityScore: 0.95,
    dataSource: 'nvidia_official',
    verified: true,
    testDate: new Date('2024-01-15')
  };

  describe('normalizeBenchmarks', () => {
    it('should normalize benchmark data correctly', () => {
      const rawBenchmarks = [mockBenchmarkData];
      const normalized = BenchmarkProcessor.normalizeBenchmarks(rawBenchmarks);
      
      expect(Object.keys(normalized)).toHaveLength(1);
      
      const result = Object.values(normalized)[0];
      expect(result.normalizedScore).toBeGreaterThan(0);
      expect(result.normalizedScore).toBeLessThanOrEqual(200);
      expect(result.dataQuality).toBeGreaterThan(0);
      expect(result.dataQuality).toBeLessThanOrEqual(1);
      expect(result.sourceCredibility).toBeCloseTo(0.95, 1);
      expect(result.confidenceInterval.lower).toBeLessThan(result.confidenceInterval.upper);
    });

    it('should handle empty benchmark array', () => {
      const normalized = BenchmarkProcessor.normalizeBenchmarks([]);
      expect(Object.keys(normalized)).toHaveLength(0);
    });

    it('should calculate confidence intervals correctly', () => {
      const benchmarkWithVariance = {
        ...mockBenchmarkData,
        additionalMetrics: {
          throughputVariance: 0.1
        }
      };
      
      const normalized = BenchmarkProcessor.normalizeBenchmarks([benchmarkWithVariance]);
      const result = Object.values(normalized)[0];
      
      expect(result.confidenceInterval.lower).toBeGreaterThan(0);
      expect(result.confidenceInterval.upper).toBeGreaterThan(result.confidenceInterval.lower);
    });
  });

  describe('predictPerformance', () => {
    it('should predict performance for RTX 4090', () => {
      const prediction = BenchmarkProcessor.predictPerformance('rtx-4090', mockModelParams);
      
      expect(prediction.predictedTokensPerSecond).toBeGreaterThan(0);
      expect(prediction.predictedMemoryEfficiency).toBeGreaterThan(0);
      expect(prediction.predictedMemoryEfficiency).toBeLessThanOrEqual(1);
      expect(prediction.predictedPowerEfficiency).toBeGreaterThan(0);
      expect(prediction.confidenceLevel).toBeGreaterThan(0);
      expect(prediction.confidenceLevel).toBeLessThanOrEqual(1);
      expect(prediction.predictionMethod).toBeDefined();
      expect(Array.isArray(prediction.basedOnBenchmarks)).toBe(true);
      expect(Array.isArray(prediction.limitations)).toBe(true);
    });

    it('should handle unknown GPU with fallback prediction', () => {
      const prediction = BenchmarkProcessor.predictPerformance('unknown-gpu', mockModelParams);
      
      expect(prediction.predictedTokensPerSecond).toBeGreaterThan(0);
      expect(prediction.confidenceLevel).toBeLessThan(0.5); // 低可信度
      expect(prediction.predictionMethod).toBe('specification_based_estimation');
      expect(prediction.basedOnBenchmarks).toHaveLength(0);
      expect(prediction.limitations.length).toBeGreaterThan(0);
    });

    it('should adjust predictions based on model size', () => {
      const smallModelParams = { ...mockModelParams, parameterCount: 1 };
      const largeModelParams = { ...mockModelParams, parameterCount: 70 };
      
      const smallPrediction = BenchmarkProcessor.predictPerformance('rtx-4090', smallModelParams);
      const largePrediction = BenchmarkProcessor.predictPerformance('rtx-4090', largeModelParams);
      
      // 小模型应该有更高的吞吐量
      expect(smallPrediction.predictedTokensPerSecond).toBeGreaterThan(
        largePrediction.predictedTokensPerSecond
      );
    });

    it('should consider batch size in predictions', () => {
      const smallBatchParams = { ...mockModelParams, batchSize: 1 };
      const largeBatchParams = { ...mockModelParams, batchSize: 8 };
      
      const smallBatchPrediction = BenchmarkProcessor.predictPerformance('rtx-4090', smallBatchParams);
      const largeBatchPrediction = BenchmarkProcessor.predictPerformance('rtx-4090', largeBatchParams);
      
      // 大批处理应该有不同的性能特征
      expect(smallBatchPrediction.predictedTokensPerSecond).not.toBe(
        largeBatchPrediction.predictedTokensPerSecond
      );
    });
  });

  describe('calculateRelativePerformance', () => {
    it('should calculate relative performance correctly', () => {
      const relativePerf = BenchmarkProcessor.calculateRelativePerformance('rtx-4090', 'rtx-4090');
      
      expect(relativePerf.relativeScore).toBeCloseTo(100, 1); // 自己比自己应该是100
      expect(relativePerf.performanceRatio).toBeCloseTo(1, 2);
      expect(relativePerf.confidenceLevel).toBeGreaterThan(0);
      expect(relativePerf.comparisonBasis).toBeDefined();
    });

    it('should handle comparison with different GPUs', () => {
      const relativePerf = BenchmarkProcessor.calculateRelativePerformance('h100', 'rtx-4090');
      
      expect(relativePerf.relativeScore).toBeGreaterThan(100); // H100应该比RTX 4090强
      expect(relativePerf.performanceRatio).toBeGreaterThan(1);
      expect(relativePerf.confidenceLevel).toBeGreaterThan(0);
    });

    it('should handle unknown GPU comparison', () => {
      const relativePerf = BenchmarkProcessor.calculateRelativePerformance('unknown-gpu', 'rtx-4090');
      
      expect(relativePerf.relativeScore).toBe(50); // 默认评分
      expect(relativePerf.performanceRatio).toBe(0.5);
      expect(relativePerf.confidenceLevel).toBe(0.1);
      expect(relativePerf.comparisonBasis).toBe('insufficient_data');
    });
  });

  describe('Data Quality Assessment', () => {
    it('should assess data quality based on freshness', () => {
      const freshBenchmark = {
        ...mockBenchmarkData,
        testDate: new Date() // 今天的数据
      };
      
      const oldBenchmark = {
        ...mockBenchmarkData,
        testDate: new Date('2023-01-01') // 旧数据
      };
      
      const freshNormalized = BenchmarkProcessor.normalizeBenchmarks([freshBenchmark]);
      const oldNormalized = BenchmarkProcessor.normalizeBenchmarks([oldBenchmark]);
      
      const freshQuality = Object.values(freshNormalized)[0].dataQuality;
      const oldQuality = Object.values(oldNormalized)[0].dataQuality;
      
      expect(freshQuality).toBeGreaterThan(oldQuality);
    });

    it('should assess data quality based on verification status', () => {
      const verifiedBenchmark = {
        ...mockBenchmarkData,
        verified: true
      };
      
      const unverifiedBenchmark = {
        ...mockBenchmarkData,
        verified: false
      };
      
      const verifiedNormalized = BenchmarkProcessor.normalizeBenchmarks([verifiedBenchmark]);
      const unverifiedNormalized = BenchmarkProcessor.normalizeBenchmarks([unverifiedBenchmark]);
      
      const verifiedQuality = Object.values(verifiedNormalized)[0].dataQuality;
      const unverifiedQuality = Object.values(unverifiedNormalized)[0].dataQuality;
      
      expect(verifiedQuality).toBeGreaterThan(unverifiedQuality);
    });

    it('should assess data quality based on source credibility', () => {
      const highCredibilityBenchmark = {
        ...mockBenchmarkData,
        credibilityScore: 0.95
      };
      
      const lowCredibilityBenchmark = {
        ...mockBenchmarkData,
        credibilityScore: 0.5
      };
      
      const highCredNormalized = BenchmarkProcessor.normalizeBenchmarks([highCredibilityBenchmark]);
      const lowCredNormalized = BenchmarkProcessor.normalizeBenchmarks([lowCredibilityBenchmark]);
      
      const highCredQuality = Object.values(highCredNormalized)[0].dataQuality;
      const lowCredQuality = Object.values(lowCredNormalized)[0].dataQuality;
      
      expect(highCredQuality).toBeGreaterThan(lowCredQuality);
    });
  });

  describe('Parameter Matching', () => {
    it('should match parameters correctly for exact match', () => {
      const exactMatchParams = {
        ...mockModelParams,
        parameterCount: 7 // 匹配7B模型
      };
      
      const prediction = BenchmarkProcessor.predictPerformance('rtx-4090', exactMatchParams);
      expect(prediction.confidenceLevel).toBeGreaterThan(0.4); // 合理可信度
    });

    it('should handle parameter mismatches with lower confidence', () => {
      const mismatchParams = {
        ...mockModelParams,
        parameterCount: 175, // 很大的模型，没有直接基准
        batchSize: 32,       // 不同的批处理大小
        precision: 'fp32' as PrecisionType    // 不同的精度
      };
      
      const prediction = BenchmarkProcessor.predictPerformance('rtx-4090', mismatchParams);
      expect(prediction.confidenceLevel).toBeLessThan(0.7); // 较低可信度
      expect(prediction.limitations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme model parameters', () => {
      const extremeParams = {
        ...mockModelParams,
        parameterCount: 1000, // 极大模型
        batchSize: 1024,      // 极大批处理
        sequenceLength: 32768 // 极长序列
      };
      
      const prediction = BenchmarkProcessor.predictPerformance('rtx-4090', extremeParams);
      expect(prediction.predictedTokensPerSecond).toBeGreaterThan(0);
      expect(prediction.limitations.length).toBeGreaterThan(0);
    });

    it('should handle minimal model parameters', () => {
      const minimalParams = {
        ...mockModelParams,
        parameterCount: 0.1,  // 极小模型
        batchSize: 1,
        sequenceLength: 128
      };
      
      const prediction = BenchmarkProcessor.predictPerformance('rtx-4090', minimalParams);
      expect(prediction.predictedTokensPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Integration with Real Data', () => {
    it('should work with actual benchmark data from constants', () => {
      const testName = 'llama-7b-inference';
      const test = PERFORMANCE_BENCHMARKS.standardInferenceTests[testName];
      
      expect(test).toBeDefined();
      expect(test.results['rtx-4090']).toBeDefined();
      
      const gpuResult = test.results['rtx-4090'];
      expect(gpuResult.llmInference.tokensPerSecond).toBeGreaterThan(0);
      expect(gpuResult.credibilityScore).toBeGreaterThan(0);
      expect(gpuResult.verified).toBe(true);
    });

    it('should handle multiple GPU comparisons', () => {
      const gpuIds = ['rtx-4090', 'rtx-4080', 'a100-80gb', 'h100'];
      const predictions: Record<string, PerformancePrediction> = {};
      
      gpuIds.forEach(gpuId => {
        predictions[gpuId] = BenchmarkProcessor.predictPerformance(gpuId, mockModelParams);
      });
      
      // H100应该是最快的
      expect(predictions['h100'].predictedTokensPerSecond).toBeGreaterThan(
        predictions['rtx-4090'].predictedTokensPerSecond
      );
      
      // RTX 4090应该比RTX 4080快
      expect(predictions['rtx-4090'].predictedTokensPerSecond).toBeGreaterThan(
        predictions['rtx-4080'].predictedTokensPerSecond
      );
    });
  });

  describe('Performance Scaling', () => {
    it('should scale performance correctly with model size', () => {
      const sizes = [1, 7, 13, 70];
      const predictions = sizes.map(size => {
        const params = { ...mockModelParams, parameterCount: size };
        return BenchmarkProcessor.predictPerformance('rtx-4090', params);
      });
      
      // 性能应该随模型大小递减
      for (let i = 0; i < predictions.length - 1; i++) {
        expect(predictions[i].predictedTokensPerSecond).toBeGreaterThanOrEqual(
          predictions[i + 1].predictedTokensPerSecond
        );
      }
    });

    it('should handle precision scaling', () => {
      const precisions: PrecisionType[] = ['fp32', 'fp16', 'int8'];
      const predictions = precisions.map(precision => {
        const params = { ...mockModelParams, precision };
        return BenchmarkProcessor.predictPerformance('rtx-4090', params);
      });
      
      // INT8应该比FP16快，FP16应该比FP32快
      expect(predictions[2].predictedTokensPerSecond).toBeGreaterThanOrEqual(
        predictions[1].predictedTokensPerSecond
      );
      expect(predictions[1].predictedTokensPerSecond).toBeGreaterThanOrEqual(
        predictions[0].predictedTokensPerSecond
      );
    });
  });
});

// 辅助函数测试
describe('Benchmark Helper Functions', () => {
  it('should process GPU benchmarks correctly', async () => {
    const { processGPUBenchmarks } = await import('../benchmarkProcessor');
    
    const results = processGPUBenchmarks('rtx-4090');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    results.forEach(result => {
      expect(result.normalizedScore).toBeGreaterThan(0);
      expect(result.dataQuality).toBeGreaterThan(0);
      expect(result.dataQuality).toBeLessThanOrEqual(1);
    });
  });

  it('should handle GPU with no benchmark data', async () => {
    const { processGPUBenchmarks } = await import('../benchmarkProcessor');
    
    const results = processGPUBenchmarks('non-existent-gpu');
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});