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
    });
    
    test('内存限制很小时应该返回批处理大小1', () => {
      const result = optimizeBatchSize(testParams, 5, 'inference'); // 5GB限制
      expect(result.optimalBatchSize).toBe(1);
    });
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