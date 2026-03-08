import type { ProviderType } from '../types';

export type ProviderPreset = {
  id: ProviderType;
  label: string;
  baseUrl: string;
  apiKeyPlaceholder: string;
  description: string;
  keyUrl: string;
  keyUrlLabel?: string;
  keyNotice?: string;
  preferredModels?: string[];
};

export const providerPresets: Record<ProviderType, ProviderPreset> = {
  siliconflow: {
    id: 'siliconflow',
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeyPlaceholder: 'sk-sf-...',
    description: '默认推荐。填好 Key 后即可直接拉取可用模型。',
    keyUrl: 'https://cloud.siliconflow.cn/i/pnTWTpiB',
    keyUrlLabel: '获取 API Key',
    keyNotice: 'SiliconFlow 里带 `Pro/` 前缀的模型需要付费 API 权限，赠金或免费额度通常不能直接调用。',
    preferredModels: [
      'deepseek-ai/DeepSeek-V3.2',
      'Pro/deepseek-ai/DeepSeek-V3.2',
      'Pro/moonshotai/Kimi-K2.5',
      'Qwen/Qwen3.5-32B',
    ],
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyPlaceholder: 'sk-...',
    description: '官方兼容接口，文本模型可以直接拉取。',
    keyUrl: 'https://platform.deepseek.com/',
    keyUrlLabel: '获取 API Key',
    preferredModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  minimax: {
    id: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/v1',
    apiKeyPlaceholder: 'sk-api-...',
    description: 'OpenAI 兼容聊天接口可用，但模型列表需要使用官方已知模型回退。',
    keyUrl: 'https://platform.minimaxi.com/',
    keyUrlLabel: '获取 API Key',
    preferredModels: ['MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.1'],
  },
  nvidia: {
    id: 'nvidia',
    label: 'NVIDIA',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyPlaceholder: 'nvapi-...',
    description: '标准兼容接口，模型列表可直接拉取，适合选开源大模型。',
    keyUrl: 'https://build.nvidia.com/',
    keyUrlLabel: '获取 API Key',
    preferredModels: [
      'deepseek-ai/deepseek-v3.2',
      'moonshotai/kimi-k2.5',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-8b-instruct',
      'minimaxai/minimax-m2.5',
    ],
  },
  '302ai': {
    id: '302ai',
    label: '302.AI',
    baseUrl: 'https://api.302.ai/v1',
    apiKeyPlaceholder: 'sk-...',
    description: '聚合平台，建议拉取模型列表后再选。',
    keyUrl: 'https://share.302.ai/Yy010z',
    keyUrlLabel: '获取 API Key',
  },
  bioinfoark: {
    id: 'bioinfoark',
    label: 'BioInfoArk',
    baseUrl: 'https://oa.ai01.org/v1',
    apiKeyPlaceholder: 'sk-...',
    description: '按兼容 OpenAI 的方式配置，优先从列表选择模型。',
    keyUrl: 'https://www.bioinfoark.com/?page_id=902',
    keyUrlLabel: '获取 API Key',
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyPlaceholder: 'sk-...',
    description: '适合自定义中转站或任意兼容 OpenAI 的平台。默认给出 OpenAI 官方入口作为参考。',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'OpenAI API Keys',
  },
};

export const providerOptionList = [
  providerPresets.siliconflow,
  providerPresets.deepseek,
  providerPresets.minimax,
  providerPresets.nvidia,
  providerPresets['302ai'],
  providerPresets.bioinfoark,
  providerPresets['openai-compatible'],
];
