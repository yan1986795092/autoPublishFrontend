import { Eye } from 'lucide-react';
import type { AgentResult } from '../../types';
import { getPreviewComponent } from '../preview/index';

interface ResultPreviewProps {
  result: AgentResult | null;
  selectedPlatform: string | null;
  selectedContentType?: string | null;
}

// ── P1-3: 与 PreviewPanel 对齐 — 仅移动端主导平台用手机壳 ──
const MOBILE_PLATFORMS = new Set(['xiaohongshu', 'douyin', 'weibo']);

export function ResultPreview({ result, selectedPlatform, selectedContentType }: ResultPreviewProps) {
  // 组合预览：优先用平台的外壳，传 content_type 给内部渲染
  const previewKey = selectedPlatform || selectedContentType || null;
  // 不在 render 中调用 getPreviewComponent，移到 JSX 里 IIFE
  const isMobile = selectedPlatform ? MOBILE_PLATFORMS.has(selectedPlatform) : false;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="w-8 h-8 text-app-text-tertiary mb-2" />
        <p className="text-xs text-app-text-tertiary">执行完成后查看预览</p>
      </div>
    );
  }

  const content =
    (result.output?.full_text as string) ||
    (result.output?.content as string) ||
    JSON.stringify(result.output, null, 2);

  return (
    <div className="flex justify-center">
      {isMobile ? (
        <MobileFrame>
          {(() => {
            const PC = getPreviewComponent(previewKey);
            return <PC content={content} contentType={selectedContentType || undefined} />;
          })()}
        </MobileFrame>
      ) : (
        <DocumentFrame>
          {(() => {
            const PC = getPreviewComponent(previewKey);
            return <PC content={content} contentType={selectedContentType || undefined} />;
          })()}
        </DocumentFrame>
      )}
    </div>
  );
}

// ── 移动端手机壳 ──
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[300px] aspect-[9/19] rounded-[2.25rem] bg-neutral-900 p-[7px] shadow-2xl shadow-black/50 relative border border-white/5">
      <div className="w-full h-full rounded-[1.875rem] bg-white overflow-hidden relative flex flex-col">
        <div className="absolute top-[11px] left-1/2 -translate-x-1/2 z-20 w-[100px] h-[26px] bg-black rounded-full flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
        </div>
        <div className="shrink-0 flex items-center justify-between px-7 pt-[11px] pb-0.5 bg-white text-[10px] text-black font-semibold tracking-tight relative z-10">
          <span className="tabular-nums">9:41</span>
          <div className="flex items-center gap-1">
            <svg width="13" height="9" viewBox="0 0 17 12" fill="currentColor"><path d="M1 8h2v4H1zm4-3h2v7H5zm4-4h2v11H9zm4-1h2v12h-2z"/></svg>
            <svg width="13" height="9" viewBox="0 0 15 12" fill="currentColor"><path d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3.5-2.5a5 5 0 00-7 0l-1.5-1.5a7 7 0 0110 0L11 8zm3-3a10 10 0 00-13 0L-.5 3.5a12 12 0 0116 0L14 5z"/></svg>
            <svg width="20" height="10" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="18" height="11" rx="2.5"/><path d="M21 4.5v3"/><rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor"/></svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {children}
        </div>
        <div className="shrink-0 flex justify-center py-1.5 bg-white">
          <div className="w-[110px] h-[4px] rounded-full bg-neutral-300/70" />
        </div>
      </div>
    </div>
  );
}

// ── 桌面端文档框 ──
function DocumentFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[340px] rounded-xl bg-white border border-neutral-200 shadow-md overflow-hidden flex flex-col">
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-neutral-100 border-b border-neutral-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className="ml-2 text-[10px] text-neutral-500 truncate">preview</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 text-neutral-800">
        {children}
      </div>
    </div>
  );
}