import {
  calculateModelWeights,
  calculateActivations,
  calculateGradients,
  calculateOptimizerStates,
  calculateMemoryRequirements,
  validateModelParameters,
  optimizeBatchSize
} from '../memoryCalculator';
import { ModelParameters } from '../../types';

// 测试用的模型参数
const testParams: ModelParameters = {
  parameterCount: 7, // 7B参数
  precision: 'fp16',
  sequenceLength: 2048,
  batchSize: 1,
  hiddenSize: 4096,
  numLayers: 32,
  vocabularySize: 32000
};

describe('内存计算引擎测试', () => {
  
  describe('calculateModelWeights', () => {
    test('应该正确计算FP16精度下7B模型的权重内存', () => {
      const weights = calculateModelWeights(testParams);
      // 7B * 2 bytes ≈ 13GB (考虑1024进制转换)
      expect(weights).toBeCloseTo(13, 0.5);
    });
    
    test('应该正确计算FP32精度下的权重内存', () => {
      const fp32Params = { ...testParams, precision: 'fp32' as const };
      const weights = calculateModelWeights(fp32Params);
      // 7B * 4 bytes ≈ 26GB (考虑1024进制转换)
      expect(weights).toBeCloseTo(26, 0.5);
    });
  });
  
  describe('calculateActivations', () => {
    test('应该计算激活值内存', () => {
      const activations = calculateActivations(testParams);
      expect(activations).toBeGreaterThan(0);
      // 激活值内存应该相对较小
      expect(activations).toBeLessThan(10);
    });
    
    test('批处理大小增加应该增加激活值内存', () => {
      const batch1 = calculateActivations(testParams);
      const batch4 = calculateActivations({ ...testParams, batchSize: 4 });
      expect(batch4).toBeGreaterThan(batch1);
      // 应该大约是4倍关系（线性增长）
      expect(batch4 / batch1).toBeCloseTo(4, 0.5);
    });

    test('应该正确计算KV缓存内存', () => {
      // 计算总激活值
      const totalActivations = calculateActivations(testParams);
      
      // KV缓存应该是激活值的重要组成部分
      expect(totalActivations).toBeGreaterThan(0);
      
      // 验证KV缓存对内存的影响
      const noKvParams = { ...testParams, numLayers: 1 };
      const withKvParams = { ...testParams, numLayers: 32 };
      const noKvActivations = calculateActivations(noKvParams);
      const withKvActivations = calculateActivations(withKvParams);
      
      // 更多层应该导致更多KV缓存内存
      expect(withKvActivations).toBeGreaterThan(noKvActivations);
    });

    test('序列长度增加应该增加激活值内存', () => {
      const seq1024 = calculateActivations({ ...testParams, sequenceLength: 1024 });
      const seq4096 = calculateActivations({ ...testParams, sequenceLength: 4096 });
      expect(seq4096).toBeGreaterThan(seq1024);
      // 应该大约是4倍关系
      expect(seq4096 / seq1024).toBeCloseTo(4, 0.5);
    });

    test('不同精度应该影响激活值内存', () => {
      const fp32 = calculateActivations({ ...testParams, precision: 'fp32' });
      const fp16 = calculateActivations({ ...testParams, precision: 'fp16' });
      const int8 = calculateActivations({ ...testParams, precision: 'int8' });
      
      // FP32应该是FP16的2倍
      expect(fp32 / fp16).toBeCloseTo(2, 0.1);
      // FP16应该是INT8的2倍
      expect(fp16 / int8).toBeCloseTo(2, 0.1);
    });

    test('应该确保结果单位为GB', () => {
      const activations = calculateActivations(testParams);
      // 对于7B模型，激活值应该在合理的GB范围内
      expect(activations).toBeGreaterThan(0.1); // 至少100MB
      expect(activations).toBeLessThan(100);    // 不超过100GB
    });
  });
  
  describe('calculateGradients', () => {
    test('梯度内存应该等于权重内存', () => {
      const weights = calculateModelWeights(testParams);
      const gradients = calculateGradients(weights);
      expect(gradients).toBe(weights);
    });
  });
  
  describe('calculateOptimizerStates', () => {
    test('Adam优化器状态应该是权重的2倍', () => {
      const weights = calculateModelWeights(testParams);
      const optimizer = calculateOptimizerStates(weights, 'adam');
      expect(optimizer).toBe(weights * 2);
    });
    
    test('SGD优化器状态应该等于权重', () => {
      const weights = calculateModelWeights(testParams);
      const optimizer = calculateOptimizerStates(weights, 'sgd');
      expect(optimizer).toBe(weights);
    });
  });
  
  describe('calculateMemoryRequirements', () => {
    test('推理模式应该只包含权重和激活值', () => {
      const result = calculateMemoryRequirements(testParams, 'inference');
      
      expect(result.inference.modelWeights).toBeGreaterThan(0);
      expect(result.inference.activations).toBeGreaterThan(0);
      expect(result.inference.total).toBe(result.inference.modelWeights + result.inference.activations);
      // 推理模式下，训练相关的内存应该为0
      expect(result.training.gradients).toBe(0);
      expect(result.training.optimizerStates).toBe(0);
    });
    
    test('训练模式应该包含所有内存类型', () => {
      const result = calculateMemoryRequirements(testParams, 'training');
      
      expect(result.training.modelWeights).toBeGreaterThan(0);
      expect(result.training.activations).toBeGreaterThan(0);
      expect(result.training.gradients).toBeGreaterThan(0);
      expect(result.training.optimizerStates).toBeGreaterThan(0);
      expect(result.training.total).toBe(
        result.training.modelWeights + result.training.activations + result.training.gradients + result.training.optimizerStates
      );
    });
    
    test('应该生成硬件推荐', () => {
      const result = calculateMemoryRequirements(testParams, 'inference');
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
    });
  });
  
  describe('validateModelParameters', () => {
    test('有效参数应该通过验证', () => {
      const validation = validateModelParameters(testParams);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    test('无效参数应该返回错误', () => {
      const invalidParams = { ...testParams, parameterCount: -1 };
      const validation = validateModelParameters(invalidParams);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('optimizeBatchSize', () => {
    test('应该找到最优批处理大小', () => {
      const result = optimizeBatchSize(testParams, 50, 'inference'); // 50GB限制
      expect(result.optimalBatchSize).toBeGreaterThanOrEqual(1);
      expect(result.memoryUsage).toBeLessThanOrEqual(50);
      expect(result.utilizationRate).toBeLessThanOrEqual(1);
      expect(result.analysisData).toBeDefined();
      expect(result.analysisData.length).toBeGreaterThan(0);
    });
    
    test('内存限制很小时应该返回批处理大小1', () => {
      const result = optimizeBatchSize(testParams, 5, 'inference'); // 5GB限制
      expect(result.optimalBatchSize).toBe(1);
      // 对于小内存限制，应该有警告或建议
      expect(result.warnings.length + result.recommendations.length).toBeGreaterThan(0);
    });

    test('应该正确计算安全边距', () => {
      const result = optimizeBatchSize(testParams, 48, 'inference', 0.8); // 80%安全边距
      const safeMemoryLimit = 48 * 0.8;
      expect(result.memoryUsage).toBeLessThanOrEqual(safeMemoryLimit);
    });

    test('应该返回详细的分析数据', () => {
      const result = optimizeBatchSize(testParams, 48, 'inference');
      expect(result.analysisData).toBeDefined();
      
      result.analysisData.forEach(point => {
        expect(point.batchSize).toBeGreaterThan(0);
        expect(point.memoryUsage).toBeGreaterThan(0);
        expect(point.utilizationRate).toBeGreaterThanOrEqual(0);
        expect(typeof point.withinLimit).toBe('boolean');
        expect(typeof point.safetyMarginExceeded).toBe('boolean');
      });
    });

    test('应该在输入无效时返回错误结果', () => {
      const result1 = optimizeBatchSize(testParams, 0, 'inference');
      expect(result1.validation.isValid).toBe(false);
      expect(result1.validation.errorMessage).toContain('输入参数验证失败');
      
      const result2 = optimizeBatchSize(testParams, 48, 'inference', 1.5);
      expect(result2.validation.isValid).toBe(false);
      expect(result2.validation.errorMessage).toContain('输入参数验证失败');
    });

    test('应该包含增强的分析数据', () => {
      const result = optimizeBatchSize(testParams, 48, 'inference');
      
      // 验证新的分析数据字段
      result.analysisData.forEach(point => {
        expect(typeof point.estimatedThroughput).toBe('number');
        expect(point.memoryBreakdown).toBeDefined();
        expect(point.memoryBreakdown?.weights).toBeGreaterThan(0);
        expect(point.memoryBreakdown?.activations).toBeGreaterThan(0);
      });
      
      // 验证性能估算
      expect(result.performanceEstimate).toBeDefined();
      expect(typeof result.performanceEstimate?.throughputImprovement).toBe('number');
      expect(typeof result.performanceEstimate?.memoryEfficiency).toBe('number');
      expect(typeof result.performanceEstimate?.recommendedForTraining).toBe('boolean');
      expect(typeof result.performanceEstimate?.recommendedForInference).toBe('boolean');
      
      // 验证验证结果
      expect(result.validation).toBeDefined();
      expect(typeof result.validation.isValid).toBe('boolean');
      expect(Array.isArray(result.validation.warnings)).toBe(true);
      expect(Array.isArray(result.validation.recommendations)).toBe(true);
      expect(['high', 'medium', 'low']).toContain(result.validation.confidence);
      
      // 验证新的结果字段
      expect(typeof result.safetyMargin).toBe('number');
      expect(typeof result.maxMemoryLimit).toBe('number');
    });

    test('应该生成合理的警告和建议', () => {
      // 测试高内存使用率警告 - 使用更小的内存限制
      const highMemoryResult = optimizeBatchSize(testParams, 14, 'inference');
      expect(highMemoryResult.warnings.length + highMemoryResult.recommendations.length).toBeGreaterThan(0);
      
      // 测试低内存利用率建议
      const lowMemoryResult = optimizeBatchSize(testParams, 200, 'inference');
      expect(lowMemoryResult.recommendations.length).toBeGreaterThan(0);
    });

    test('应该正确处理不同的安全边距', () => {
      const result1 = optimizeBatchSize(testParams, 48, 'inference', 0.8);
      const result2 = optimizeBatchSize(testParams, 48, 'inference', 0.95);
      
      expect(result1.safetyMargin).toBe(0.8);
      expect(result2.safetyMargin).toBe(0.95);
      
      // 更严格的安全边距应该产生更小的最优批处理大小
      expect(result1.optimalBatchSize).toBeLessThanOrEqual(result2.optimalBatchSize);
    });

    test('应该为训练和推理模式生成不同的建议', () => {
      const inferenceResult = optimizeBatchSize(testParams, 48, 'inference');
      const trainingResult = optimizeBatchSize(testParams, 80, 'training'); // 使用更大的内存限制
      
      // 验证两个结果都是有效的
      expect(inferenceResult.validation.isValid).toBe(true);
      expect(trainingResult.validation.isValid).toBe(true);
      
      // 训练模式通常需要更多内存，因此最优批处理大小可能更小
      expect(trainingResult.memoryUsage).toBeGreaterThan(inferenceResult.memoryUsage);
      
      // 验证内存分解包含训练特有的字段
      const trainingPoint = trainingResult.analysisData[0];
      expect(trainingPoint.memoryBreakdown?.gradients).toBeDefined();
      expect(trainingPoint.memoryBreakdown?.optimizer).toBeDefined();
    });
  });
});

// 内存单位一致性测试
describe('内存单位一致性测试', () => {
  test('所有内存计算结果应该使用GB单位', () => {
    const result = calculateMemoryRequirements(testParams, 'training');
    
    // 验证所有内存值都是合理的GB数值
    expect(result.inference.modelWeights).toBeGreaterThan(0);
    expect(result.inference.activations).toBeGreaterThan(0);
    expect(result.training.gradients).toBeGreaterThan(0);
    expect(result.training.optimizerStates).toBeGreaterThan(0);
    
    // 验证数值范围合理（对于7B模型）
    expect(result.inference.modelWeights).toBeLessThan(100);
    expect(result.inference.activations).toBeLessThan(100);
    expect(result.training.gradients).toBeLessThan(100);
    expect(result.training.optimizerStates).toBeLessThan(100);
  });

  test('批处理优化结果应该使用GB单位', () => {
    const result = optimizeBatchSize(testParams, 48, 'inference');
    
    expect(result.memoryUsage).toBeGreaterThan(0);
    expect(result.memoryUsage).toBeLessThan(100);
    
    result.analysisData.forEach(point => {
      expect(point.memoryUsage).toBeGreaterThan(0);
      expect(point.memoryUsage).toBeLessThan(100);
    });
  });

  test('内存计算应该保持精度', () => {
    // 测试小模型的精度
    const smallModel: ModelParameters = {
      ...testParams,
      parameterCount: 0.1, // 100M参数
    };
    
    const result = calculateMemoryRequirements(smallModel, 'inference');
    expect(result.inference.modelWeights).toBeCloseTo(0.186, 1); // 约0.2GB
    expect(result.inference.total).toBeGreaterThan(0.1);
  });
});

// 集成测试
describe('内存计算集成测试', () => {
  test('LLaMA 7B推理模式完整计算', () => {
    const result = calculateMemoryRequirements(testParams, 'inference');
    
    // 验证结果结构
    expect(result).toHaveProperty('parameters');
    expect(result).toHaveProperty('inference');
    expect(result).toHaveProperty('training');
    expect(result).toHaveProperty('recommendations');
    
    // 验证数值合理性
    expect(result.inference.total).toBeGreaterThan(10); // 至少10GB
    expect(result.inference.total).toBeLessThan(100);   // 不超过100GB
    
    // 验证推理和训练数据都存在
    expect(result.inference.modelWeights).toBeGreaterThan(0);
    expect(result.inference.activations).toBeGreaterThan(0);
    expect(result.training.modelWeights).toBeGreaterThan(0);
    expect(result.training.activations).toBeGreaterThan(0);
  });
  
  test('GPT-3.5规模训练模式完整计算', () => {
    const gpt35Params: ModelParameters = {
      parameterCount: 175,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 12288,
      numLayers: 96,
      vocabularySize: 50257
    };
    
    const result = calculateMemoryRequirements(gpt35Params, 'training');
    
    // 训练模式应该包含所有内存类型
    expect(result.training.gradients).toBeDefined();
    expect(result.training.optimizerStates).toBeDefined();
    
    // 总内存应该显著大于推理模式
    const inferenceResult = calculateMemoryRequirements(gpt35Params, 'inference');
    expect(result.training.total).toBeGreaterThan(inferenceResult.inference.total * 3);
  });
});