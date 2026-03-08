import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { History, Loader2, Send } from 'lucide-react';
import { paperQuickActions, selectionQuickActions } from '../../lib/chatActions';
import type { ChatMessage, ChatSession } from '../../types';

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
  chatSessions: ChatSession[];
  activeChatId: string | null;
  chatMessages: ChatMessage[];
  chatStatus: 'idle' | 'streaming' | 'error';
  chatError: string | null;
  onSendMessage: (content: string) => void;
  onQuickAction: (actionPrompt: string) => void;
  onClearSelection: () => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
}

export function ChatPanel({
  fileName,
  hasValidSettings,
  isFileLoaded,
  selection,
  chatSessions,
  activeChatId,
  chatMessages,
  chatStatus,
  chatError,
  onSendMessage,
  onQuickAction,
  onClearSelection,
  onOpenSettings,
  onNewChat,
  onSelectChat,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const isStreaming = chatStatus === 'streaming';
  const canSend =
    inputValue.trim().length > 0 && !isStreaming && hasValidSettings && isFileLoaded;

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
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 p-5">
          {/* Selection preview card */}
          {selection && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  第 {selection.pageNumber} 页 · 当前选段
                </p>
                <button
                  onClick={onClearSelection}
                  aria-label="Clear selected passage"
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                >
                  清除
                </button>
              </div>
              <blockquote className="mt-3 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 border-l-2 border-slate-300">
                {selection.selectedText}
              </blockquote>
            </div>
          )}

          {/* Empty states */}
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
          ) : chatMessages.length === 0 ? (
            <EmptyState
              title={selection ? '选择一个快捷动作，或直接提问' : '先选一段文字，或直接提问'}
              description={
                selection
                  ? '可以直接点下面的快捷动作，也可以自己输入问题。'
                  : '你可以在 PDF 里选中一段，也可以直接输入任何关于论文的问题。'
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
          {chatMessages.map((msg, index) => {
            const isLast = index === chatMessages.length - 1;
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-slate-200 px-4 py-2.5 text-sm text-slate-900 leading-6 whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              );
            }
            // assistant message
            return (
              <div key={msg.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
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

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick actions + input area */}
      <div className="border-t border-slate-200 bg-white px-5 py-4 space-y-2">
        {/* Selection-based quick actions */}
        {selection && (
            <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-0.5">选段</span>
            {selectionQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onQuickAction(action.prompt)}
                disabled={isStreaming}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Paper-level quick actions (always available) */}
        {isFileLoaded && hasValidSettings && (
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mr-0.5">整篇</span>
            {paperQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onSendMessage(action.prompt)}
                disabled={isStreaming}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
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
                  : '输入你的问题…（Enter 发送，Shift+Enter 换行）'
            }
            style={{ resize: 'none', overflow: 'hidden' }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="shrink-0 flex h-[38px] w-[38px] items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
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
