import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../ui/button';
import { cn } from '../../utils/helpers';
import { GripVertical, X, Play } from 'lucide-react';
import type { ExecutionPlan, AgentTask } from '../../types';

const AGENT_ICONS: Record<string, string> = {
  WritingAgent: '✍️',
  SEOAgent: '🔍',
  DiagramAgent: '📊',
  ReviewAgent: '✅',
  WebSearch: '🌐',
  ImageAgent: '🎨',
  CodeAgent: '💻',
  HotTopicAgent: '🔥',
  PlatformAdapter: '📱',
  ManagerAgent: '🧠',
};

const AGENT_LABELS: Record<string, string> = {
  WritingAgent: '写作',
  SEOAgent: 'SEO优化',
  DiagramAgent: '图表',
  ReviewAgent: '审核',
  WebSearch: '搜索',
  ImageAgent: '配图',
  CodeAgent: '代码',
  HotTopicAgent: '热点',
  PlatformAdapter: '平台适配',
  ManagerAgent: '规划',
};

interface SortableTaskProps {
  task: AgentTask & { _skipped?: boolean; _id?: string };
  index: number;
  onToggle: (index: number) => void;
}

function SortableTask({ task, index, onToggle }: SortableTaskProps) {
  const id = (task as any)._id || task.id || String(index);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const skipped = (task as any)._skipped;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-colors',
        skipped
          ? 'border-app-border/30 bg-app-surface/30'
          : 'border-app-border bg-app-elevated hover:border-blue-500/30'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-app-text-tertiary hover:text-app-text-secondary"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="text-xs text-app-text-tertiary w-5">{index + 1}</span>
      <span className="text-lg">{AGENT_ICONS[task.agent_type] || '🤖'}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', skipped ? 'text-app-text-tertiary line-through' : 'text-app-text')}>
          {AGENT_LABELS[task.agent_type] || task.agent_type}
        </p>
        {(task as any).reasoning && (
          <p className="text-xs text-app-text-secondary truncate">{(task as any).reasoning}</p>
        )}
      </div>

      {task.dependencies.length > 0 && (
        <span className="text-[10px] text-app-text-tertiary border border-app-border rounded px-1.5 py-0.5">
          依赖 #{task.dependencies.map(d => (typeof d === 'number' ? d + 1 : d)).join(', #')}
        </span>
      )}

      <button
        onClick={() => onToggle(index)}
        className={cn(
          'text-[10px] px-2 py-1 rounded border transition-colors',
          skipped
            ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10'
            : 'border-green-500/30 text-green-400 bg-green-500/10'
        )}
      >
        {skipped ? '已跳过' : '启用'}
      </button>
    </div>
  );
}

interface ExecutionPlanEditorProps {
  plan: ExecutionPlan;
  open: boolean;
  onConfirm: (plan: ExecutionPlan) => void;
  onCancel: () => void;
}

export function ExecutionPlanEditor({ plan, open, onConfirm, onCancel }: ExecutionPlanEditorProps) {
  const [localTasks, setLocalTasks] = useState<(AgentTask & { _skipped: boolean; _id: string })[]>(() =>
    plan.tasks.map((t, i) => ({ ...t, _skipped: false, _id: t.id || `task-${i}` }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalTasks((items) => {
        const oldIndex = items.findIndex((t) => t._id === active.id);
        const newIndex = items.findIndex((t) => t._id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggle = (index: number) => {
    setLocalTasks((tasks) =>
      tasks.map((t, i) => (i === index ? { ...t, _skipped: !t._skipped } : t))
    );
  };

  const skippedCount = localTasks.filter(t => t._skipped).length;
  const activeTasks = localTasks.filter(t => !t._skipped);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-2xl rounded-2xl border border-app-border bg-app-elevated shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
          <div>
            <h2 className="text-base font-semibold text-app-text">执行计划 — 可拖拽调整</h2>
            <p className="text-xs text-app-text-secondary mt-0.5">拖拽调整顺序，点击按钮跳过不需要的步骤</p>
          </div>
          <button onClick={onCancel} className="text-app-text-tertiary hover:text-app-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 bg-app-surface/50 border-b border-app-border">
          <p className="text-xs text-app-text-secondary">
            <span className="text-app-text-tertiary">目标:</span> {plan.goal}
          </p>
        </div>

        <div className="max-h-[400px] overflow-auto p-4 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {localTasks.map((task, index) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  index={index}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-app-border bg-app-surface/50">
          <div className="text-xs text-app-text-tertiary">
            {skippedCount > 0 && <span className="text-yellow-400">将跳过 {skippedCount} 个步骤</span>}
            <span className="ml-2">共 {activeTasks.length} 个步骤执行</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
            <Button
              size="sm"
              onClick={() => onConfirm({ ...plan, tasks: activeTasks })}
              disabled={activeTasks.length === 0}
            >
              <Play className="w-4 h-4 mr-1" /> 开始执行
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
