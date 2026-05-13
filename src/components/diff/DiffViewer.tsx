import { cn } from '../../utils/helpers';

interface DiffChange {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

interface DiffViewerProps {
  changes: DiffChange[];
  stats: { added: number; removed: number; unchanged: number };
}

export function DiffViewer({ changes, stats }: DiffViewerProps) {
  const total = stats.added + stats.removed + stats.unchanged;
  const hasChanges = stats.added > 0 || stats.removed > 0;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-green-400">+{stats.added} 新增</span>
        <span className="text-red-400">-{stats.removed} 删除</span>
        <span className="text-app-text-tertiary">{stats.unchanged} 未变</span>
        {hasChanges && (
          <span className="ml-auto text-app-text-tertiary">
            共 {total} 行，{stats.added + stats.removed} 处变更
          </span>
        )}
      </div>

      {/* Diff content */}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] font-mono text-[11px] leading-relaxed">
        {!hasChanges ? (
          <div className="p-4 text-center text-app-text-tertiary">两个版本内容相同</div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            {changes.map((change, i) => (
              <div
                key={i}
                className={cn(
                  'flex px-4 py-0.5',
                  change.type === 'insert' && 'bg-green-500/10 text-green-300',
                  change.type === 'delete' && 'bg-red-500/10 text-red-300',
                  change.type === 'equal' && 'text-app-text-secondary',
                )}
              >
                <span className="w-5 flex-shrink-0 text-app-text-tertiary select-none">
                  {change.type === 'insert' ? '+' : change.type === 'delete' ? '-' : ' '}
                </span>
                <span className="whitespace-pre-wrap break-all">{change.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
