import { useEffect, useEffectEvent, useState } from 'react';
import { TopBar } from './components/layout/TopBar';
import { SplitPane } from './components/layout/SplitPane';
import { PdfViewer, type PdfSelectionPayload } from './components/reader/PdfViewer';
import { ChatPanel } from './components/chat/ChatPanel';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { providerPresets } from './lib/providers';
import type { ChatMessage, ChatSession, ModelSettings, ProviderType } from './types';

type SettingsState = ModelSettings & {
  apiKey: string;
};

type ApiKeysStore = Partial<Record<ProviderType, string>>;
type SelectedModelsStore = Partial<Record<ProviderType, string>>;
type ConfiguredModelsStore = Partial<Record<ProviderType, string[]>>;

type ModelFetchStatus = 'idle' | 'loading' | 'success' | 'error';
type DocumentContext = {
  abstract: string;
  overview: string;
};

const settingsStorageKey = 'papercopilot:model-settings';
const apiKeysStorageKey = 'papercopilot:api-keys';
const selectedModelsStorageKey = 'papercopilot:selected-models';
const configuredModelsStorageKey = 'papercopilot:configured-models';
const chatSessionsStorageKey = 'papercopilot:chat-sessions';

const defaultSettings: SettingsState = {
  provider: 'siliconflow',
  baseUrl: providerPresets.siliconflow.baseUrl,
  apiKey: '',
  model: '',
  temperature: 0.2,
  maxTokens: 4096,
  contextCharBudget: 2000,
};

