import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Document, Page } from 'react-pdf';
import { FileUp, Languages, Lightbulb, ListCollapse, Loader2, Sparkles } from 'lucide-react';
import { selectionQuickActions } from '../../lib/chatActions';

export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PdfSelectionPayload {
  pageNumber: number;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  rects: SelectionRect[];
  bubbleTop: number;
  bubbleLeft: number;
  source?: 'text-selection' | 'paragraph';
  anchorId?: string;
}

interface PdfViewerProps {
  file: File | null;
  contextCharBudget: number;
  selection: PdfSelectionPayload | null;
  onSelectionChange: (selection: PdfSelectionPayload | null) => void;
  onDocumentContextReady: (context: { abstract: string; overview: string } | null) => void;
  onQuickAction: (prompt: string) => void;
  actionDisabled: boolean;
  onOpenFile: () => void;
  onFileDrop: (file: File) => void;
}

export function PdfViewer({
  file,
  contextCharBudget,
  selection,
  onSelectionChange,
  onDocumentContextReady,
  onQuickAction,
  actionDisabled,
  onOpenFile,
  onFileDrop,
}: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState(0);
  const [paragraphAnchors, setParagraphAnchors] = useState<PdfSelectionPayload[]>([]);
  const [hoveredAnchorId, setHoveredAnchorId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scale = 1.2;
  const hoveredAnchor = !selection
    ? paragraphAnchors.find((anchor) => anchor.anchorId === hoveredAnchorId) ?? null
    : null;
  const activeOverlay = selection ?? hoveredAnchor;

  function onDocumentLoadSuccess(document: LoadedDocumentProxy) {
    setLoadError(null);
    setNumPages(document.numPages);
    setRenderedPages(0);
    setParagraphAnchors([]);
    setHoveredAnchorId(null);
    void extractDocumentContext(document).then(onDocumentContextReady).catch(() => {
      onDocumentContextReady(null);
    });
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    window.setTimeout(() => {
      const nextSelection = captureSelection(event.currentTarget, contextCharBudget);

      if (nextSelection) {
        onSelectionChange(nextSelection);
        return;
      }

      if (!hoveredAnchorId) {
        onSelectionChange(null);
      }
    }, 0);
  }

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-selection-menu="true"]')) {
      return;
    }

    const browserSelection = window.getSelection();
    if (browserSelection && !browserSelection.isCollapsed) {
      return;
    }

    const hoveredParagraph = findAnchorAtPoint(event, event.currentTarget, paragraphAnchors);
    if (hoveredParagraph) {
      window.getSelection()?.removeAllRanges();
      onSelectionChange(hoveredParagraph);
      setHoveredAnchorId(hoveredParagraph.anchorId ?? null);
      return;
    }

    if (selection) {
      onSelectionChange(null);
    }
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (selection) {
      setHoveredAnchorId(null);
      return;
    }

    const hoveredParagraph = findAnchorAtPoint(event, event.currentTarget, paragraphAnchors);
    setHoveredAnchorId(hoveredParagraph?.anchorId ?? null);
  }

  useEffect(() => {
    if (!containerRef.current || !numPages || renderedPages === 0) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      const nextAnchors = extractParagraphAnchors(containerRef.current!, contextCharBudget);
      setParagraphAnchors(nextAnchors);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [contextCharBudget, file, numPages, renderedPages]);

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
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredAnchorId(null)}
      onClick={handleClick}
    >
      {activeOverlay && activeOverlay.rects.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-20">
          {activeOverlay.rects.map((rect, index) => (
            <div
              key={`${activeOverlay.anchorId ?? activeOverlay.pageNumber}-${index}-${rect.top}-${rect.left}`}
              className={`absolute rounded ring-1 ${
                selection
                  ? 'bg-blue-300/40 ring-blue-400/30'
                  : 'bg-cyan-200/45 ring-cyan-400/40'
              }`}
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          ))}
        </div>
      )}

      {selection && (
        <div
          data-selection-menu="true"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
          className="absolute z-30 min-w-[220px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur"
          style={{
            top: Math.max(8, selection.bubbleTop),
            left: Math.max(8, selection.bubbleLeft),
            maxWidth: 'calc(100% - 16px)',
          }}
        >
          <div className="mb-1 px-2 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">快捷操作</p>
          </div>
          <div className="grid gap-1">
            {selectionQuickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onQuickAction(action.prompt)}
                disabled={actionDisabled}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ActionIcon actionId={action.id} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
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
              onRenderSuccess={() => {
                setRenderedPages((current) => current + 1);
              }}
              className="pdf-page"
            />
          </div>
        ))}
      </Document>
    </div>
  );
}

