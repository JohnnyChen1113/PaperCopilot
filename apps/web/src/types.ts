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
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextCharBudget: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

export type ChatSession = {
  id: string;
  title: string;
  paperName: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type ChatRequest = {
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  systemPrompt: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
};
