import { render, screen } from '@testing-library/react';
import { UtilizationDisplay } from '../UtilizationDisplay';
import { HardwareRecommendation } from '../../../types';

// Mock the MemoryBreakdownCalculator and MemoryUnitConverter
jest.mock('../../../utils/MemoryBreakdownCalculator', () => ({
  MemoryBreakdownCalculator: {
    calculateGPUMemoryBreakdown: jest.fn(() => [
      {
        label: '基础需求',
        valueBytes: 8589934592, // 8GB in bytes
        percentage: 50.0,
        color: '#3b82f6',
        description: '模型运行所需的基础内存'
      },
      {
        label: '系统开销',
        valueBytes: 1073741824, // 1GB in bytes
        percentage: 6.25,
        color: '#ef4444',
        description: '驱动和系统保留的内存'
      },
      {
        label: '可用内存',
        valueBytes: 7516192768, // ~7GB in bytes
        percentage: 43.75,
        color: '#10b981',
        description: '剩余可用的GPU内存'
      }
    ]),
    validateBreakdown: jest.fn(() => ({
      isValid: true,
      errors: [],
      warnings: []
    }))
  }
}));

jest.mock('../../../utils/MemoryUnitConverter', () => ({
  MemoryUnitConverter: {
    gbToBytes: jest.fn((gb: number) => gb * 1024 * 1024 * 1024),
    formatMemorySize: jest.fn((bytes: number, precision: number = 2) => {
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(precision)} GB`;
    }),
    calculatePercentage: jest.fn((part: number, total: number, precision: number = 2) => {
      return parseFloat(((part / total) * 100).toFixed(precision));
    })
  }
}));

describe('UtilizationDisplay', () => {
  const mockHardware: HardwareRecommendation = {
    id: 'test-gpu',
    name: 'Test GPU',
    memorySize: 16,
    price: 1000,
    suitable: true,
    multiCardRequired: 1,
    efficiency: 'high',
    description: 'Test GPU description',
    utilizationDetails: {
      theoreticalUtilization: 0.75,
      practicalUtilization: 0.85,
      fragmentationLoss: 0.5,
      systemOverhead: 1.0,
      safetyBuffer: 0.5,
      recommendations: ['Test recommendation'],
      efficiency: 'high',
      details: {
        totalMemoryNeeded: 10.0,
        availableMemory: 15.0,
        wastedMemory: 1.0,
        utilizationScore: 85
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders utilization details correctly', () => {
    render(<UtilizationDisplay hardware={mockHardware} />);

    // Check if main sections are rendered
    expect(screen.getByText('内存利用率分析')).toBeInTheDocument();
    expect(screen.getByText('内存使用分解')).toBeInTheDocument();

    // Check if utilization metrics are displayed
    expect(screen.getByText('理论利用率')).toBeInTheDocument();
    expect(screen.getByText('实际利用率')).toBeInTheDocument();
    expect(screen.getByText('效率评分')).toBeInTheDocument();

    // Check if utilization values are displayed correctly
    expect(screen.getByText('75.0%')).toBeInTheDocument(); // theoretical utilization
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // practical utilization
    expect(screen.getByText('85分')).toBeInTheDocument(); // utilization score
  });

  it('renders memory breakdown with standardized calculator', () => {
    render(<UtilizationDisplay hardware={mockHardware} />);

    // Check if breakdown items are rendered
    expect(screen.getByText('基础需求')).toBeInTheDocument();
    expect(screen.getByText('系统开销')).toBeInTheDocument();
    expect(screen.getByText('可用内存')).toBeInTheDocument();

    // Check if memory sizes are formatted correctly
    expect(screen.getByText('8.0 GB')).toBeInTheDocument();
    expect(screen.getByText('1.0 GB')).toBeInTheDocument();
    expect(screen.getByText('7.0 GB')).toBeInTheDocument();

    // Check if percentages are displayed
    expect(screen.getByText('(50.0%)')).toBeInTheDocument();
    expect(screen.getByText('(6.3%)')).toBeInTheDocument();
    expect(screen.getByText('(43.8%)')).toBeInTheDocument();
  });

  it('renders summary information with correct formatting', () => {
    render(<UtilizationDisplay hardware={mockHardware} />);

    // Check if summary section is rendered
    expect(screen.getByText('GPU总显存:')).toBeInTheDocument();
    expect(screen.getByText('可用显存:')).toBeInTheDocument();
    expect(screen.getByText('实际占用:')).toBeInTheDocument();

    // Check if memory values are formatted with 1 decimal place precision
    const summaryValues = screen.getAllByText(/\d+\.\d GB/);
    expect(summaryValues.length).toBeGreaterThan(0);
  });

  it('handles error cases gracefully', () => {
    // Mock the calculator to throw an error
    const mockCalculateGPUMemoryBreakdown = jest.fn(() => {
      throw new Error('Calculation failed');
    });
    
    jest.doMock('../../../utils/MemoryBreakdownCalculator', () => ({
      MemoryBreakdownCalculator: {
        calculateGPUMemoryBreakdown: mockCalculateGPUMemoryBreakdown,
        validateBreakdown: jest.fn(() => ({
          isValid: false,
          errors: ['Test error'],
          warnings: []
        }))
      }
    }));

    render(<UtilizationDisplay hardware={mockHardware} />);

    // The component should still render without crashing
    expect(screen.getByText('内存利用率分析')).toBeInTheDocument();
  });

  it('renders multi-card details when available', () => {
    const hardwareWithMultiCard: HardwareRecommendation = {
      ...mockHardware,
      multiCardDetails: {
        totalEffectiveMemory: 30.0,
        communicationOverhead: 2.0,
        loadBalancingEfficiency: 0.9,
        scalingFactor: 1.8,
        optimalCardCount: 2,
        perCardUtilization: [0.8, 0.75],
        recommendations: ['Multi-card recommendation'],
        costEfficiency: 85
      }
    };

    render(<UtilizationDisplay hardware={hardwareWithMultiCard} />);

    // Check if multi-card section is rendered
    expect(screen.getByText('多卡配置分析')).toBeInTheDocument();
    expect(screen.getByText('扩展因子')).toBeInTheDocument();
    expect(screen.getByText('负载均衡效率')).toBeInTheDocument();
    expect(screen.getByText('成本效率')).toBeInTheDocument();

    // Check if multi-card values are displayed
    expect(screen.getByText('1.80x')).toBeInTheDocument();
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getAllByText('85分')).toHaveLength(2); // One for efficiency score, one for cost efficiency
  });

  it('does not render when no utilization details are provided', () => {
    const hardwareWithoutDetails: HardwareRecommendation = {
      ...mockHardware,
      utilizationDetails: undefined,
      multiCardDetails: undefined
    };

    const { container } = render(<UtilizationDisplay hardware={hardwareWithoutDetails} />);
    expect(container.firstChild).toBeNull();
  });
});