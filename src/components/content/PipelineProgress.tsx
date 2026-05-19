import { cn } from '../../utils/helpers';
import type { Content } from '../../types';

interface PipelineStage {
  key: string;
  label: string;
}

const STAGES: PipelineStage[] = [
  { key: 'generating', label: '生成' },
  { key: 'draft', label: '草稿' },
  { key: 'reviewing', label: '审核' },
  { key: 'ready', label: '待发布' },
  { key: 'published', label: '已发布' },
];

const STATUS_STAGE_MAP: Record<string, number> = {
  generating: 0,
  draft: 1,
  reviewing: 2,
  ready: 3,
  published: 4,
  archived: -1,
};

export function PipelineProgress({ status }: { status: Content['status'] | string }) {
  const currentIdx = STATUS_STAGE_MAP[status] ?? 0;
  const isArchived = status === 'archived';

  if (isArchived) {
    return (
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center">
            <div className={cn('w-2 h-2 rounded-full bg-app-border')} />
            {i < STAGES.length - 1 && <div className="w-4 h-0.5 bg-app-border" />}
          </div>
        ))}
        <span className="text-[10px] text-app-text-tertiary ml-1">已归档</span>
      </div>
    );
  }

  if (currentIdx < 0 || currentIdx >= STAGES.length) {
    return <span className="text-[10px] text-app-text-tertiary">{status}</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => (
        <div key={stage.key} className="flex items-center">
          <div className={cn(
            'w-2 h-2 rounded-full',
            i <= currentIdx ? 'bg-primary-500' : 'bg-app-border'
          )} />
          {i < STAGES.length - 1 && (
            <div className={cn('w-4 h-0.5', i < currentIdx ? 'bg-primary-500/50' : 'bg-app-border')} />
          )}
        </div>
      ))}
      <span className="text-[10px] text-app-text-tertiary ml-1">{STAGES[currentIdx]?.label}</span>
    </div>
  );
}
