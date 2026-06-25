import { Eye } from 'lucide-react';
import { PLATFORM_MAP } from '../../agent/PlatformSelector';
import { getPreviewComponent } from '../../preview/index';

export interface PreviewPanelProps {
  platformCode?: string;
  title: string;
  contentMd: string;
  tags: string[];
}

export function PreviewPanel({ platformCode, title, contentMd, tags }: PreviewPanelProps) {
  const platformLabel = platformCode ? PLATFORM_MAP.get(platformCode)?.label || platformCode : '';

  return (
    <div className="w-[380px] shrink-0 border-l border-app-border/30 bg-app-surface/20 p-4 hidden lg:block sticky top-0 self-start max-h-screen overflow-y-auto">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <Eye className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-app-text">实时预览</span>
          {platformLabel && (
            <span className="text-[10px] text-app-text-tertiary ml-auto">{platformLabel}</span>
          )}
        </div>

        {title && (
          <div className="shrink-0 text-center mb-2">
            <div className="text-sm font-semibold text-app-text leading-snug line-clamp-1 px-2">
              {title}
            </div>
          </div>
        )}

        <div className="flex-1 flex justify-center min-h-0">
          <div className="self-center w-full max-w-[300px] aspect-[9/19] rounded-[2.25rem] bg-neutral-800 p-[7px] shadow-2xl shadow-black/50 relative">
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
                {(() => {
                  const PreviewComponent = getPreviewComponent(platformCode || 'xiaohongshu');
                  return (
                    <div className="[&>*]:m-0">
                      <PreviewComponent content={contentMd || ''} />
                    </div>
                  );
                })()}
              </div>
              <div className="shrink-0 flex justify-center py-1.5 bg-white">
                <div className="w-[110px] h-[4px] rounded-full bg-neutral-300/70" />
              </div>
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="shrink-0 mt-2 flex justify-center flex-wrap gap-1">
            {tags.map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
