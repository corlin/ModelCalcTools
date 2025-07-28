import { useState } from 'react'
import { DEFAULT_MODEL_PARAMS } from './constants'
import { CalculationMode, MemoryCalculationResult, ModelParameters } from './types'
import { calculateMemoryRequirements } from './utils/memoryCalculator'

function AppMinimal() {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('inference')
  const [memoryResult, setMemoryResult] = useState<MemoryCalculationResult | null>(null)
  const [currentParams, setCurrentParams] = useState<ModelParameters>(DEFAULT_MODEL_PARAMS)

  const handleCalculate = () => {
    const result = calculateMemoryRequirements(currentParams, calculationMode)
    setMemoryResult(result)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>LLM内存计算器 - 最小版本</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>计算模式</h2>
        <label>
          <input
            type="radio"
            value="inference"
            checked={calculationMode === 'inference'}
            onChange={(e) => setCalculationMode(e.target.value as CalculationMode)}
          />
          推理模式
        </label>
        <label style={{ marginLeft: '20px' }}>
          <input
            type="radio"
            value="training"
            checked={calculationMode === 'training'}
            onChange={(e) => setCalculationMode(e.target.value as CalculationMode)}
          />
          训练模式
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>模型参数</h2>
        <div>
          <label>
            参数数量 (B): 
            <input
              type="number"
              value={currentParams.parameterCount}
              onChange={(e) => setCurrentParams({
                ...currentParams,
                parameterCount: parseFloat(e.target.value) || 0
              })}
              style={{ marginLeft: '10px', width: '100px' }}
            />
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>
            批处理大小: 
            <input
              type="number"
              value={currentParams.batchSize}
              onChange={(e) => setCurrentParams({
                ...currentParams,
                batchSize: parseInt(e.target.value) || 1
              })}
              style={{ marginLeft: '10px', width: '100px' }}
            />
          </label>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>
            序列长度: 
            <input
              type="number"
              value={currentParams.sequenceLength}
              onChange={(e) => setCurrentParams({
                ...currentParams,
                sequenceLength: parseInt(e.target.value) || 1
              })}
              style={{ marginLeft: '10px', width: '100px' }}
            />
          </label>
        </div>
      </div>

      <button 
        onClick={handleCalculate}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        计算内存需求
      </button>

      {memoryResult && (
        <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
          <h2>计算结果</h2>
          {calculationMode === 'inference' ? (
            <div>
              <p>模型权重: {(memoryResult.inference.modelWeights / (1024**3)).toFixed(2)} GB</p>
              <p>激活值: {(memoryResult.inference.activations / (1024**3)).toFixed(2)} GB</p>
              <p><strong>总计: {(memoryResult.inference.total / (1024**3)).toFixed(2)} GB</strong></p>
            </div>
          ) : (
            <div>
              <p>模型权重: {(memoryResult.training.modelWeights / (1024**3)).toFixed(2)} GB</p>
              <p>激活值: {(memoryResult.training.activations / (1024**3)).toFixed(2)} GB</p>
              <p>梯度: {(memoryResult.training.gradients / (1024**3)).toFixed(2)} GB</p>
              <p>优化器状态: {(memoryResult.training.optimizerStates / (1024**3)).toFixed(2)} GB</p>
              <p><strong>总计: {(memoryResult.training.total / (1024**3)).toFixed(2)} GB</strong></p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AppMinimal