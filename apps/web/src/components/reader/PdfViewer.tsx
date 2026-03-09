import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Document, Page } from 'react-pdf';
import { FileUp, Loader2, Minus, Plus } from 'lucide-react';

export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface NormalizedSelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface HighlightRecord {
  id: string;
  paperName: string;
  pageNumber: number;
  selectedText: string;
  color: HighlightColor;
  rects: NormalizedSelectionRect[];
  createdAt: number;
}

export interface PdfSelectionPayload {
  pageNumber: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  rects: SelectionRect[];
  normalizedRects: NormalizedSelectionRect[];
  bubbleTop: number;
  bubbleLeft: number;
  source?: 'text-selection' | 'paragraph';
  anchorId?: string;
}

interface PdfViewerProps {
  file: File | null;
  contextCharBudget: number;
  selection: PdfSelectionPayload | null;
  highlightedSelections: HighlightRecord[];
  onSelectionChange: (selection: PdfSelectionPayload | null) => void;
  onDocumentContextReady: (context: { abstract: string; overview: string } | null) => void;
  onOpenFile: () => void;
  onFileDrop: (file: File) => void;
}

export function PdfViewer({
  file,
  contextCharBudget,
  highlightedSelections,
  onSelectionChange,
  onDocumentContextReady,
  onOpenFile,
  onFileDrop,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [scale, setScale] = useState(1.2);
  const [renderTick, setRenderTick] = useState(0);
  const [pageLayouts, setPageLayouts] = useState<Record<number, { top: number; left: number; width: number; height: number }>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomLevels = useMemo(() => [1, 1.25, 1.5, 2], []);

  function onDocumentLoadSuccess(document: LoadedDocumentProxy) {
    setLoadError(null);
    setNumPages(document.numPages);
    setRenderTick(0);
    void extractDocumentContext(document).then(onDocumentContextReady).catch(() => {
      onDocumentContextReady(null);
    });
  }

  useEffect(() => {
    let frameId = 0;

    const syncSelection = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const container = containerRef.current;
        if (!container) {
          return;
        }

        const nextSelection = captureSelection(container, contextCharBudget);
        if (nextSelection) {
          onSelectionChange(nextSelection);
          return;
        }

        const browserSelection = window.getSelection();
        const anchorNode = browserSelection?.anchorNode ?? null;

        // Keep the last PDF selection while the user types in the right panel.
        // Only clear it when the collapsed caret is still inside the PDF area.
        if (
          browserSelection &&
          anchorNode &&
          container.contains(anchorNode) &&
          browserSelection.isCollapsed
        ) {
          onSelectionChange(null);
        }
      });
    };

    document.addEventListener('selectionchange', syncSelection);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('selectionchange', syncSelection);
    };
  }, [contextCharBudget, file, onSelectionChange]);

  useEffect(() => {
    let frameId = 0;

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measurePages);
    };

    const measurePages = () => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const nextLayouts = Object.fromEntries(
        Array.from(container.querySelectorAll<HTMLElement>('[data-page-number]')).map((pageElement) => {
          const pageNumber = Number(pageElement.dataset.pageNumber ?? '0');
          const rect = pageElement.getBoundingClientRect();

          return [
            pageNumber,
            {
              top: rect.top - containerRect.top + container.scrollTop,
              left: rect.left - containerRect.left + container.scrollLeft,
              width: rect.width,
              height: rect.height,
            },
          ];
        }),
      );

      setPageLayouts(nextLayouts);
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleMeasure();
          })
        : null;

    const container = containerRef.current;
    if (container && resizeObserver) {
      resizeObserver.observe(container);

      Array.from(container.querySelectorAll<HTMLElement>('[data-page-number]')).forEach((pageElement) => {
        resizeObserver.observe(pageElement);

        const canvas = pageElement.querySelector('canvas');
        if (canvas) {
          resizeObserver.observe(canvas);
        }

        const textLayer = pageElement.querySelector('.react-pdf__Page__textContent');
        if (textLayer instanceof HTMLElement) {
          resizeObserver.observe(textLayer);
        }
      });
    }

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [file, numPages, renderTick, scale]);

  if (!file) {
    return (
      <div className="flex-1 bg-slate-100 p-6">
        <div
          className={`flex h-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed px-8 text-center transition ${
            isDraggingFile
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-slate-300 bg-white text-slate-500'
          }`}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            const nextTarget = event.relatedTarget as Node | null;
            if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
              setIsDraggingFile(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDraggingFile(false);
            const droppedFile = event.dataTransfer.files?.[0];
            if (droppedFile?.type === 'application/pdf') {
              onFileDrop(droppedFile);
            }
          }}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <FileUp className="h-7 w-7" />
          </div>
          <p className="mt-5 text-lg font-semibold text-slate-900">打开论文 PDF</p>
          <p className="mt-2 max-w-sm text-sm leading-7 text-slate-500">
            左侧这里可以直接拖拽上传，也可以点击下面按钮选择本地 PDF。
          </p>
          <button
            type="button"
            onClick={onOpenFile}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <FileUp className="h-4 w-4" />
            打开 PDF
          </button>
          <p className="mt-3 text-xs text-slate-400">支持拖拽上传 PDF 文件</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full bg-slate-200 overflow-y-auto relative"
    >
      <div className="sticky top-0 z-30 flex justify-center px-4 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => setScale((current) => Math.max(1, Number((current - 0.1).toFixed(2))))}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="缩小"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            {zoomLevels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setScale(level)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  Math.abs(scale - level) < 0.001
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {Math.round(level * 100)}%
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setScale((current) => Math.min(2.5, Number((current + 0.1).toFixed(2))))}
            className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="放大"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {highlightedSelections.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {highlightedSelections.flatMap((highlight) => {
            const pageLayout = pageLayouts[highlight.pageNumber];
            if (!pageLayout) {
              return [];
            }

            return highlight.rects.map((rect, rectIndex) => {
              const colorClass = getHighlightColorClasses(highlight.color);
              return (
                <div
                  key={`${highlight.id}-${rectIndex}`}
                  className={`absolute rounded ring-1 ${colorClass}`}
                  style={{
                    top: pageLayout.top + rect.top * pageLayout.height,
                    left: pageLayout.left + rect.left * pageLayout.width,
                    width: rect.width * pageLayout.width,
                    height: rect.height * pageLayout.height,
                  }}
                />
              );
            });
          })}
        </div>
      )}

      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(error) => {
          setNumPages(undefined);
          setLoadError(error.message || 'Failed to load PDF file.');
        }}
        loading={
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 h-full">
            <Loader2 className="animate-spin w-8 h-8 mb-4 text-blue-500" />
            <span className="text-sm font-medium">正在加载文档...</span>
          </div>
        }
        error={
          <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center text-red-600">
            <p className="text-sm font-semibold">PDF 加载失败。</p>
            <p className="mt-2 max-w-sm text-xs leading-6 text-red-500">
              {loadError || '文件可能已损坏，或者当前查看器无法正确解析它。'}
            </p>
          </div>
        }
        className="flex flex-col items-center py-8 gap-6 min-h-full"
      >
        {Array.from({ length: numPages || 0 }, (_, index) => (
          <div key={`page_${index + 1}`} className="relative shadow-md bg-white" data-page-number={index + 1}>
            <Page 
              pageNumber={index + 1} 
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              onRenderSuccess={() => setRenderTick((current) => current + 1)}
              className="pdf-page"
            />
          </div>
        ))}
      </Document>
    </div>
  );
}

