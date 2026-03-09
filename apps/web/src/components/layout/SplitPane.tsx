import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}

const minLeftWidth = 360;
const minRightWidth = 340;
const defaultRightWidth = 430;
const collapsedRightWidth = 44;

export function SplitPane({ left, right, className }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const lastExpandedWidthRef = useRef(defaultRightWidth);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const container = containerRef.current;
      if (!container || isCollapsed) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const maxRightWidth = Math.max(minRightWidth, rect.width - minLeftWidth);
      const nextWidth = rect.right - event.clientX;
      const clampedWidth = Math.max(minRightWidth, Math.min(maxRightWidth, nextWidth));
      lastExpandedWidthRef.current = clampedWidth;
      setRightWidth(clampedWidth);
    }

    function handlePointerUp() {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isCollapsed, isDragging]);

  function toggleCollapsed() {
    if (isCollapsed) {
      setIsCollapsed(false);
      setRightWidth(lastExpandedWidthRef.current);
      return;
    }

    lastExpandedWidthRef.current = rightWidth;
    setIsCollapsed(true);
  }

  return (
    <div
      ref={containerRef}
      className={cn('flex h-[calc(100vh-48px)] w-full overflow-hidden bg-slate-100', className)}
    >
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden border-r border-slate-200 bg-white">
        {left}
      </div>

      <div
        className={cn(
          'group relative shrink-0 bg-transparent transition-[width] duration-200',
          isCollapsed ? 'w-4' : 'w-4',
        )}
      >
        <button
          type="button"
          onMouseDown={(event) => {
            if (isCollapsed) {
              return;
            }

            event.preventDefault();
            setIsDragging(true);
          }}
          className={cn(
            'absolute inset-y-0 left-1/2 z-20 w-4 -translate-x-1/2 cursor-col-resize',
            isCollapsed && 'cursor-default',
          )}
          aria-label="调整左右面板宽度"
        >
          <span
            className={cn(
              'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition group-hover:bg-blue-300',
              isDragging && 'bg-blue-400',
            )}
          />
          <span
            className={cn(
              'absolute left-1/2 top-1/2 flex h-12 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition',
              isCollapsed ? 'opacity-0' : 'opacity-100 group-hover:text-slate-600',
              isDragging && 'border-blue-300 text-blue-500',
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <ChevronRight className="-ml-1 h-3.5 w-3.5" />
          </span>
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          className="absolute left-1/2 top-5 z-30 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          aria-label={isCollapsed ? '展开右侧面板' : '收起右侧面板'}
          title={isCollapsed ? '展开右侧面板' : '收起右侧面板'}
        >
          {isCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
        </button>
      </div>

      <div
        style={{ width: isCollapsed ? collapsedRightWidth : rightWidth }}
        className="relative shrink-0 overflow-hidden border-l border-slate-200 bg-slate-50 shadow-inner transition-[width] duration-200"
      >
        {isCollapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-full w-full flex-col items-center justify-start gap-3 bg-slate-50 px-2 pt-16 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="展开论文助手"
          >
            <PanelRightOpen className="h-4 w-4" />
            <span className="[writing-mode:vertical-rl] text-xs font-semibold tracking-[0.2em]">
              助手
            </span>
          </button>
        ) : (
          <div className="h-full min-w-0">{right}</div>
        )}
      </div>
    </div>
  );
}
