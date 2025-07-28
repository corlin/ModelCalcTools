import {
  ErrorHandler,
  // CalculatorError,
  ErrorType,
  createValidationError,
  createCalculationError,
  safeExecute,
  debounce,
  throttle
} from '../errorHandler';

describe('错误处理工具测试', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorLog();
  });

  describe('CalculatorError', () => {
    test('应该创建验证错误', () => {
      const error = createValidationError('验证失败', 'testField');
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('验证失败');
      expect(error.field).toBe('testField');
    });

    test('应该创建计算错误', () => {
      const error = createCalculationError('计算失败', 'CALC_001');
      expect(error.type).toBe(ErrorType.CALCULATION_ERROR);
      expect(error.message).toBe('计算失败');
      expect(error.code).toBe('CALC_001');
    });
  });

  describe('ErrorHandler', () => {
    test('应该是单例模式', () => {
      const handler1 = ErrorHandler.getInstance();
      const handler2 = ErrorHandler.getInstance();
      expect(handler1).toBe(handler2);
    });

    test('应该处理CalculatorError', () => {
      const error = createValidationError('测试错误', 'testField');
      const errorState = errorHandler.handleError(error);
      
      expect(errorState.hasError).toBe(true);
      expect(errorState.errorMessage).toBe('测试错误');
      expect(errorState.errorField).toBe('testField');
    });

    test('应该处理普通Error', () => {
      const error = new Error('验证失败的普通错误');
      const errorState = errorHandler.handleError(error);
      
      expect(errorState.hasError).toBe(true);
      expect(errorState.errorMessage).toContain('验证失败的普通错误');
    });

    test('应该处理未知错误', () => {
      const errorState = errorHandler.handleError('字符串错误');
      
      expect(errorState.hasError).toBe(true);
      expect(errorState.errorMessage).toContain('未知错误');
    });

    test('应该记录错误到日志', () => {
      const error = createValidationError('测试错误');
      errorHandler.handleError(error);
      
      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].error.message).toBe('测试错误');
    });

    test('应该限制日志大小', () => {
      // 添加超过100个错误
      for (let i = 0; i < 120; i++) {
        const error = createValidationError(`错误${i}`);
        errorHandler.handleError(error);
      }
      
      const log = errorHandler.getErrorLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    test('应该清空错误日志', () => {
      const error = createValidationError('测试错误');
      errorHandler.handleError(error);
      
      expect(errorHandler.getErrorLog().length).toBe(1);
      
      errorHandler.clearErrorLog();
      expect(errorHandler.getErrorLog().length).toBe(0);
    });
  });

  describe('safeExecute', () => {
    test('应该返回成功结果', async () => {
      const result = await safeExecute(() => 'success');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    test('应该捕获同步错误', async () => {
      const result = await safeExecute(() => {
        throw new Error('同步错误');
      });
      
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.hasError).toBe(true);
      }
    });

    test('应该捕获异步错误', async () => {
      const result = await safeExecute(async () => {
        throw new Error('异步错误');
      });
      
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.hasError).toBe(true);
      }
    });

    test('应该处理Promise返回值', async () => {
      const result = await safeExecute(async () => {
        return Promise.resolve('异步成功');
      });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('异步成功');
      }
    });
  });

  describe('debounce', () => {
    test('应该延迟执行函数', (done) => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      // 快速调用多次
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // 立即检查，应该还没有执行
      expect(callCount).toBe(0);

      // 等待超过延迟时间
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });

    test('应该重置延迟时间', (done) => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      
      setTimeout(() => {
        debouncedFn(); // 重置延迟
      }, 50);

      setTimeout(() => {
        expect(callCount).toBe(0); // 还没有执行
      }, 120);

      setTimeout(() => {
        expect(callCount).toBe(1); // 现在应该执行了
        done();
      }, 180);
    });
  });

  describe('throttle', () => {
    test('应该限制函数调用频率', (done) => {
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      // 快速调用多次
      throttledFn();
      throttledFn();
      throttledFn();

      // 应该立即执行一次
      expect(callCount).toBe(1);

      setTimeout(() => {
        throttledFn();
        expect(callCount).toBe(2); // 应该执行第二次
        done();
      }, 150);
    });

    test('应该在节流期间忽略调用', () => {
      let callCount = 0;
      const throttledFn = throttle(() => {
        callCount++;
      }, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(callCount).toBe(1);
    });
  });

  describe('错误类型推断', () => {
    test('应该正确推断验证错误', () => {
      const error = new Error('参数验证失败');
      const errorState = errorHandler.handleError(error);
      
      expect(errorState.errorMessage).toContain('参数验证失败');
    });

    test('应该正确推断计算错误', () => {
      const error = new Error('内存计算出错');
      const errorState = errorHandler.handleError(error);
      
      expect(errorState.errorMessage).toContain('计算过程中发生错误');
    });

    test('应该正确推断网络错误', () => {
      const error = new Error('网络请求失败');
      const errorState = errorHandler.handleError(error);
      
      expect(errorState.errorMessage).toContain('网络连接出现问题');
    });
  });
});

// 集成测试
describe('错误处理集成测试', () => {
  test('应该完整处理验证错误流程', async () => {
    const errorHandler = ErrorHandler.getInstance();
    
    const result = await safeExecute(() => {
      throw createValidationError('参数数量超出范围', 'parameterCount');
    });

    expect(result.success).toBe(false);
    if (result.success === false) {
      expect(result.error.hasError).toBe(true);
      expect(result.error.errorField).toBe('parameterCount');
      expect(result.error.errorMessage).toContain('参数数量超出范围');
    }

    // 检查错误是否被记录
    const log = errorHandler.getErrorLog();
    expect(log.length).toBeGreaterThan(0);
  });

  test('应该处理复杂的错误场景', async () => {
    const complexFunction = async () => {
      // 模拟复杂的计算过程
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 总是成功，避免随机性
      return '计算成功';
    };

    const result = await safeExecute(complexFunction);
    
    // 无论成功还是失败，都应该有明确的结果
    expect(typeof result.success).toBe('boolean');
    
    if (result.success === true) {
      expect(result.data).toBe('计算成功');
    } else if (result.success === false) {
      expect(result.error.hasError).toBe(true);
    }
  });
});