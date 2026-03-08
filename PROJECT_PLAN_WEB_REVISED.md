# PaperCopilot Web Plan (Revised)

## 1. Product Positioning

PaperCopilot is a web-based academic reading assistant focused on helping users understand papers at the paragraph level.

The MVP solves one narrow workflow well:
- Open a local PDF in the browser
- Select a sentence or paragraph from the paper
- Ask AI to explain that selection in context
- Show the explanation in a side panel
- Keep the selected region visually highlighted

The MVP is not a paper manager. Library, folder, tag, project, cross-paper search, and long-lived annotation systems are out of scope.

## 2. Core Product Decision

This version is not a pure browser-only app.

It is a:
- Web SPA frontend
- Plus a very thin API proxy layer

Reason:
- Browser-direct requests with user API keys are fragile
- Different forwarding platforms have different CORS and auth behaviors
- You need a stable transport layer for streaming, retries, and provider normalization

The proxy should stay thin. It is not a database backend and not an accounts system.

## 3. MVP Goals

The MVP is successful if a user can:
- Open a local born-digital PDF in the browser
- Select a text span from a page
- Trigger `Explain this`
- Receive a streamed explanation within a side panel
- See the selected region remain highlighted
- Configure a provider endpoint, model, and API key
- Use an OpenAI-compatible forwarding platform without code changes

## 4. Non-Goals

Do not build these in MVP:
- User accounts
- Paper library or collection management
- Backend database
- Full-document chat
- RAG or embeddings
- Citation export
- Persistent note system
- Cross-device sync
- Scanned PDF OCR pipeline

## 5. What the Old Project Already Proved

The original native project uses a pragmatic provider strategy that is worth keeping.

Observed in:
- [LLMProvider.swift](/Users/johnny/AIPaperReader/AIPaperReader/AIPaperReader/Models/LLMProvider.swift)
- [LLMServiceFactory.swift](/Users/johnny/AIPaperReader/AIPaperReader/AIPaperReader/Services/LLMService/LLMServiceFactory.swift)
- [OpenAIService.swift](/Users/johnny/AIPaperReader/AIPaperReader/AIPaperReader/Services/LLMService/OpenAIService.swift)
- [AppSettings.swift](/Users/johnny/AIPaperReader/AIPaperReader/AIPaperReader/Models/AppSettings.swift)

Key conclusions from the old project:
- Most providers are treated as OpenAI-compatible transports, not as separate SDK integrations.
- Only Ollama is handled separately.
- The request shape is standardized around:
  - `POST {baseURL}/v1/chat/completions`
  - `GET {baseURL}/v1/models`
  - `Authorization: Bearer <apiKey>`
- Provider-specific behavior is mostly metadata:
  - default base URL
  - default model list
  - whether API key is required
  - provider display info
- Runtime config is separated cleanly:
  - `provider`
  - `baseURL`
  - `apiKey`
  - `modelName`
  - `temperature`
  - `maxTokens`
  - `contextTokenBudget`

This is the right compatibility model for the web version too.

## 6. Revised Compatibility Strategy

### 6.1 Provider model

The web version should support three provider modes:

1. `openai-compatible`
- Default and primary mode
- Works with forwarding platforms and aggregators
- User provides:
  - base URL
  - API key
  - model

2. `preset-openai-compatible`
- Pre-filled metadata presets for known platforms
- Examples:
  - SiliconFlow
  - DeepSeek
  - 302.AI
  - BioInfoArk
- These are still handled by the same OpenAI-compatible transport

3. `ollama`
- Optional later
- Separate transport because local models and endpoints differ
- Not required in MVP unless you know you need local inference

### 6.2 Implementation rule

Do not build one client per provider.

Build:
- one provider metadata layer
- one OpenAI-compatible transport layer
- optionally one Ollama transport later

That is the exact lesson from the old project and it keeps the codebase small.

## 7. Architecture

### Frontend
- React
- TypeScript
- Vite
- Zustand
- `react-pdf` backed by `pdfjs-dist`

### Thin proxy backend
- Node.js
- Fastify or Hono

Recommendation:
- Use `Hono`

Reason:
- very small surface area
- easy deployment to Node, Vercel, or Cloudflare later
- clean streaming support

### Why a thin proxy is the right tradeoff

The proxy should do only this:
- receive normalized explain requests
- inject or validate provider credentials
- forward request to configured OpenAI-compatible endpoint
- normalize streaming output
- normalize provider errors

The proxy should not do this in MVP:
- save PDFs
- store paper text
- store user history
- run retrieval
- maintain a database

