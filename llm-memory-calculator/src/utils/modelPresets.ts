import { ModelPreset, ModelCategory } from '../types';

export const MODEL_PRESETS: ModelPreset[] = [
  // GPT系列
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: '175B参数的GPT模型，适用于对话和文本生成',
    parameters: {
      parameterCount: 175,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 12288,
      numLayers: 96,
      vocabularySize: 50257
    },
    category: 'gpt',
    popular: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: '估计1.76T参数的大型语言模型',
    parameters: {
      parameterCount: 1760,
      precision: 'fp16',
      sequenceLength: 8192,
      batchSize: 1,
      hiddenSize: 20480,
      numLayers: 120,
      vocabularySize: 50257
    },
    category: 'gpt',
    popular: true
  },
  
  // LLaMA系列
  {
    id: 'llama-7b',
    name: 'LLaMA 7B',
    description: '7B参数的LLaMA模型，开源高效',
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000
    },
    category: 'llama',
    popular: true
  },
  {
    id: 'llama-13b',
    name: 'LLaMA 13B',
    description: '13B参数的LLaMA模型',
    parameters: {
      parameterCount: 13,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 5120,
      numLayers: 40,
      vocabularySize: 32000
    },
    category: 'llama',
    popular: true
  },
  {
    id: 'llama-30b',
    name: 'LLaMA 30B',
    description: '30B参数的LLaMA模型',
    parameters: {
      parameterCount: 30,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 6656,
      numLayers: 60,
      vocabularySize: 32000
    },
    category: 'llama'
  },
  {
    id: 'llama-65b',
    name: 'LLaMA 65B',
    description: '65B参数的LLaMA模型',
    parameters: {
      parameterCount: 65,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 8192,
      numLayers: 80,
      vocabularySize: 32000
    },
    category: 'llama'
  },
  {
    id: 'llama2-7b',
    name: 'LLaMA 2 7B',
    description: 'LLaMA 2的7B版本，性能更优',
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 32000
    },
    category: 'llama',
    popular: true
  },
  {
    id: 'llama2-13b',
    name: 'LLaMA 2 13B',
    description: 'LLaMA 2的13B版本',
    parameters: {
      parameterCount: 13,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 5120,
      numLayers: 40,
      vocabularySize: 32000
    },
    category: 'llama'
  },
  {
    id: 'llama2-70b',
    name: 'LLaMA 2 70B',
    description: 'LLaMA 2的70B版本，大型模型',
    parameters: {
      parameterCount: 70,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 8192,
      numLayers: 80,
      vocabularySize: 32000
    },
    category: 'llama'
  },

  // BERT系列
  {
    id: 'bert-base',
    name: 'BERT Base',
    description: '110M参数的BERT基础模型',
    parameters: {
      parameterCount: 0.11,
      precision: 'fp32',
      sequenceLength: 512,
      batchSize: 32,
      hiddenSize: 768,
      numLayers: 12,
      vocabularySize: 30522
    },
    category: 'bert'
  },
  {
    id: 'bert-large',
    name: 'BERT Large',
    description: '340M参数的BERT大型模型',
    parameters: {
      parameterCount: 0.34,
      precision: 'fp32',
      sequenceLength: 512,
      batchSize: 16,
      hiddenSize: 1024,
      numLayers: 24,
      vocabularySize: 30522
    },
    category: 'bert'
  },

  // 其他模型
  {
    id: 'chatglm-6b',
    name: 'ChatGLM-6B',
    description: '6B参数的中文对话模型',
    parameters: {
      parameterCount: 6,
      precision: 'fp16',
      sequenceLength: 2048,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 28,
      vocabularySize: 130528
    },
    category: 'other',
    popular: true
  },
  {
    id: 'baichuan-7b',
    name: 'Baichuan-7B',
    description: '7B参数的百川大模型',
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 4096,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 64000
    },
    category: 'other'
  },
  {
    id: 'qwen-7b',
    name: 'Qwen-7B',
    description: '7B参数的通义千问模型',
    parameters: {
      parameterCount: 7,
      precision: 'fp16',
      sequenceLength: 8192,
      batchSize: 1,
      hiddenSize: 4096,
      numLayers: 32,
      vocabularySize: 151936
    },
    category: 'other'
  },
  {
    id: 'claude-instant',
    name: 'Claude Instant',
    description: '估计52B参数的Claude快速版本',
    parameters: {
      parameterCount: 52,
      precision: 'fp16',
      sequenceLength: 9000,
      batchSize: 1,
      hiddenSize: 8192,
      numLayers: 64,
      vocabularySize: 50000
    },
    category: 'other'
  }
];

// 获取热门模型
export const getPopularModels = (): ModelPreset[] => {
  return MODEL_PRESETS.filter(model => model.popular);
};

// 按类别获取模型
export const getModelsByCategory = (category: string): ModelPreset[] => {
  return MODEL_PRESETS.filter(model => model.category === category);
};

// 根据ID获取模型
export const getModelById = (id: string): ModelPreset | undefined => {
  return MODEL_PRESETS.find(model => model.id === id);
};

// 获取所有类别
export const getAllCategories = (): ModelCategory[] => {
  const categories = MODEL_PRESETS.map(model => model.category);
  return [...new Set(categories)] as ModelCategory[];
};