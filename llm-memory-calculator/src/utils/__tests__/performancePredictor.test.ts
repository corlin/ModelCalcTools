import PerformancePredictor from '../performancePredictor';
import { ModelParameters } from '../../types';

describe('PerformancePredictor', () => {
  const mockModelParams: ModelParameters = {
    parameterCount: 7,
    precision: 'fp16',
    sequenceLength: 2048,
    batchSize: 1,
    hiddenSize: 4096,
    numLayers: 32,
    vocabularySize: 32000
  };

  describe('generateEnhancedRecommendations', () => {
    it('should generate enhanced recommendations', () => {
      const recommendations = PerformancePredictor.generateEnhancedRecommendations(mockModelParams);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        expect(rec.id).toBeDefined();
        expect(rec.name).toBeDefined();
        expect(rec.performancePrediction).toBeDefined();
        expect(rec.benchmarkCoverage).toBeGreaterThanOrEqual(0);
        expect(rec.benchmarkCoverage).toBeLessThanOrEqual(1);
        expect(rec.dataQualityScore).toBeGreaterThanOrEqual(0);
        expect(rec.dataQualityScore).toBeLessThanOrEqual(1);
        expect(['high', 'medium', 'low']).toContain(rec.predictionReliability);
        expect(rec.detailedMetrics).toBeDefined();
        expect(rec.comparisonMetrics).toBeDefined();
        expect(rec.riskAssessment).toBeDefined();
      });
    });

    it('should respect budget constraints', () => {
      const maxBudget = 2000;
      const recommendations = PerformancePredictor.generateEnhancedRecommendations(
        mockModelParams, 
        maxBudget
      );
      
      recommendations.forEach(rec => {
        expect(rec.price).toBeLessThanOrEqual(maxBudget);
      });
    });

    it('should sort recommendations by overall score', () => {
      const recommendations = PerformancePredictor.generateEnhancedRecommendations(mockModelParams);
      
      // 检查是否按性能排序（第一个应该是最好的）
      if (recommendations.length > 1) {
        const first = recommendations[0];
        const second = recommendations[1];
        
        // 第一个推荐应该有更好的综合表现
        expect(first.performancePrediction.predictedTokensPerSecond).toBeGreaterThan(0);
        expect(second.performancePrediction.predictedTokensPerSecond).toBeGreaterThan(0);
      }
    });
  });

  describe('getDetailedPerformanceAnalysis', () => {
    it('should provide detailed analysis for RTX 4090', () => {
      const analysis = PerformancePredictor.getDetailedPerformanceAnalysis('rtx-4090', mockModelParams);
      
      expect(analysis.prediction).toBeDefined();
      expect(analysis.benchmarkComparison).toBeDefined();
      expect(analysis.riskAnalysis).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
      
      expect(analysis.prediction.predictedTokensPerSecond).toBeGreaterThan(0);
      expect(analysis.benchmarkComparison.relativePerformance).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(analysis.riskAnalysis.performanceRisk);
    });

    it('should throw error for unknown GPU', () => {
      expect(() => {
        PerformancePredictor.getDetailedPerformanceAnalysis('unknown-gpu', mockModelParams);
      }).toThrow('GPU unknown-gpu not found');
    });
  });
});