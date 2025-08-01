import { render, screen } from '@testing-library/react';
import { MemoryWarnings } from '../MemoryWarnings';
import { MemoryCalculationResult } from '../../../types';

// Mock the GPU recommendation engine
jest.mock('../../../utils/gpuRecommendationEngine', () => ({
  gpuRecommendationEngine: {
    generateRecommendations: jest.fn(() => ({
      recommendations: [
        {
          id: 'rtx-4090',
          name: 'RTX 4090',
          suitable: true,
          memoryUtilization: 75,
          standardizedUtilization: {
            efficiencyRating: 'good'
          },
          price: 1699
        }
      ],
      bestRecommendation: {
        id: 'rtx-4090',
        name: 'RTX 4090',
        suitable: true,
        memoryUtilization: 75,
        standardizedUtilization: {
          efficiencyRating: 'good'
        },
        price: 1699
      }
    }))
  }
}));

describe('MemoryWarnings', () => {
  const mockResult: MemoryCalculationResult = {
    parameters: {
      parameterCount: 7,
      batchSize: 1,
      sequenceLength: 2048,
      precision: 'fp16',
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000
    },
    inference: {
      modelWeights: 14,
      activations: 3,
      total: 17
    },
    training: {
      modelWeights: 14,
      activations: 8,
      gradients: 14,
      optimizerStates: 28,
      total: 64
    }
  };

  it('should render GPU recommendations for compatible hardware', () => {
    const totalMemory = 17 * 1024 * 1024 * 1024; // 17GB in bytes
    
    render(
      <MemoryWarnings
        totalMemory={totalMemory}
        mode="inference"
        result={mockResult}
      />
    );

    expect(screen.getByText('内存分析和建议')).toBeInTheDocument();
    expect(screen.getByText('推荐GPU配置')).toBeInTheDocument();
  });

  it('should show warnings for large batch sizes', () => {
    const largeResult = {
      ...mockResult,
      parameters: {
        ...mockResult.parameters,
        batchSize: 64
      }
    };

    const totalMemory = 17 * 1024 * 1024 * 1024;
    
    render(
      <MemoryWarnings
        totalMemory={totalMemory}
        mode="inference"
        result={largeResult}
      />
    );

    expect(screen.getByText('批处理大小过大')).toBeInTheDocument();
  });

  it('should show warnings for long sequences', () => {
    const longSeqResult = {
      ...mockResult,
      parameters: {
        ...mockResult.parameters,
        sequenceLength: 8192
      }
    };

    const totalMemory = 17 * 1024 * 1024 * 1024;
    
    render(
      <MemoryWarnings
        totalMemory={totalMemory}
        mode="inference"
        result={longSeqResult}
      />
    );

    expect(screen.getByText('序列长度过长')).toBeInTheDocument();
  });

  it('should show precision optimization suggestions for fp32', () => {
    const fp32Result = {
      ...mockResult,
      parameters: {
        ...mockResult.parameters,
        precision: 'fp32' as const
      }
    };

    const totalMemory = 17 * 1024 * 1024 * 1024;
    
    render(
      <MemoryWarnings
        totalMemory={totalMemory}
        mode="inference"
        result={fp32Result}
      />
    );

    expect(screen.getByText('精度优化建议')).toBeInTheDocument();
  });
});