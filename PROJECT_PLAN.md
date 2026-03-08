# PaperCopilot Project Plan (Web SPA Version)

## 1. Product Positioning

PaperCopilot is a pure web-based academic reading assistant focused on helping users understand papers in context. By adopting a Web SPA (Single Page Application) architecture, the tool can be deployed easily, accessed from any browser, and requires zero installation.

The MVP is intentionally narrow:
- Open a local PDF paper directly in the browser
- Select a paragraph or sentence in the paper
- Ask an AI model to explain that selected content in plain language
- Show the explanation next to the PDF using real-time streaming
- Visually highlight the interpreted text inside the document

The MVP is not a literature manager. Library management, tags, folders, cross-paper organization, notes database, and retrieval workflows are explicitly deferred to V2.

## 2. MVP Goals

### Core user problem
Academic papers are often difficult to understand at the paragraph level. Users need contextual, localized explanations tied directly to the section they are reading.

### MVP success criteria
The MVP is successful if a user can:
- Drag and drop or select a PDF from their local disk into the browser
- Select a text span from the PDF
- Trigger an AI explanation for that selection
- Instantly see a streaming explanation in a side panel
- See the selected text highlighted in the document
- Provide their own API key (BYOK - Bring Your Own Key) stored safely in the browser

### Non-goals for MVP
Do not build these yet:
- User accounts or backend databases
- Paper library or collections
- Chat history or multi-session thread persistence
- Full-document QA or RAG search
- Citation export
- Team or cloud features

## 3. Product Scope

### MVP feature set
1. Local PDF import into browser memory
2. PDF reading with page navigation and zoom
3. Text selection capture
4. Selection-aware AI explanation (Streaming)
5. Explanation side panel
6. Highlight overlay for the interpreted selection
7. API key and model settings (stored in `localStorage`)
8. Error handling and loading states

### V1.1 candidate features
1. Scanned PDF support (Vision/OCR integration)
2. Explain again with different styles
3. Translate selected text
4. Summarize selected section
5. Copy explanation as Markdown

## 4. Recommended Tech Stack

### Frontend Foundation
- React
- TypeScript
- Vite
- Zustand for app state

### PDF Rendering
- `react-pdf` (Wrapper around `pdfjs-dist`)
- Provides robust Canvas + Text Layer rendering out of the box, saving massive amounts of DOM manipulation time.

### Storage
- `localStorage` for API keys, settings, and UI state.

### Networking & LLM
- Native `fetch` API directly in the browser component/hook.
- Streaming responses (`ReadableStream`) to provide immediate feedback, bypassing the long wait times of strict JSON structures.
- BYOK (Bring Your Own Key) model to avoid backend infrastructure for the MVP.

### UI Utilities
- Tailwind CSS
- Lucide React (for icons)
- `clsx` and `tailwind-merge`

### Markdown Rendering
- `react-markdown` to render the streaming AI response cleanly.

## 5. Proposed Project Structure

```text
paperCopilot/
  PROJECT_PLAN.md
  package.json
  vite.config.ts
  tsconfig.json
  src/
    main.tsx
    App.tsx
    index.css
    components/
      layout/
        TopBar.tsx
        Sidebar.tsx
        SplitPane.tsx
      reader/
        PdfViewer.tsx
        HighlightOverlay.tsx
        SelectionToolbar.tsx
      explain/
        ExplainPanel.tsx
        StreamingMessage.tsx
      settings/
        SettingsDialog.tsx
    hooks/
      usePdfSelection.ts
      useLlmStream.ts
      useSettings.ts
    stores/
      appStore.ts
      readerStore.ts
    lib/
      pdfContextExtractor.ts
      openaiClient.ts
    types/
      index.ts
```

## 6. Package Recommendations

### Required packages
- `react`, `react-dom`, `vite`, `typescript`
- `react-pdf`
- `zustand`
- `lucide-react`
- `react-markdown`

### Avoid in MVP
- Next.js (unless SEO or SSR is needed later; Vite SPA is simpler for a purely client-heavy tool)
- Heavy component libraries (MUI, AntD)
- Vector DBs
- Backend ORMs (Prisma)

## 7. Core Architecture Decisions

### 7.1 Pure Client-Side Architecture
By processing the PDF entirely in the browser and sending LLM requests directly from the client (using user-provided API keys), we eliminate the need for a backend server. This makes hosting free (GitHub Pages, Vercel, Netlify) and privacy absolute (files never leave the user's machine).

### 7.2 Streaming Responses over strict JSON
To bypass the "spinner fatigue" of waiting 5-10 seconds for a structured JSON explanation, the MVP will use standard text/markdown streaming. The AI will output a well-formatted markdown response immediately, creating a much better user experience.

### 7.3 Context Extraction Strategy
Instead of traversing complex PDF.js DOM trees to find the surrounding context, the app will:
1. Identify the selected text and its page number.
2. Extract the full raw text of that specific page via the PDF.js API (`page.getTextContent()`).
3. Perform a string search to locate the selected text within the full page text.
4. Extract the surrounding 500-1000 characters as reliable context.

## 8. High-Risk Areas & Vision/OCR Strategy

### Risk: PDF.js Text Layer inconsistencies
**The Problem:** Sometimes the text layer generated by PDF.js places words out of order, or columns interleave strangely, making selection difficult.
**Solution for MVP:** Stick to born-digital academic papers and use `react-pdf`, which handles the most common layout quirks significantly better than a raw manual implementation.

### Alternative: Dealing with Scanned PDFs (OCR vs. Vision)
**Is local OCR helpful?**
Running OCR like Tesseract.js in the browser is slow, resource-intensive, and inaccurate for complex academic multi-column layouts.

**Better Solution (V1.1): Multi-modal Vision**
When a user encounters a scanned PDF with no text layer, rather than attempting local OCR, the app can take a canvas screenshot of the user's view (or the drawn bounding box). This image is sent directly to a Vision model (like GPT-4o or Claude 3.5 Sonnet). The model natively "reads" the image and explains the boxed area, leapfrogging the need for perfect text extraction and easily handling charts and complex formulas.

**MVP Scope:** Only support standard, text-selectable PDFs initially to validate the core UI/UX loop rapidly.

## 9. Main User Flow

1. User opens the hosted website URL.
2. User drags and drops a PDF into the browser window.
3. PDF renders using `react-pdf`.
4. User selects a sentence or paragraph.
5. A floating button appears: `Explain this`.
6. User clicks it. The frontend extracts the selected text and context.
7. Frontend opens a streaming connection to the LLM API (using BYOK stored key).
8. The `ExplainPanel` opens and renders the Markdown explanation in real-time.

## 10. Security Constraints

- API Keys must be stored exclusively in `localStorage`.
- Provide a clear warning that API keys are stored locally and sent only directly to the LLM provider (e.g., OpenAI/Anthropic).
- Zero user data collection. Do not log user paper contents or reading history.

## 11. Milestone Plan

### Milestone 1: SPA Foundation & PDF Viewer
- Initialize Vite + React project.
- Implement dropzone for PDF files.
- Integrate `react-pdf` to render pages with zoom functionality.

### Milestone 2: Selection & Context Extraction
- Add event listeners for text selection.
- Implement string-matching context extraction.
- Render a highlight overlay on the PDF canvas to map current selection.

### Milestone 3: AI Streaming & UI
- Build the settings dialog for API keys and provider selection.
- Implement streaming `fetch` for AI API interactions.
- Render streaming responses using `react-markdown`.
- Finalize split-pane layout and visual styling (Tailwind).
