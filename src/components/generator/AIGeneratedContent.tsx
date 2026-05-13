import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { Badge } from '../ui/badge';
import { Sparkles, Zap, Timer, Coins, AlertCircle, Brain, CheckCircle2 } from 'lucide-react';

export function AIGeneratedContent() {
  const { status, draft, metadata, error } = useGeneratorStore();

  return (
    <AnimatePresence mode="wait">
      {status === 'idle' && (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col items-center justify-center text-center p-6 glass-card"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-2xl bg-gradient-primary/10 border border-primary-500/20 flex items-center justify-center mb-4"
          >
            <Sparkles className="w-6 h-6 text-primary-400" />
          </motion.div>
          <h3 className="text-sm font-semibold text-app-text mb-1">等待创作</h3>
          <p className="text-[11px] text-app-text-tertiary">点击"新建"输入主题并生成内容</p>
        </motion.div>
      )}

      {(status === 'generating' || status === 'streaming') && (
        <motion.div
          key="generating"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col items-center justify-center p-6 glass-card"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-primary-400" />
          </div>
          <h3 className="text-sm font-semibold text-app-text mb-1">
            {status === 'generating' ? 'AI 构思中' : '内容生成中'}
          </h3>
          <p className="text-[11px] text-app-text-secondary mb-4">
            {status === 'generating' ? '正在分析主题并构思内容...' : '正在输出生成的内容...'}
          </p>
          {/* Waveform animation */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-6 rounded-full bg-gradient-primary"
                animate={{
                  height: ['8px', '24px', '8px'],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </motion.div>
      )}

      {status === 'error' && error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col items-center justify-center p-6 glass-card border-red-500/30"
        >
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4"
          >
            <AlertCircle className="w-6 h-6 text-red-400" />
          </motion.div>
          <h3 className="text-sm font-semibold text-red-400 mb-1">生成失败</h3>
          <p className="text-[11px] text-app-text-secondary text-center max-w-[200px]">{error}</p>
        </motion.div>
      )}

      {status === 'generated' && draft.content_md && (
        <motion.div
          key="generated"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col glass-card overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-semibold text-app-text leading-snug truncate"
                >
                  {draft.title || '生成的内容'}
                </motion.h2>
                <p className="text-[10px] text-app-text-tertiary mt-0.5">
                  AI 创作 · {new Date().toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>

            {/* Metadata */}
            {metadata && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-1.5 mt-2 flex-wrap"
              >
                <Badge variant="primary" size="xs">
                  <Zap className="w-2 h-2" />
                  {metadata.model}
                </Badge>
                <Badge variant="secondary" size="xs">
                  <Timer className="w-2 h-2" />
                  {(metadata.generation_time_ms / 1000).toFixed(1)}s
                </Badge>
                <Badge variant="secondary" size="xs">
                  <Coins className="w-2 h-2" />
                  ${metadata.tokens_cost_usd.toFixed(4)}
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <div className="prose prose-xs max-w-none text-app-text-secondary [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-app-text [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-app-text [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-app-text [&_p]:text-xs [&_a]:text-primary-400 [&_ul]:text-xs [&_ol]:text-xs [&_li]:text-xs [&_strong]:text-app-text [&_em]:text-app-text-secondary [&_code]:bg-app-elevated [&_code]:text-primary-400 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-app-elevated [&_pre]:border [&_pre]:border-white/[0.06] [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:text-[10px] [&_blockquote]:border-app-border [&_blockquote]:text-app-text-secondary [&_blockquote]:text-[10px] [&_blockquote]:pl-3">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {draft.content_md}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Bottom fade indicator */}
          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-[rgba(20,20,22,0.85)] to-transparent pointer-events-none" />
        </motion.div>
      )}

      {status === 'generated' && !draft.content_md && (
        <motion.div
          key="empty-generated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full flex flex-col items-center justify-center p-6 glass-card"
        >
          <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
          <p className="text-xs text-app-text-tertiary">内容已生成，请查看编辑器</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
