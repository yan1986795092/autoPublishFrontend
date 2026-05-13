import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiEditApi } from '../../services/api';
import { cn } from '../../utils/helpers';
import { Link, Loader2, Sparkles, ExternalLink, FileText, Image } from 'lucide-react';

interface ParsedContent {
  title: string;
  description: string;
  content: string;
  images: string[];
  url: string;
  domain: string;
}

interface Props {
  onParseResult?: (data: { title: string; content: string }) => void;
  className?: string;
}

export function UrlInput({ onParseResult, className }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedContent | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleParse = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await aiEditApi.parseUrl(url);
      if (res.data.success && res.data.data) {
        const data = res.data.data as ParsedContent;
        setResult(data);
        onParseResult?.({ title: data.title, content: data.content });
      } else {
        setError((res.data as unknown as { error?: string }).error || '解析失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('rounded-xl bg-app-surface border border-white/[0.04] overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <Link className="w-3.5 h-3.5 text-primary-400" />
        <span className="text-[11px] font-semibold text-app-text">URL 导入</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3.5 pb-3.5 space-y-2.5"
          >
            {/* URL input */}
            <div className="flex gap-1.5">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴文章链接，如：https://..."
                className="flex-1 rounded-lg border border-app-border bg-app-surface text-[10px] text-app-text placeholder:text-app-text-tertiary px-2.5 py-1.5 focus:outline-none focus:border-primary-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
              />
              <button
                onClick={handleParse}
                disabled={loading || !url.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-400 text-[10px] font-medium hover:bg-primary-600/30 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                解析
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] text-red-400">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {/* Domain badge */}
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-2.5 h-2.5 text-app-text-tertiary" />
                  <span className="text-[9px] text-app-text-tertiary">{result.domain}</span>
                </div>

                {/* Title */}
                {result.title && (
                  <div className="flex items-start gap-1.5">
                    <FileText className="w-3 h-3 text-app-text-tertiary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[9px] text-app-text-tertiary">标题</span>
                      <p className="text-[10px] text-app-text">{result.title}</p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {result.description && (
                  <div className="flex items-start gap-1.5">
                    <FileText className="w-3 h-3 text-app-text-tertiary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[9px] text-app-text-tertiary">描述</span>
                      <p className="text-[10px] text-app-text-secondary">{result.description}</p>
                    </div>
                  </div>
                )}

                {/* Images */}
                {result.images.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <Image className="w-3 h-3 text-app-text-tertiary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[9px] text-app-text-tertiary">图片 ({result.images.length})</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
