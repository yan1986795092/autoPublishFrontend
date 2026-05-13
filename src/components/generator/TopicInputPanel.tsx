import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/button';
import { GenerationParams } from './GenerationParams';
import { TemplateSelector } from './TemplateSelector';
import { ModelSelector } from './ModelSelector';
import { PresetManager } from './PresetManager';
import { PersonaEditor } from './PersonaEditor';
import { HotTopicsPanel } from './HotTopicsPanel';
import { Sparkles, Loader2, RefreshCw, SlidersHorizontal, Wand2, Layers } from 'lucide-react';
import { generateStream, contentsApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import type { GenerateParams } from '../../types';

const exampleTopics = [
  '如何高效学习编程？',
  '2024年科技趋势预测',
  '一周健康食谱推荐',
];

const platforms = [
  { code: 'xiaohongshu', name: '小红书', emoji: '🎨', gradient: 'from-pink-500 to-rose-500' },
  { code: 'wechat', name: '公众号', emoji: '📱', gradient: 'from-green-500 to-emerald-500' },
  { code: 'zhihu', name: '知乎', emoji: '💡', gradient: 'from-blue-500 to-indigo-500' },
];

export function TopicInputPanel() {
  const {
    status,
    draft,
    setTopic,
    setPlatformCode,
    setParameters,
    setGeneratedContent,
    setStreamingContent,
    setStatus,
    setError,
    reset,
  } = useGeneratorStore();
  const { showToast } = useUIStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isBatching, setIsBatching] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      const timer = setInterval(() => {
        setExampleIndex((i) => (i + 1) % exampleTopics.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [status]);

  // Listen for Ctrl+Enter from keyboard shortcuts
  useEffect(() => {
    const listener = () => {
      if (!isGenerating && status === 'idle' && draft.topic.trim()) {
        handleGenerate();
      }
    };
    window.addEventListener('app:generate', listener);
    return () => window.removeEventListener('app:generate', listener);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!draft.topic.trim()) {
      setError('请输入内容主题');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus('generating');

    let accumulatedMd = '';

    try {
      await generateStream(
        {
          topic: draft.topic,
          platform_code: draft.platform_code,
          parameters: draft.parameters,
          model: draft.model || undefined,
          template_id: draft.template_id || undefined,
        },
        {
          onToken: (token) => {
            accumulatedMd += token;
            setStreamingContent(accumulatedMd, accumulatedMd.replace(/\n/g, '<br>'));
          },
          onTitle: () => {},
          onDone: (result) => {
            setGeneratedContent({
              id: result.content_id,
              title: result.title,
              content_md: accumulatedMd,
              content_html: accumulatedMd.replace(/\n/g, '<br>'),
              metadata: result.metadata,
            });
            showToast('内容生成成功', 'success');
            setIsGenerating(false);
          },
          onError: (message) => {
            setError(message);
            showToast(message, 'error');
            setIsGenerating(false);
          },
        },
      );
    } catch (err: unknown) {
      let msg = '网络错误，请重试';
      if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = (err as Error).message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      setStatus('error');
      showToast(msg, 'error');
      setIsGenerating(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!draft.topic.trim()) {
      setError('请输入内容主题');
      return;
    }

    setIsGenerating(true);
    setIsBatching(true);
    setError(null);
    setStatus('generating');

    try {
      const res = await contentsApi.batchGenerate({
        topic: draft.topic,
        platforms: platforms.map((p) => p.code),
        parameters: draft.parameters,
        model: draft.model || undefined,
      });

      if (res.data.success && res.data.data) {
        const contents = res.data.data.contents;
        // Show first platform result in editor
        const first = contents[0];
        setGeneratedContent({
          id: first.content_id,
          title: first.title,
          content_md: first.content_md,
          content_html: first.content_html,
          metadata: first.metadata,
        });
        showToast(`全平台生成完成！共 ${contents.length} 篇`, 'success');
      } else {
        setError('批量生成失败');
        showToast('批量生成失败', 'error');
      }
    } catch (err: unknown) {
      let msg = '网络错误，请重试';
      if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = (err as Error).message;
      }
      setError(msg);
      setStatus('error');
      showToast(msg, 'error');
    } finally {
      setIsGenerating(false);
      setIsBatching(false);
    }
  };

  const handleReset = () => {
    reset();
    showToast('已重置', 'info');
  };

  const isLoading = isGenerating || status === 'generating' || status === 'streaming';
  const charCount = draft.topic.length;
  const charColor = charCount > 500 ? 'text-red-400' : charCount > 300 ? 'text-amber-400' : 'text-app-text-tertiary';

  return (
    <div className="glass-card flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Wand2 className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-app-text">创作面板</span>
        {draft.topic && (
          <button
            onClick={handleReset}
            className="ml-auto p-1 rounded-md text-app-text-tertiary hover:text-app-text-secondary hover:bg-white/[0.06] transition-all"
            title="重置"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Topic Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">创作主题</span>
            <span className={cn('text-[9px] font-medium', charColor)}>{charCount} 字</span>
          </div>
          <div className="relative">
            <textarea
              value={draft.topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder=""
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

        {/* Hot Topics Panel */}
        {!isLoading && status === 'idle' && (
          <HotTopicsPanel onSelectTopic={setTopic} />
        )}

        {/* Platform Selection */}
        <div className="space-y-1.5">
          <span className="text-[9px] text-app-text-tertiary uppercase tracking-wider font-medium">目标平台</span>
          <div className="grid grid-cols-3 gap-1.5">
            {platforms.map((p) => {
              const isSelected = draft.platform_code === p.code;
              return (
                <button
                  key={p.code}
                  onClick={() => setPlatformCode(p.code)}
                  disabled={isLoading}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-150',
                    isSelected
                      ? 'border-primary-500/50 bg-primary-600/15'
                      : 'border-app-border bg-app-surface hover:border-app-border-light'
                  )}
                >
                  <span className="text-base">{p.emoji}</span>
                  <span className={cn(
                    'text-[9px] font-medium',
                    isSelected ? 'text-primary-400' : 'text-app-text-secondary'
                  )}>
                    {p.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Selector */}
        <TemplateSelector disabled={isLoading} />

        {/* Model Selector */}
        <ModelSelector disabled={isLoading} />

        {/* Preset Manager */}
        <PresetManager />
        <PersonaEditor disabled={isLoading} />

        {/* Generate Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isLoading || !draft.topic.trim()}
            variant="gradient"
            className="flex-1 h-9 text-xs"
          >
            {isLoading && !isBatching ? (
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
            onClick={handleBatchGenerate}
            disabled={isLoading || !draft.topic.trim()}
            variant="ghost-glow"
            className="h-9 px-2.5 text-xs"
            title="一键生成全平台内容"
          >
            {isLoading && isBatching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Layers className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[9px] text-app-text-tertiary hover:text-app-text-secondary transition-colors mx-auto"
        >
          <SlidersHorizontal className="w-3 h-3" />
          {showAdvanced ? '收起高级设置' : '高级设置'}
        </button>

        {/* Advanced Settings — tabbed parameter panel */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <GenerationParams disabled={isLoading} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {status === 'error' && draft.topic && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <p className="text-[10px] text-red-400">{draft.topic}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
