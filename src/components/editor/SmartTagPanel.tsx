import { useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { aiEditApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import { Hash, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface Props {
  editor: Editor;
  currentTags: string[];
  onAddTag: (tag: string) => void;
}

export function SmartTagPanel({ editor, currentTags, onAddTag }: Props) {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useUIStore();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async () => {
    const text = editor.state.doc.textContent.trim();
    if (!text || text.length < 20) return;

    setLoading(true);
    try {
      const res = await aiEditApi.suggestTags(text);
      const tags = res.data.data?.tags || [];
      setSuggestedTags(tags);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [editor]);

  const handleGenerate = () => {
    setSuggestedTags([]);
    fetchSuggestions();
  };

  const isAlreadyAdded = (tag: string) =>
    currentTags.some((t) => t.toLowerCase() === tag.toLowerCase());

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3 h-3 text-primary-400" />
          <span className="text-[10px] font-medium text-app-text-secondary">智能标签推荐</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-[10px] px-2 py-1 rounded-md bg-primary-600/10 text-primary-400 hover:bg-primary-600/20 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : (
            <Sparkles className="w-2.5 h-2.5" />
          )}
          {loading ? '分析中...' : '生成推荐'}
        </button>
      </div>

      {suggestedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestedTags.map((tag) => {
            const added = isAlreadyAdded(tag);
            return (
              <button
                key={tag}
                onClick={() => {
                  if (!added) {
                    onAddTag(tag);
                    showToast(`已添加标签「${tag}」`, 'success');
                  }
                }}
                disabled={added}
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border transition-all',
                  added
                    ? 'border-green-500/30 text-green-400 bg-green-500/10 cursor-default'
                    : 'border-white/[0.08] text-app-text-secondary hover:border-primary-500/30 hover:text-primary-400 hover:bg-primary-500/10 cursor-pointer'
                )}
              >
                {added ? '✓ ' : '# '}
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {suggestedTags.length === 0 && !loading && (
        <p className="text-[10px] text-app-text-tertiary">点击「生成推荐」AI 将根据内容推荐标签</p>
      )}
    </div>
  );
}
