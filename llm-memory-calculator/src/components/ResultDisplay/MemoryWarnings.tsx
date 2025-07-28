import React, { useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { formatMemorySize } from '../../utils/formatters';
// import { GPU_HARDWARE } from '../../constants';

export interface MemoryWarningsProps {
  totalMemory: number;
  mode: CalculationMode;
  result: MemoryCalculationResult;
}

interface Warning {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  suggestions?: string[];
}

export const MemoryWarnings: React.FC<MemoryWarningsProps> = ({
  totalMemory,
  mode,
  result
}) => {
  const warnings = useMemo(() => {
    const warningList: Warning[] = [];
    
    // 检查内存是否超过常见GPU限制
    const commonGPUs = [
      { name: 'RTX 4090', memory: 24 * 1024 * 1024 * 1024 }, // 24GB
      { name: 'RTX 3090', memory: 24 * 1024 * 1024 * 1024 }, // 24GB
      { name: 'RTX 4080', memory: 16 * 1024 * 1024 * 1024 }, // 16GB
      { name: 'RTX 3080', memory: 10 * 1024 * 1024 * 1024 }, // 10GB
      { name: 'RTX 4070', memory: 12 * 1024 * 1024 * 1024 }, // 12GB
    ];

    // 检查是否超过所有常见GPU的内存限制
    const exceedsAllGPUs = commonGPUs.every(gpu => totalMemory > gpu.memory);
    if (exceedsAllGPUs) {
      warningList.push({
        type: 'error',
        title: '内存需求过高',
        message: `当前配置需要 ${formatMemorySize(totalMemory)} 内存，超过了所有常见消费级GPU的显存容量。`,
        suggestions: [
          '考虑使用更小的模型',
          '减少批处理大小',
          '使用模型并行或数据并行',
          '考虑使用专业级GPU（如A100、H100）',
          '使用CPU推理（速度较慢）'
        ]
      });
    } else {
      // 找到可以运行的GPU
      const compatibleGPUs = commonGPUs.filter(gpu => totalMemory <= gpu.memory);
      if (compatibleGPUs.length > 0) {
        warningList.push({
          type: 'info',
          title: '推荐GPU',
          message: `当前配置可以在以下GPU上运行：${compatibleGPUs.map(gpu => gpu.name).join('、')}`,
        });
      }
    }

    // 检查批处理大小是否过大
    if (result.parameters.batchSize > 32) {
      warningList.push({
        type: 'warning',
        title: '批处理大小较大',
        message: `当前批处理大小为 ${result.parameters.batchSize}，可能导致内存不足。`,
        suggestions: [
          '尝试减少批处理大小',
          '使用梯度累积技术',
          '考虑使用更大显存的GPU'
        ]
      });
    }

    // 检查序列长度是否过长
    if (result.parameters.sequenceLength > 4096) {
      warningList.push({
        type: 'warning',
        title: '序列长度较长',
        message: `当前序列长度为 ${result.parameters.sequenceLength}，会显著增加内存需求。`,
        suggestions: [
          '考虑使用更短的序列长度',
          '使用滑动窗口技术',
          '考虑使用支持长序列的优化模型'
        ]
      });
    }

    // 训练模式特定警告
    if (mode === 'training') {
      const trainingOverhead = (result.training.gradients + result.training.optimizerStates) / totalMemory;
      if (trainingOverhead > 0.6) {
        warningList.push({
          type: 'warning',
          title: '训练开销较高',
          message: `梯度和优化器状态占用了 ${(trainingOverhead * 100).toFixed(1)}% 的内存。`,
          suggestions: [
            '考虑使用更简单的优化器（如SGD）',
            '使用梯度检查点技术',
            '考虑使用混合精度训练'
          ]
        });
      }
    }

    // 精度相关建议
    if (result.parameters.precision === 'fp32') {
      warningList.push({
        type: 'info',
        title: '精度优化建议',
        message: '当前使用FP32精度，可以考虑使用FP16或BF16来减少内存使用。',
        suggestions: [
          '使用FP16可减少约50%内存',
          '使用BF16在某些硬件上性能更好',
          '注意混合精度训练的数值稳定性'
        ]
      });
    }

    return warningList;
  }, [totalMemory, mode, result]);

  if (warnings.length === 0) {
    return (
      <div className="memory-warnings">
        <div className="warning-item success">
          <div className="warning-icon">✅</div>
          <div className="warning-content">
            <h5>配置良好</h5>
            <p>当前配置的内存需求在合理范围内。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="memory-warnings">
      <h4>内存分析和建议</h4>
      {warnings.map((warning, index) => (
        <div key={index} className={`warning-item ${warning.type}`}>
          <div className="warning-icon">
            {warning.type === 'error' && '❌'}
            {warning.type === 'warning' && '⚠️'}
            {warning.type === 'info' && 'ℹ️'}
          </div>
          <div className="warning-content">
            <h5>{warning.title}</h5>
            <p>{warning.message}</p>
            {warning.suggestions && (
              <ul className="warning-suggestions">
                {warning.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};