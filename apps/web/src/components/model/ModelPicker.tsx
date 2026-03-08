import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus, Plus, Search } from 'lucide-react';

type ModelFetchStatus = 'idle' | 'loading' | 'success' | 'error';

type ModelPickerProps = {
  value: string;
  options: string[];
  disabled?: boolean;
  status?: ModelFetchStatus;
  searchPlaceholder?: string;
  placeholder: string;
  emptyLabel?: string;
  onChange: (model: string) => void;
  triggerClassName?: string;
  panelClassName?: string;
  defaultOpen?: boolean;
  showTrigger?: boolean;
};

type ModelGroup = {
  id: string;
  label: string;
  models: string[];
};

export function ModelPicker({
  value,
  options,
  disabled = false,
  status = 'idle',
  searchPlaceholder = '搜索模型 ID 或名称',
  placeholder,
  emptyLabel = '没有可用模型',
  onChange,
  triggerClassName,
  panelClassName,
  defaultOpen = false,
  showTrigger = true,
}: ModelPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const visibleOptions = value && !options.includes(value) ? [value, ...options] : options;
  const groups = buildModelGroups(visibleOptions);
  const selectedGroupId = groups.find((group) => group.models.includes(value))?.id;
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      models: group.models.filter((model) => model.toLowerCase().includes(query.trim().toLowerCase())),
    }))
    .filter((group) => group.models.length > 0);

  function closePicker() {
    setIsOpen(false);
    setQuery('');
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePicker();
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {showTrigger ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setIsOpen((current) => {
              if (current) {
                setQuery('');
              }

              return !current;
            })
          }
          className={
            triggerClassName ??
            'flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
          }
        >
          <span className="min-w-0 truncate">{value || placeholder}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : null}

      {isOpen && !disabled && (
        <div
          className={
            panelClassName ??
            (showTrigger
              ? 'absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl'
              : 'rounded-2xl border border-slate-200 bg-white p-3')
          }
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-3 max-h-[340px] space-y-2 overflow-y-auto pr-1">
            {filteredGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {visibleOptions.length === 0
                  ? status === 'loading'
                    ? '正在拉取模型列表...'
                    : emptyLabel
                  : '没有匹配的模型。'}
              </div>
            ) : (
              filteredGroups.map((group) => {
                const forceExpand = query.trim().length > 0;
                const isExpanded =
                  forceExpand || expandedGroups[group.id] || (!Object.prototype.hasOwnProperty.call(expandedGroups, group.id) && group.id === selectedGroupId);

                return (
                  <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50/80">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((current) => ({
                          ...current,
                          [group.id]: !current[group.id],
                        }))
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {group.label.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="truncate text-sm font-semibold text-slate-900">{group.label}</span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {group.models.length}
                        </span>
                      </div>
                      {isExpanded ? (
                        <Minus className="h-4 w-4 shrink-0 text-slate-500" />
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-200 px-2 py-2">
                        <div className="space-y-1">
                          {group.models.map((model) => {
                            const isActive = model === value;

                            return (
                              <button
                                key={model}
                                type="button"
                                onClick={() => {
                                  onChange(model);
                                  closePicker();
                                }}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                  isActive
                                    ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                                    : 'bg-white text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <span className="min-w-0 truncate text-sm">{model}</span>
                                {isActive ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildModelGroups(models: string[]) {
  const groups = new Map<string, ModelGroup>();

  for (const model of models) {
    const rawKey = getModelGroupKey(model);
    const normalizedKey = rawKey.toLowerCase();
    const existing = groups.get(normalizedKey);

    if (existing) {
      existing.models.push(model);
      continue;
    }

    groups.set(normalizedKey, {
      id: normalizedKey,
      label: rawKey,
      models: [model],
    });
  }

  return Array.from(groups.values());
}

function getModelGroupKey(model: string) {
  const trimmed = model.trim();

  if (trimmed.includes('/')) {
    return trimmed.split('/')[0];
  }

  const lower = trimmed.toLowerCase();
  const knownPrefixes = ['deepseek', 'minimax', 'qwen', 'glm', 'kimi', 'claude', 'gemini', 'gpt', 'llama'];
  const matchedPrefix = knownPrefixes.find((prefix) => lower.startsWith(prefix));

  if (matchedPrefix) {
    return matchedPrefix;
  }

  return trimmed.split(/[-_.:]/)[0] || '其他';
}