function captureSelection(
  container: HTMLDivElement,
  contextCharBudget: number,
): PdfSelectionPayload | null {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }

  const range = selection.getRangeAt(0)

  if (!container.contains(range.commonAncestorContainer)) {
    return null
  }

  const selectedText = normalizeWhitespace(selection.toString())

  if (!selectedText || selectedText.length < 3) {
    return null
  }

  const pageElement = findPageElement(range.commonAncestorContainer)
  if (!pageElement) {
    return null
  }

  const pageRect = pageElement.getBoundingClientRect()

  const pageNumberText = pageElement.getAttribute('data-page-number')
  const pageNumber = pageNumberText ? Number(pageNumberText) : 1
  const pageText = normalizeWhitespace(pageElement.textContent ?? '')
  const selectionIndex = findSelectionIndex(pageText, selectedText)
  const contextStart = selectionIndex >= 0 ? Math.max(0, selectionIndex - contextCharBudget) : 0
  const contextEnd =
    selectionIndex >= 0
      ? Math.min(pageText.length, selectionIndex + selectedText.length + contextCharBudget)
      : Math.min(pageText.length, contextCharBudget * 2)

  const contextBefore =
    selectionIndex >= 0 ? pageText.slice(contextStart, selectionIndex) : pageText.slice(0, contextCharBudget)
  const contextAfter =
    selectionIndex >= 0
      ? pageText.slice(selectionIndex + selectedText.length, contextEnd)
      : pageText.slice(contextCharBudget, contextEnd)

  const filteredRects = collectSelectionRects(range, pageElement)
  const containerRect = container.getBoundingClientRect()
  const rects = filteredRects
    .map((rect) => ({
      top: rect.top - containerRect.top + container.scrollTop,
      left: rect.left - containerRect.left + container.scrollLeft,
      width: rect.width,
      height: rect.height,
    }))

  const normalizedRects = filteredRects
    .map((rect) => ({
      top: clampRatio((rect.top - pageRect.top) / Math.max(1, pageRect.height)),
      left: clampRatio((rect.left - pageRect.left) / Math.max(1, pageRect.width)),
      width: clampRatio(rect.width / Math.max(1, pageRect.width)),
      height: clampRatio(rect.height / Math.max(1, pageRect.height)),
    }))

  if (rects.length === 0 || normalizedRects.length === 0) {
    return null
  }

  const firstRect = rects[0]
  const bubbleTop = Math.max(8, firstRect.top - 42)
  const bubbleLeft = Math.max(8, firstRect.left)

  return {
    pageNumber: Number.isFinite(pageNumber) ? pageNumber : 1,
    selectedText,
    contextBefore,
    contextAfter,
    rects,
    normalizedRects,
    bubbleTop,
    bubbleLeft,
    source: 'text-selection' as const,
  }
}

