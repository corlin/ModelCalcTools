import { 
  MemoryDisplayFallback, 
  UtilizationDisplayFallback,
  StandardizedMemoryData,
  MemoryBreakdownItem,
  StandardizedUtilizationResult
} from '../types';
import { MemoryUnitConverter } from './MemoryUnitConverter';

/**
 * 降级显示管理器
 * 提供各种错误情况下的降级显示策略
 */
export class FallbackDisplayManager {
  // 默认的降级数据
  private static readonly DEFAULT_MEMORY_SIZE = MemoryUnitConverter.gbToBytes(1);
  private static readonly DEFAULT_UTILIZATION = 0;
  private static readonly RETRY_DELAY = 2000; // 2秒重试延迟

  /**
   * 获取内存显示的降级策略
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 内存显示降级策略
   */
  static getMemoryDisplayFallback(
    error: Error, 
    context?: { 
      retryCallback?: () => void;
      showRetryButton?: boolean;
      customMessage?: string;
    }
  ): MemoryDisplayFallback {
    const errorType = this.categorizeError(error);
    
    let placeholderText = '内存数据计算中...';
    let errorMessage = '数据暂时不可用，请稍后重试';
    
    switch (errorType) {
      case 'validation':
        placeholderText = '数据验证中...';
        errorMessage = '数据格式有误，正在重新计算';
        break;
      case 'calculation':
        placeholderText = '重新计算中...';
        errorMessage = '计算过程出现问题，正在重试';
        break;
      case 'network':
        placeholderText = '连接中...';
        errorMessage = '网络连接问题，请检查网络后重试';
        break;
      case 'memory':
        placeholderText = '内存不足...';
        errorMessage = '系统内存不足，请关闭其他应用后重试';
        break;
      default:
        placeholderText = '加载中...';
        errorMessage = context?.customMessage || '数据暂时不可用，请稍后重试';
    }

    return {
      showPlaceholder: true,
      placeholderText,
      errorMessage,
      retryAction: context?.retryCallback || (() => {
        setTimeout(() => {
          window.location.reload();
        }, this.RETRY_DELAY);
      })
    };
  }

  /**
   * 获取利用率显示的降级策略
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 利用率显示降级策略
   */
  static getUtilizationDisplayFallback(
    error?: Error,
    context?: {
      lastKnownUtilization?: number;
      isLoading?: boolean;
    }
  ): UtilizationDisplayFallback {
    if (context?.isLoading) {
      return {
        utilizationPercentage: context.lastKnownUtilization || 0,
        status: 'loading',
        message: '正在计算利用率...'
      };
    }

    if (error) {
      const errorType = this.categorizeError(error);
      
      switch (errorType) {
        case 'validation':
          return {
            utilizationPercentage: 0,
            status: 'error',
            message: '数据验证失败，利用率不可用'
          };
        case 'calculation':
          return {
            utilizationPercentage: context?.lastKnownUtilization || 0,
            status: 'error',
            message: '计算错误，显示上次结果'
          };
        default:
          return {
            utilizationPercentage: 0,
            status: 'error',
            message: '利用率数据不可用'
          };
      }
    }

    return {
      utilizationPercentage: 0,
      status: 'unknown',
      message: '利用率数据不可用'
    };
  }

  /**
   * 获取内存分解显示的降级数据
   * @param _error 错误对象（暂未使用）
   * @param totalMemoryBytes 总内存字节数（如果已知）
   * @returns 降级的内存分解数据
   */
  static getMemoryBreakdownFallback(
    _error: Error,
    totalMemoryBytes?: number
  ): MemoryBreakdownItem[] {
    const fallbackTotal = totalMemoryBytes || this.DEFAULT_MEMORY_SIZE;
    
    // 提供基本的分解结构，避免界面完全空白
    return [
      {
        label: '数据不可用',
        valueBytes: fallbackTotal,
        percentage: 100,
        color: '#9ca3af',
        description: '内存分解数据暂时不可用'
      }
    ];
  }

  /**
   * 获取标准化内存数据的降级版本
   * @param _error 错误对象（暂未使用）
   * @param partialData 部分可用的数据
   * @returns 降级的标准化内存数据
   */
  static getStandardizedMemoryDataFallback(
    _error: Error,
    partialData?: Partial<StandardizedMemoryData>
  ): StandardizedMemoryData {
    const now = new Date();
    
    return {
      totalBytes: partialData?.totalBytes || this.DEFAULT_MEMORY_SIZE,
      breakdown: {
        weightsBytes: partialData?.breakdown?.weightsBytes || this.DEFAULT_MEMORY_SIZE * 0.6,
        activationsBytes: partialData?.breakdown?.activationsBytes || this.DEFAULT_MEMORY_SIZE * 0.4,
        gradientsBytes: partialData?.breakdown?.gradientsBytes,
        optimizerBytes: partialData?.breakdown?.optimizerBytes
      },
      utilization: partialData?.utilization || this.getDefaultUtilization(),
      metadata: {
        calculationMode: partialData?.metadata?.calculationMode || 'inference',
        timestamp: partialData?.metadata?.timestamp || now,
        version: partialData?.metadata?.version || 'fallback-1.0.0'
      }
    };
  }

