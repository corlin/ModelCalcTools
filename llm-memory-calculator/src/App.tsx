import { useState, useCallback, useMemo } from 'react'
import { DEFAULT_MODEL_PARAMS } from './constants'
import { ModelPreset, CalculationMode, MemoryCalculationResult, ModelParameters, ErrorState } from './types'
import { calculateMemoryRequirements } from './utils/memoryCalculator'
import { ModelInput } from './components/ModelInput'
import { PresetSelector } from './components/PresetSelector'
import { ResultDisplay } from './components/ResultDisplay'
import { MemoryChart } from './components/MemoryChart'
import { BatchOptimizer } from './components/BatchOptimizer'
import { HardwareRecommendation } from './components/HardwareRecommendation'
import { ChartType } from './components/MemoryChart/ChartTypeToggle'
import './components/ModelInput/ModelInput.css'
import './App.css'

// 视图类型
type ViewType = 'input' | 'results' | 'chart' | 'optimizer' | 'hardware';

function App() {
  // 核心状态
  const [selectedPreset, setSelectedPreset] = useState<ModelPreset | null>(null)
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('inference')
  const [memoryResult, setMemoryResult] = useState<MemoryCalculationResult | null>(null)
  const [currentParams, setCurrentParams] = useState<ModelParameters>(DEFAULT_MODEL_PARAMS)
  const [validationError, setValidationError] = useState<ErrorState>({ hasError: false, errorMessage: '' })
  const [isParamsValid, setIsParamsValid] = useState(true)
  
  // 界面状态
  const [activeView, setActiveView] = useState<ViewType>('input')
  const [chartType, setChartType] = useState<ChartType>('pie')
  const [showPresetSelector, setShowPresetSelector] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)



  // 计算内存需求
  const calculateMemory = useCallback((params: ModelParameters, mode: CalculationMode) => {
    try {
      const result = calculateMemoryRequirements(params, mode)
      setMemoryResult(result)
      return result
    } catch (error) {
      console.error('内存计算失败:', error)
      setMemoryResult(null)
      return null
    }
  }, [])

  // 处理参数变化
  const handleParametersChange = useCallback((params: ModelParameters, isValid: boolean) => {
    setCurrentParams(params)
    setIsParamsValid(isValid)
    
    if (isValid) {
      calculateMemory(params, calculationMode)
    } else {
      setMemoryResult(null)
    }
  }, [calculationMode, calculateMemory])

  // 处理验证错误
  const handleValidationChange = useCallback((error: ErrorState) => {
    setValidationError(error)
  }, [])

  // 处理预设模型选择
  const handlePresetSelect = useCallback((preset: ModelPreset) => {
    setSelectedPreset(preset)
    setCurrentParams(preset.parameters)
    calculateMemory(preset.parameters, calculationMode)
    setShowPresetSelector(false)
    // 自动切换到结果视图
    if (activeView === 'input') {
      setActiveView('results')
    }
  }, [calculationMode, calculateMemory, activeView])

  // 处理计算模式变化
  const handleModeChange = useCallback((mode: CalculationMode) => {
    setCalculationMode(mode)
    if (isParamsValid) {
      calculateMemory(currentParams, mode)
    }
  }, [isParamsValid, currentParams, calculateMemory])

  // 处理批处理大小变化
  const handleBatchSizeChange = useCallback((batchSize: number) => {
    const newParams = { ...currentParams, batchSize }
    setCurrentParams(newParams)
    if (isParamsValid) {
      calculateMemory(newParams, calculationMode)
    }
  }, [currentParams, isParamsValid, calculationMode, calculateMemory])

  // 处理视图切换
  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view)
  }, [])

  // 检查是否有计算结果
  const hasResults = useMemo(() => memoryResult !== null, [memoryResult])

  return (
    <div className="app">
      {/* 应用头部 */}
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>大模型内存需求计算工具</h1>
            <p>精确计算大语言模型GPU内存需求的专业工具</p>
          </div>
          
          <div className="header-actions">
            <button
              onClick={() => setShowPresetSelector(!showPresetSelector)}
              className={`preset-toggle ${showPresetSelector ? 'active' : ''}`}
              title="选择预设模型"
            >
              📋 预设模型
            </button>
            
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="sidebar-toggle"
              title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {sidebarCollapsed ? '📖' : '📕'}
            </button>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* 侧边栏 */}
        <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* 导航菜单 */}
          <nav className="sidebar-nav">
            <div className="nav-section">
              <h3>输入配置</h3>
              <button
                onClick={() => handleViewChange('input')}
                className={`nav-item ${activeView === 'input' ? 'active' : ''}`}
              >
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">参数输入</span>
              </button>
            </div>

            <div className="nav-section">
              <h3>结果分析</h3>
              <button
                onClick={() => handleViewChange('results')}
                className={`nav-item ${activeView === 'results' ? 'active' : ''} ${!hasResults ? 'disabled' : ''}`}
                disabled={!hasResults}
              >
                <span className="nav-icon">📊</span>
                <span className="nav-text">计算结果</span>
              </button>
              
              <button
                onClick={() => handleViewChange('chart')}
                className={`nav-item ${activeView === 'chart' ? 'active' : ''} ${!hasResults ? 'disabled' : ''}`}
                disabled={!hasResults}
              >
                <span className="nav-icon">📈</span>
                <span className="nav-text">可视化图表</span>
              </button>
              
              <button
                onClick={() => handleViewChange('optimizer')}
                className={`nav-item ${activeView === 'optimizer' ? 'active' : ''} ${!hasResults ? 'disabled' : ''}`}
                disabled={!hasResults}
              >
                <span className="nav-icon">⚡</span>
                <span className="nav-text">批处理优化</span>
              </button>
              
              <button
                onClick={() => handleViewChange('hardware')}
                className={`nav-item ${activeView === 'hardware' ? 'active' : ''} ${!hasResults ? 'disabled' : ''}`}
                disabled={!hasResults}
              >
                <span className="nav-icon">🖥️</span>
                <span className="nav-text">硬件推荐</span>
              </button>
            </div>
          </nav>

          {/* 快速信息面板 */}
          {!sidebarCollapsed && hasResults && (
            <div className="quick-info">
              <h4>快速信息</h4>
              <div className="info-item">
                <span className="info-label">当前模型</span>
                <span className="info-value">
                  {selectedPreset?.name || '自定义模型'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">参数量</span>
                <span className="info-value">{currentParams.parameterCount}B</span>
              </div>
              <div className="info-item">
                <span className="info-label">计算模式</span>
                <span className="info-value">
                  {calculationMode === 'inference' ? '推理' : '训练'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">总内存需求</span>
                <span className="info-value">
                  {memoryResult ? 
                    `${(calculationMode === 'inference' ? memoryResult.inference.total : memoryResult.training.total).toFixed(2)} GB` 
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* 主内容区 */}
        <main className="app-main">
          {/* 预设模型选择器 */}
          {showPresetSelector && (
            <div className="preset-overlay">
              <div className="preset-modal">
                <div className="preset-modal-header">
                  <h3>选择预设模型</h3>
                  <button
                    onClick={() => setShowPresetSelector(false)}
                    className="close-button"
                  >
                    ✕
                  </button>
                </div>
                <PresetSelector
                  selectedPreset={selectedPreset?.id}
                  onPresetSelect={handlePresetSelect}
                  onCustomMode={() => {
                    setShowPresetSelector(false)
                    setActiveView('input')
                  }}
                />
              </div>
            </div>
          )}

          {/* 主视图内容 */}
          <div className="main-content">
            {activeView === 'input' && (
              <div className="view-container">
                <div className="view-header">
                  <h2>模型参数配置</h2>
                  <p>输入或调整模型参数以计算内存需求</p>
                </div>
                
                <ModelInput
                  initialParams={currentParams}
                  onParametersChange={handleParametersChange}
                  onValidationChange={handleValidationChange}
                />

                {/* 验证错误提示 */}
                {validationError.hasError && (
                  <div className="error-card">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <h4>参数验证错误</h4>
                      <p>{validationError.errorMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'results' && hasResults && (
              <div className="view-container">
                <ResultDisplay
                  result={memoryResult}
                  mode={calculationMode}
                  onModeChange={handleModeChange}
                  showWarnings={true}
                  showBreakdown={true}
                />
              </div>
            )}

            {activeView === 'chart' && hasResults && (
              <div className="view-container">
                <div className="view-header">
                  <h2>内存分布可视化</h2>
                  <p>图表展示不同类型内存的使用情况</p>
                </div>
                
                <MemoryChart
                  result={memoryResult!}
                  mode={calculationMode}
                  chartType={chartType}
                  onChartTypeChange={setChartType}
                  showLegend={true}
                  showValues={true}
                  animated={true}
                />
              </div>
            )}

            {activeView === 'optimizer' && hasResults && (
              <div className="view-container">
                <BatchOptimizer
                  parameters={currentParams}
                  mode={calculationMode}
                  maxMemoryGB={24}
                  onBatchSizeChange={handleBatchSizeChange}
                />
              </div>
            )}

            {activeView === 'hardware' && hasResults && (
              <div className="view-container">
                <HardwareRecommendation
                  result={memoryResult}
                  mode={calculationMode}
                  budget={50000}
                />
              </div>
            )}

            {/* 空状态 */}
            {!hasResults && activeView !== 'input' && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>暂无计算结果</h3>
                <p>请先在参数输入页面配置模型参数，或选择预设模型开始计算</p>
                <div className="empty-actions">
                  <button
                    onClick={() => handleViewChange('input')}
                    className="primary-button"
                  >
                    前往参数输入
                  </button>
                  <button
                    onClick={() => setShowPresetSelector(true)}
                    className="secondary-button"
                  >
                    选择预设模型
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
