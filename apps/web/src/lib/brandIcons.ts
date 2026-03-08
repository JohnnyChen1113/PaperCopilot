import type { ProviderType } from '../types';

type BrandVisual = {
  iconSrc?: string;
  label: string;
  className: string;
};

export function getProviderVisual(provider: ProviderType): BrandVisual {
  switch (provider) {
    case 'siliconflow':
      return icon('/model-icons/siliconcloud.svg', 'SF', 'bg-white ring-slate-200');
    case 'deepseek':
      return icon('/model-icons/deepseek.svg', 'DS', 'bg-white ring-slate-200');
    case 'minimax':
      return icon('/model-icons/minimax.svg', 'MM', 'bg-white ring-slate-200');
    case 'nvidia':
      return icon('/model-icons/nvidia.svg', 'NV', 'bg-white ring-slate-200');
    case '302ai':
      return icon('/model-icons/ai302.svg', '302', 'bg-white ring-slate-200');
    case 'bioinfoark':
      return fallback('BA', 'bg-slate-100 text-slate-700 ring-slate-200');
    case 'openai-compatible':
      return icon('/model-icons/openai.svg', 'OA', 'bg-white ring-slate-200');
    default:
      return fallback('AI', 'bg-slate-100 text-slate-700 ring-slate-200');
  }
}

export function getModelVisual(model: string, provider: ProviderType): BrandVisual {
  const normalized = model.toLowerCase();

  if (normalized.includes('moonshot') || normalized.includes('kimi')) {
    return icon('/model-icons/kimi.svg', 'K', 'bg-white ring-slate-200');
  }

  if (normalized.includes('deepseek')) {
    return icon('/model-icons/deepseek.svg', 'DS', 'bg-white ring-slate-200');
  }

  if (normalized.includes('qwen')) {
    return icon('/model-icons/qwen.svg', 'Q', 'bg-white ring-slate-200');
  }

  if (normalized.includes('glm') || normalized.includes('zai-org') || normalized.includes('chatglm')) {
    return icon('/model-icons/zhipu.svg', 'Z', 'bg-white ring-slate-200');
  }

  if (normalized.includes('minimax')) {
    return icon('/model-icons/minimax.svg', 'M', 'bg-white ring-slate-200');
  }

  return getProviderVisual(provider);
}

function icon(iconSrc: string, label: string, className: string): BrandVisual {
  return { iconSrc, label, className };
}

function fallback(label: string, className: string): BrandVisual {
  return { label, className };
}
