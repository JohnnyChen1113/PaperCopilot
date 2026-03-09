export type QuickAction = {
  id: string;
  label: string;
  prompt?: string;
};

export const selectionMenuActions: QuickAction[] = [
  {
    id: 'ask-ai',
    label: '问 AI',
  },
  {
    id: 'translate-zh',
    label: '快捷翻译',
  },
  {
    id: 'highlight',
    label: '高亮',
  },
  {
    id: 'note',
    label: '记笔记',
  },
];

export const selectionQuickActions: QuickAction[] = [
  {
    id: 'explain',
    label: '解释这一段',
    prompt: '请详细解释这段内容，用中文拆解其中的术语、概念和逻辑关系。',
  },
  {
    id: 'summarize',
    label: '总结这一段',
    prompt: '请用中文把这段内容概括成 3 到 5 句话，突出核心观点。',
  },
  {
    id: 'translate-zh',
    label: '翻译成中文',
    prompt: '请把这段内容翻译成中文，并尽量准确保留专业术语。',
  },
  {
    id: 'key-points',
    label: '提炼要点',
    prompt: '请用中文提炼这段内容的关键论点或发现，并用简洁要点列出。',
  },
];

export const paperQuickActions: QuickAction[] = [
  {
    id: 'paper-overview',
    label: '这篇论文讲什么？',
    prompt: '请用中文概括这篇论文主要在研究什么，包括研究问题、目标和整体思路。',
  },
  {
    id: 'paper-contributions',
    label: '主要贡献',
    prompt: '请用中文总结这篇论文的主要贡献或关键发现。',
  },
  {
    id: 'paper-method',
    label: '研究方法',
    prompt: '请用中文说明这篇论文采用了什么研究方法或实验设计。',
  },
];
