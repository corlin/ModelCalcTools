import React, { useState, useMemo } from 'react';
import { ModelPreset, ModelCategory } from '../../types';
import { MODEL_PRESETS, getModelsByCategory, getAllCategories } from '../../utils/modelPresets';
import { MODEL_CATEGORY_LABELS } from '../../constants';
import { ModelCard } from './ModelCard';
import { CategoryFilter } from './CategoryFilter';

export interface PresetSelectorProps {
  selectedPreset?: string;
  onPresetSelect: (preset: ModelPreset) => void;
  onCustomMode?: () => void;
  showPopularOnly?: boolean;
  className?: string;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPreset,
  onPresetSelect,
  onCustomMode,
  showPopularOnly = false,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // 获取所有类别
  const categories = useMemo(() => getAllCategories(), []);

  // 过滤模型
  const filteredModels = useMemo(() => {
    let models = MODEL_PRESETS;

    // 只显示热门模型
    if (showPopularOnly) {
      models = models.filter(model => model.popular);
    }

    // 按类别过滤
    if (selectedCategory !== 'all') {
      models = getModelsByCategory(selectedCategory);
    }

    // 按搜索查询过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      models = models.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query)
      );
    }

    return models;
  }, [selectedCategory, searchQuery, showPopularOnly]);

  // 按类别分组的模型
  const modelsByCategory = useMemo(() => {
    const grouped: Record<ModelCategory, ModelPreset[]> = {
      gpt: [],
      llama: [],
      bert: [],
      other: []
    };

    filteredModels.forEach(model => {
      grouped[model.category].push(model);
    });

    return grouped;
  }, [filteredModels]);

  const handlePresetSelect = (preset: ModelPreset) => {
    onPresetSelect(preset);
  };

  const handleCustomMode = () => {
    if (onCustomMode) {
      onCustomMode();
    }
  };

  return (
    <div className={`preset-selector ${className}`}>
      <div className="preset-selector-header">
        <h3>选择预设模型</h3>
        <div className="preset-selector-controls">
          {/* 搜索框 */}
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索模型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          {/* 显示详情切换 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`toggle-details ${showDetails ? 'active' : ''}`}
            title={showDetails ? '隐藏详情' : '显示详情'}
          >
            {showDetails ? '📋' : '📄'}
          </button>

          {/* 自定义模式按钮 */}
          {onCustomMode && (
            <button
              onClick={handleCustomMode}
              className="custom-mode-btn"
              title="自定义参数"
            >
              ⚙️ 自定义
            </button>
          )}
        </div>
      </div>

      {/* 类别过滤器 */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        modelCounts={modelsByCategory}
      />

      {/* 模型统计 */}
      <div className="model-stats">
        <span className="model-count">
          找到 {filteredModels.length} 个模型
        </span>
        {searchQuery && (
          <span className="search-info">
            搜索: "{searchQuery}"
          </span>
        )}
      </div>

      {/* 模型列表 */}
      <div className="model-list">
        {filteredModels.length === 0 ? (
          <div className="no-models">
            <p>没有找到匹配的模型</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="clear-search"
              >
                清除搜索
              </button>
            )}
          </div>
        ) : selectedCategory === 'all' ? (
          // 按类别分组显示
          categories.map(category => {
            const categoryModels = modelsByCategory[category as ModelCategory];
            if (categoryModels.length === 0) return null;

            return (
              <div key={category} className="category-section">
                <h4 className="category-title">
                  {MODEL_CATEGORY_LABELS[category as ModelCategory]}
                  <span className="category-count">({categoryModels.length})</span>
                </h4>
                <div className="model-grid">
                  {categoryModels.map((model: ModelPreset) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isSelected={selectedPreset === model.id}
                      showDetails={showDetails}
                      onSelect={handlePresetSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          // 单一类别显示
          <div className="model-grid">
            {filteredModels.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                isSelected={selectedPreset === model.id}
                showDetails={showDetails}
                onSelect={handlePresetSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* 热门模型快速选择 */}
      {!showPopularOnly && selectedCategory === 'all' && !searchQuery && (
        <div className="popular-models">
          <h4>热门模型</h4>
          <div className="popular-model-chips">
            {MODEL_PRESETS.filter(model => model.popular).map(model => (
              <button
                key={model.id}
                onClick={() => handlePresetSelect(model)}
                className={`popular-chip ${selectedPreset === model.id ? 'selected' : ''}`}
              >
                {model.name}
                <span className="chip-params">{model.parameters.parameterCount}B</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetSelector;