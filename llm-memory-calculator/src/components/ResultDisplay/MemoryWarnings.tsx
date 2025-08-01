import React, { useMemo } from 'react';
import { MemoryCalculationResult, CalculationMode } from '../../types';
import { MemoryUnitConverter } from '../../utils/MemoryUnitConverter';
import { gpuRecommendationEngine } from '../../utils/gpuRecommendationEngine';
import './MemoryWarnings.css';

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

// 辅助函数：获取利用率描述
const getUtilizationDescription = (rating: string): string => {
  switch (rating) {
    case 'excellent': return '最佳利用率，性能与效率平衡';
    case 'good': return '良好利用率，推荐使用';
    case 'fair': return '一般利用率，可以接受';
    case 'poor': return '利用率较低，考虑其他选择';
    default: return '利用率评估中';
  }
};

// 辅助函数：获取效率描述
const getEfficiencyDescription = (rating: string): string => {
  switch (rating) {
    case 'excellent': return '性价比极佳';
    case 'good': return '性价比良好';
    case 'fair': return '性价比一般';
    case 'poor': return '性价比较低';
    default: return '评估中';
  }
};

export const MemoryWarnings: React.FC<MemoryWarningsProps> = ({
  totalMemory,
  mode,
  result
}) => {
  const warnings = useMemo(() => {
    const warningList: Warning[] = [];

    // 使用统一的GPU推荐引擎
    const recommendationResult = gpuRecommendationEngine.generateRecommendations(result, mode);
    const compatibleGPUs = recommendationResult.recommendations.filter(r => r.suitable);
    const incompatibleGPUs = recommendationResult.recommendations.filter(r => !r.suitable);

    // 检查是否超过所有GPU的内存限制
    if (compatibleGPUs.length === 0) {
      const largestGPU = recommendationResult.recommendations
        .sort((a, b) => b.memorySize - a.memorySize)[0];
      
      if (largestGPU) {
        const reductionNeeded = MemoryUnitConverter.bytesToGB(totalMemory - MemoryUnitConverter.gbToBytes(largestGPU.memorySize));

        warningList.push({
          type: 'error',
          title: '内存需求严重超标',
          message: `当前配置需要 ${MemoryUnitConverter.formatMemorySize(totalMemory, 1)} 内存，超过了所有可用GPU的显存容量。需要减少至少 ${reductionNeeded.toFixed(1)}GB 内存使用。`,
          suggestions: [
            `减少批处理大小至 ${Math.max(1, Math.floor(result.parameters.batchSize * 0.5))} 或更小`,
            `使用更小的模型（如7B参数模型替代13B+模型）`,
            `启用梯度检查点技术可节省约30-50%内存`,
            `考虑使用专业级GPU：A100 (80GB) 或 H100 (80GB)`,
            `使用模型并行：将模型分布到多张GPU上`,
            `CPU推理作为备选方案（速度较慢但无显存限制）`
          ]
        });
      }
    } else {
      // 获取最佳推荐GPU
      const bestGPU = recommendationResult.bestRecommendation;
      
      if (bestGPU) {
        const utilizationPercent = bestGPU.memoryUtilization;
        const utilizationLevel = bestGPU.standardizedUtilization.efficiencyRating;
        const price = `约 ¥${Math.round(bestGPU.price * 7.2 / 1000)}K`;

        warningList.push({
          type: 'info',
          title: '推荐GPU配置',
          message: `当前配置可以在以下GPU上运行，推荐 ${bestGPU.name} (${utilizationPercent.toFixed(1)}% 利用率，${price})
            <div class="memory-progress-indicator">
              <div class="memory-progress-bar">
                <div class="memory-progress-fill ${utilizationLevel}" style="width: ${Math.min(utilizationPercent, 100)}%"></div>
              </div>
              <div class="memory-progress-text">${utilizationPercent.toFixed(1)}%</div>
            </div>`,
          suggestions: [
            `💡 最佳选择：${bestGPU.name} - 效率评级 ${bestGPU.standardizedUtilization.efficiencyRating}`,
            `📊 兼容GPU：${compatibleGPUs.slice(0, 3).map(gpu => `${gpu.name} (约 ¥${Math.round(gpu.price * 7.2 / 1000)}K)`).join('、')}`,
            incompatibleGPUs.length > 0 ? `❌ 不兼容：${incompatibleGPUs.slice(0, 3).map(gpu => gpu.name).join('、')} - 显存不足` : null,
            `⚡ 利用率：${utilizationPercent.toFixed(1)}% - ${getUtilizationDescription(bestGPU.standardizedUtilization.efficiencyRating)}`,
            `💰 成本效益：${price} - ${getEfficiencyDescription(bestGPU.standardizedUtilization.efficiencyRating)}`
          ].filter(Boolean) as string[]
        });
      }
    }

    // 检查批处理大小是否过大
    if (result.parameters.batchSize > 32) {
      const recommendedBatchSize = Math.max(1, Math.floor(result.parameters.batchSize * 0.6));
      const memoryReduction = MemoryUnitConverter.calculatePercentage(
        result.parameters.batchSize - recommendedBatchSize,
        result.parameters.batchSize,
        0
      );

      warningList.push({
        type: 'warning',
        title: '批处理大小过大',
        message: `当前批处理大小为 ${result.parameters.batchSize}，建议降至 ${recommendedBatchSize} 以减少约 ${memoryReduction}% 内存使用。`,
        suggestions: [
          `立即优化：将批处理大小设为 ${recommendedBatchSize}`,
          `使用梯度累积：保持有效批大小不变，分多步累积梯度`,
          `动态批处理：根据可用内存自动调整批大小`,
          `如需保持大批处理：考虑升级到更大显存的GPU`
        ]
      });
    } else if (result.parameters.batchSize > 16 && MemoryUnitConverter.bytesToGB(totalMemory) > 20) {
      warningList.push({
        type: 'info',
        title: '批处理优化建议',
        message: `当前批处理大小 ${result.parameters.batchSize} 适中，但可进一步优化内存使用。`,
        suggestions: [
          `尝试批大小 ${Math.max(1, result.parameters.batchSize - 4)} 以获得更多内存余量`,
          `启用混合精度训练可额外节省约50%内存`
        ]
      });
    }

    // 检查序列长度是否过长
    if (result.parameters.sequenceLength > 4096) {
      const recommendedLength = Math.min(4096, Math.floor(result.parameters.sequenceLength * 0.75));
      const memoryImpact = Math.pow(result.parameters.sequenceLength / 2048, 2); // 序列长度对内存的二次方影响
      const impactPercentage = (memoryImpact * 100 - 100).toFixed(0);

      warningList.push({
        type: 'warning',
        title: '序列长度过长',
        message: `当前序列长度 ${result.parameters.sequenceLength} 会导致内存需求增加约 ${impactPercentage}%。建议降至 ${recommendedLength}。`,
        suggestions: [
          `立即优化：将序列长度设为 ${recommendedLength}`,
          `使用滑动窗口：处理长文本时分段处理`,
          `文档分块：将长文档分割为较短的片段`,
          `考虑Longformer或BigBird等长序列优化模型`,
          `使用稀疏注意力机制减少内存占用`
        ]
      });
    } else if (result.parameters.sequenceLength > 2048 && MemoryUnitConverter.bytesToGB(totalMemory) > 15) {
      warningList.push({
        type: 'info',
        title: '序列长度优化建议',
        message: `序列长度 ${result.parameters.sequenceLength} 适中，但在大模型上仍有优化空间。`,
        suggestions: [
          `对于大多数任务，2048长度已足够`,
          `如需处理长文本，考虑使用检索增强生成(RAG)方案`
        ]
      });
    }

    // 训练模式特定警告
    if (mode === 'training') {
      const trainingOverhead = (result.training.gradients + result.training.optimizerStates) / totalMemory;
      if (trainingOverhead > 0.6) {
        const potentialSavingsBytes = trainingOverhead * totalMemory * 0.4;
        const potentialSavings = MemoryUnitConverter.bytesToGB(potentialSavingsBytes);
        const overheadPercentage = MemoryUnitConverter.calculatePercentage(
          result.training.gradients + result.training.optimizerStates,
          totalMemory,
          1
        );

        warningList.push({
          type: 'warning',
          title: '训练内存开销过高',
          message: `梯度和优化器状态占用了 ${overheadPercentage}% 的内存，可优化节省约 ${potentialSavings.toFixed(1)}GB。`,
          suggestions: [
            `使用AdamW替代Adam优化器可节省约20%内存`,
            `启用梯度检查点技术可节省30-50%激活值内存`,
            `使用混合精度训练(FP16)可减少约50%内存占用`,
            `考虑使用SGD优化器（内存占用最小但收敛可能较慢）`,
            `使用ZeRO优化器状态分片技术`,
            `启用梯度累积减少批处理大小`
          ]
        });
      } else if (trainingOverhead > 0.4) {
        const overheadPercentage = MemoryUnitConverter.calculatePercentage(
          result.training.gradients + result.training.optimizerStates,
          totalMemory,
          1
        );

        warningList.push({
          type: 'info',
          title: '训练内存优化建议',
          message: `训练开销 ${overheadPercentage}% 在合理范围内，但仍有优化空间。`,
          suggestions: [
            `启用混合精度训练可进一步减少内存使用`,
            `使用梯度检查点在内存和计算时间间取得平衡`
          ]
        });
      }
    }

    // 精度相关建议
    if (result.parameters.precision === 'fp32') {
      const fp16SavingsBytes = totalMemory * 0.5;
      const fp16Savings = MemoryUnitConverter.bytesToGB(fp16SavingsBytes);

      warningList.push({
        type: 'info',
        title: '精度优化建议',
        message: `当前使用FP32精度，切换到FP16可节省约 ${fp16Savings.toFixed(1)}GB 内存（50%减少）。`,
        suggestions: [
          `立即优化：使用FP16混合精度训练`,
          `BF16精度：在A100/H100等新硬件上推荐使用`,
          `INT8量化：推理时可进一步减少75%内存使用`,
          `注意事项：监控训练稳定性，必要时调整学习率`,
          `硬件要求：确保GPU支持Tensor Core加速`
        ]
      });
    } else if (result.parameters.precision === 'fp16') {
      warningList.push({
        type: 'info',
        title: '精度配置良好',
        message: '已使用FP16精度，内存使用已优化。如需进一步优化可考虑量化技术。',
        suggestions: [
          `INT8量化：推理时可再减少50%内存`,
          `INT4量化：极限内存优化，但可能影响精度`
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
            <div className="memory-progress-indicator">
              <div className="memory-progress-bar">
                <div className="memory-progress-fill optimal" style={{ width: '75%' }}></div>
              </div>
              <div className="memory-progress-text">优化</div>
            </div>
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
            {warning.type === 'error' && '🚨'}
            {warning.type === 'warning' && '⚠️'}
            {warning.type === 'info' && '💡'}
          </div>
          <div className="warning-content">
            <h5>
              {warning.title}
              {warning.type === 'error' && (
                <span className="memory-utilization-badge critical">严重</span>
              )}
              {warning.type === 'warning' && (
                <span className="memory-utilization-badge high">注意</span>
              )}
            </h5>
            <div
              dangerouslySetInnerHTML={{
                __html: warning.message.replace(/\n/g, '<br/>')
              }}
            />
            {warning.suggestions && (
              <div className="warning-suggestions">
                <ul>
                  {warning.suggestions.map((suggestion, idx) => (
                    <li key={idx}>{suggestion}</li>
                  ))}
                </ul>
                {(warning.type === 'error' || warning.type === 'warning') && (
                  <div className="warning-action-buttons">
                    <button
                      className="warning-action-button primary"
                      onClick={() => {
                        // 可以添加自动优化功能
                        console.log('Auto-optimize clicked for:', warning.title);
                      }}
                    >
                      🔧 自动优化
                    </button>
                    <button
                      className="warning-action-button secondary"
                      onClick={() => {
                        // 可以添加详细说明功能
                        console.log('Learn more clicked for:', warning.title);
                      }}
                    >
                      📖 了解更多
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};