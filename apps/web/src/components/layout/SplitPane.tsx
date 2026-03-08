import React from 'react';
import { cn } from '../../lib/utils';

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}

export function SplitPane({ left, right, className }: SplitPaneProps) {
  return (
    <div className={cn("flex w-full h-[calc(100vh-48px)] overflow-hidden bg-slate-100", className)}>
      <div className="flex-1 w-1/2 min-w-[300px] border-r border-slate-200 overflow-y-auto bg-white flex flex-col relative">
        {left}
      </div>
      <div className="flex-1 min-w-[300px] max-w-[500px] xl:max-w-[600px] bg-slate-50 flex flex-col shadow-inner overflow-hidden relative">
        {right}
      </div>
    </div>
  );
}
