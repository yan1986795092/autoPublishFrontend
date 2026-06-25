import { useMemo } from 'react';
import { cn } from '../../../utils/helpers';

interface DiffLine {
  type: string;
  text: string;
}

interface DiffViewProps {
  lines: DiffLine[];
  version1?: string | number;
  version2?: string | number;
  loading?: boolean;
}

interface RenderedLine {
  type: 'equal' | 'insert' | 'delete';
  content: string;
  oldNum: number;
  newNum: number;
}

type DiffType = 'equal' | 'insert' | 'delete';

function normalizeType(type: string): DiffType {
  if (type === 'add') return 'insert';
  if (type === 'equal' || type === 'insert' || type === 'delete') return type;
  return 'equal';
}

/** 把 ndiff 行转换为带行号的渲染行 */
function buildLines(lines: DiffLine[]): RenderedLine[] {
  const result: RenderedLine[] = [];
  let oldNum = 0;
  let newNum = 0;
  for (const line of lines) {
    const type = normalizeType(line.type);
    if (type === 'equal') {
      oldNum++; newNum++;
      result.push({ type: 'equal', content: line.text, oldNum, newNum });
    } else if (type === 'delete') {
      oldNum++;
      result.push({ type: 'delete', content: line.text, oldNum, newNum: newNum + 1 });
    } else if (type === 'insert') {
      newNum++;
      result.push({ type: 'insert', content: line.text, oldNum: oldNum + 1, newNum });
    }
  }
  return result;
}

export function DiffView({ lines, version1, version2, loading }: DiffViewProps) {
  const renderedLines = useMemo(() => buildLines(lines), [lines]);

  const stats = useMemo(() => {
    let adds = 0, dels = 0;
    for (const l of renderedLines) {
      if (l.type === 'insert') adds++;
      if (l.type === 'delete') dels++;
    }
    return { adds, dels };
  }, [renderedLines]);

  if (loading) {
    return <p className="text-xs text-app-text-tertiary p-3">加载差异中...</p>;
  }

  if (!lines.length) return null;

  return (
    <div className="rounded-lg border border-app-border overflow-hidden text-[11px] font-mono leading-5">
      {/* Header: diff stat */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-app-surface/50 border-b border-app-border/50 text-[10px]">
        {version1 !== undefined && version2 !== undefined && (
          <span className="text-app-text-tertiary">
            v{version1} → v{version2}
          </span>
        )}
        <span className="text-green-400 font-medium">+{stats.adds}</span>
        <span className="text-red-400 font-medium">-{stats.dels}</span>
        <span className="text-app-text-tertiary/50 ml-auto">{renderedLines.length} 行</span>
      </div>

      {/* Diff body — unified view with edge gutter */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        {renderedLines.map((line, i) => (
          <div
            key={i}
            className={cn(
              'flex items-stretch',
              line.type === 'delete' && 'bg-red-500/[0.07]',
              line.type === 'insert' && 'bg-green-500/[0.07]',
            )}
          >
            {/* Edge gutter (3px colored bar) */}
            <div
              className={cn(
                'w-[3px] shrink-0',
                line.type === 'delete' && 'bg-red-400',
                line.type === 'insert' && 'bg-green-400',
                line.type === 'equal' && 'bg-transparent',
              )}
            />
            {/* Line numbers */}
            <div className="flex shrink-0 border-r border-app-border/30 select-none">
              <span
                className={cn(
                  'inline-block w-[40px] text-right pr-2 tabular-nums',
                  line.type === 'delete' ? 'text-red-400/60' : 'text-app-text-tertiary/40',
                  line.type === 'equal' && 'text-app-text-tertiary/30',
                )}
              >
                {line.type !== 'insert' ? line.oldNum : ''}
              </span>
              <span
                className={cn(
                  'inline-block w-[40px] text-right pr-2 tabular-nums',
                  line.type === 'insert' ? 'text-green-400/60' : 'text-app-text-tertiary/40',
                  line.type === 'equal' && 'text-app-text-tertiary/30',
                )}
              >
                {line.type !== 'delete' ? line.newNum : ''}
              </span>
            </div>
            {/* Prefix + content */}
            <div
              className={cn(
                'flex items-center flex-1 min-w-0 px-1',
                line.type === 'delete' && 'bg-red-500/[0.07] text-red-300',
                line.type === 'insert' && 'bg-green-500/[0.07] text-green-300',
                line.type === 'equal' && 'text-app-text-secondary',
              )}
            >
              <span className="w-4 shrink-0 select-none text-center">
                {line.type === 'delete' ? '−' : line.type === 'insert' ? '+' : ' '}
              </span>
              <span className="whitespace-pre-wrap break-all">{line.content}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
