import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, FileUp, Settings } from 'lucide-react';
import { BrandAvatar } from '../shared/BrandAvatar';
import { getModelVisual } from '../../lib/brandIcons';
import { providerPresets } from '../../lib/providers';
import type { ProviderType } from '../../types';

interface TopBarProps {
  onFileSelect: () => void;
  onOpenSettings: () => void;
  fileName?: string;
  settingsReady: boolean;
  provider: ProviderType;
  model: string;
  configuredProviders: ProviderType[];
  configuredModelsByProvider: Partial<Record<ProviderType, string[]>>;
  onProviderChange: (provider: ProviderType) => void;
  onModelChange: (model: string) => void;
}

export function TopBar({
  onFileSelect,
  onOpenSettings,
  fileName,
  settingsReady,
  provider,
  model,
  configuredProviders,
  configuredModelsByProvider,
  onProviderChange,
  onModelChange,
}: TopBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [panelProvider, setPanelProvider] = useState<ProviderType>(provider);
  const providerModels = useMemo(
    () => configuredModelsByProvider,
    [configuredModelsByProvider],
  );

  useEffect(() => {
    setPanelProvider(provider);
  }, [provider]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsSwitcherOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSwitcherOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const activePreset = providerPresets[provider];
  const activeModelVisual = getModelVisual(model, provider);
  const visibleProviderModels = providerModels[panelProvider] ?? [];

  return (
    <header className="w-full border-b border-slate-200 bg-white px-4 py-3 shadow-sm z-10 relative">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <h1 className="text-sm font-semibold text-slate-800">PaperCopilot</h1>
        </div>

        <div className="mx-8 flex max-w-xl flex-1 items-center gap-6">
          {fileName && (
            <div className="flex-1 truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
              {fileName}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div ref={rootRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setIsSwitcherOpen((current) => !current)}
              className="flex min-w-[340px] items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-left shadow-sm transition hover:border-slate-300 hover:bg-white"
            >
              <BrandAvatar
                label={activeModelVisual.label}
                iconSrc={activeModelVisual.iconSrc}
                className={activeModelVisual.className}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {model || '先在设置里添加模型'}
                  {model ? (
                    <span className="ml-1.5 text-slate-500">| {activePreset.label}</span>
                  ) : null}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition ${isSwitcherOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isSwitcherOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[560px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
                <div className="border-b border-slate-200 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">模型切换</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {configuredProviders.map((providerId) => {
                      const preset = providerPresets[providerId];
                      const isActive = providerId === panelProvider;
                      return (
                        <button
                          key={providerId}
                          type="button"
                          onClick={() => {
                            setPanelProvider(providerId);
                            onProviderChange(providerId);
                          }}
                          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-slate-900 text-white'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="mb-3 text-sm font-semibold text-slate-500">
                    {providerPresets[panelProvider].label}
                  </p>

                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {visibleProviderModels.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        这个供应商还没有已配置模型，先去设置里添加。
                      </div>
                    ) : (
                      visibleProviderModels.map((configuredModel) => {
                        const visual = getModelVisual(configuredModel, panelProvider);
                        const isActiveModel = panelProvider === provider && configuredModel === model;

                        return (
                          <button
                            key={`${panelProvider}-${configuredModel}`}
                            type="button"
                            onClick={() => {
                              onProviderChange(panelProvider);
                              onModelChange(configuredModel);
                              setIsSwitcherOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                              isActiveModel
                                ? 'bg-slate-100 ring-1 ring-slate-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <BrandAvatar
                              label={visual.label}
                              iconSrc={visual.iconSrc}
                              className={visual.className}
                              size="md"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                              {configuredModel}
                            </span>
                            {panelProvider === 'siliconflow' && configuredModel.startsWith('Pro/') ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                付费
                              </span>
                            ) : null}
                            {isActiveModel ? (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                当前
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className={`hidden rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:block ${
              settingsReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {settingsReady ? '模型已就绪' : '需要配置'}
          </div>
          <button
            onClick={onFileSelect}
            className="flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <FileUp className="h-3.5 w-3.5" />
            打开 PDF
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
