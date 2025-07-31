import { 
  EnhancedGPUHardware, 
  GPUValidationResult, 
  GPUValidationError,
  GPUManufacturer
} from '../types';
import { GPU_VALIDATION_RULES } from '../constants';

/**
 * GPU数据验证器类
 * 负责验证GPU硬件数据的完整性和准确性
 */
export class GPUDataValidator {
  private validationRules = GPU_VALIDATION_RULES;

  /**
   * 验证完整的GPU数据
   * @param gpu GPU硬件数据
   * @returns 验证结果
   */
  validateGPUData(gpu: EnhancedGPUHardware): GPUValidationResult {
    const errors: GPUValidationError[] = [];
    const warnings: string[] = [];

    // 验证基本字段
    this.validateBasicFields(gpu, errors);
    
    // 验证硬件规格
    this.validateHardwareSpecs(gpu, errors, warnings);
    
    // 验证价格信息
    this.validatePriceInfo(gpu, errors, warnings);
    
    // 验证基准测试数据
    this.validateBenchmarkData(gpu, errors, warnings);
    
    // 验证效率评级
    this.validateEfficiencyRating(gpu, errors, warnings);
    
    // 验证数据一致性
    this.validateDataConsistency(gpu, errors, warnings);

    // 计算数据可信度
    const confidence = this.calculateConfidence(gpu, errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      confidence
    };
  }

