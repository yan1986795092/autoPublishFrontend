import { useState, useRef, useEffect } from 'react';
import {
  Wand2, Expand, Languages, ChevronDown,
  SearchIcon, AlertTriangle, Volume2, X, Loader2,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../ui/dropdown-menu';

export interface EditorToolbarProps {
  aiLoading: boolean;
  onRewrite: (instruction: string) => void;
  onExpand: () => void;
  onTranslate: (lang: string) => void;
  onTone: (tone: string) => void;
  onSeo: () => void;
  onBanned: () => void;
}

export function EditorToolbar({
  aiLoading,
  onRewrite, onExpand,
  onTranslate, onTone,
  onSeo, onBanned,
}: EditorToolbarProps) {
  const [translateOpen, setTranslateOpen] = useState(false);
  const [toneOpen, setToneOpen] = useState(false);
  const [showRewriteInput, setShowRewriteInput] = useState(false);
  const [rewriteInput, setRewriteInput] = useState('');
  const rewriteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showRewriteInput && rewriteRef.current) {
      rewriteRef.current.focus();
    }
  }, [showRewriteInput]);

  const handleRewriteSubmit = () => {
    if (!rewriteInput.trim()) return;
    onRewrite(rewriteInput.trim());
    setRewriteInput('');
    setShowRewriteInput(false);
  };

  return (
    <div className="border-y border-app-border bg-app-elevated">
      <div className="relative flex flex-wrap items-center gap-1 px-3 py-2.5">
        <Badge variant="primary" size="sm" className="mr-1 shrink-0">AI</Badge>

        {/* Group 1: 写作 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost-glow"
            size="xs"
            onClick={() => setShowRewriteInput(true)}
            disabled={aiLoading}
            title="改写"
            className="gap-1"
          >
            <Wand2 className="w-3 h-3" /><span className="text-[10px]">改写</span>
          </Button>
          <Button variant="ghost-glow" size="xs" onClick={onExpand} disabled={aiLoading} title="扩写" className="gap-1">
            <Expand className="w-3 h-3" /><span className="text-[10px]">扩写</span>
          </Button>
        </div>

        {/* Divider */}
        <span className="w-px h-5 bg-app-border/50 mx-1" />

        {/* Group 2: 风格 */}
        <div className="flex items-center gap-0.5">
          <DropdownMenu open={translateOpen} onOpenChange={setTranslateOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost-glow" size="xs" disabled={aiLoading} className="gap-1">
                <Languages className="w-3 h-3" /><span className="text-[10px]">翻译</span><ChevronDown className="w-2.5 h-2.5 text-app-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4}>
              <DropdownMenuItem onClick={() => { onTranslate('en'); setTranslateOpen(false); }}>EN - 英文</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTranslate('ja'); setTranslateOpen(false); }}>JA - 日文</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTranslate('ko'); setTranslateOpen(false); }}>KO - 韩文</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTranslate('zh-CN'); setTranslateOpen(false); }}>zh-CN - 中文</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={toneOpen} onOpenChange={setToneOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost-glow" size="xs" disabled={aiLoading} className="gap-1">
                <Volume2 className="w-3 h-3" /><span className="text-[10px]">语调</span><ChevronDown className="w-2.5 h-2.5 text-app-text-tertiary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={4}>
              <DropdownMenuItem onClick={() => { onTone('professional'); setToneOpen(false); }}>专业</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTone('humorous'); setToneOpen(false); }}>幽默</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTone('warm'); setToneOpen(false); }}>温暖</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { onTone('formal'); setToneOpen(false); }}>正式</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Divider */}
        <span className="w-px h-5 bg-app-border/50 mx-1" />

        {/* Group 3: 分析 */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost-glow" size="xs" onClick={onSeo} disabled={aiLoading} title="SEO 分析" className="gap-1">
            <SearchIcon className="w-3 h-3" /><span className="text-[10px]">SEO</span>
          </Button>
          <Button variant="ghost-glow" size="xs" onClick={onBanned} disabled={aiLoading} title="违禁词检测" className="gap-1">
            <AlertTriangle className="w-3 h-3" /><span className="text-[10px]">违禁词</span>
          </Button>
        </div>

        {/* Loading indicator */}
        {aiLoading && (
          <div className="flex items-center gap-1.5 ml-auto shrink-0 bg-primary-500/10 px-2 py-1 rounded-full border border-primary-500/20">
            <Loader2 className="w-3 h-3 animate-spin text-primary-400" />
            <span className="text-[11px] font-medium text-primary-400 whitespace-nowrap">AI 处理中...</span>
          </div>
        )}

        {/* Progress line */}
        {aiLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-primary-500/10 overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-shimmer rounded-full" />
          </div>
        )}
      </div>

      {/* Inline rewrite input */}
      {showRewriteInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-app-border/20 bg-app-surface/30">
          <span className="text-[10px] text-primary-400 font-medium shrink-0 whitespace-nowrap">改写要求：</span>
          <Input
            ref={rewriteRef}
            value={rewriteInput}
            onChange={(e) => setRewriteInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRewriteSubmit(); if (e.key === 'Escape') { setShowRewriteInput(false); setRewriteInput(''); } }}
            placeholder="更口语化、更专业、缩短到200字…"
            className="h-7 text-xs flex-1"
          />
          <Button size="xs" onClick={handleRewriteSubmit} disabled={!rewriteInput.trim()} className="h-7 text-xs shrink-0">
            生成
          </Button>
          <button
            onClick={() => { setShowRewriteInput(false); setRewriteInput(''); }}
            className="shrink-0 text-app-text-tertiary hover:text-app-text-secondary p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