## 8. Recommended Stack

### Frontend
- `react`
- `react-dom`
- `typescript`
- `vite`
- `zustand`
- `react-pdf`
- `pdfjs-dist`
- `react-markdown`
- `zod`
- `lucide-react`
- `clsx`

### Thin proxy
- `hono`
- `zod`
- native `fetch`

### Styling
- Tailwind CSS is acceptable for speed
- If you want a stronger product identity, pair Tailwind with a small token system and custom CSS variables

### Do not use in MVP
- Next.js
- Prisma
- database of any kind
- LangChain
- vector store
- heavyweight component library

## 9. Revised Project Structure

```text
paperCopilot/
  PROJECT_PLAN.md
  PROJECT_PLAN_WEB_REVISED.md
  apps/
    web/
      package.json
      vite.config.ts
      tsconfig.json
      src/
        main.tsx
        App.tsx
        styles/
          globals.css
          tokens.css
        components/
          layout/
            TopBar.tsx
            SplitPane.tsx
          reader/
            PdfViewer.tsx
            TextSelectionLayer.tsx
            HighlightOverlay.tsx
            SelectionActionBubble.tsx
          explain/
            ExplainPanel.tsx
            ExplainSection.tsx
            ExplainToolbar.tsx
          settings/
            SettingsDialog.tsx
            ProviderForm.tsx
            ModelForm.tsx
          common/
            EmptyState.tsx
            ErrorBanner.tsx
            LoadingState.tsx
        hooks/
          usePdfSelection.ts
          useExplainSelection.ts
          useSettings.ts
        stores/
          appStore.ts
          readerStore.ts
          settingsStore.ts
        lib/
          selectionAnchors.ts
          contextExtraction.ts
          requestBuilder.ts
          streamParser.ts
        types/
          ui.ts
    proxy/
      package.json
      tsconfig.json
      src/
        index.ts
        routes/
          explain.ts
          models.ts
        providers/
          providerRegistry.ts
          openaiCompatible.ts
        lib/
          streamOpenAI.ts
          normalizeError.ts
          schema.ts
  packages/
    shared/
      src/
        explain.ts
        provider.ts
        schema.ts
```

## 10. Main Product Loop

1. User opens the web app
2. User loads a local PDF into browser memory
3. PDF renders with selectable text layer
4. User selects a paragraph or sentence
5. Frontend computes a stable selection payload
6. User clicks `Explain this`
7. Frontend sends normalized request to proxy
8. Proxy forwards to configured provider
9. Proxy streams structured sections back
10. Frontend renders explanation incrementally in the side panel
11. Selection stays highlighted until user clears or selects another passage

## 11. Selection Strategy

This is the most important technical area in the app.

### Do not do this
- Do not rely on searching the selected string inside full page text as the primary anchor

Reason:
- repeated phrases
- hyphenation issues
- whitespace normalization differences
- two-column ordering problems
- formula and symbol loss

### Do this instead

At selection time, capture:
- page number
- selected text
- DOM rects for highlight
- start text item index
- end text item index
- surrounding text item indexes

Then derive local context from neighboring text items in DOM order.

### Fallback

If anchor extraction fails:
- fall back to normalized string search on page text
- mark the request as lower confidence internally

This should be a fallback only, not the primary plan.

## 12. Context Extraction

For each selection, send:
- selected text
- the text item window immediately before the selection
- the text item window immediately after the selection
- page number
- optional page title or document title if available

Recommended context window:
- around 300 to 800 characters before
- around 300 to 800 characters after

Do not send the full page unless the page is small.

## 13. Response Protocol

Do not use freeform markdown as the transport contract.

Use a structured response model and stream per section.

### Target response shape

```ts
type ExplainSectionName =
  | 'plainExplanation'
  | 'termNotes'
  | 'whyItMatters'
  | 'contextRelation'

type ExplainResponse = {
  plainExplanation: string
  termNotes: Array<{
    term: string
    explanation: string
  }>
  whyItMatters: string
  contextRelation: string
}
```

### Streaming recommendation

Use SSE or chunked NDJSON with events like:
- `section:start`
- `section:delta`
- `section:end`
- `complete`
- `error`

This keeps the UI fast without throwing away structure.

## 14. Explain Prompt Strategy

The model should behave as an academic reading assistant, not a chatbot.

It should:
- explain only from the selected text and local context
- use plain Chinese by default
- explain terms and method language
- explain why the selected part matters
- avoid hallucinating content from outside the supplied excerpt

