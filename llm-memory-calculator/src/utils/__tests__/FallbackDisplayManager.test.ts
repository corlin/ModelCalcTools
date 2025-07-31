import { FallbackDisplayManager } from '../FallbackDisplayManager';
import { StandardizedMemoryData } from '../../types';
import { MemoryUnitConverter } from '../MemoryUnitConverter';

describe('FallbackDisplayManager', () => {
  describe('getMemoryDisplayFallback', () => {
    it('should return appropriate fallback for validation errors', () => {
      const validationError = new Error('数据验证失败');
      const fallback = FallbackDisplayManager.getMemoryDisplayFallback(validationError);

      expect(fallback.showPlaceholder).toBe(true);
      expect(fallback.placeholderText).toContain('验证');
      expect(fallback.errorMessage).toContain('数据格式有误');
      expect(typeof fallback.retryAction).toBe('function');
    });

    it('should return appropriate fallback for calculation errors', () => {
      const calculationError = new Error('计算过程出错');
      const fallback = FallbackDisplayManager.getMemoryDisplayFallback(calculationError);

      expect(fallback.showPlaceholder).toBe(true);
      expect(fallback.placeholderText).toContain('计算');
      expect(fallback.errorMessage).toContain('计算过程出现问题');
    });

    it('should return appropriate fallback for network errors', () => {
      const networkError = new Error('网络连接失败');
      const fallback = FallbackDisplayManager.getMemoryDisplayFallback(networkError);

      expect(fallback.showPlaceholder).toBe(true);
      expect(fallback.placeholderText).toContain('连接');
      expect(fallback.errorMessage).toContain('网络连接问题');
    });

    it('should use custom message when provided', () => {
      const error = new Error('测试错误');
      const customMessage = '自定义错误消息';
      const fallback = FallbackDisplayManager.getMemoryDisplayFallback(error, {
        customMessage
      });

      expect(fallback.errorMessage).toBe(customMessage);
    });

    it('should use custom retry callback when provided', () => {
      const error = new Error('测试错误');
      const mockRetryCallback = jest.fn();
      const fallback = FallbackDisplayManager.getMemoryDisplayFallback(error, {
        retryCallback: mockRetryCallback
      });

      fallback.retryAction();
      expect(mockRetryCallback).toHaveBeenCalled();
    });
  });

  describe('getUtilizationDisplayFallback', () => {
    it('should return loading state when isLoading is true', () => {
      const fallback = FallbackDisplayManager.getUtilizationDisplayFallback(undefined, {
        isLoading: true,
        lastKnownUtilization: 75
      });

      expect(fallback.status).toBe('loading');
      expect(fallback.utilizationPercentage).toBe(75);
      expect(fallback.message).toContain('正在计算');
    });

    it('should return error state for validation errors', () => {
      const validationError = new Error('验证失败');
      const fallback = FallbackDisplayManager.getUtilizationDisplayFallback(validationError);

      expect(fallback.status).toBe('error');
      expect(fallback.utilizationPercentage).toBe(0);
      expect(fallback.message).toContain('数据验证失败');
    });

    it('should return last known utilization for calculation errors', () => {
      const calculationError = new Error('计算错误');
      const fallback = FallbackDisplayManager.getUtilizationDisplayFallback(calculationError, {
        lastKnownUtilization: 80
      });

      expect(fallback.status).toBe('error');
      expect(fallback.utilizationPercentage).toBe(80);
      expect(fallback.message).toContain('显示上次结果');
    });

    it('should return unknown state when no error provided', () => {
      const fallback = FallbackDisplayManager.getUtilizationDisplayFallback();

      expect(fallback.status).toBe('unknown');
      expect(fallback.utilizationPercentage).toBe(0);
      expect(fallback.message).toContain('利用率数据不可用');
    });
  });

  describe('getMemoryBreakdownFallback', () => {
    it('should return fallback breakdown with correct structure', () => {
      const error = new Error('分解计算失败');
      const totalMemoryBytes = MemoryUnitConverter.gbToBytes(10);
      const fallback = FallbackDisplayManager.getMemoryBreakdownFallback(error, totalMemoryBytes);

      expect(fallback).toHaveLength(1);
      expect(fallback[0].label).toBe('数据不可用');
      expect(fallback[0].valueBytes).toBe(totalMemoryBytes);
      expect(fallback[0].percentage).toBe(100);
      expect(fallback[0].color).toBe('#9ca3af');
      expect(fallback[0].description).toContain('暂时不可用');
    });

    it('should use default memory size when totalMemoryBytes not provided', () => {
      const error = new Error('分解计算失败');
      const fallback = FallbackDisplayManager.getMemoryBreakdownFallback(error);

      expect(fallback).toHaveLength(1);
      expect(fallback[0].valueBytes).toBeGreaterThan(0);
    });
  });

  describe('getStandardizedMemoryDataFallback', () => {
    it('should return valid fallback data structure', () => {
      const error = new Error('数据创建失败');
      const fallback = FallbackDisplayManager.getStandardizedMemoryDataFallback(error);

      expect(fallback.totalBytes).toBeGreaterThan(0);
      expect(fallback.breakdown.weightsBytes).toBeGreaterThan(0);
      expect(fallback.breakdown.activationsBytes).toBeGreaterThan(0);
      expect(fallback.utilization.theoreticalUtilization).toBe(0);
      expect(fallback.utilization.practicalUtilization).toBe(0);
      expect(fallback.utilization.efficiencyRating).toBe('poor');
      expect(fallback.metadata.calculationMode).toBe('inference');
      expect(fallback.metadata.version).toContain('fallback');
    });

    it('should merge partial data when provided', () => {
      const error = new Error('数据创建失败');
      const partialData: Partial<StandardizedMemoryData> = {
        totalBytes: MemoryUnitConverter.gbToBytes(20),
        metadata: {
          calculationMode: 'training',
          timestamp: new Date('2023-01-01'),
          version: 'test-1.0.0'
        }
      };

      const fallback = FallbackDisplayManager.getStandardizedMemoryDataFallback(error, partialData);

      expect(fallback.totalBytes).toBe(partialData.totalBytes);
      expect(fallback.metadata.calculationMode).toBe('training');
      expect(fallback.metadata.timestamp).toEqual(partialData.metadata!.timestamp);
      expect(fallback.metadata.version).toBe('test-1.0.0');
    });
  });

  describe('createRetryableErrorHandler', () => {
    it('should retry operation on failure', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockResolvedValueOnce('成功');

      const retryHandler = FallbackDisplayManager.createRetryableErrorHandler(3, 10);
      const result = await retryHandler(mockOperation);

      expect(result).toBe('成功');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should call onError callback for each failure', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockResolvedValueOnce('成功');

      const mockOnError = jest.fn();
      const retryHandler = FallbackDisplayManager.createRetryableErrorHandler(3, 10);
      
      await retryHandler(mockOperation, mockOnError);

      expect(mockOnError).toHaveBeenCalledTimes(1);
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should throw last error after max retries', async () => {
      const lastError = new Error('最终失败');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockRejectedValueOnce(lastError);

      const retryHandler = FallbackDisplayManager.createRetryableErrorHandler(3, 10);

      await expect(retryHandler(mockOperation)).rejects.toThrow('最终失败');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('createGracefulDataFetcher', () => {
    it('should return primary data when successful', async () => {
      const primaryData = { data: '主要数据' };
      const mockPrimarySource = jest.fn().mockResolvedValue(primaryData);
      const mockFallbackSource = jest.fn();

      const fetcher = FallbackDisplayManager.createGracefulDataFetcher(
        mockPrimarySource,
        mockFallbackSource
      );

      const result = await fetcher();

      expect(result).toBe(primaryData);
      expect(mockPrimarySource).toHaveBeenCalled();
      expect(mockFallbackSource).not.toHaveBeenCalled();
    });

    it('should return fallback data when primary fails', async () => {
      const error = new Error('主要数据源失败');
      const fallbackData = { data: '降级数据' };
      const mockPrimarySource = jest.fn().mockRejectedValue(error);
      const mockFallbackSource = jest.fn().mockReturnValue(fallbackData);

      const fetcher = FallbackDisplayManager.createGracefulDataFetcher(
        mockPrimarySource,
        mockFallbackSource
      );

      const result = await fetcher();

      expect(result).toBe(fallbackData);
      expect(mockPrimarySource).toHaveBeenCalled();
      expect(mockFallbackSource).toHaveBeenCalledWith(error);
    });
  });

  describe('isFallbackData', () => {
    it('should detect fallback data by version', () => {
      const fallbackData = {
        metadata: {
          version: 'fallback-1.0.0'
        }
      };

      expect(FallbackDisplayManager.isFallbackData(fallbackData)).toBe(true);
    });

    it('should detect fallback breakdown data', () => {
      const fallbackBreakdown = [
        {
          label: '数据不可用',
          valueBytes: 1000,
          percentage: 100,
          color: '#9ca3af'
        }
      ];

      expect(FallbackDisplayManager.isFallbackData(fallbackBreakdown)).toBe(true);
    });

    it('should return false for normal data', () => {
      const normalData = {
        totalBytes: 1000,
        metadata: {
          version: '1.0.0'
        }
      };

      expect(FallbackDisplayManager.isFallbackData(normalData)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(FallbackDisplayManager.isFallbackData(null)).toBe(false);
      expect(FallbackDisplayManager.isFallbackData(undefined)).toBe(false);
    });
  });

  describe('getRecoveryRecommendations', () => {
    it('should return validation-specific recommendations', () => {
      const validationError = new Error('验证失败');
      const recommendations = FallbackDisplayManager.getRecoveryRecommendations(validationError);

      expect(recommendations).toContain('检查输入参数是否在有效范围内');
      expect(recommendations).toContain('确认模型配置的合理性');
    });

    it('should return calculation-specific recommendations', () => {
      const calculationError = new Error('计算错误');
      const recommendations = FallbackDisplayManager.getRecoveryRecommendations(calculationError);

      expect(recommendations).toContain('减少模型参数规模');
      expect(recommendations).toContain('降低批处理大小');
    });

    it('should return network-specific recommendations', () => {
      const networkError = new Error('网络错误');
      const recommendations = FallbackDisplayManager.getRecoveryRecommendations(networkError);

      expect(recommendations).toContain('检查网络连接');
      expect(recommendations).toContain('刷新页面重试');
    });

    it('should return memory-specific recommendations', () => {
      const memoryError = new Error('内存不足');
      const recommendations = FallbackDisplayManager.getRecoveryRecommendations(memoryError);

      expect(recommendations).toContain('关闭其他应用程序释放内存');
      expect(recommendations).toContain('减少模型大小或批处理大小');
    });

    it('should return default recommendations for unknown errors', () => {
      const unknownError = new Error('未知错误');
      const recommendations = FallbackDisplayManager.getRecoveryRecommendations(unknownError);

      expect(recommendations).toContain('刷新页面重试');
      expect(recommendations).toContain('检查浏览器控制台错误信息');
    });
  });

  describe('createUserFriendlyErrorMessage', () => {
    it('should create user-friendly message for validation errors', () => {
      const validationError = new Error('验证失败');
      const message = FallbackDisplayManager.createUserFriendlyErrorMessage(validationError);

      expect(message).toContain('输入数据验证失败');
      expect(message).toContain('请检查参数设置');
    });

    it('should create user-friendly message for calculation errors', () => {
      const calculationError = new Error('计算失败');
      const message = FallbackDisplayManager.createUserFriendlyErrorMessage(calculationError, {
        operation: '内存计算'
      });

      expect(message).toContain('内存计算计算过程中出现问题');
      expect(message).toContain('建议降低模型复杂度');
    });

    it('should create user-friendly message for network errors', () => {
      const networkError = new Error('网络失败');
      const message = FallbackDisplayManager.createUserFriendlyErrorMessage(networkError);

      expect(message).toContain('网络连接出现问题');
      expect(message).toContain('请检查网络连接');
    });

    it('should create user-friendly message for memory errors', () => {
      const memoryError = new Error('内存不足');
      const message = FallbackDisplayManager.createUserFriendlyErrorMessage(memoryError);

      expect(message).toContain('系统内存不足');
      expect(message).toContain('请关闭其他应用');
    });

    it('should create user-friendly message for unknown errors', () => {
      const unknownError = new Error('未知错误');
      const message = FallbackDisplayManager.createUserFriendlyErrorMessage(unknownError);

      expect(message).toContain('未知错误');
      expect(message).toContain('请刷新页面');
    });
  });
});