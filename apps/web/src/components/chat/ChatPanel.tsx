import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { BookText, Eraser, Highlighter, History, Languages, Lightbulb, Loader2, NotebookPen, Send, Square, Trash2 } from 'lucide-react';
import { paperQuickActions, selectionMenuActions, selectionQuickActions } from '../../lib/chatActions';
import type { ChatMessage, ChatSession } from '../../types';
import type { HighlightColor } from '../reader/PdfViewer';

type SelectionPreview = {
  pageNumber: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
};

interface ChatPanelProps {
  fileName?: string;
  hasValidSettings: boolean;
  isFileLoaded: boolean;
  selection: SelectionPreview | null;
  notes: Array<{
    id: string;
    content: string;
    createdAt: number;
    updatedAt: number;
    selection: SelectionPreview;
  }>;
  activeTab: 'assistant' | 'notes';
  noteDraft: string;
  chatSessions: ChatSession[];
  activeChatId: string | null;
  chatMessages: ChatMessage[];
  chatStatus: 'idle' | 'streaming' | 'error';
  chatError: string | null;
  highlightColor: HighlightColor;
  isSelectionHighlighted: boolean;
  onSendMessage: (content: string) => void;
  onStopStreaming: () => void;
  onQuickAction: (actionPrompt: string) => void;
  onSelectionAction: (actionId: string) => void;
  onHighlightColorChange: (color: HighlightColor) => void;
  onClearSelection: () => void;
  onOpenSettings: () => void;
  onTabChange: (tab: 'assistant' | 'notes') => void;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  onSelectNote: (noteId: string) => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

export function ChatPanel({
  fileName,
  hasValidSettings,
  isFileLoaded,
  selection,
  notes,
  activeTab,
  noteDraft,
  chatSessions,
  activeChatId,
  chatMessages,
  chatStatus,
  chatError,
  highlightColor,
  isSelectionHighlighted,
  onSendMessage,
  onStopStreaming,
  onQuickAction,
  onSelectionAction,
  onHighlightColorChange,
  onClearSelection,
  onOpenSettings,
  onTabChange,
  onNoteDraftChange,
  onSaveNote,
  onSelectNote,
  onNewChat,
  onSelectChat,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const isStreaming = chatStatus === 'streaming';
  const canSend =
    inputValue.trim().length > 0 && !isStreaming && hasValidSettings && isFileLoaded;
  const canSaveNote = Boolean(selection && noteDraft.trim().length > 0);
  const renderedMessages = chatMessages.map((message) => ({
    ...message,
    content: normalizeMarkdownForRender(message.content),
  }));

  function handleSend() {
    if (!canSend) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    // Auto-expand textarea up to ~4 rows
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`; // ~4 rows at ~28px each
  }

  function handleScroll() {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">对话</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">论文助手</h2>
            {fileName && (
              <p className="mt-0.5 text-sm text-slate-500 truncate max-w-[180px]" title={fileName}>
                {fileName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNewChat}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              新对话
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('assistant')}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeTab === 'assistant'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <BookText className="h-4 w-4" />
            Assistant
          </button>
          <button
            type="button"
            onClick={() => onTabChange('notes')}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              activeTab === 'notes'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <NotebookPen className="h-4 w-4" />
            My Notes
            {notes.length > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${activeTab === 'notes' ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                {notes.length}
              </span>
            )}
          </button>
        </div>

        {chatSessions.length > 0 && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <History className="h-3.5 w-3.5" />
              最近对话
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {chatSessions.map((session) => {
                const isActive = session.id === activeChatId;

                return (
                  <button
                    key={session.id}
                    onClick={() => onSelectChat(session.id)}
                    className={`min-w-[160px] max-w-[220px] rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-slate-900">{session.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(session.updatedAt).toLocaleString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable content area */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-5">
          {!isFileLoaded ? (
            <EmptyState
              title="还没有加载 PDF"
              description="先打开或拖入一篇论文，然后再围绕选中的句子或段落进行对话。"
            />
          ) : !hasValidSettings ? (
            <EmptyState
              title="模型还没有配置"
              description="先补全 Base URL、API key 和模型，再开始对话。"
              actionLabel="打开设置"
              onAction={onOpenSettings}
            />
          ) : activeTab === 'assistant' && chatMessages.length === 0 ? (
            <EmptyState
              title={selection ? '选择一个快捷动作，或直接提问' : '先选一段文字，或直接提问'}
              description={
                selection
                  ? '可以直接点下面的快捷动作，也可以自己输入问题。'
                  : '你可以在 PDF 里选中一段，也可以直接输入任何关于论文的问题。'
              }
            />
          ) : activeTab === 'notes' && notes.length === 0 ? (
            <EmptyState
              title={selection ? '为当前选段写一条笔记' : '先选中一段文本再记笔记'}
              description={
                selection
                  ? '笔记会和当前选中的内容绑定，并保存在本地浏览器里。'
                  : '在左侧选中文本后，可以在这里写下你的理解、疑问或结论。'
              }
            />
          ) : null}

          {/* Error banner */}
          {chatError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {chatError}
            </div>
          )}

          {/* Messages list */}
          {activeTab === 'assistant' &&
            renderedMessages.map((msg, index) => {
            const isLast = index === renderedMessages.length - 1;
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-slate-200 px-4 py-2.5 text-sm text-slate-900 leading-6 whitespace-pre-wrap">
                    {msg.quote && (
                      <div className="mb-3 rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          第 {msg.quote.pageNumber} 页引用
                        </p>
                        <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-slate-600">
                          {compactQuote(msg.quote.selectedText, 140, 36)}
                        </blockquote>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              );
            }
            // assistant message
            return (
              <div key={msg.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                {isLast && isStreaming && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>生成中…</span>
                  </div>
                )}
              </div>
            );
            })}

          {activeTab === 'notes' && notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onSelectNote(note.id)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  第 {note.selection.pageNumber} 页
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(note.updatedAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <blockquote className="mt-3 rounded-lg border-l-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {note.selection.selectedText}
              </blockquote>
              <div className="markdown-content mt-3">
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {normalizeMarkdownForRender(note.content)}
                </ReactMarkdown>
              </div>
            </button>
          ))}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick actions + input area */}
      <div className="border-t border-slate-200 bg-white px-5 py-4 space-y-3">
        {/* Selection-based quick actions */}
        {selection && activeTab === 'assistant' && (
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-0.5">选段</span>
            {selectionQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  if (action.prompt) {
                    onQuickAction(action.prompt);
                  }
                }}
                disabled={isStreaming || !action.prompt}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Paper-level quick actions (always available) */}
        {isFileLoaded && hasValidSettings && activeTab === 'assistant' && (
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-0.5">整篇</span>
            {paperQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => {
                  if (action.prompt) {
                    onSendMessage(action.prompt);
                  }
                }}
                disabled={isStreaming || !action.prompt}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'assistant' ? (
          <div className="space-y-2">
            {selection && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    第 {selection.pageNumber} 页 · 将作为本轮引用发送
                  </p>
                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    清除
                  </button>
                </div>
                <blockquote className="mt-2 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600">
                  {compactQuote(selection.selectedText, 160, 40)}
                </blockquote>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectionMenuActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => onSelectionAction(action.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        action.id === 'highlight' && isSelectionHighlighted
                          ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:text-rose-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <SelectionActionIcon actionId={action.id} isActive={action.id === 'highlight' && isSelectionHighlighted} />
                      {action.id === 'highlight' && isSelectionHighlighted ? '删除高亮' : action.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-500">高亮颜色</span>
                  {highlightColorOptions.map((option) => {
                    const isActive = option.id === highlightColor;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onHighlightColorChange(option.id)}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          isActive
                            ? 'scale-110 border-slate-900 shadow-sm'
                            : 'border-white/80 hover:scale-105 hover:border-slate-300'
                        } ${option.className}`}
                        aria-label={`切换到${option.label}高亮`}
                        title={option.label}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={
                  !isFileLoaded
                    ? '先加载一篇 PDF…'
                    : !hasValidSettings
                      ? '先完成模型设置…'
                      : selection
                        ? '围绕当前选段继续提问…'
                        : '输入你的问题…（Enter 发送，Shift+Enter 换行）'
                }
                style={{ resize: 'none', overflow: 'hidden' }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={isStreaming ? onStopStreaming : handleSend}
                disabled={isStreaming ? false : !canSend}
                aria-label={isStreaming ? 'Stop generation' : 'Send message'}
                className={`shrink-0 flex h-[38px] w-[38px] items-center justify-center rounded-md text-white transition-colors ${
                  isStreaming
                    ? 'bg-rose-500 hover:bg-rose-600'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300'
                }`}
              >
                {isStreaming ? <Square className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {isStreaming && (
              <p className="text-xs text-slate-400">
                正在生成，点击右侧停止按钮可中断本轮回答。
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={6}
              value={noteDraft}
              onChange={(event) => onNoteDraftChange(event.target.value)}
              placeholder={
                selection
                  ? '写下你对这段内容的理解、疑问或总结…'
                  : '先在左侧选中一段文本，然后在这里记笔记。'
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSaveNote}
                disabled={!canSaveNote}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <NotebookPen className="h-4 w-4" />
                保存笔记
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internal sub-components
// ---------------------------------------------------------------------------

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
      <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg select-none">
        文
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function SelectionActionIcon({ actionId, isActive = false }: { actionId: string; isActive?: boolean }) {
  switch (actionId) {
    case 'ask-ai':
      return <Lightbulb className="h-3.5 w-3.5 text-amber-500" />;
    case 'translate-zh':
      return <Languages className="h-3.5 w-3.5 text-emerald-500" />;
    case 'highlight':
      return isActive ? <Trash2 className="h-3.5 w-3.5 text-rose-600" /> : <Highlighter className="h-3.5 w-3.5 text-amber-600" />;
    case 'erase-highlight':
      return <Eraser className="h-3.5 w-3.5 text-rose-500" />;
    case 'note':
      return <NotebookPen className="h-3.5 w-3.5 text-violet-500" />;
    default:
      return <BookText className="h-3.5 w-3.5 text-slate-500" />;
  }
}

function compactQuote(text: string, maxLength = 180, tailLength = 48) {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const headLength = Math.max(24, maxLength - tailLength - 3);
  return `${normalized.slice(0, headLength)}...${normalized.slice(-tailLength)}`;
}

const highlightColorOptions: Array<{
  id: HighlightColor;
  label: string;
  className: string;
}> = [
  { id: 'yellow', label: '黄色', className: 'bg-amber-300' },
  { id: 'green', label: '绿色', className: 'bg-emerald-300' },
  { id: 'blue', label: '蓝色', className: 'bg-sky-300' },
  { id: 'pink', label: '粉色', className: 'bg-pink-300' },
];

function normalizeMarkdownForRender(content: string) {
  if (!content) {
    return content;
  }

  const next = normalizeCollapsedTables(content);
  const lines = next.split('\n');

  return lines
    .map((line) => {
      if (isTableLikeLine(line)) {
        return line.trimEnd();
      }

      return line.replace(/<br\s*\/?>/gi, '  \n').trimEnd();
    })
    .join('\n');
}

function looksLikeCollapsedTable(line: string) {
  return /\|/.test(line) && /\|\s*:?-{3,}/.test(line) && /\s\|\s\|\s/.test(line);
}

function expandCollapsedTableLine(line: string) {
  return line.replace(/\s\|\s\|\s/g, ' |\n| ').split('\n');
}

function normalizeCollapsedTables(content: string) {
  return content
    .split('\n')
    .flatMap((line) => {
      if (!looksLikeCollapsedTable(line)) {
        return [line];
      }

      return expandCollapsedTableLine(line);
    })
    .join('\n');
}

function isTableLikeLine(line: string) {
  return /^\s*\|.*\|\s*$/.test(line);
}
