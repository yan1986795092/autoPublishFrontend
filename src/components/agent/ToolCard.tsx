import { useState } from 'react';
import { cn } from '../../utils/helpers';
import type { StreamToolUse } from '../../types';
import { Wrench, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';

interface ToolCardProps {
  tool: StreamToolUse;
  status: 'calling' | 'result';
  className?: string;
}

export function ToolCard({ tool, status, className }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'rounded-lg border p-3 my-2',
      status === 'calling'
        ? 'border-cyan-500/30 bg-cyan-500/5'
        : 'border-green-500/30 bg-green-500/5',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className={cn(
            'w-3.5 h-3.5',
            status === 'calling' ? 'text-cyan-400' : 'text-green-400'
          )} />
          <span className={cn(
            'text-xs font-medium',
            status === 'calling' ? 'text-cyan-400' : 'text-green-400'
          )}>
            {tool.name}
          </span>
          {status === 'calling' && (
            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          )}
          {status === 'result' && (
            <CheckCircle2 className="w-3 h-3 text-green-400" />
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-app-text-tertiary hover:text-app-text-secondary"
        >
          <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          <div className="rounded bg-black/20 p-2">
            <p className="text-[9px] text-app-text-tertiary uppercase mb-1">输入</p>
            <pre className="text-[10px] text-app-text-secondary font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.output && (
            <div className="rounded bg-black/20 p-2">
              <p className="text-[9px] text-app-text-tertiary uppercase mb-1">输出</p>
              <pre className="text-[10px] text-app-text-secondary font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(tool.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
