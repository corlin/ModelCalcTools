// 简单的组件测试文件
import React from 'react';
import { ModelInput } from './components/ModelInput';
import { PresetSelector } from './components/PresetSelector';
import { ResultDisplay } from './components/ResultDisplay';
import { MemoryChart } from './components/MemoryChart';
import { DEFAULT_MODEL_PARAMS } from './constants';
import { calculateMemoryRequirements } from './utils/memoryCalculator';

// 测试数据
const testResult = calculateMemoryRequirements(DEFAULT_MODEL_PARAMS, 'inference');

export const TestComponents: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>组件测试页面</h1>
      
      <section style={{ marginBottom: '40px' }}>
        <h2>1. ModelInput 组件</h2>
        <ModelInput
          initialParams={DEFAULT_MODEL_PARAMS}
          onParametersChange={() => {}}
          onValidationChange={() => {}}
        />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>2. PresetSelector 组件</h2>
        <PresetSelector
          onPresetSelect={() => {}}
        />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>3. ResultDisplay 组件</h2>
        <ResultDisplay
          result={testResult}
          mode="inference"
          onModeChange={() => {}}
        />
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>4. MemoryChart 组件</h2>
        <MemoryChart
          result={testResult}
          mode="inference"
          chartType="pie"
          onChartTypeChange={() => {}}
        />
      </section>
    </div>
  );
};

export default TestComponents;