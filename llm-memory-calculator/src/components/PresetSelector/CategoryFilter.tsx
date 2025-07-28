import React from 'react';
import { ModelCategory, ModelPreset } from '../../types';
import { MODEL_CATEGORY_LABELS } from '../../constants';

export interface CategoryFilterProps {
  categories: ModelCategory[];
  selectedCategory: ModelCategory | 'all';
  onCategorySelect: (category: ModelCategory | 'all') => void;
  modelCounts: Record<ModelCategory, ModelPreset[]>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  modelCounts
}) => {
  const getCategoryIcon = (category: ModelCategory | 'all') => {
    switch (category) {
      case 'all': return '🌐';
      case 'gpt': return '🤖';
      case 'llama': return '🦙';
      case 'bert': return '📚';
      case 'other': return '⚡';
      default: return '📦';
    }
  };

  const getCategoryColor = (category: ModelCategory | 'all') => {
    switch (category) {
      case 'all': return '#6b7280';
      case 'gpt': return '#10b981';
      case 'llama': return '#3b82f6';
      case 'bert': return '#f59e0b';
      case 'other': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getTotalCount = () => {
    return Object.values(modelCounts).reduce((total, models) => total + models.length, 0);
  };

  const allCategories: Array<ModelCategory | 'all'> = ['all', ...categories];

  return (
    <div className="category-filter">
      <div className="category-tabs">
        {allCategories.map(category => {
          const count = category === 'all' 
            ? getTotalCount() 
            : modelCounts[category as ModelCategory]?.length || 0;
          
          const isActive = selectedCategory === category;
          const categoryColor = getCategoryColor(category);

          return (
            <button
              key={category}
              onClick={() => onCategorySelect(category)}
              className={`category-tab ${isActive ? 'active' : ''}`}
              style={{
                '--category-color': categoryColor,
                borderColor: isActive ? categoryColor : 'transparent',
                backgroundColor: isActive ? `${categoryColor}15` : 'transparent'
              } as React.CSSProperties}
              disabled={count === 0}
            >
              <span className="category-icon">
                {getCategoryIcon(category)}
              </span>
              <span className="category-label">
                {category === 'all' ? '全部' : MODEL_CATEGORY_LABELS[category as ModelCategory]}
              </span>
              <span 
                className="category-count"
                style={{ color: isActive ? categoryColor : '#9ca3af' }}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* 类别描述 */}
      {selectedCategory !== 'all' && (
        <div className="category-description">
          <p className="category-desc-text">
            {getCategoryDescription(selectedCategory as ModelCategory)}
          </p>
        </div>
      )}
    </div>
  );
};

const getCategoryDescription = (category: ModelCategory): string => {
  switch (category) {
    case 'gpt':
      return 'GPT系列模型，擅长文本生成和对话任务，具有强大的语言理解能力。';
    case 'llama':
      return 'LLaMA系列开源模型，在多种任务上表现优异，支持多语言处理。';
    case 'bert':
      return 'BERT系列模型，专门用于自然语言理解任务，如文本分类和问答。';
    case 'other':
      return '其他优秀的语言模型，包括各种专业化和创新的模型架构。';
    default:
      return '';
  }
};