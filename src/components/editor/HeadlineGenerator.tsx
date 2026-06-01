import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { useUIStore } from '../../stores/useUIStore';
import { aiEditApi } from '../../services/api';
import { Sparkles, Loader2, Check, RefreshCw } from 'lucide-react';

interface Props {
  editor: Editor;
}

export function HeadlineGenerator({ editor }: Props) {
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useUIStore();

  const handleGenerate = async () => {
    const text = editor.state.doc.textContent.trim();
    if (!text || text.length < 20) {
      showToast('内容太少，请先撰写至少 20 个字符', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await aiEditApi.generateHeadlines(text);
      const result = res.data.data?.headlines || [];
      setHeadlines(result);
    } catch {
      showToast('标题生成失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (headline: string) => {
    // Replace the first heading in the document, or insert at the start
    const { doc } = editor.state;
    let found = false;
    doc.forEach((node, pos) => {
      if (!found && (node.type.name === 'heading' || node.type.name === 'paragraph')) {
        found = true;
        editor
          .chain()
          .focus()
          .setTextSelection({ from: pos + 1, to: pos + node.nodeSize - 1 })
          .deleteSelection()
          .insertContent(headline)
          .run();
      }
    });
    if (!found) {
      editor.chain().focus().setContent(`<h1>${headline}</h1>${editor.getHTML()}`, { emitUpdate: true }).run();
    }
    showToast('已应用标题', 'success');
  };

  return (
    <div className="px-4 py-3 border-t border-white/[0.04]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-medium text-app-text-secondary">标题生成</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-[10px] px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
          ) : headlines.length > 0 ? (
            <RefreshCw className="w-2.5 h-2.5" />
          ) : (
            <Sparkles className="w-2.5 h-2.5" />
          )}
          {loading ? '生成中...' : headlines.length > 0 ? '重新生成' : '生成标题'}
        </button>
      </div>

      {headlines.length > 0 && (
        <div className="space-y-1">
          {headlines.map((hl, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group cursor-pointer"
              onClick={() => handleApply(hl)}
            >
              <span className="text-[10px] text-app-text-tertiary w-4 flex-shrink-0">{i + 1}</span>
              <span className="text-[11px] text-app-text-secondary flex-1">{hl}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleApply(hl); }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-1"
              >
                <Check className="w-2.5 h-2.5" />
                应用
              </button>
            </div>
          ))}
        </div>
      )}

      {headlines.length === 0 && !loading && (
        <p className="text-[10px] text-app-text-tertiary">点击「生成标题」AI 将根据内容推荐吸引人的标题</p>
      )}
    </div>
  );
}