### Prompt sections
- role instruction
- document title
- page number
- selected text
- context before
- context after
- output schema rules

## 15. Security Model

### Recommended default
- Frontend stores non-sensitive UI preferences locally
- API key is not stored by default
- User may opt in to local persistence

### Hosted mode
- Frontend talks to the proxy
- Proxy may use:
  - server-side environment key
  - or user-provided encrypted token flow later

### Important language correction
Do not claim:
- absolute privacy
- safe localStorage
- files never leave device

Correct wording:
- original PDF file is not uploaded by default
- selected text and local context are sent to the configured AI provider when the user triggers explanation

## 16. Settings Model

Reuse the old project's config shape conceptually.

### Suggested settings schema

```ts
type ProviderType =
  | 'openai-compatible'
  | 'siliconflow'
  | 'deepseek'
  | '302ai'
  | 'bioinfoark'

type ModelSettings = {
  provider: ProviderType
  baseUrl: string
  apiKey?: string
  model: string
  temperature: number
  maxTokens: number
  contextCharBudget: number
}
```

### Preset metadata

Keep a provider registry with:
- display name
- default base URL
- whether api key is required
- model suggestions
- docs URL

This mirrors the old native app and is the right level of abstraction.

## 17. API Surface

### Frontend to proxy

`POST /api/explain`
- request: normalized explain request
- response: SSE or NDJSON stream

`GET /api/models`
- query by provider, base URL, and key
- return compatible models if available

### Shared request type

```ts
type ExplainRequest = {
  documentTitle: string
  pageNumber: number
  selectedText: string
  contextBefore: string
  contextAfter: string
  provider: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}
```

## 18. UI Plan

### Layout
- Left: PDF reader
- Right: explanation panel
- Top: upload, model, explain status, settings

### States
- empty app
- PDF loaded but nothing selected
- selection active
- explanation streaming
- explanation complete
- error state

### Explanation panel sections
- selected text
- plain explanation
- term notes
- why this matters
- context relation

### Keep out of MVP
- multi-message chat transcript
- conversation bubbles
- conversational composer

This is a reading tool first.

## 19. Milestones

### Milestone 1: Frontend shell and PDF viewer
- Vite app setup
- local PDF open
- `react-pdf` rendering
- zoom and page navigation
- split-pane layout

### Milestone 2: Selection anchoring
- capture page-local rects
- capture text item anchor indexes
- build stable highlight overlay
- derive local context from neighboring text items

### Milestone 3: Thin proxy and provider adapter
- implement `openaiCompatible` provider transport
- implement provider registry with presets
- implement `/api/explain`
- implement `/api/models`
- normalize streaming and error output

### Milestone 4: Structured explanation UX
- render streamed sections
- selected text preview
- retry and cancel
- error handling
- provider/model settings

### Milestone 5: Hardening
- scanned PDF unsupported notice
- local persistence for recent UI state
- opt-in API key persistence
- smoke test representative paper layouts

## 20. Testing Plan

### Unit tests
- provider registry
- request builder
- stream parser
- response schema validation
- context extraction helpers

### Manual smoke tests
- open PDF
- select text on single-column paper
- select text on two-column paper
- explanation stream renders correctly
- selected region remains highlighted
- invalid API key returns readable error
- switching provider presets updates base URL and model defaults

## 21. Known Risks

### Risk: forwarded platforms are almost but not fully OpenAI-compatible
Mitigation:
- isolate transport logic in `openaiCompatible.ts`
- support provider-level request overrides later if required
- start with the most standard payload possible

### Risk: selection extraction breaks on complex layouts
Mitigation:
- anchor by text items, not only raw strings
- explicitly support born-digital papers only in MVP
- test with real two-column academic PDFs early

### Risk: streaming output becomes hard to render cleanly
Mitigation:
- stream section-based payloads instead of raw markdown only

## 22. Acceptance Criteria

The MVP is complete when:
- a user can open a local PDF in the browser
- a user can select a passage and trigger explanation
- the app can stream a structured explanation into the side panel
- the app can keep the passage highlighted
- the app can work with at least one OpenAI-compatible forwarding platform by configuring `baseUrl + apiKey + model`
- the app does not require library management or a database

## 23. Final Recommendation

Build this as:
- Web SPA for reading and interaction
- Thin proxy for provider normalization
- OpenAI-compatible transport as the main compatibility layer

Do not build this as:
- browser-direct provider client
- unstructured markdown chat app
- paper manager in disguise

The most important implementation priority is not styling, but reliable selection anchoring and a stable OpenAI-compatible provider adapter.
