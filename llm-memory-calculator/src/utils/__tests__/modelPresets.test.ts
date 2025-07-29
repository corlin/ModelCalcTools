import { getModelById, getModelsByCategory, getAllCategories } from '../modelPresets';
import { ModelCategory } from '../../types';

describe('Model Presets', () => {
  describe('DeepSeek Models', () => {
    test('should include DeepSeek-R1 model', () => {
      const deepseekR1 = getModelById('deepseek-r1');
      
      expect(deepseekR1).toBeDefined();
      expect(deepseekR1?.name).toBe('DeepSeek-R1');
      expect(deepseekR1?.category).toBe('deepseek');
      expect(deepseekR1?.parameters.parameterCount).toBe(671);
      expect(deepseekR1?.popular).toBe(true);
      expect(deepseekR1?.tags).toContain('推理优化');
      expect(deepseekR1?.specialFeatures).toContain('推理优化');
      expect(deepseekR1?.recommendedUseCase).toContain('复杂推理任务');
    });

    test('should include DeepSeek-R1-Distill-Qwen-32B model', () => {
      const deepseekDistill = getModelById('deepseek-r1-distill-qwen-32b');
      
      expect(deepseekDistill).toBeDefined();
      expect(deepseekDistill?.name).toBe('DeepSeek-R1-Distill-Qwen-32B');
      expect(deepseekDistill?.category).toBe('deepseek');
      expect(deepseekDistill?.parameters.parameterCount).toBe(32);
      expect(deepseekDistill?.popular).toBe(true);
      expect(deepseekDistill?.tags).toContain('蒸馏优化');
      expect(deepseekDistill?.specialFeatures).toContain('蒸馏优化');
      expect(deepseekDistill?.recommendedUseCase).toContain('资源受限环境');
    });

    test('should return DeepSeek models when filtering by category', () => {
      const deepseekModels = getModelsByCategory('deepseek');
      
      expect(deepseekModels).toHaveLength(2);
      expect(deepseekModels.map(m => m.id)).toContain('deepseek-r1');
      expect(deepseekModels.map(m => m.id)).toContain('deepseek-r1-distill-qwen-32b');
    });

    test('should include deepseek in all categories', () => {
      const categories = getAllCategories();
      
      expect(categories).toContain('deepseek' as ModelCategory);
    });
  });

  describe('Model Configuration Validation', () => {
    test('DeepSeek-R1 should have correct parameters', () => {
      const model = getModelById('deepseek-r1');
      
      expect(model?.parameters).toEqual({
        parameterCount: 671,
        precision: 'fp16',
        sequenceLength: 8192,
        batchSize: 1,
        hiddenSize: 11008,
        numLayers: 64,
        vocabularySize: 102400
      });
    });

    test('DeepSeek-R1-Distill-Qwen-32B should have correct parameters', () => {
      const model = getModelById('deepseek-r1-distill-qwen-32b');
      
      expect(model?.parameters).toEqual({
        parameterCount: 32,
        precision: 'fp16',
        sequenceLength: 8192,
        batchSize: 1,
        hiddenSize: 5120,
        numLayers: 64,
        vocabularySize: 151936
      });
    });
  });

  describe('Special Features and Tags', () => {
    test('DeepSeek models should have appropriate tags', () => {
      const deepseekR1 = getModelById('deepseek-r1');
      const deepseekDistill = getModelById('deepseek-r1-distill-qwen-32b');

      expect(deepseekR1?.tags).toEqual(
        expect.arrayContaining(['推理优化', '大规模参数', '高性能', '671B', 'reasoning'])
      );
      
      expect(deepseekDistill?.tags).toEqual(
        expect.arrayContaining(['蒸馏优化', '高效推理', 'Qwen架构', '32B', 'distilled'])
      );
    });

    test('DeepSeek models should have special features', () => {
      const deepseekR1 = getModelById('deepseek-r1');
      const deepseekDistill = getModelById('deepseek-r1-distill-qwen-32b');

      expect(deepseekR1?.specialFeatures).toEqual(['推理优化', '大规模参数', '高性能推理']);
      expect(deepseekDistill?.specialFeatures).toEqual(['蒸馏优化', '高效推理', 'Qwen架构兼容']);
    });

    test('DeepSeek models should have recommended use cases', () => {
      const deepseekR1 = getModelById('deepseek-r1');
      const deepseekDistill = getModelById('deepseek-r1-distill-qwen-32b');

      expect(deepseekR1?.recommendedUseCase).toBe('复杂推理任务、代码生成、数学问题求解、逻辑推理');
      expect(deepseekDistill?.recommendedUseCase).toBe('资源受限环境、快速推理、生产部署、高效对话');
    });
  });
});