# PaperCopilot

PaperCopilot is a web-based academic reading assistant for working directly with PDFs.

## Features

- Upload or drag-and-drop PDF papers
- Paragraph hover and click actions in the reader
- Chat-first workflow for explaining, summarizing, translating, and extracting key points
- BYOK support for multiple model providers
- Local chat history persistence with AI-generated conversation titles

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Deploy

This project is configured for Vercel:

- Static frontend output: `apps/web/dist`
- API routes: `api/[[...route]].ts`