  /**
   * 验证基本字段
   */
  private validateBasicFields(gpu: EnhancedGPUHardware, errors: GPUValidationError[]): void {
    // 验证ID
    if (!gpu.id || typeof gpu.id !== 'string' || gpu.id.trim().length === 0) {
      errors.push({
        field: 'id',
        message: 'GPU ID不能为空',
        severity: 'error'
      });
    }

    // 验证名称
    if (!gpu.name || typeof gpu.name !== 'string' || gpu.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'GPU名称不能为空',
        severity: 'error'
      });
    }

    // 验证制造商
    const validManufacturers: GPUManufacturer[] = ['nvidia', 'amd', 'intel'];
    if (!validManufacturers.includes(gpu.manufacturer)) {
      errors.push({
        field: 'manufacturer',
        message: `制造商必须是以下之一: ${validManufacturers.join(', ')}`,
        severity: 'error',
        actualValue: gpu.manufacturer
      });
    }

    // 验证架构
    if (!gpu.architecture || typeof gpu.architecture !== 'string') {
      errors.push({
        field: 'architecture',
        message: 'GPU架构不能为空',
        severity: 'error'
      });
    }

    // 验证内存类型
    if (!gpu.memoryType || typeof gpu.memoryType !== 'string') {
      errors.push({
        field: 'memoryType',
        message: '内存类型不能为空',
        severity: 'error'
      });
    }

    // 验证数据来源
    if (!gpu.dataSource || typeof gpu.dataSource !== 'string') {
      errors.push({
        field: 'dataSource',
        message: '数据来源不能为空',
        severity: 'error'
      });
    }

    // 验证更新时间
    if (!gpu.lastUpdated || !(gpu.lastUpdated instanceof Date)) {
      errors.push({
        field: 'lastUpdated',
        message: '最后更新时间必须是有效的日期',
        severity: 'error'
      });
    }
  }

  /**
   * 验证硬件规格
   */
  private validateHardwareSpecs(
    gpu: EnhancedGPUHardware, 
    errors: GPUValidationError[], 
    warnings: string[]
  ): void {
    // 验证显存大小
    const memoryValidation = this.validateNumericField(
      gpu.memorySize,
      this.validationRules.memorySize,
      'memorySize'
    );
    if (!memoryValidation.isValid) {
      errors.push(memoryValidation.error!);
    }

    // 验证内存带宽
    const bandwidthValidation = this.validateNumericField(
      gpu.memoryBandwidth,
      this.validationRules.memoryBandwidth,
      'memoryBandwidth'
    );
    if (!bandwidthValidation.isValid) {
      errors.push(bandwidthValidation.error!);
    }

    // 验证计算单元数
    const computeUnitsValidation = this.validateNumericField(
      gpu.computeUnits,
      this.validationRules.computeUnits,
      'computeUnits'
    );
    if (!computeUnitsValidation.isValid) {
      errors.push(computeUnitsValidation.error!);
    }

    // 验证基础频率
    const baseClockValidation = this.validateNumericField(
      gpu.baseClock,
      this.validationRules.baseClock,
      'baseClock'
    );
    if (!baseClockValidation.isValid) {
      errors.push(baseClockValidation.error!);
    }

    // 验证加速频率
    const boostClockValidation = this.validateNumericField(
      gpu.boostClock,
      this.validationRules.boostClock,
      'boostClock'
    );
    if (!boostClockValidation.isValid) {
      errors.push(boostClockValidation.error!);
    }

    // 验证TDP
    const tdpValidation = this.validateNumericField(
      gpu.tdp,
      this.validationRules.tdp,
      'tdp'
    );
    if (!tdpValidation.isValid) {
      errors.push(tdpValidation.error!);
    }

    // 验证频率逻辑关系
    if (gpu.boostClock <= gpu.baseClock) {
      warnings.push('加速频率应该高于基础频率');
    }

    // 验证内存带宽合理性
    const expectedBandwidth = this.estimateMemoryBandwidth(gpu.memoryType, gpu.memorySize);
    if (expectedBandwidth && Math.abs(gpu.memoryBandwidth - expectedBandwidth) / expectedBandwidth > 0.3) {
      warnings.push(`内存带宽 ${gpu.memoryBandwidth} GB/s 可能与 ${gpu.memoryType} 类型不匹配`);
    }
  }

  /**
   * 验证价格信息
   */
  private validatePriceInfo(
    gpu: EnhancedGPUHardware, 
    errors: GPUValidationError[], 
    warnings: string[]
  ): void {
    if (!gpu.price) {
      errors.push({
        field: 'price',
        message: '价格信息不能为空',
        severity: 'error'
      });
      return;
    }

    // 验证MSRP
    if (typeof gpu.price.msrp !== 'number' || gpu.price.msrp < this.validationRules.price.msrp.min || 
        gpu.price.msrp > this.validationRules.price.msrp.max) {
      errors.push({
        field: 'price.msrp',
        message: `MSRP必须在 ${this.validationRules.price.msrp.min} 到 ${this.validationRules.price.msrp.max} 之间`,
        severity: 'error',
        expectedRange: this.validationRules.price.msrp,
        actualValue: gpu.price.msrp
      });
    }

    // 验证当前价格
    if (typeof gpu.price.currentPrice !== 'number' || gpu.price.currentPrice < this.validationRules.price.currentPrice.min || 
        gpu.price.currentPrice > this.validationRules.price.currentPrice.max) {
      errors.push({
        field: 'price.currentPrice',
        message: `当前价格必须在 ${this.validationRules.price.currentPrice.min} 到 ${this.validationRules.price.currentPrice.max} 之间`,
        severity: 'error',
        expectedRange: this.validationRules.price.currentPrice,
        actualValue: gpu.price.currentPrice
      });
    }

    // 验证货币
    if (!gpu.price.currency || typeof gpu.price.currency !== 'string') {
      errors.push({
        field: 'price.currency',
        message: '货币类型不能为空',
        severity: 'error'
      });
    }

    // 验证价格更新时间
    if (!gpu.price.lastUpdated || !(gpu.price.lastUpdated instanceof Date)) {
      errors.push({
        field: 'price.lastUpdated',
        message: '价格更新时间必须是有效的日期',
        severity: 'error'
      });
    } else {
      // 检查价格数据是否过期
      const daysSinceUpdate = (Date.now() - gpu.price.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 30) {
        warnings.push(`价格数据已过期 ${Math.floor(daysSinceUpdate)} 天，建议更新`);
      }
    }

    // 验证价格合理性
    if (gpu.price.currentPrice > gpu.price.msrp * 3) {
      warnings.push('当前价格显著高于MSRP，可能存在市场异常');
    }
  }

  /**
   * 验证基准测试数据
   */
  private validateBenchmarkData(
    gpu: EnhancedGPUHardware, 
    errors: GPUValidationError[], 
    warnings: string[]
  ): void {
    if (!gpu.benchmarks) {
      errors.push({
        field: 'benchmarks',
        message: '基准测试数据不能为空',
        severity: 'error'
      });
      return;
    }

    // 验证LLM推理基准
    if (!gpu.benchmarks.llmInference) {
      errors.push({
        field: 'benchmarks.llmInference',
        message: 'LLM推理基准数据不能为空',
        severity: 'error'
      });
    } else {
      const inference = gpu.benchmarks.llmInference;
      const rules = this.validationRules.benchmarks.llmInference;

      if (inference.tokensPerSecond < rules.tokensPerSecond.min || 
          inference.tokensPerSecond > rules.tokensPerSecond.max) {
        errors.push({
          field: 'benchmarks.llmInference.tokensPerSecond',
          message: `每秒token数必须在 ${rules.tokensPerSecond.min} 到 ${rules.tokensPerSecond.max} 之间`,
          severity: 'error',
          expectedRange: rules.tokensPerSecond,
          actualValue: inference.tokensPerSecond
        });
      }

      if (inference.memoryEfficiency < rules.memoryEfficiency.min || 
          inference.memoryEfficiency > rules.memoryEfficiency.max) {
        errors.push({
          field: 'benchmarks.llmInference.memoryEfficiency',
          message: `内存效率必须在 ${rules.memoryEfficiency.min} 到 ${rules.memoryEfficiency.max} 之间`,
          severity: 'error',
          expectedRange: rules.memoryEfficiency,
          actualValue: inference.memoryEfficiency
        });
      }

      if (inference.powerEfficiency < rules.powerEfficiency.min || 
          inference.powerEfficiency > rules.powerEfficiency.max) {
        errors.push({
          field: 'benchmarks.llmInference.powerEfficiency',
          message: `功耗效率必须在 ${rules.powerEfficiency.min} 到 ${rules.powerEfficiency.max} 之间`,
          severity: 'error',
          expectedRange: rules.powerEfficiency,
          actualValue: inference.powerEfficiency
        });
      }
    }

    // 验证合成基准
    if (!gpu.benchmarks.syntheticBenchmarks) {
      errors.push({
        field: 'benchmarks.syntheticBenchmarks',
        message: '合成基准数据不能为空',
        severity: 'error'
      });
    } else {
      const synthetic = gpu.benchmarks.syntheticBenchmarks;
      const rules = this.validationRules.benchmarks.syntheticBenchmarks;

      if (synthetic.fp16Performance < rules.fp16Performance.min || 
          synthetic.fp16Performance > rules.fp16Performance.max) {
        errors.push({
          field: 'benchmarks.syntheticBenchmarks.fp16Performance',
          message: `FP16性能必须在 ${rules.fp16Performance.min} 到 ${rules.fp16Performance.max} TFLOPS之间`,
          severity: 'error',
          expectedRange: rules.fp16Performance,
          actualValue: synthetic.fp16Performance
        });
      }

      if (synthetic.memoryBandwidthUtilization < rules.memoryBandwidthUtilization.min || 
          synthetic.memoryBandwidthUtilization > rules.memoryBandwidthUtilization.max) {
        errors.push({
          field: 'benchmarks.syntheticBenchmarks.memoryBandwidthUtilization',
          message: `内存带宽利用率必须在 ${rules.memoryBandwidthUtilization.min} 到 ${rules.memoryBandwidthUtilization.max} 之间`,
          severity: 'error',
          expectedRange: rules.memoryBandwidthUtilization,
          actualValue: synthetic.memoryBandwidthUtilization
        });
      }
    }

    // 验证测试条件
    if (!gpu.benchmarks.testConditions) {
      warnings.push('缺少基准测试条件信息');
    } else {
      const conditions = gpu.benchmarks.testConditions;
      if (!conditions.modelSize || !conditions.framework || !conditions.precision) {
        warnings.push('基准测试条件信息不完整');
      }
    }
  }

  /**
   * 验证效率评级
   */
  private validateEfficiencyRating(
    gpu: EnhancedGPUHardware, 
    errors: GPUValidationError[], 
    warnings: string[]
  ): void {
    if (!gpu.efficiency) {
      errors.push({
        field: 'efficiency',
        message: '效率评级不能为空',
        severity: 'error'
      });
      return;
    }

    const efficiency = gpu.efficiency;
    const rules = this.validationRules.efficiency;

    // 验证各项评分
    const scoreFields = ['overall', 'performance', 'powerEfficiency', 'costEffectiveness', 'reliability'] as const;
    
    for (const field of scoreFields) {
      const value = efficiency[field];
      const rule = rules[field];
      
      if (typeof value !== 'number' || value < rule.min || value > rule.max) {
        errors.push({
          field: `efficiency.${field}`,
          message: `${field}评分必须在 ${rule.min} 到 ${rule.max} 之间`,
          severity: 'error',
          expectedRange: rule,
          actualValue: value
        });
      }
    }

    // 验证可信度
    if (typeof efficiency.confidence !== 'number' || 
        efficiency.confidence < rules.confidence.min || 
        efficiency.confidence > rules.confidence.max) {
      errors.push({
        field: 'efficiency.confidence',
        message: `可信度必须在 ${rules.confidence.min} 到 ${rules.confidence.max} 之间`,
        severity: 'error',
        expectedRange: rules.confidence,
        actualValue: efficiency.confidence
      });
    }

    // 验证评分逻辑一致性
    if (efficiency.overall > Math.max(efficiency.performance, efficiency.powerEfficiency, efficiency.costEffectiveness)) {
      warnings.push('综合评分不应高于所有子项评分的最高值');
    }
  }

  /**
   * 验证数据一致性
   */
  private validateDataConsistency(
    gpu: EnhancedGPUHardware, 
    _errors: GPUValidationError[], 
    warnings: string[]
  ): void {
    // 验证性能与硬件规格的一致性
    if (gpu.benchmarks?.syntheticBenchmarks?.fp16Performance && gpu.computeUnits) {
      const expectedPerformance = this.estimatePerformance(gpu.computeUnits, gpu.boostClock);
      const actualPerformance = gpu.benchmarks.syntheticBenchmarks.fp16Performance;
      
      if (Math.abs(actualPerformance - expectedPerformance) / expectedPerformance > 0.5) {
        warnings.push(`FP16性能 ${actualPerformance} TFLOPS 与硬件规格不匹配，预期约 ${expectedPerformance.toFixed(1)} TFLOPS`);
      }
    }

    // 验证内存带宽利用率的合理性
    if (gpu.benchmarks?.syntheticBenchmarks?.memoryBandwidthUtilization) {
      const utilization = gpu.benchmarks.syntheticBenchmarks.memoryBandwidthUtilization;
      if (utilization > 0.95) {
        warnings.push('内存带宽利用率过高，可能不现实');
      }
    }

    // 验证功耗效率的合理性
    if (gpu.benchmarks?.llmInference?.powerEfficiency && gpu.tdp) {
      const efficiency = gpu.benchmarks.llmInference.powerEfficiency;
      const maxTheoreticalEfficiency = gpu.benchmarks.llmInference.tokensPerSecond / gpu.tdp;
      
      if (efficiency > maxTheoreticalEfficiency * 1.2) {
        warnings.push('功耗效率可能过于乐观');
      }
    }

    // 验证价格与性能的合理性
    if (gpu.price?.currentPrice && gpu.benchmarks?.llmInference?.tokensPerSecond) {
      const pricePerformanceRatio = gpu.price.currentPrice / gpu.benchmarks.llmInference.tokensPerSecond;
      
      // 这里可以添加与其他GPU的比较逻辑
      if (pricePerformanceRatio > 50) {
        warnings.push('价格性能比可能偏高');
      }
    }
  }

  /**
   * 验证数值字段
   */
  private validateNumericField(
    value: number,
    rule: { min: number; max: number; type: string; required: boolean },
    fieldName: string
  ): { isValid: boolean; error?: GPUValidationError } {
    if (rule.required && (value === undefined || value === null)) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          message: `${fieldName}是必填字段`,
          severity: 'error'
        }
      };
    }

    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          message: `${fieldName}必须是有效数字`,
          severity: 'error',
          actualValue: value
        }
      };
    }

    if (value < rule.min || value > rule.max) {
      return {
        isValid: false,
        error: {
          field: fieldName,
          message: `${fieldName}必须在 ${rule.min} 到 ${rule.max} 之间`,
          severity: 'error',
          expectedRange: { min: rule.min, max: rule.max },
          actualValue: value
        }
      };
    }

    return { isValid: true };
  }

  /**
   * 估算内存带宽（基于内存类型）
   */
  private estimateMemoryBandwidth(memoryType: string, memorySize: number): number | null {
    const bandwidthPerGB: Record<string, number> = {
      'GDDR6X': 42,     // GB/s per GB
      'GDDR6': 32,
      'HBM2e': 25,
      'HBM3': 42
    };

    const rate = bandwidthPerGB[memoryType];
    return rate ? rate * memorySize : null;
  }

  /**
   * 估算理论性能（基于计算单元和频率）
   */
  private estimatePerformance(computeUnits: number, clockMHz: number): number {
    // 简化的性能估算公式：TFLOPS = (计算单元数 * 频率 * 2) / 10^12
    return (computeUnits * clockMHz * 2) / 1000000;
  }

  /**
   * 计算数据可信度
   */
  private calculateConfidence(
    gpu: EnhancedGPUHardware,
    _errors: GPUValidationError[],
    _warnings: string[]
  ): number {
    let confidence = 1.0;

    // 错误降低可信度
    const errorCount = _errors.filter(e => e.severity === 'error').length;
    confidence -= errorCount * 0.15;

    // 警告降低可信度
    confidence -= _warnings.length * 0.03;

    // 数据来源影响可信度
    const sourceConfidence: Record<string, number> = {
      'manufacturer_official': 1.0,
      'third_party_verified': 0.9,
      'community_reported': 0.7,
      'estimated': 0.5
    };
    
    const sourceMultiplier = sourceConfidence[gpu.dataSource] || 0.5;
    confidence *= sourceMultiplier;

    // 数据新鲜度影响可信度
    if (gpu.lastUpdated) {
      const daysSinceUpdate = (Date.now() - gpu.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate > 90) {
        confidence *= 0.85;
      } else if (daysSinceUpdate > 30) {
        confidence *= 0.95;
      }
    }

    // 验证状态影响可信度
    if (!gpu.verified) {
      confidence *= 0.85;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * 批量验证GPU数据
   * @param gpus GPU数据数组
   * @returns 批量验证结果
   */
  validateBatch(gpus: EnhancedGPUHardware[]): {
    results: Array<{ gpu: EnhancedGPUHardware; validation: GPUValidationResult }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      averageConfidence: number;
    };
  } {
    const results = gpus.map(gpu => ({
      gpu,
      validation: this.validateGPUData(gpu)
    }));

    const valid = results.filter(r => r.validation.isValid).length;
    const invalid = results.length - valid;
    const averageConfidence = results.length > 0 
      ? results.reduce((sum, r) => sum + r.validation.confidence, 0) / results.length
      : 0;

    return {
      results,
      summary: {
        total: results.length,
        valid,
        invalid,
        averageConfidence
      }
    };
  }
}

// 导出默认实例
export const gpuDataValidator = new GPUDataValidator();