function loadApiKeys(): ApiKeysStore {
  try {
    const raw = localStorage.getItem(apiKeysStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as ApiKeysStore;
  } catch {
    return {};
  }
}

function saveApiKeys(store: ApiKeysStore) {
  localStorage.setItem(apiKeysStorageKey, JSON.stringify(store));
}

function loadSelectedModels(): SelectedModelsStore {
  try {
    const raw = localStorage.getItem(selectedModelsStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as SelectedModelsStore;
  } catch {
    return {};
  }
}

function saveSelectedModel(provider: ProviderType, model: string) {
  const store = loadSelectedModels();
  store[provider] = model;
  localStorage.setItem(selectedModelsStorageKey, JSON.stringify(store));
}

function loadConfiguredModels(): ConfiguredModelsStore {
  try {
    const raw = localStorage.getItem(configuredModelsStorageKey);
    if (!raw) return {};
    return JSON.parse(raw) as ConfiguredModelsStore;
  } catch {
    return {};
  }
}

function loadChatSessions() {
  try {
    const raw = localStorage.getItem(chatSessionsStorageKey);
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function createChatSession(paperName: string): ChatSession {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '新对话',
    paperName,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeConfiguredModels(store: ConfiguredModelsStore) {
  return Object.fromEntries(
    Object.entries(store).map(([provider, models]) => [
      provider,
      Array.from(new Set((models ?? []).filter(Boolean))),
    ]),
  ) as ConfiguredModelsStore;
}

function loadInitialConfiguredModels() {
  const configuredModelsStore = loadConfiguredModels();
  const selectedModelsStore = loadSelectedModels();
  const nextStore: ConfiguredModelsStore = { ...configuredModelsStore };

  for (const [provider, model] of Object.entries(selectedModelsStore)) {
    if (!model) {
      continue;
    }

    nextStore[provider as ProviderType] = Array.from(
      new Set([...(nextStore[provider as ProviderType] ?? []), model]),
    );
  }

  try {
    const raw = localStorage.getItem(settingsStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SettingsState>;
      if (parsed.provider && parsed.model) {
        nextStore[parsed.provider] = Array.from(
          new Set([...(nextStore[parsed.provider] ?? []), parsed.model]),
        );
      }
    }
  } catch {
    // Ignore invalid persisted settings and use whatever was already recovered.
  }

  return normalizeConfiguredModels(nextStore);
}

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(settingsStorageKey);
    if (!raw) {
      return defaultSettings;
    }

    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    const migratedProvider = parsed.provider ?? defaultSettings.provider;
    const selectedModelsStore = loadSelectedModels();
    const configuredModelsStore = loadConfiguredModels();
    const migratedBaseUrl =
      migratedProvider === 'siliconflow' &&
      (!parsed.baseUrl ||
        parsed.baseUrl === 'https://api.siliconflow.com' ||
        parsed.baseUrl === 'https://api.siliconflow.com/v1')
        ? providerPresets.siliconflow.baseUrl
        : parsed.baseUrl;

    // Read the api-keys store
    const apiKeysStore = loadApiKeys();

    // Migration: if old model-settings had an apiKey, copy it to the api-keys store
    if (parsed.apiKey && !apiKeysStore[migratedProvider]) {
      apiKeysStore[migratedProvider] = parsed.apiKey;
      saveApiKeys(apiKeysStore);
    }

    // Populate apiKey from the api-keys store for the current provider
    const apiKey = apiKeysStore[migratedProvider] ?? '';

    // Migration: cap maxTokens at 8192 (some providers reject higher values)
    const migratedMaxTokens =
      typeof parsed.maxTokens === 'number' && parsed.maxTokens > 8192
        ? 4096
        : parsed.maxTokens;
    const migratedModel = selectedModelsStore[migratedProvider] ?? parsed.model ?? '';

    return {
      ...defaultSettings,
      ...parsed,
      provider: migratedProvider,
      baseUrl: migratedBaseUrl ?? defaultSettings.baseUrl,
      apiKey,
      model:
        migratedModel ||
        configuredModelsStore[migratedProvider]?.[0] ||
        defaultSettings.model,
      maxTokens: migratedMaxTokens ?? defaultSettings.maxTokens,
    };
  } catch {
    return defaultSettings;
  }
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [selection, setSelection] = useState<PdfSelectionPayload | null>(null);
  const [settings, setSettings] = useState<SettingsState>(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(loadChatSessions);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatStatus, setChatStatus] = useState<'idle' | 'streaming' | 'error'>('idle');
  const [chatError, setChatError] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelFetchStatus, setModelFetchStatus] = useState<ModelFetchStatus>('idle');
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null);
  const [configuredModels, setConfiguredModels] = useState<ConfiguredModelsStore>(loadInitialConfiguredModels);

  // Save non-key settings to papercopilot:model-settings (strip apiKey)
  useEffect(() => {
    const persistedSettings: Omit<ModelSettings, 'apiKey'> = {
      provider: settings.provider,
      baseUrl: settings.baseUrl,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      contextCharBudget: settings.contextCharBudget,
    };
    localStorage.setItem(settingsStorageKey, JSON.stringify(persistedSettings));
  }, [settings]);

  // Save apiKey to papercopilot:api-keys under the current provider
  useEffect(() => {
    if (settings.apiKey !== undefined) {
      const store = loadApiKeys();
      store[settings.provider] = settings.apiKey;
      saveApiKeys(store);
    }
  }, [settings.apiKey, settings.provider]);

  // Save selected model per provider whenever a non-empty model is confirmed
  useEffect(() => {
    if (settings.model) {
      saveSelectedModel(settings.provider, settings.model);
    }
  }, [settings.model, settings.provider]);

  useEffect(() => {
    localStorage.setItem(
      configuredModelsStorageKey,
      JSON.stringify(normalizeConfiguredModels(configuredModels)),
    );
  }, [configuredModels]);

  useEffect(() => {
    localStorage.setItem(chatSessionsStorageKey, JSON.stringify(chatSessions));
  }, [chatSessions]);

  const settingsReady = Boolean(settings.baseUrl.trim() && settings.model.trim() && settings.apiKey.trim());
  const currentProviderConfiguredModels = configuredModels[settings.provider] ?? [];
  const currentPaperSessions = file
    ? chatSessions
        .filter((session) => session.paperName === file.name)
        .sort((left, right) => right.updatedAt - left.updatedAt)
    : [];
  const activeChat = currentPaperSessions.find((session) => session.id === activeChatId) ?? null;
  const chatMessages = activeChat?.messages ?? [];

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        applyFile(target.files[0]);
      }
    };
    input.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        applyFile(droppedFile);
      }
    }
  };

  function ensureActiveChatSession(paperName: string) {
    const existingActiveSession = chatSessions.find(
      (session) => session.id === activeChatId && session.paperName === paperName,
    );

    if (existingActiveSession) {
      return existingActiveSession;
    }

    const latestSession = chatSessions
      .filter((session) => session.paperName === paperName)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    if (latestSession) {
      setActiveChatId(latestSession.id);
      return latestSession;
    }

    const nextSession = createChatSession(paperName);
    setChatSessions((current) => [nextSession, ...current]);
    setActiveChatId(nextSession.id);
    return nextSession;
  }

  function replaceSession(sessionId: string, updater: (session: ChatSession) => ChatSession) {
    setChatSessions((current) =>
      current.map((session) => (session.id === sessionId ? updater(session) : session)),
    );
  }

  async function generateSessionTitle(sessionId: string, messages: ChatMessage[]) {
    if (!settingsReady || messages.length < 2) {
      return;
    }

    try {
      const response = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          model: settings.model,
        }),
      });

      if (!response.ok) {
        return;
      }

      const result = (await response.json()) as { title?: string };
      const nextTitle = result.title?.trim();

      if (!nextTitle) {
        return;
      }

      replaceSession(sessionId, (session) => {
        if (session.title !== '新对话') {
          return session;
        }

        return {
          ...session,
          title: nextTitle,
          updatedAt: Date.now(),
        };
      });
    } catch {
      // Ignore title generation failures and keep the default title.
    }
  }

  async function handleChat(userContent: string) {
    if (!file || !settingsReady) {
      if (!settingsReady) setIsSettingsOpen(true);
      return;
    }

    if (chatStatus === 'streaming') return;

    // Build system prompt with selection context if available
    let systemPrompt =
      `你是一个帮助研究者阅读学术论文的智能助手。当前正在讨论的论文文件名是《${file.name}》。默认使用中文回答，输出简洁清楚的 Markdown。优先解释论文内容本身，不要泛泛而谈；如果信息不足，要明确指出。用户在问“这篇论文讲什么”“主要贡献”“研究方法”这类问题时，默认基于当前论文内容作答，不要要求用户再次上传论文或粘贴摘要。`;
    if (documentContext?.abstract) {
      systemPrompt += `\n\n论文摘要：\n${documentContext.abstract}`;
    } else if (documentContext?.overview) {
      systemPrompt += `\n\n论文内容节选：\n${documentContext.overview}`;
    }
    if (selection) {
      systemPrompt += `\n\n用户当前正在阅读这篇论文《${file.name}》中第 ${selection.pageNumber} 页的这段内容：\n\n「${selection.selectedText}」\n\n前文上下文：${selection.contextBefore || '无'}\n后文上下文：${selection.contextAfter || '无'}`;
    }

    // Append user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };
    const targetSession = ensureActiveChatSession(file.name);
    const messagesWithUser = [...targetSession.messages, userMsg];
    replaceSession(targetSession.id, (session) => ({
      ...session,
      messages: messagesWithUser,
      updatedAt: Date.now(),
    }));
    setChatStatus('streaming');
    setChatError(null);

    // Add empty assistant message to update in-place
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    const allMessages = [...messagesWithUser, assistantMsg];
    replaceSession(targetSession.id, (session) => ({
      ...session,
      messages: allMessages,
      updatedAt: Date.now(),
    }));

    try {
      const payload = {
        messages: messagesWithUser.map(m => ({ role: m.role, content: m.content })),
        systemPrompt,
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        const details = await response.text();
        throw new Error(details || 'Chat request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Update assistant message in-place by id (resilient to future appends)
        replaceSession(targetSession.id, (session) => ({
          ...session,
          messages: session.messages.map((message) =>
            message.id === assistantMsg.id ? { ...message, content: accumulated } : message,
          ),
          updatedAt: Date.now(),
        }));
      }

      setChatStatus('idle');
      const completedMessages = allMessages.map((message) =>
        message.id === assistantMsg.id ? { ...message, content: accumulated } : message,
      );
      void generateSessionTitle(targetSession.id, completedMessages);
    } catch (error) {
      setChatStatus('error');
      setChatError(error instanceof Error ? error.message : 'Unexpected error.');
    }
  }

  function handleQuickAction(actionPrompt: string) {
    if (!selection) return;
    void handleChat(actionPrompt);
  }

  async function runRefreshModels() {
    if (!settings.baseUrl.trim() || !settings.apiKey.trim()) {
      setModelOptions([]);
      setModelFetchStatus('error');
      setModelFetchError('请先填写 Base URL 和 API key。');
      return;
    }

    setModelFetchStatus('loading');
    setModelFetchError(null);

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: settings.provider,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
        }),
      });

      const result = (await response.json()) as { models?: string[]; error?: string; details?: string };

      if (!response.ok) {
        throw new Error(result.details || result.error || '加载模型列表失败。');
      }

      const nextModels = Array.isArray(result.models) ? result.models : [];
      setModelOptions(nextModels);
      setModelFetchStatus('success');
      setModelFetchError(null);

      if (nextModels.length === 0) {
        setSettings((current: SettingsState) => ({
          ...current,
          model: configuredModels[current.provider]?.[0] ?? current.model,
        }));
        return;
      }

      const preferredModels = providerPresets[settings.provider].preferredModels ?? [];
      const preferredModel = preferredModels.find((candidate) => nextModels.includes(candidate));

      setSettings((current: SettingsState) => ({
        ...current,
        model: nextModels.includes(current.model) ? current.model : preferredModel ?? nextModels[0],
      }));
    } catch (error) {
      setModelOptions([]);
      setModelFetchStatus('error');
      setModelFetchError(error instanceof Error ? error.message : '加载模型列表失败。');
    }
  }

  const refreshModelsInEffect = useEffectEvent(async () => {
    await runRefreshModels();
  });

  useEffect(() => {
    if (!settings.baseUrl.trim() || !settings.apiKey.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshModelsInEffect();
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [settings.provider, settings.baseUrl, settings.apiKey]);

  function applyFile(nextFile: File) {
    const latestSession = chatSessions
      .filter((session) => session.paperName === nextFile.name)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    setFile(nextFile);
    setSelection(null);
    setDocumentContext(null);
    setActiveChatId(latestSession?.id ?? null);
    setChatStatus('idle');
    setChatError(null);
  }

  function handleSelectionChange(nextSelection: PdfSelectionPayload | null) {
    setSelection(nextSelection);
  }

  function updateSettings<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setSettings((current: SettingsState) => {
      if (key === 'provider') {
        const nextProvider = value as ProviderType;
        const preset = providerPresets[nextProvider];
        const savedKeys = loadApiKeys();
        const savedModels = loadSelectedModels();
        const providerConfiguredModels = configuredModels[nextProvider] ?? [];
        return {
          ...current,
          provider: nextProvider,
          baseUrl: preset.baseUrl,
          apiKey: savedKeys[nextProvider] ?? '',
          model: savedModels[nextProvider] ?? providerConfiguredModels[0] ?? '',
        };
      }

      if (key === 'baseUrl') {
        return {
          ...current,
          baseUrl: value as string,
          model: '',
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });

    if (key === 'provider' || key === 'baseUrl' || key === 'apiKey') {
      setModelOptions([]);
      setModelFetchStatus('idle');
      setModelFetchError(null);
    }
  }

  function addConfiguredModel(model: string) {
    const trimmedModel = model.trim();
    if (!trimmedModel) {
      return;
    }

    setConfiguredModels((current) => {
      const nextProviderModels = Array.from(
        new Set([...(current[settings.provider] ?? []), trimmedModel]),
      );

      return {
        ...current,
        [settings.provider]: nextProviderModels,
      };
    });

    setSettings((current) => ({
      ...current,
      model: trimmedModel,
    }));
  }

  function removeConfiguredModel(model: string) {
    const remainingModels = (configuredModels[settings.provider] ?? []).filter((item) => item !== model);

    setConfiguredModels((current) => {
      return {
        ...current,
        [settings.provider]: remainingModels,
      };
    });

    setSettings((current) => {
      if (current.model !== model) {
        return current;
      }

      return {
        ...current,
        model: remainingModels[0] ?? '',
      };
    });
  }

  function activateConfiguredModel(model: string) {
    setSettings((current) => ({
      ...current,
      model,
    }));
  }

  const quickSwitchProviders = Array.from(
    new Set(
      Object.entries(configuredModels)
        .filter(([, models]) => (models?.length ?? 0) > 0)
        .map(([provider]) => provider as ProviderType)
        .concat(settings.provider),
    ),
  );

  return (
    <div
      className="flex flex-col w-full h-screen relative bg-slate-50 text-slate-900"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <TopBar
        onFileSelect={handleFileSelect}
        onOpenSettings={() => setIsSettingsOpen(true)}
        fileName={file?.name}
        settingsReady={settingsReady}
        provider={settings.provider}
        model={settings.model}
        configuredProviders={quickSwitchProviders}
        configuredModelsByProvider={configuredModels}
        onProviderChange={(provider) => updateSettings('provider', provider)}
        onModelChange={(model) => updateSettings('model', model)}
      />
      <SplitPane
        left={
          <PdfViewer
            file={file}
            contextCharBudget={settings.contextCharBudget}
            selection={selection}
            onSelectionChange={handleSelectionChange}
            onDocumentContextReady={setDocumentContext}
            onQuickAction={(prompt) => {
              handleQuickAction(prompt);
            }}
            actionDisabled={chatStatus === 'streaming'}
            onOpenFile={handleFileSelect}
            onFileDrop={applyFile}
          />
        }
        right={
          <ChatPanel
            fileName={file?.name}
            hasValidSettings={settingsReady}
            isFileLoaded={Boolean(file)}
            selection={selection}
            chatSessions={currentPaperSessions}
            activeChatId={activeChat?.id ?? null}
            chatMessages={chatMessages}
            chatStatus={chatStatus}
            chatError={chatError}
            onSendMessage={(content) => { void handleChat(content); }}
            onQuickAction={(prompt) => { handleQuickAction(prompt); }}
            onClearSelection={() => setSelection(null)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onNewChat={() => {
              if (!file) {
                return;
              }

              const nextSession = createChatSession(file.name);
              setChatSessions((current) => [nextSession, ...current]);
              setActiveChatId(nextSession.id);
              setChatStatus('idle');
              setChatError(null);
            }}
            onSelectChat={(chatId) => {
              setActiveChatId(chatId);
              setChatStatus('idle');
              setChatError(null);
            }}
          />
        }
      />
      <SettingsDialog
        open={isSettingsOpen}
        settings={settings}
        modelOptions={modelOptions}
        configuredModels={currentProviderConfiguredModels}
        modelFetchStatus={modelFetchStatus}
        modelFetchError={modelFetchError}
        onClose={() => setIsSettingsOpen(false)}
        onChange={updateSettings}
        onAddConfiguredModel={addConfiguredModel}
        onRemoveConfiguredModel={removeConfiguredModel}
        onActivateConfiguredModel={activateConfiguredModel}
        onRefreshModels={() => {
          void runRefreshModels();
        }}
      />
    </div>
  );
}

export default App;
