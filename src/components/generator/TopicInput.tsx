import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/button';
import { Sparkles, Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { contentsApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../ui/dialog';

const exampleTopics = [
  '如何高效学习编程？',
  '2024年科技趋势预测',
  '一周健康食谱推荐',
];

export function TopicInput() {
  const {
    status,
    draft,
    setTopic,
    setPlatformCode,
    setParameters,
    setGeneratedContent,
    setError,
    reset,
  } = useGeneratorStore();
  const { showToast, topicDialogOpen, closeTopicDialog } = useUIStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (topicDialogOpen) {
      const timer = setInterval(() => {
        setExampleIndex((i) => (i + 1) % exampleTopics.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [topicDialogOpen]);

  const handleGenerate = async () => {
    if (!draft.topic.trim()) {
      setError('请输入内容主题');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await contentsApi.generate({
        topic: draft.topic,
        platform_code: draft.platform_code,
        parameters: draft.parameters,
      });

      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setGeneratedContent({
          id: data.content_id,
          title: data.title,
          content_md: data.content_md,
          content_html: data.content_html,
          metadata: data.metadata,
        });
        showToast('内容生成成功', 'success');
        closeTopicDialog();
      } else {
        setError(res.data.error?.message || '生成失败');
        showToast(res.data.error?.message || '生成失败', 'error');
      }
    } catch (err: unknown) {
      let msg = '网络错误，请重试';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
        msg = axiosErr.response?.data?.error?.message || msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    reset();
    showToast('已重置', 'info');
  };

  const isLoading = isGenerating || status === 'generating' || status === 'streaming';

  const platforms = [
    { code: 'xiaohongshu', name: '小红书', emoji: '🎨', desc: '生活分享、知识干货', gradient: 'from-pink-500 to-rose-500' },
    { code: 'wechat', name: '公众号', emoji: '📱', desc: '深度文章、品牌内容', gradient: 'from-green-500 to-emerald-500' },
  ];

  const charCount = draft.topic.length;
  const charColor = charCount > 500 ? 'text-red-400' : charCount > 300 ? 'text-amber-400' : 'text-app-text-tertiary';

  return (
    <Dialog open={topicDialogOpen} onOpenChange={(open) => !open && closeTopicDialog()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative overflow-hidden">
          {/* Glass highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Header */}
          <div className="px-5 pt-5 pb-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-app-text m-0">AI 内容创作</DialogTitle>
              <p className="text-[10px] text-app-text-tertiary mt-0.5">输入主题，一键生成优质内容</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Topic */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">创作主题</span>
                <span className={cn('text-[9px] font-medium', charColor)}>{charCount} 字</span>
              </div>
              <div className="relative">
                <textarea
                  ref={inputRef as any}
                  placeholder=""
                  value={draft.topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-app-border bg-app-surface text-xs text-app-text placeholder:text-app-text-tertiary p-3 leading-relaxed focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)] transition-all disabled:opacity-50"
                />
                {!draft.topic && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={exampleIndex}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute top-3 left-3 text-xs text-app-text-tertiary pointer-events-none"
                    >
                      {exampleTopics[exampleIndex]}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-1.5">
              <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">目标平台</span>
              <div className="grid grid-cols-3 gap-2">
                {platforms.map((p) => {
                  const isSelected = draft.platform_code === p.code;
                  return (
                    <motion.button
                      key={p.code}
                      onClick={() => setPlatformCode(p.code)}
                      disabled={isLoading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150',
                        isSelected
                          ? 'border-primary-500/50 bg-primary-600/15'
                          : 'border-app-border bg-app-surface hover:border-app-border-light'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-lg',
                        isSelected ? `bg-gradient-to-br ${p.gradient}` : 'bg-app-elevated'
                      )}>
                        <span>{p.emoji}</span>
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium',
                        isSelected ? 'text-primary-400' : 'text-app-text-secondary'
                      )}>
                        {p.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-3 p-3 rounded-xl bg-app-surface border border-app-border">
              <div className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3 text-app-text-tertiary" />
                <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">参数设置</span>
              </div>

              {/* Length & Tone in grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Length */}
                <div className="space-y-1">
                  <span className="text-[9px] text-app-text-tertiary">长度</span>
                  <div className="flex gap-1">
                    {(['short', 'medium', 'long'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setParameters({ length: val })}
                        disabled={isLoading}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          draft.parameters.length === val
                            ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                            : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
                        )}
                      >
                        {val === 'short' ? '短' : val === 'medium' ? '中' : '长'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div className="space-y-1">
                  <span className="text-[9px] text-app-text-tertiary">风格</span>
                  <div className="flex gap-1">
                    {(['friendly', 'professional', 'humorous'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setParameters({ tone: val })}
                        disabled={isLoading}
                        className={cn(
                          'flex-1 py-1.5 rounded-lg border text-[10px] font-medium transition-all',
                          draft.parameters.tone === val
                            ? 'border-primary-500/50 bg-primary-600/15 text-primary-400'
                            : 'border-app-border bg-app-surface text-app-text-tertiary hover:text-app-text-secondary'
                        )}
                      >
                        {val === 'friendly' ? '友好' : val === 'professional' ? '专业' : '幽默'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Creativity */}
              <div className="space-y-1">
                <span className="text-[9px] text-app-text-tertiary">创造力 ({Math.round(draft.parameters.creativity * 100)}%)</span>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-app-text-tertiary">保守</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={draft.parameters.creativity}
                    onChange={(e) => setParameters({ creativity: parseFloat(e.target.value) })}
                    className="flex-1 h-1 rounded-full appearance-none bg-gray-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(59,130,246,0.4)]"
                    disabled={isLoading}
                  />
                  <span className="text-[8px] text-app-text-tertiary">创新</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !draft.topic.trim()}
                variant="gradient"
                className="flex-1 h-9 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    开始生成
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={isLoading}
                className="h-9 w-9 p-0 text-app-text-tertiary hover:text-app-text-secondary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