function clampRatio(value: number) {
  return Math.max(0, Math.min(1, value));
}

function collectSelectionRects(range: Range, pageElement: HTMLElement) {
  const textLayer =
    pageElement.querySelector<HTMLElement>('.react-pdf__Page__textContent') ?? pageElement;
  const walker = document.createTreeWalker(textLayer, NodeFilter.SHOW_TEXT);
  const rects: Array<{ top: number; left: number; width: number; height: number }> = [];

  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const textContent = textNode.textContent ?? '';

    if (!textContent.trim() || !range.intersectsNode(textNode)) {
      continue;
    }

    const nodeRange = document.createRange();
    const endOffset = textContent.length;
    const startOffset = textNode === range.startContainer ? range.startOffset : 0;
    const limitedEndOffset = textNode === range.endContainer ? range.endOffset : endOffset;

    if (limitedEndOffset <= startOffset) {
      continue;
    }

    nodeRange.setStart(textNode, startOffset);
    nodeRange.setEnd(textNode, limitedEndOffset);

    rects.push(
      ...Array.from(nodeRange.getClientRects())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })),
    );
  }

  return mergeAdjacentRects(rects);
}

function mergeAdjacentRects(rects: Array<{ top: number; left: number; width: number; height: number }>) {
  if (rects.length <= 1) {
    return rects;
  }

  const sorted = [...rects].sort((left, right) =>
    Math.abs(left.top - right.top) > 1 ? left.top - right.top : left.left - right.left,
  );
  const merged: typeof sorted = [];

  for (const rect of sorted) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...rect });
      continue;
    }

    const sameLine = Math.abs(last.top - rect.top) < Math.max(3, rect.height * 0.45);
    const horizontalGap = rect.left - (last.left + last.width);
    const compatibleHeight = Math.abs(last.height - rect.height) < Math.max(3, rect.height * 0.45);

    if (sameLine && compatibleHeight && horizontalGap <= 6) {
      const rightEdge = Math.max(last.left + last.width, rect.left + rect.width);
      last.top = Math.min(last.top, rect.top);
      last.height = Math.max(last.height, rect.height);
      last.width = rightEdge - last.left;
      continue;
    }

    merged.push({ ...rect });
  }

  return merged;
}

function getHighlightColorClasses(color: HighlightColor) {
  switch (color) {
    case 'green':
      return 'bg-emerald-300/55 ring-emerald-500/45';
    case 'blue':
      return 'bg-sky-300/55 ring-sky-500/45';
    case 'pink':
      return 'bg-pink-300/55 ring-pink-500/45';
    default:
      return 'bg-amber-300/55 ring-amber-500/45';
  }
}

type LoadedDocumentProxy = NonNullable<ComponentProps<typeof Document>['onLoadSuccess']> extends (
  document: infer T,
) => void
  ? T
  : never;

async function extractDocumentContext(document: LoadedDocumentProxy) {
  const pageTexts: string[] = [];
  const maxPages = Math.min(document.numPages, 3);

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = normalizeWhitespace(
      textContent.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .join(' '),
    );

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  const overview = normalizeWhitespace(pageTexts.join(' ')).slice(0, 5000);
  const abstract = extractAbstractText(overview);

  return {
    abstract,
    overview: overview.slice(0, 2600),
  };
}

function extractAbstractText(text: string) {
  if (!text) {
    return '';
  }

  const normalized = normalizeWhitespace(text);
  const abstractMatch = normalized.match(
    /\babstract\b[:\s-]*(.{120,2400}?)(?=\b(?:keywords|introduction|background|results|materials and methods|methods|1\s+introduction)\b)/i,
  );

  if (abstractMatch?.[1]) {
    return abstractMatch[1].trim();
  }

  return normalized.slice(0, 1600);
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function findPageElement(node: Node | null) {
  let current: Node | null = node

  while (current) {
    if (current instanceof HTMLElement && current.dataset.pageNumber) {
      return current
    }

    current = current.parentNode
  }

  return null
}

function findSelectionIndex(pageText: string, selectedText: string) {
  const exactIndex = pageText.indexOf(selectedText)
  if (exactIndex >= 0) {
    return exactIndex
  }

  const lowerIndex = pageText.toLowerCase().indexOf(selectedText.toLowerCase())
  if (lowerIndex >= 0) {
    return lowerIndex
  }

  const probe = selectedText.slice(0, Math.min(selectedText.length, 32)).toLowerCase()
  return probe ? pageText.toLowerCase().indexOf(probe) : -1
}
