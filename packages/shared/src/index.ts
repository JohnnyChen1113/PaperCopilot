export type ProviderType =
  | 'openai-compatible'
  | 'siliconflow'
  | 'deepseek'
  | 'minimax'
  | 'nvidia'
  | '302ai'
  | 'bioinfoark';

export type ModelSettings = {
  provider: ProviderType;
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextCharBudget: number;
};
