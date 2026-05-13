import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { useUIStore } from '../../stores/useUIStore';
import { cn } from '../../utils/helpers';
import { generateStream } from '../../services/api';
import { Button } from '../ui/button';
import { Sparkles, Brain, FileText, CheckCircle2, AlertCircle, Clock, Coins, Edit3, RefreshCw } from 'lucide-react';

const statusConfig = {
  idle: {
    label: '等待输入',
    message: '输入主题并点击生成',
    dotColor: 'bg-gray-600',
    dotRing: false,
    icon: Sparkles,
    iconColor: 'text-app-text-tertiary',
  },
  generating: {
    label: '构思中',
    message: '正在构思内容...',
    dotColor: 'bg-yellow-400',
    dotRing: true,
    icon: Brain,
    iconColor: 'text-yellow-400',
  },
  streaming: {
    label: '生成中',
    message: '正在生成内容...',
    dotColor: 'bg-primary-500',
    dotRing: true,
    icon: FileText,
    iconColor: 'text-primary-400',
  },
  generated: {
    label: '已完成',
    message: '内容生成完成',
    dotColor: 'bg-green-500',
    dotRing: false,
    icon: CheckCircle2,
    iconColor: 'text-green-400',
  },
  error: {
    label: '出错',
    message: '生成出错',
    dotColor: 'bg-red-500',
    dotRing: false,
    icon: AlertCircle,
    iconColor: 'text-red-400',
  },
  editing: {
    label: '编辑中',
    message: '正在编辑...',
    dotColor: 'bg-blue-500',
    dotRing: false,
    icon: Sparkles,
    iconColor: 'text-blue-400',
  },
};

const statusSteps = [
  { key: 'idle', label: '等待' },
  { key: 'generating', label: '构思' },
  { key: 'streaming', label: '生成' },
  { key: 'generated', label: '完成' },
];

function getActiveStepIndex(status: string): number {
  switch (status) {
    case 'idle': return 0;
    case 'generating': return 1;
    case 'streaming': return 2;
    case 'generated': case 'editing': return 3;
    case 'error': return -1;
    default: return 0;
  }
}

export function AIStatusPanel() {
  const { status, error, metadata } = useGeneratorStore();
  const { showToast } = useUIStore();

  const activeStep = getActiveStepIndex(status);
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;
  const StatusIcon = config.icon;

  const handleRegenerate = async () => {
    const state = useGeneratorStore.getState();
    const { topic, platform_code, parameters } = state.draft;

    state.setStatus('generating');

    let accumulatedMd = '';
    try {
      await generateStream(
        { topic, platform_code, parameters },
        {
          onToken: (token) => {
            accumulatedMd += token;
            state.setStreamingContent(accumulatedMd, accumulatedMd.replace(/\n/g, '<br>'));
          },
          onTitle: () => {},
          onDone: (result) => {
            state.setGeneratedContent({
              id: result.content_id,
              title: result.title,
              content_md: accumulatedMd,
              content_html: accumulatedMd.replace(/\n/g, '<br>'),
              metadata: result.metadata,
            });
            showToast('内容已重新生成', 'success');
          },
          onError: (message) => {
            state.setError(message);
            showToast(message, 'error');
          },
        },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '网络错误，请重试';
      state.setError(msg);
      state.setStatus('error');
      showToast(msg, 'error');
    }
  };

  const handleModifyTopic = () => {
    const state = useGeneratorStore.getState();
    const topic = state.draft.topic;
    const params = state.draft.parameters;
    const platform = state.draft.platform_code;
    state.reset();
    state.setTopic(topic);
    state.setParameters(params);
    state.setPlatformCode(platform);
    showToast('已返回修改主题', 'info');
  };

  const showActions = status === 'generated' || status === 'error';

  return (
    <div className="glass-card flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2.5">
        <div className="relative flex-shrink-0">
          <div className={cn('w-2.5 h-2.5 rounded-full', config.dotColor)} />
          {config.dotRing && (
            <div className={cn('absolute -inset-1 rounded-full animate-ping opacity-40', config.dotColor.replace('bg-', 'bg-').replace('500', '400/30'))} />
          )}
        </div>
        <span className="text-xs font-semibold text-app-text">Agent 状态</span>
        <AnimatePresence>
          {status === 'generated' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="ml-auto"
            >
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-600/20 text-green-400">完成</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">当前状态</span>
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5"
            >
              <div className={cn('w-7 h-7 rounded-lg bg-app-surface flex items-center justify-center', config.iconColor)}>
                <StatusIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-medium text-app-text">{config.label}</div>
                <div className="text-[10px] text-app-text-tertiary">{config.message}</div>
              </div>
            </motion.div>
          </AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-[10px] text-red-400 bg-red-500/10 rounded-lg px-2 py-1.5"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Progress steps */}
        <div className="space-y-2">
          <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">进度</span>
          <div className="flex items-center gap-1.5">
            {statusSteps.map((step, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="relative w-full h-1 rounded-full overflow-hidden bg-gray-900">
                    <motion.div
                      className={cn(
                        'absolute inset-0 rounded-full',
                        isDone ? 'bg-gradient-primary' : isActive ? 'bg-primary-500/50' : ''
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: isDone || isActive ? '100%' : '0%' }}
                      transition={{ duration: 0.4 }}
                    />
                    {isActive && (
                      <div className="absolute inset-0 rounded-full bg-primary-500/50 animate-pulse" />
                    )}
                  </div>
                  <span className={cn(
                    'text-[8px] font-medium',
                    isDone ? 'text-primary-400' : isActive ? 'text-app-text' : 'text-app-text-tertiary'
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metadata */}
        <AnimatePresence>
          {metadata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">统计</span>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="bg-app-surface rounded-lg px-2.5 py-2 border border-app-border/50">
                  <div className="flex items-center gap-1 text-[9px] text-app-text-tertiary mb-0.5">
                    <Coins className="w-2.5 h-2.5" />
                    Token
                  </div>
                  <motion.div
                    className="text-[11px] text-app-text font-mono font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {metadata.tokens_used}
                  </motion.div>
                </div>
                <div className="bg-app-surface rounded-lg px-2.5 py-2 border border-app-border/50">
                  <div className="flex items-center gap-1 text-[9px] text-app-text-tertiary mb-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    耗时
                  </div>
                  <motion.div
                    className="text-[11px] text-app-text font-mono font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {(metadata.generation_time_ms / 1000).toFixed(1)}s
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-2 pt-2 border-t border-white/[0.04]"
            >
              <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">操作</span>
              <div className="flex gap-2">
                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[10px] gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {status === 'error' ? '重试' : '重新生成'}
                </Button>
                <Button
                  onClick={handleModifyTopic}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[10px] gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  修改主题
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
