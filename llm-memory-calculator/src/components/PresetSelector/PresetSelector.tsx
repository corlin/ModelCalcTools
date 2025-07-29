import React, { useState, useMemo, useCallback } from 'react';
import { ModelPreset, ModelCategory } from '../../types';
import { MODEL_PRESETS, getAllCategories } from '../../utils/modelPresets';
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

type SortOption = 'name' | 'parameters' | 'category';

interface FilterState {
  searchQuery: string;
  selectedCategory: ModelCategory | 'all';
  showPopularOnly: boolean;
  parameterRange: {
    min: number;
    max: number;
  };
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPreset,
  onPresetSelect,
  onCustomMode,
  showPopularOnly: initialShowPopularOnly = false,
  className = ''
}) => {
  // Get parameter range from all models
  const parameterRange = useMemo(() => {
    const params = MODEL_PRESETS.map(model => model.parameters.parameterCount);
    return {
      min: Math.min(...params),
      max: Math.max(...params)
    };
  }, []);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedCategory: 'all',
    showPopularOnly: initialShowPopularOnly,
    parameterRange: parameterRange,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  const [showDetails, setShowDetails] = useState(false);

  // 获取所有类别
  const categories = useMemo(() => getAllCategories(), []);

  // 搜索防抖
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(filters.searchQuery);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // 过滤和排序模型
  const filteredAndSortedModels = useMemo(() => {
    let models = [...MODEL_PRESETS];

    // 按搜索查询过滤
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      models = models.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        model.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        model.recommendedUseCase?.toLowerCase().includes(query)
      );
    }

    // 按类别过滤
    if (filters.selectedCategory !== 'all') {
      models = models.filter(model => model.category === filters.selectedCategory);
    }

    // 只显示热门模型
    if (filters.showPopularOnly) {
      models = models.filter(model => model.popular);
    }

    // 按参数范围过滤
    models = models.filter(model => 
      model.parameters.parameterCount >= filters.parameterRange.min &&
      model.parameters.parameterCount <= filters.parameterRange.max
    );

    // 排序
    models.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'parameters':
          comparison = a.parameters.parameterCount - b.parameters.parameterCount;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return models;
  }, [filters, debouncedSearchQuery]);

  // 按类别分组的模型
  const modelsByCategory = useMemo(() => {
    const grouped: Record<ModelCategory, ModelPreset[]> = {
      gpt: [],
      llama: [],
      bert: [],
      deepseek: [],
      other: []
    };

    filteredAndSortedModels.forEach(model => {
      grouped[model.category].push(model);
    });

    return grouped;
  }, [filteredAndSortedModels]);

  // 更新过滤器的回调函数
  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    updateFilter('searchQuery', query);
  }, [updateFilter]);

  const handleCategoryChange = useCallback((category: ModelCategory | 'all') => {
    updateFilter('selectedCategory', category);
  }, [updateFilter]);

  const handlePopularToggle = useCallback(() => {
    updateFilter('showPopularOnly', !filters.showPopularOnly);
  }, [filters.showPopularOnly, updateFilter]);

  const handleParameterRangeChange = useCallback((min: number, max: number) => {
    updateFilter('parameterRange', { min, max });
  }, [updateFilter]);

  const handleSortChange = useCallback((sortBy: SortOption, sortOrder?: 'asc' | 'desc') => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: sortOrder || (prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc')
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedCategory: 'all',
      showPopularOnly: false,
      parameterRange: parameterRange,
      sortBy: 'name',
      sortOrder: 'asc'
    });
  }, [parameterRange]);

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
              placeholder="搜索模型名称、描述、标签..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
            {filters.searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="clear-search-btn"
                title="清除搜索"
              >
                ✕
              </button>
            )}
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

      {/* 过滤器和排序控制 */}
      <div className="filter-controls">
        {/* 热门模型切换 */}
        <div className="filter-group">
          <label className="filter-label">
            <input
              type="checkbox"
              checked={filters.showPopularOnly}
              onChange={handlePopularToggle}
              className="popular-toggle"
            />
            <span className="toggle-text">只显示热门模型</span>
            <span className="toggle-icon">{filters.showPopularOnly ? '🔥' : '⭐'}</span>
          </label>
        </div>

        {/* 参数范围滑块 */}
        <div className="filter-group parameter-range">
          <label className="filter-label">参数数量范围 (B)</label>
          <div className="range-slider-container">
            <div className="range-values">
              <span>{filters.parameterRange.min}B</span>
              <span>{filters.parameterRange.max}B</span>
            </div>
            <div className="dual-range-slider">
              <input
                type="range"
                min={parameterRange.min}
                max={parameterRange.max}
                step={parameterRange.max > 100 ? 10 : 1}
                value={filters.parameterRange.min}
                onChange={(e) => handleParameterRangeChange(
                  Math.min(Number(e.target.value), filters.parameterRange.max - 1),
                  filters.parameterRange.max
                )}
                className="range-slider range-min"
              />
              <input
                type="range"
                min={parameterRange.min}
                max={parameterRange.max}
                step={parameterRange.max > 100 ? 10 : 1}
                value={filters.parameterRange.max}
                onChange={(e) => handleParameterRangeChange(
                  filters.parameterRange.min,
                  Math.max(Number(e.target.value), filters.parameterRange.min + 1)
                )}
                className="range-slider range-max"
              />
            </div>
          </div>
        </div>

        {/* 排序控制 */}
        <div className="filter-group sort-controls">
          <label className="filter-label">排序方式</label>
          <div className="sort-buttons">
            <button
              onClick={() => handleSortChange('name')}
              className={`sort-btn ${filters.sortBy === 'name' ? 'active' : ''}`}
            >
              名称 {filters.sortBy === 'name' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSortChange('parameters')}
              className={`sort-btn ${filters.sortBy === 'parameters' ? 'active' : ''}`}
            >
              参数量 {filters.sortBy === 'parameters' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSortChange('category')}
              className={`sort-btn ${filters.sortBy === 'category' ? 'active' : ''}`}
            >
              类别 {filters.sortBy === 'category' && (filters.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* 清除所有过滤器 */}
        <div className="filter-group">
          <button
            onClick={clearAllFilters}
            className="clear-filters-btn"
            title="重置所有过滤器"
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 类别过滤器 */}
      <CategoryFilter
        categories={categories}
        selectedCategory={filters.selectedCategory}
        onCategorySelect={handleCategoryChange}
        modelCounts={modelsByCategory}
      />

      {/* 模型统计 */}
      <div className="model-stats">
        <span className="model-count">
          找到 {filteredAndSortedModels.length} 个模型
        </span>
        {debouncedSearchQuery && (
          <span className="search-info">
            搜索: "{debouncedSearchQuery}"
          </span>
        )}
        {filters.showPopularOnly && (
          <span className="filter-info">
            🔥 仅显示热门模型
          </span>
        )}
        {(filters.parameterRange.min !== parameterRange.min || filters.parameterRange.max !== parameterRange.max) && (
          <span className="filter-info">
            📊 参数范围: {filters.parameterRange.min}B - {filters.parameterRange.max}B
          </span>
        )}
      </div>

      {/* 模型列表 */}
      <div className="model-list">
        {filteredAndSortedModels.length === 0 ? (
          <div className="no-models">
            <p>没有找到匹配的模型</p>
            <div className="no-models-actions">
              {debouncedSearchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="clear-search"
                >
                  清除搜索
                </button>
              )}
              <button
                onClick={clearAllFilters}
                className="clear-filters"
              >
                重置所有过滤器
              </button>
            </div>
          </div>
        ) : filters.selectedCategory === 'all' ? (
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
            {filteredAndSortedModels.map(model => (
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
      {!filters.showPopularOnly && filters.selectedCategory === 'all' && !debouncedSearchQuery && (
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