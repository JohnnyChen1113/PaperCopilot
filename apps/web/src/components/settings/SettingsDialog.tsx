import { useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { BrandAvatar } from '../shared/BrandAvatar';
import { getModelVisual, getProviderVisual } from '../../lib/brandIcons';
import { providerOptionList, providerPresets } from '../../lib/providers';
import { ModelPicker } from '../model/ModelPicker';
import type { ModelSettings, ProviderType } from '../../types';

type SettingsState = ModelSettings & {
  apiKey: string;
};

type ModelFetchStatus = 'idle' | 'loading' | 'success' | 'error';

interface SettingsDialogProps {
  open: boolean;
  settings: SettingsState;
  modelOptions: string[];
  configuredModels: string[];
  modelFetchStatus: ModelFetchStatus;
  modelFetchError: string | null;
  onClose: () => void;
  onChange: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onAddConfiguredModel: (model: string) => void;
  onRemoveConfiguredModel: (model: string) => void;
  onActivateConfiguredModel: (model: string) => void;
  onRefreshModels: () => void;
}

export function SettingsDialog({
  open,
  settings,
  modelOptions,
  configuredModels,
  modelFetchStatus,
  modelFetchError,
  onClose,
  onChange,
  onAddConfiguredModel,
  onRemoveConfiguredModel,
  onActivateConfiguredModel,
  onRefreshModels,
}: SettingsDialogProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState<boolean>(false);

  if (!open) {
    return null;
  }

  const preset = providerPresets[settings.provider];
  const providerVisual = getProviderVisual(settings.provider);
  const canLoadModels = Boolean(settings.baseUrl.trim() && settings.apiKey.trim());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center px-4 py-4 sm:py-6">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-[1120px] overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">设置</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">模型配置</h2>
            <p className="mt-1 text-sm text-slate-500">
              API 凭证仅保存在当前浏览器的 localStorage 中，只会发送到你配置的接口地址。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            关闭
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[320px_minmax(0,1fr)]">
          <section className="border-b border-slate-200 bg-slate-50/70 px-6 py-5 md:border-b-0 md:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">服务商</p>
            <div className="mt-4 grid gap-3">
              {providerOptionList.map((option) => {
                const isActive = option.id === settings.provider;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChange('provider', option.id as ProviderType)}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isActive ? '当前' : '选择'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="px-6 py-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">{preset.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{preset.description}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <BrandAvatar
                      label={providerVisual.label}
                      iconSrc={providerVisual.iconSrc}
                      className={providerVisual.className}
                      size="lg"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{preset.label}</p>
                      <p className="mt-1 text-xs leading-6 text-slate-600">
                        点击右侧按钮直接前往对应入口，注册或登录后获取 API Key。
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={preset.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                      {preset.keyUrlLabel ?? '获取 API Key'}
                    </a>
                  </div>
                </div>
                {preset.keyNotice ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">注意</p>
                    <p className="mt-1 text-sm leading-6 text-amber-900">{preset.keyNotice}</p>
                  </div>
                ) : null}
                <p className="mt-3 break-all text-xs text-blue-700">
                  {preset.keyUrl}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">已配置模型</p>
                    <p className="mt-1 text-xs text-slate-500">
                      这里维护这个供应商下可快速切换的模型。点击某个模型可以设为当前使用。
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                    {configuredModels.length} 个
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {configuredModels.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                      这个供应商还没有加入任何模型。先从上面的模型列表里添加。
                    </div>
                  ) : (
                    configuredModels.map((model) => {
                      const isActive = model === settings.model;
                      const modelVisual = getModelVisual(model, settings.provider);

                      return (
                        <div
                          key={model}
                          className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                            isActive
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onActivateConfiguredModel(model)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            {isActive ? (
                              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-1 ring-blue-200">
                                <Check className="h-4 w-4" />
                              </span>
                            ) : (
                              <BrandAvatar
                                label={modelVisual.label}
                                iconSrc={modelVisual.iconSrc}
                                className={modelVisual.className}
                                size="sm"
                              />
                            )}
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="block truncate text-sm font-medium text-slate-900">{model}</span>
                                {preset.id === 'siliconflow' && model.startsWith('Pro/') ? (
                                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    付费 API
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-500">
                                {isActive
                                  ? '当前正在使用'
                                  : preset.id === 'siliconflow' && model.startsWith('Pro/')
                                    ? '点击切换到这个模型；需要付费 API 权限'
                                    : '点击切换到这个模型'}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveConfiguredModel(model)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-500"
                            aria-label={`移除模型 ${model}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModelManagerOpen((current) => !current)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        isModelManagerOpen
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {isModelManagerOpen ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      管理
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelManagerOpen(true);
                        if (canLoadModels) {
                          onRefreshModels();
                        }
                      }}
                      disabled={!canLoadModels || modelFetchStatus === 'loading'}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {modelFetchStatus === 'loading' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      添加
                    </button>
                  </div>

                  {isModelManagerOpen ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">模型</p>
                          <p className="mt-1 text-xs text-slate-500">
                            在下方搜索并展开分组，点击模型即可加入当前供应商。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={onRefreshModels}
                          disabled={!canLoadModels || modelFetchStatus === 'loading'}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {modelFetchStatus === 'loading' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          刷新
                        </button>
                      </div>

                      <ModelPicker
                        value=""
                        options={modelOptions}
                        status={modelFetchStatus}
                        disabled={modelOptions.length === 0 && modelFetchStatus !== 'loading'}
                        placeholder="先填写 API key 并拉取模型"
                        searchPlaceholder="搜索模型 ID 或名称"
                        emptyLabel="当前还没有可用模型"
                        onChange={onAddConfiguredModel}
                        showTrigger={false}
                        defaultOpen={true}
                        panelClassName="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                      />

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3">
                        <p className="text-sm text-slate-600">
                          {modelFetchStatus === 'success'
                            ? `已从当前接口加载 ${modelOptions.length} 个模型。`
                            : modelFetchStatus === 'loading'
                              ? '正在从服务商拉取可用模型...'
                              : modelFetchError
                                ? modelFetchError
                                : '先填写 API key，然后点击“添加”或“刷新”加载模型列表。'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Base URL" className="md:col-span-2">
                  <input
                    value={settings.baseUrl}
                    onChange={(event) => onChange('baseUrl', event.target.value)}
                    className={inputClassName}
                    placeholder={preset.baseUrl}
                  />
                </Field>

                <Field label="API Key" className="md:col-span-2">
                  <input
                    type="password"
                    value={settings.apiKey}
                    onChange={(event) => onChange('apiKey', event.target.value)}
                    className={inputClassName}
                    placeholder={preset.apiKeyPlaceholder}
                  />
                </Field>
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  aria-expanded={isAdvancedOpen}
                  aria-controls="advanced-settings"
                  onClick={() => setIsAdvancedOpen((v) => !v)}
                  className="flex items-center gap-1.5 transition-colors text-xs font-medium text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
                >
                  {isAdvancedOpen ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  高级设置
                </button>

                {isAdvancedOpen && (
                  <div id="advanced-settings" className="mt-3 grid gap-4 md:grid-cols-2">
                    <Field label="Temperature">
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.temperature}
                        onChange={(event) => onChange('temperature', Number(event.target.value))}
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Max tokens">
                      <input
                        type="number"
                        min="256"
                        max="8192"
                        step="256"
                        value={settings.maxTokens}
                        onChange={(event) => onChange('maxTokens', Number(event.target.value))}
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="选段两侧上下文（字符）" className="md:col-span-2">
                      <input
                        type="number"
                        min="400"
                        max="6000"
                        step="100"
                        value={settings.contextCharBudget}
                        onChange={(event) => onChange('contextCharBudget', Number(event.target.value))}
                        className={inputClassName}
                      />
                      <p className="mt-1 text-xs text-slate-500">每次请求里，附带在选中文本前后发送给模型的上下文字符数。</p>
                    </Field>
                  </div>
                )}
              </div>

            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100';