  /**
   * 获取默认的利用率数据
   * @returns 默认利用率结果
   */
  private static getDefaultUtilization(): StandardizedUtilizationResult {
    return {
      theoreticalUtilization: this.DEFAULT_UTILIZATION,
      practicalUtilization: this.DEFAULT_UTILIZATION,
      utilizationPercentage: this.DEFAULT_UTILIZATION,
      isOverCapacity: false,
      efficiencyRating: 'poor'
    };
  }

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误类型
   */
  private static categorizeError(error: Error): 'validation' | 'calculation' | 'network' | 'memory' | 'unknown' {
    const message = error.message.toLowerCase();
    
    if (message.includes('验证') || message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (message.includes('计算') || message.includes('calculation') || message.includes('compute')) {
      return 'calculation';
    }
    
    if (message.includes('网络') || message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    
    if (message.includes('内存') || message.includes('memory') || message.includes('out of memory')) {
      return 'memory';
    }
    
    return 'unknown';
  }

  /**
   * 创建带有重试机制的错误处理器
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试延迟（毫秒）
   * @returns 错误处理器函数
   */
  static createRetryableErrorHandler(
    maxRetries: number = 3,
    retryDelay: number = 1000
  ) {
    return async function<T>(
      operation: () => Promise<T>,
      onError?: (error: Error, attempt: number) => void
    ): Promise<T> {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          
          if (onError) {
            onError(lastError, attempt);
          }
          
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          // 指数退避重试
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError!;
    };
  }

  /**
   * 创建优雅降级的数据获取器
   * @param primaryDataSource 主要数据源
   * @param fallbackDataSource 降级数据源
   * @returns 数据获取器函数
   */
  static createGracefulDataFetcher<T>(
    primaryDataSource: () => Promise<T>,
    fallbackDataSource: (error: Error) => T
  ) {
    return async function(): Promise<T> {
      try {
        return await primaryDataSource();
      } catch (error) {
        console.warn('Primary data source failed, using fallback:', error);
        return fallbackDataSource(error as Error);
      }
    };
  }

  /**
   * 检查数据是否为降级数据
   * @param data 要检查的数据
   * @returns 是否为降级数据
   */
  static isFallbackData(data: any): boolean {
    if (!data) return false;
    
    // 检查是否包含降级标识
    if (data.metadata?.version?.includes('fallback')) {
      return true;
    }
    
    // 检查是否为默认降级值
    if (data.totalBytes === this.DEFAULT_MEMORY_SIZE) {
      return true;
    }
    
    // 检查内存分解是否为降级数据
    if (Array.isArray(data) && data.length === 1 && data[0]?.label === '数据不可用') {
      return true;
    }
    
    return false;
  }

  /**
   * 获取错误恢复建议
   * @param error 错误对象
   * @returns 恢复建议数组
   */
  static getRecoveryRecommendations(error: Error): string[] {
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'validation':
        return [
          '检查输入参数是否在有效范围内',
          '确认模型配置的合理性',
          '重置为默认参数后重试'
        ];
      
      case 'calculation':
        return [
          '减少模型参数规模',
          '降低批处理大小',
          '使用更低精度的数据类型',
          '检查系统资源使用情况'
        ];
      
      case 'network':
        return [
          '检查网络连接',
          '刷新页面重试',
          '稍后再试'
        ];
      
      case 'memory':
        return [
          '关闭其他应用程序释放内存',
          '减少模型大小或批处理大小',
          '使用更高配置的设备'
        ];
      
      default:
        return [
          '刷新页面重试',
          '检查浏览器控制台错误信息',
          '联系技术支持'
        ];
    }
  }

  /**
   * 创建用户友好的错误消息
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 用户友好的错误消息
   */
  static createUserFriendlyErrorMessage(
    error: Error,
    context?: {
      operation?: string;
      userAction?: string;
    }
  ): string {
    const errorType = this.categorizeError(error);
    const operation = context?.operation || '操作';
    
    switch (errorType) {
      case 'validation':
        return `输入数据验证失败，请检查参数设置后重试。`;
      
      case 'calculation':
        return `${operation}计算过程中出现问题，建议降低模型复杂度后重试。`;
      
      case 'network':
        return `网络连接出现问题，请检查网络连接后重试。`;
      
      case 'memory':
        return `系统内存不足，请关闭其他应用或降低计算规模。`;
      
      default:
        return `${operation}过程中出现未知错误，请刷新页面后重试。`;
    }
  }

  /**
   * 记录降级事件（用于监控和调试）
   * @param eventType 事件类型
   * @param error 错误对象
   * @param context 上下文信息
   */
  static logFallbackEvent(
    eventType: 'memory_display' | 'utilization_display' | 'breakdown_display' | 'data_validation',
    error: Error,
    context?: Record<string, any>
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 在开发环境下输出到控制台
    if (import.meta.env?.DEV) {
      console.warn('Fallback event:', logData);
    }
    
    // 在生产环境下可以发送到监控服务
    // 这里只是示例，实际实现需要根据具体的监控服务调整
    if (import.meta.env?.PROD) {
      // 示例：发送到监控服务
      // monitoringService.logEvent('fallback', logData);
    }
  }
}