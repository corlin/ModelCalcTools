import { ErrorState } from '../types';
// import { ERROR_MESSAGES } from '../constants';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 自定义错误类
 */
export class CalculatorError extends Error {
  public readonly type: ErrorType;
  public readonly field?: string;
  public readonly code?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    field?: string,
    code?: string
  ) {
    super(message);
    this.name = 'CalculatorError';
    this.type = type;
    this.field = field;
    this.code = code;
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{ timestamp: Date; error: CalculatorError }> = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误并返回用户友好的错误状态
   * @param error 错误对象
   * @returns 错误状态
   */
  public handleError(error: unknown): ErrorState {
    let calculatorError: CalculatorError;

    if (error instanceof CalculatorError) {
      calculatorError = error;
    } else if (error instanceof Error) {
      calculatorError = new CalculatorError(
        error.message,
        this.inferErrorType(error.message)
      );
    } else {
      calculatorError = new CalculatorError(
        '发生未知错误',
        ErrorType.UNKNOWN_ERROR
      );
    }

    // 记录错误
    this.logError(calculatorError);

    // 返回用户友好的错误状态
    return {
      hasError: true,
      errorMessage: this.getUserFriendlyMessage(calculatorError),
      errorField: calculatorError.field
    };
  }

  /**
   * 根据错误消息推断错误类型
   * @param message 错误消息
   * @returns 错误类型
   */
  private inferErrorType(message: string): ErrorType {
    if (message.includes('验证') || message.includes('范围') || message.includes('必须')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('计算') || message.includes('内存')) {
      return ErrorType.CALCULATION_ERROR;
    }
    if (message.includes('网络') || message.includes('请求')) {
      return ErrorType.NETWORK_ERROR;
    }
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * 获取用户友好的错误消息
   * @param error 计算器错误
   * @returns 用户友好的消息
   */
  private getUserFriendlyMessage(error: CalculatorError): string {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return error.message;
      case ErrorType.CALCULATION_ERROR:
        return `计算过程中发生错误: ${error.message}`;
      case ErrorType.NETWORK_ERROR:
        return '网络连接出现问题，请检查网络连接后重试';
      default:
        return '发生未知错误，请刷新页面后重试';
    }
  }

  /**
   * 记录错误到日志
   * @param error 计算器错误
   */
  private logError(error: CalculatorError): void {
    this.errorLog.push({
      timestamp: new Date(),
      error
    });

    // 保持日志大小在合理范围内
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }

    // 在开发环境下输出到控制台
    if (import.meta.env.DEV) {
      console.error('Calculator Error:', {
        type: error.type,
        message: error.message,
        field: error.field,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 获取错误日志
   * @returns 错误日志数组
   */
  public getErrorLog(): Array<{ timestamp: Date; error: CalculatorError }> {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * 创建验证错误
 * @param message 错误消息
 * @param field 错误字段
 * @returns 验证错误对象
 */
export function createValidationError(message: string, field?: string): CalculatorError {
  return new CalculatorError(message, ErrorType.VALIDATION_ERROR, field);
}

/**
 * 创建计算错误
 * @param message 错误消息
 * @param code 错误代码
 * @returns 计算错误对象
 */
export function createCalculationError(message: string, code?: string): CalculatorError {
  return new CalculatorError(message, ErrorType.CALCULATION_ERROR, undefined, code);
}

/**
 * 安全执行函数，捕获并处理错误
 * @param fn 要执行的函数
 * @param errorHandler 错误处理器
 * @returns 执行结果或错误状态
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  errorHandler: ErrorHandler = ErrorHandler.getInstance()
): Promise<{ success: true; data: T } | { success: false; error: ErrorState }> {
  try {
    const result = await fn();
    return { success: true, data: result };
  } catch (error) {
    const errorState = errorHandler.handleError(error);
    return { success: false, error: errorState };
  }
}

/**
 * 重试机制装饰器
 * @param maxRetries 最大重试次数
 * @param delay 重试延迟（毫秒）
 * @returns 装饰器函数
 */
export function withRetry(maxRetries: number = 3, delay: number = 1000) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: any[]) {
      let lastError: unknown;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(target, args);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) {
            throw error;
          }

          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }

      throw lastError;
    } as any;

    return descriptor;
  };
}

/**
 * 防抖函数，用于防止频繁的验证调用
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数，用于限制函数调用频率
 * @param func 要节流的函数
 * @param limit 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 获取全局错误处理器实例
 * @returns 错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();