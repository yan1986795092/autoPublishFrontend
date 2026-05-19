import { useState, useMemo } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
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
import { GripVertical, X, Play, ArrowDown } from 'lucide-react';
import type { ExecutionPlan, AgentTask } from '../../types';
import { getAgentIcon, getAgentLabel } from '../../config/agents';

/** Recalculate dependency indices after reorder by matching task IDs */
function recalcDeps(tasks: (AgentTask & { _id: string })[]): AgentTask[] {
  return tasks.map((t) => {
    if (t.dependencies.length === 0) return { ...t, _skipped: undefined, _id: undefined };
    // Map each dependency index to its new position by matching task IDs
    const newDeps = t.dependencies
      .map((depIdx) => tasks[depIdx]?._id)
      .filter(Boolean)
      .map((depId) => tasks.findIndex((ot) => ot._id === depId))
      .filter((idx) => idx >= 0);
    return { ...t, dependencies: newDeps, _skipped: undefined, _id: undefined };
  }) as AgentTask[];
}

interface SortableTaskProps {
  task: AgentTask & { _skipped?: boolean; _id?: string };
  index: number;
  total: number;
  dependencies: number[][]; // all links [from, to]
  onToggle: (index: number) => void;
}

function SortableTask({ task, index, total, dependencies, onToggle }: SortableTaskProps) {
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

  // Compute which tasks depend on this one (incoming arrows)
  const dependedBy = useMemo(
    () => dependencies.filter(([from]) => from === index).map(([, to]) => to),
    [dependencies, index]
  );

  return (
    <div className="relative">
      {/* Dependency arrow lines */}
      {task.dependencies.length > 0 && (
        <div className="absolute -top-2 left-8 flex items-center gap-1">
          {task.dependencies.map((depIdx) => (
            <span
              key={depIdx}
              className="text-[9px] text-cyan-400/60 bg-cyan-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
              title={`依赖步骤 #${depIdx + 1}`}
            >
              <ArrowDown className="w-2.5 h-2.5 rotate-180" />
              #{depIdx + 1}
            </span>
          ))}
        </div>
      )}

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
        <span className="text-lg">{getAgentIcon(task.agent_type)}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', skipped ? 'text-app-text-tertiary line-through' : 'text-app-text')}>
            {getAgentLabel(task.agent_type)}
          </p>
          {(task as any).reasoning && (
            <p className="text-xs text-app-text-secondary truncate">{(task as any).reasoning}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {task.dependencies.length > 0 && (
            <span className="text-[10px] text-cyan-400/80 border border-cyan-500/20 rounded px-1.5 py-0.5">
              依赖 #{task.dependencies.map(d => d + 1).join(', #')}
            </span>
          )}
          {dependedBy.length > 0 && (
            <span className="text-[10px] text-orange-400/60 border border-orange-500/20 rounded px-1.5 py-0.5">
              被 #{dependedBy.map(d => d + 1).join(', #')} 依赖
            </span>
          )}
        </div>

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
    (plan?.tasks ?? []).map((t, i) => ({ ...t, _skipped: false, _id: t.id || `task-${i}` }))
  );

  // Compute dependency links: [fromIndex, toIndex][] where 'to' depends on 'from'
  const dependencyLinks = useMemo(() => {
    const links: number[][] = [];
    localTasks.forEach((task, toIdx) => {
      task.dependencies.forEach((fromIdx) => {
        if (fromIdx >= 0 && fromIdx < localTasks.length && fromIdx !== toIdx) {
          links.push([fromIdx, toIdx]);
        }
      });
    });
    return links;
  }, [localTasks]);

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
  // Recalculate dependencies when confirming, to fix stale indices after drag
  const finalTasks = recalcDeps(localTasks.filter(t => !t._skipped));

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
            <span className="text-app-text-tertiary">目标:</span> {plan?.goal}
          </p>
        </div>

        <div className="max-h-[400px] overflow-auto p-4 space-y-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
              {localTasks.map((task, index) => (
                <SortableTask
                  key={task._id}
                  task={task}
                  index={index}
                  total={localTasks.length}
                  dependencies={dependencyLinks}
                  onToggle={handleToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-app-border bg-app-surface/50">
          <div className="text-xs text-app-text-tertiary">
            {skippedCount > 0 && <span className="text-yellow-400">将跳过 {skippedCount} 个步骤</span>}
            <span className="ml-2">共 {finalTasks.length} 个步骤执行</span>
            {dependencyLinks.length > 0 && (
              <span className="ml-2 text-cyan-400/60">· {dependencyLinks.length} 个依赖</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>取消</Button>
            <Button
              size="sm"
              onClick={() => onConfirm({ ...plan, tasks: finalTasks })}
              disabled={finalTasks.length === 0}
            >
              <Play className="w-4 h-4 mr-1" /> 开始执行
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
