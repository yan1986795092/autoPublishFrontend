import { useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';
import { useEditorStore } from '../../stores/useEditorStore';
import { useUIStore } from '../../stores/useUIStore';
import { aiEditApi } from '../../services/api';
import { AlertTriangle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/helpers';

interface Props {
  editor: Editor;
}

export function BannedWordHighlighter({ editor }: Props) {
  const { showToast } = useUIStore();
  const { bannedWords, setBannedWords, activePlatform } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced check on editor changes
  useEffect(() => {
    const handleUpdate = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const text = editor.state.doc.textContent;
        if (!text.trim()) {
          setBannedWords([]);
          return;
        }
        setLoading(true);
        try {
          const res = await aiEditApi.checkBannedWords(text, activePlatform);
          const words = res.data.data?.words || [];
          setBannedWords(words);
        } catch {
          showToast('违禁词检查失败', 'error');
        } finally {
          setLoading(false);
        }
      }, 800);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor, activePlatform, setBannedWords]);

  // Re-check on platform change
  useEffect(() => {
    if (editor.state.doc.textContent.trim()) {
      const text = editor.state.doc.textContent;
      const doCheck = async () => {
        setLoading(true);
        try {
          const res = await aiEditApi.checkBannedWords(text, activePlatform);
          const words = res.data.data?.words || [];
          setBannedWords(words);
        } catch {
          showToast('违禁词检查失败', 'error');
        } finally {
          setLoading(false);
        }
      };
      doCheck();
    }
  }, [activePlatform, editor, setBannedWords]);

  if (bannedWords.length === 0 && !loading) return null;

  const handleReplace = (bw: typeof bannedWords[0]) => {
    // Walk the ProseMirror document to find the word at the correct character offset,
    // using proper node positions (not textContent char indices) for deleteRange.
    let from: number | null = null;
    let to: number | null = null;
    let charOffset = 0;

    editor.state.doc.descendants((node, pos) => {
      if (from !== null) return false;
      if (node.isText) {
        const text = node.text ?? '';
        if (charOffset <= bw.position && bw.position < charOffset + text.length) {
          const localIdx = bw.position - charOffset;
          if (text.slice(localIdx).startsWith(bw.word)) {
            from = pos + localIdx;
            to = from + bw.word.length;
          }
        }
        charOffset += text.length;
      } else if (node.isBlock) {
        charOffset += 1; // \n in textContent
      }
      return true;
    });

    if (from === null || to === null) return;

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent(bw.suggestion || '')
      .run();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="overflow-hidden border-b border-white/[0.04]"
      >
        <div className="px-4 py-2 bg-red-500/5">
          {/* Header */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 w-full text-left"
          >
            <div className="w-5 h-5 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className={cn('w-3 h-3', loading ? 'text-amber-400' : 'text-red-400')} />
            </div>
            <span className="text-[11px] font-medium text-red-400">
              {loading ? '检查中...' : `发现 ${bannedWords.length} 个违禁词`}
            </span>
            {collapsed ? <ChevronDown className="w-3 h-3 text-red-400/60 ml-auto" /> : <ChevronUp className="w-3 h-3 text-red-400/60 ml-auto" />}
          </button>

          {/* Word list */}
          {!collapsed && (
            <div className="mt-2 space-y-1">
              {bannedWords.map((bw, i) => (
                <div
                  key={`${bw.word}-${bw.position}-${i}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                >
                  <span className="text-[11px] font-mono text-red-300 flex-shrink-0">
                    「{bw.word}」
                  </span>
                  {bw.suggestion && (
                    <>
                      <span className="text-[10px] text-app-text-tertiary">→</span>
                      <span className="text-[11px] text-green-400">{bw.suggestion}</span>
                      <button
                        onClick={() => handleReplace(bw)}
                        className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        替换
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
