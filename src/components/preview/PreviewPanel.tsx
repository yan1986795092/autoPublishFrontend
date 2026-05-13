import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XiaohongshuPreview } from './XiaohongshuPreview';
import { WechatPreview } from './WechatPreview';
import { ZhihuPreview } from './ZhihuPreview';
import { PhoneFrame } from './PhoneFrame';
import { PlatformDiffView } from './PlatformDiffView';
import { SmartTagPanel } from '../editor/SmartTagPanel';
import { useEditorStore } from '../../stores/useEditorStore';
import { useGeneratorStore } from '../../stores/useGeneratorStore';
import { contentsApi, aiEditApi } from '../../services/api';
import { Button } from '../ui/button';
import { cn } from '../../utils/helpers';
import { Shield, AlertTriangle, Loader2, Wand2 } from 'lucide-react';

const platforms = [
  { code: 'xiaohongshu', name: '小红书', emoji: '🎨', gradient: 'from-pink-500 to-rose-500' },
  { code: 'wechat', name: '公众号', emoji: '📱', gradient: 'from-green-500 to-emerald-500' },
  { code: 'zhihu', name: '知乎', emoji: '💡', gradient: 'from-blue-500 to-indigo-500' },
];

/** Default source platform for adaptation */
const SOURCE_PLATFORM = 'xiaohongshu';

export function PreviewPanel() {
  const { activePlatform, setActivePlatform, content_md, editorInstance } = useEditorStore();
  const { draft } = useGeneratorStore();
  const [tags, setTags] = useState<string[]>([]);
  const [adaptedContent, setAdaptedContent] = useState<Record<string, string>>({});
  const [adapting, setAdapting] = useState<string | null>(null);

  const title = draft?.title || '未命名内容';
  const content = content_md || draft?.content_md || '';

  const activePlatformData = platforms.find((p) => p.code === activePlatform) || platforms[0];

  // Banned word detection
  const [bannedWords, setBannedWords] = useState<Array<{ word: string; position: number; platform: string }> | null>(null);
  const [checkingWords, setCheckingWords] = useState(false);

  const handleCheckBannedWords = async () => {
    if (!draft.id) return;
    setCheckingWords(true);
    try {
      const res = await contentsApi.checkBannedWords(draft.id);
      if (res.data.success && res.data.data) {
        setBannedWords(res.data.data.words);
      }
    } catch {
      // ignore
    } finally {
      setCheckingWords(false);
    }
  };

  const handleAdapt = async (targetPlatform: string) => {
    if (!content.trim()) return;
    setAdapting(targetPlatform);
    try {
      const res = await aiEditApi.adaptContent(content, SOURCE_PLATFORM, targetPlatform);
      const result = res.data.data?.result;
      if (result) {
        setAdaptedContent((prev) => ({ ...prev, [targetPlatform]: result }));
      }
    } catch {
      // silently fail
    } finally {
      setAdapting(null);
    }
  };

  const displayContent = adaptedContent[activePlatform] || content;

  return (
    <div className="h-full flex flex-col glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.04] flex-shrink-0">
        <div className="flex items-center gap-2 mb-2.5">
          <div className={cn(
            'w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center',
            activePlatformData.gradient
          )}>
            <span className="text-xs">{activePlatformData.emoji}</span>
          </div>
          <span className="text-xs font-semibold text-app-text">平台预览</span>
          <div className="ml-auto flex items-center gap-1">
            {draft.id && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleCheckBannedWords}
                disabled={checkingWords}
                className={cn(
                  'text-[9px] h-6 px-1.5 gap-1',
                  bannedWords && bannedWords.length > 0
                    ? 'text-red-400 hover:text-red-300'
                    : bannedWords && bannedWords.length === 0
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-app-text-tertiary'
                )}
              >
                {checkingWords ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <Shield className="w-2.5 h-2.5" />
                )}
                敏感词
                {bannedWords !== null && (
                  <span className={bannedWords.length > 0 ? 'text-red-400' : 'text-green-400'}>
                    ({bannedWords.length})
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-1 relative">
          {platforms.map((p) => {
            const isActive = activePlatform === p.code;
            return (
              <motion.button
                key={p.code}
                onClick={() => setActivePlatform(p.code)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-all relative',
                  isActive
                    ? 'text-white'
                    : 'text-app-text-tertiary hover:text-app-text-secondary'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="platform-tab-bg"
                    className={cn('absolute inset-0 rounded-lg bg-gradient-to-br', p.gradient)}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{p.emoji}</span>
                <span className="relative z-10">{p.name}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Smart Tag Panel */}
      {editorInstance && (
        <div className="border-b border-white/[0.04]">
          <SmartTagPanel editor={editorInstance} currentTags={tags} onAddTag={(tag) => setTags((prev) => [...prev, tag])} />
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-3 bg-app-surface">
        {/* Adapt button */}
        {activePlatform !== SOURCE_PLATFORM && !adaptedContent[activePlatform] && content.trim() && (
          <button
            onClick={() => handleAdapt(activePlatform)}
            disabled={adapting !== null}
            className="w-full mb-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500/20 transition-colors text-[11px] disabled:opacity-50"
          >
            {adapting === activePlatform ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3" />
            )}
            {adapting === activePlatform ? '适配中...' : `智能适配${activePlatformData.name}风格`}
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activePlatform}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <PhoneFrame variant="mobile">
              {activePlatform === 'xiaohongshu' && (
                <XiaohongshuPreview title={title} content_md={displayContent} tags={['AI创作', '效率工具']} />
              )}
              {activePlatform === 'wechat' && (
                <WechatPreview title={title} content_md={displayContent} />
              )}
              {activePlatform === 'zhihu' && (
                <ZhihuPreview title={title} content_md={displayContent} />
              )}
            </PhoneFrame>
          </motion.div>
        </AnimatePresence>

        {/* Banned words warning */}
        <AnimatePresence>
          {bannedWords && bannedWords.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-semibold text-red-400">
                  检测到 {bannedWords.length} 个敏感词
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {bannedWords.map((w, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded-md bg-red-500/20 text-[9px] text-red-300"
                  >
                    {w.word}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
          {bannedWords && bannedWords.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 p-2 rounded-xl bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-[10px] text-green-400">未检测到敏感词</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform diff */}
        {adaptedContent[activePlatform] && (
          <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
            <PlatformDiffView
              sourceContent={content}
              adaptedContent={adaptedContent[activePlatform]}
              sourceLabel={`原始 (${SOURCE_PLATFORM})`}
              adaptedLabel={`适配 (${activePlatform})`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
