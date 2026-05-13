import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { aiEditApi } from '../../services/api';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  editor: Editor;
}

const ACTIONS = [
  { key: 'rewrite', label: '改写选中内容', icon: '✍️' },
  { key: 'expand', label: '扩写段落', icon: '📖' },
  { key: 'improve-friendly', label: '润色 → 友好', icon: '😊' },
  { key: 'improve-professional', label: '润色 → 专业', icon: '📊' },
  { key: 'improve-humorous', label: '润色 → 幽默', icon: '😄' },
  { key: 'summarize', label: '总结', icon: '📝' },
  { key: 'translate-en', label: '翻译 → 英文', icon: '🇬🇧' },
  { key: 'translate-zh', label: '翻译 → 中文', icon: '🇨🇳' },
] as const;

export function AIEditorActions({ editor }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useUIStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const getSelectedText = (): string => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  };

  const replaceSelectedText = (text: string) => {
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(text).run();
  };

  const handleAction = async (action: string) => {
    const selectedText = getSelectedText();
    if (!selectedText.trim()) {
      showToast('请先选中要编辑的文字', 'error');
      return;
    }

    setLoading(action);
    setOpen(false);

    try {
      let result = '';
      switch (action) {
        case 'rewrite': {
          const res = await aiEditApi.rewrite(selectedText);
          result = res.data.data?.result || '';
          break;
        }
        case 'expand': {
          const res = await aiEditApi.expand(selectedText);
          result = res.data.data?.result || '';
          break;
        }
        case 'improve-friendly':
        case 'improve-professional':
        case 'improve-humorous': {
          const tone = action.split('-')[1];
          const res = await aiEditApi.improveTone(selectedText, tone);
          result = res.data.data?.result || '';
          break;
        }
        case 'summarize': {
          const res = await aiEditApi.summarize(selectedText);
          result = res.data.data?.result || '';
          break;
        }
        case 'translate-en': {
          const res = await aiEditApi.translate(selectedText, 'en');
          result = res.data.data?.result || '';
          break;
        }
        case 'translate-zh': {
          const res = await aiEditApi.translate(selectedText, 'zh');
          result = res.data.data?.result || '';
          break;
        }
      }
      if (result) {
        replaceSelectedText(result);
        showToast('AI 编辑完成', 'success');
      } else {
        showToast('AI 编辑返回为空', 'error');
      }
    } catch {
      showToast('AI 编辑失败', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        disabled={loading !== null}
        className="h-7 w-7 text-app-text-secondary hover:bg-white/[0.06] hover:text-app-text rounded-md transition-all relative"
        title="AI 编辑"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-44 bg-app-elevated border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden py-1">
          {ACTIONS.map((action) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] text-app-text hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-xs">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
