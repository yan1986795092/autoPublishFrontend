import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../utils/helpers';
import type { AgentResult } from '../../types';

interface AgentDebugViewProps {
  result?: AgentResult | null;
  className?: string;
}

export function AgentDebugView({ result, className }: AgentDebugViewProps) {
  const [tab, setTab] = useState<'trace' | 'prompt' | 'raw'>('trace');

  if (!result) {
    return (
      <Card variant="glass" className={cn('w-full', className)}>
        <CardContent className="p-4">
          <p className="text-center text-xs text-app-text-secondary">
            运行 Agent 任务后查看调试信息
          </p>
        </CardContent>
      </Card>
    );
  }

  const trace = result.thinking_trace;
  const steps = trace?.steps || [];

  return (
    <Card variant="glass" className={cn('w-full', className)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs">
            <span>🔧 Agent 调试视图</span>
            <span className="rounded bg-app-surface px-1.5 py-0.5 text-[10px] font-mono text-app-text-secondary">
              v2.0
            </span>
          </CardTitle>
          <div className="flex gap-1 rounded-md bg-app-surface p-0.5">
            {(['trace', 'prompt', 'raw'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                  tab === t ? 'bg-app-elevated text-app-text shadow-sm' : 'text-app-text-secondary hover:text-app-text'
                )}
              >
                {t === 'trace' ? '追踪' : t === 'prompt' ? '提示词' : '原始 JSON'}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {tab === 'trace' && (
          <div className="space-y-1">
            {/* 执行时间线 */}
            <div className="mb-3 flex items-center gap-2 text-[10px] text-app-text-secondary">
              <span>总步骤: {steps.length}</span>
              <span>|</span>
              <span>总耗时: {trace?.total_elapsed?.toFixed(1) || '?'}s</span>
              <span>|</span>
              <span>Token 数: {result.usage?.tokens_used || 0}</span>
              <span>|</span>
              <span>模型: {result.usage?.model || '未知'}</span>
            </div>

            {/* 火焰图风格的时间线 */}
            {steps.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-app-border/50">
                {/* 时间线头部 */}
                <div className="grid grid-cols-[80px_1fr_60px] gap-2 border-b border-app-border/50 bg-app-surface px-3 py-1.5 text-[10px] font-medium text-app-text-secondary">
                  <span>Agent</span>
                  <span>操作</span>
                  <span className="text-right">耗时</span>
                </div>
                {/* 时间线行 */}
                {steps.map((step, i) => (
                  <div
                    key={`${step.step_number ?? step.agent}-${i}`}
                    className={cn(
                      'grid grid-cols-[80px_1fr_60px] gap-2 px-3 py-2 text-[10px]',
                      i % 2 === 0 ? 'bg-app-elevated/30' : '',
                      step.status === 'failed' ? 'bg-red-500/5' : ''
                    )}
                  >
                    <span className="truncate font-medium text-app-text">{step.agent}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full',
                        step.status === 'done' ? 'bg-green-500' :
                        step.status === 'failed' ? 'bg-red-500' : 'bg-blue-500 animate-pulse'
                      )} />
                      <span className="truncate text-app-text-secondary">{step.action}</span>
                    </div>
                    <span className="text-right text-app-text-secondary font-mono">
                      {step.time_elapsed > 0 ? `${step.time_elapsed.toFixed(1)}s` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Token 分布 */}
            {steps.some(s => s.tokens_used > 0) && (
              <div className="mt-2">
                <div className="mb-1 text-[10px] font-medium text-app-text-secondary">Token 分布</div>
                <div className="flex h-3 overflow-hidden rounded-full bg-app-surface">
                  {(() => {
                    const total = steps.reduce((sum, s) => sum + s.tokens_used, 0) || 1;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                    return steps.filter(s => s.tokens_used > 0).map((step, idx, arr) => {
                      const prevCount = arr.slice(0, idx).filter(s => s.tokens_used > 0).length;
                      return (
                        <div
                          key={`${step.agent}-${step.step_number ?? idx}`}
                          className={cn(colors[prevCount % colors.length], 'h-full transition-all')}
                          style={{ width: `${(step.tokens_used / total) * 100}%` }}
                          title={`${step.agent}: ${step.tokens_used} token`}
                        />
                      );
                    });
                  })()}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  {steps.filter(s => s.tokens_used > 0).map((step, idx, arr) => {
                    const prevCount = arr.slice(0, idx).filter(s => s.tokens_used > 0).length;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                    return (
                      <div key={`${step.agent}-${step.step_number ?? idx}`} className="flex items-center gap-1 text-[9px] text-app-text-secondary">
                        <span className={cn('inline-block h-2 w-2 rounded-full', colors[prevCount % colors.length])} />
                        {step.agent}: {step.tokens_used}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 错误高亮 */}
            {result.error && (
              <div className="mt-2 rounded-lg bg-red-500/10 p-2 text-[10px] text-red-400">
                ❌ {result.error}
              </div>
            )}
          </div>
        )}

        {tab === 'prompt' && (
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={`${step.step_number ?? step.agent}-${step.action}-${i}`} className="rounded-lg border border-app-border/50 p-2">
                <div className="mb-1 text-[10px] font-medium text-app-text">
                  #{i} {step.agent} → {step.action}
                </div>
                {step.reasoning && (
                  <div className="mb-1 text-[10px] text-app-text-secondary">
                    <span className="text-blue-400">推理过程:</span> {step.reasoning}
                  </div>
                )}
                {step.output_summary && (
                  <div className="text-[10px] text-app-text-secondary">
                    <span className="text-green-400">输出摘要:</span> {step.output_summary}
                  </div>
                )}
                {step.prompt_used && (
                  <div className="mt-1 space-y-1">
                    <div className="text-[10px] text-blue-400 font-medium">系统提示词:</div>
                    <pre className="overflow-auto rounded bg-app-surface p-2 text-[9px] text-app-text-secondary max-h-20">
                      {step.prompt_used.split('\n\n')[0]}
                    </pre>
                    <div className="text-[10px] text-green-400 font-medium">用户提示词:</div>
                    <pre className="overflow-auto rounded bg-app-surface p-2 text-[9px] text-app-text-secondary max-h-20">
                      {step.prompt_used.split('\n\n').slice(1).join('\n\n')}
                    </pre>
                  </div>
                )}
                {step.response_used && (
                  <div className="mt-1">
                    <div className="text-[10px] text-green-400 font-medium">响应:</div>
                    <pre className="overflow-auto rounded bg-app-surface p-2 text-[9px] text-app-text-secondary max-h-20">
                      {step.response_used}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'raw' && (
          <pre className="overflow-auto rounded-lg bg-app-surface p-3 text-[10px] leading-relaxed text-app-text-secondary">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