function ActionIcon({ actionId }: { actionId: string }) {
  switch (actionId) {
    case 'explain':
      return <Lightbulb className="h-4 w-4 text-amber-500" />;
    case 'summarize':
      return <ListCollapse className="h-4 w-4 text-sky-500" />;
    case 'translate-zh':
      return <Languages className="h-4 w-4 text-emerald-500" />;
    default:
      return <Sparkles className="h-4 w-4 text-violet-500" />;
  }
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

  const containerRect = container.getBoundingClientRect()
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => ({
      top: rect.top - containerRect.top + container.scrollTop,
      left: rect.left - containerRect.left + container.scrollLeft,
      width: rect.width,
      height: rect.height,
    }))

  if (rects.length === 0) {
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
    bubbleTop,
    bubbleLeft,
    source: 'text-selection' as const,
  }
}

function extractParagraphAnchors(container: HTMLDivElement, contextCharBudget: number) {
  const pageElements = Array.from(container.querySelectorAll<HTMLElement>('[data-page-number]'));
  const anchorsByPage = pageElements
    .map((pageElement) => extractPageParagraphAnchors(container, pageElement, contextCharBudget))
    .filter((pageAnchors) => pageAnchors.length > 0);

  return anchorsByPage.flat();
}

function extractPageParagraphAnchors(
  container: HTMLDivElement,
  pageElement: HTMLElement,
  contextCharBudget: number,
) {
  const spanNodes = Array.from(pageElement.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span'));
  const pageRect = pageElement.getBoundingClientRect();
  const pageNumber = Number(pageElement.dataset.pageNumber ?? '1');
  const tokens = spanNodes
    .map((span) => {
      const text = normalizeWhitespace(span.textContent ?? '');
      const rect = span.getBoundingClientRect();
      const relativeLeft = rect.left - pageRect.left;
      const relativeRight = rect.right - pageRect.left;
      const relativeTop = rect.top - pageRect.top;
      const relativeBottom = rect.bottom - pageRect.top;

      if (
        !text ||
        rect.width < 2 ||
        rect.height < 2 ||
        rect.left < pageRect.left - 2 ||
        rect.right > pageRect.right + 2 ||
        rect.top < pageRect.top - 2 ||
        rect.bottom > pageRect.bottom + 2
      ) {
        return null;
      }

      return {
        text,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        height: rect.height,
        relativeLeft,
        relativeRight,
        relativeTop,
        relativeBottom,
      };
    })
    .filter((token): token is NonNullable<typeof token> => Boolean(token))
    .sort((left, right) => {
      if (Math.abs(left.top - right.top) > 3) {
        return left.top - right.top;
      }

      return left.left - right.left;
    });

  if (tokens.length === 0) {
    return [];
  }

  const medianHeight = getMedian(tokens.map((token) => token.height)) || 18;
  const lineThreshold = Math.max(4, medianHeight * 0.6);
  const paragraphThreshold = medianHeight * 1.05;
  const pageWidth = pageRect.width;
  const lines: Array<{
    text: string;
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    centerX: number;
    rect: SelectionRect;
    column: 'left' | 'right' | 'full';
  }> = [];
  const containerRect = container.getBoundingClientRect();

  for (const token of tokens) {
    const previousLine = lines[lines.length - 1];
    const horizontalGap = previousLine ? token.left - previousLine.right : 0;
    const shouldStartNewLine =
      !previousLine ||
      Math.abs(token.top - previousLine.top) > lineThreshold ||
      horizontalGap > Math.max(medianHeight * 3.4, pageWidth * 0.12);

    if (shouldStartNewLine) {
      const width = token.right - token.left;
      lines.push({
        text: token.text,
        top: token.top,
        bottom: token.bottom,
        left: token.left,
        right: token.right,
        width,
        centerX: (token.left + token.right) / 2,
        rect: toRelativeRect(token, containerRect, container),
        column: classifyColumn({
          left: token.relativeLeft,
          right: token.relativeRight,
          width,
          centerX: ((token.relativeLeft + token.relativeRight) / 2),
        }, pageWidth),
      });
      continue;
    }

    previousLine.text = normalizeWhitespace(`${previousLine.text} ${token.text}`);
    previousLine.left = Math.min(previousLine.left, token.left);
    previousLine.right = Math.max(previousLine.right, token.right);
    previousLine.bottom = Math.max(previousLine.bottom, token.bottom);
    previousLine.width = previousLine.right - previousLine.left;
    previousLine.centerX = (previousLine.left + previousLine.right) / 2;
    previousLine.rect = toRelativeRect(previousLine, containerRect, container);
    previousLine.column = classifyColumn({
      left: previousLine.left - pageRect.left,
      right: previousLine.right - pageRect.left,
      width: previousLine.width,
      centerX: previousLine.centerX - pageRect.left,
    }, pageWidth);
  }

  const paragraphs: Array<{
    pageNumber: number;
    text: string;
    rects: SelectionRect[];
    bubbleTop: number;
    bubbleLeft: number;
    column: 'left' | 'right' | 'full';
  }> = [];

  for (const line of lines) {
    const previousParagraph = paragraphs[paragraphs.length - 1];
    const gap = previousParagraph ? line.rect.top - getLastBottom(previousParagraph.rects) : Number.POSITIVE_INFINITY;
    const previousLineRect = previousParagraph?.rects[previousParagraph.rects.length - 1];
    const sharesColumn =
      previousLineRect &&
      horizontalOverlapRatio(previousLineRect, line.rect) > 0.28 &&
      Math.abs(previousLineRect.left - line.rect.left) < pageWidth * 0.16;
    const startsNewColumn =
      previousLineRect &&
      (previousParagraph.column !== line.column ||
        (Math.abs(previousLineRect.left - line.rect.left) > pageWidth * 0.2 &&
          horizontalOverlapRatio(previousLineRect, line.rect) < 0.12));
    const largeIndentShift =
      previousLineRect &&
      Math.abs(previousLineRect.left - line.rect.left) > pageWidth * 0.08 &&
      horizontalOverlapRatio(previousLineRect, line.rect) < 0.35;

    if (
      !previousParagraph ||
      gap > paragraphThreshold ||
      startsNewColumn ||
      (!sharesColumn && gap > medianHeight * 0.35) ||
      (largeIndentShift && gap > medianHeight * 0.2)
    ) {
      paragraphs.push({
        pageNumber,
        text: line.text,
        rects: [line.rect],
        bubbleTop: Math.max(8, line.rect.top - 52),
        bubbleLeft: Math.max(8, line.rect.left),
        column: line.column,
      });
      continue;
    }

    previousParagraph.text = normalizeWhitespace(`${previousParagraph.text} ${line.text}`);
    previousParagraph.rects.push(line.rect);
  }

  return paragraphs
    .map((paragraph, index, pageParagraphs) => {
      const contextBefore = collectParagraphContext(pageParagraphs, index, 'before', contextCharBudget);
      const contextAfter = collectParagraphContext(pageParagraphs, index, 'after', contextCharBudget);

      return {
        pageNumber: paragraph.pageNumber,
        selectedText: paragraph.text,
        contextBefore,
        contextAfter,
        rects: paragraph.rects,
        bubbleTop: paragraph.bubbleTop,
        bubbleLeft: paragraph.bubbleLeft,
        source: 'paragraph' as const,
        anchorId: `page-${paragraph.pageNumber}-paragraph-${index}`,
      };
    })
    .filter((paragraph) => isParagraphCandidate(paragraph, pageWidth));
}

function toRelativeRect(
  rectLike: { top: number; left: number; right: number; bottom: number },
  containerRect: DOMRect,
  container: HTMLDivElement,
): SelectionRect {
  return {
    top: rectLike.top - containerRect.top + container.scrollTop,
    left: rectLike.left - containerRect.left + container.scrollLeft,
    width: rectLike.right - rectLike.left,
    height: rectLike.bottom - rectLike.top,
  };
}

function getMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function getLastBottom(rects: SelectionRect[]) {
  return rects[rects.length - 1]?.top + rects[rects.length - 1]?.height;
}

function collectParagraphContext(
  paragraphs: Array<{ text: string }>,
  index: number,
  direction: 'before' | 'after',
  budget: number,
) {
  const texts: string[] = [];
  let used = 0;
  const step = direction === 'before' ? -1 : 1;
  let pointer = index + step;

  while (pointer >= 0 && pointer < paragraphs.length && used < budget) {
    const text = paragraphs[pointer].text;
    texts.push(text);
    used += text.length;
    pointer += step;
  }

  if (direction === 'before') {
    texts.reverse();
  }

  return normalizeWhitespace(texts.join(' ')).slice(0, budget);
}

function findAnchorAtPoint(
  event: React.MouseEvent<HTMLDivElement>,
  container: HTMLDivElement,
  anchors: PdfSelectionPayload[],
) {
  const containerRect = container.getBoundingClientRect();
  const pointX = event.clientX - containerRect.left + container.scrollLeft;
  const pointY = event.clientY - containerRect.top + container.scrollTop;

  return anchors.find((anchor) =>
    anchor.rects.some((rect) => pointIsInsideRect(pointX, pointY, rect, 4)),
  );
}

function horizontalOverlapRatio(leftRect: SelectionRect, rightRect: SelectionRect) {
  const overlap = Math.max(
    0,
    Math.min(leftRect.left + leftRect.width, rightRect.left + rightRect.width) - Math.max(leftRect.left, rightRect.left),
  );
  const smallerWidth = Math.max(1, Math.min(leftRect.width, rightRect.width));
  return overlap / smallerWidth;
}

function isParagraphCandidate(paragraph: PdfSelectionPayload, pageWidth: number) {
  const textLength = paragraph.selectedText.length;
  const lineCount = paragraph.rects.length;
  const widestLine = Math.max(...paragraph.rects.map((rect) => rect.width), 0);
  const averageLineWidth =
    paragraph.rects.reduce((sum, rect) => sum + rect.width, 0) / Math.max(1, paragraph.rects.length);
  const alphabeticChars = Array.from(paragraph.selectedText).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
  const alphaRatio = alphabeticChars / Math.max(1, textLength);

  if (lineCount >= 2 && textLength >= 24) {
    return true;
  }

  if (averageLineWidth < pageWidth * 0.18 && textLength < 42) {
    return false;
  }

  if (lineCount === 1 && averageLineWidth < pageWidth * 0.3 && textLength < 28) {
    return false;
  }

  if (alphaRatio < 0.55 && averageLineWidth < pageWidth * 0.4) {
    return false;
  }

  if (textLength >= 42 && widestLine > pageWidth * 0.3) {
    return true;
  }

  return textLength >= 18 && averageLineWidth > pageWidth * 0.42;
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

function pointIsInsideRect(x: number, y: number, rect: SelectionRect, padding: number) {
  return (
    x >= rect.left - padding &&
    x <= rect.left + rect.width + padding &&
    y >= rect.top - padding &&
    y <= rect.top + rect.height + padding
  );
}

function classifyColumn(
  line: { left: number; right: number; width: number; centerX: number },
  pageWidth: number,
): 'left' | 'right' | 'full' {
  const widthRatio = line.width / Math.max(1, pageWidth);
  const centerRatio = line.centerX / Math.max(1, pageWidth);
  const leftRatio = line.left / Math.max(1, pageWidth);
  const rightRatio = line.right / Math.max(1, pageWidth);

  if (widthRatio > 0.74 || (leftRatio < 0.18 && rightRatio > 0.82)) {
    return 'full';
  }

  if (centerRatio < 0.5) {
    return 'left';
  }

  return 'right';
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
