import { Eye } from 'lucide-react';
import { PLATFORM_MAP } from '../../agent/PlatformSelector';
import { getPreviewComponent } from '../../preview/index';

export interface PreviewPanelProps {
  platformCode?: string;
  title: string;
  contentMd: string;
  tags: string[];
}

// ── P1-3: 区分手机壳平台和文档框平台 ──
// 手机壳主要给移动端主导的平台（小红书/抖音/微博）
// 文档框覆盖桌面长文（公众号/邮件/技术文档/SEO 文章等）
// 手机壳覆盖所有平台（公众号在 WechatPreview 里画的是 App 内阅读页，也走 mobile）
const MOBILE_PLATFORMS = new Set(['xiaohongshu', 'douyin', 'weibo', 'bilibili', 'wechat']);

type PreviewMode = 'mobile' | 'document';

/** 根据 platform 决定预览外壳模式 */
function resolvePreviewMode(platformCode?: string): PreviewMode {
  if (!platformCode) return 'document';
  if (MOBILE_PLATFORMS.has(platformCode)) return 'mobile';
  return 'document';
}

export function PreviewPanel({ platformCode, title, contentMd, tags }: PreviewPanelProps) {
  const platformLabel = platformCode ? PLATFORM_MAP.get(platformCode)?.label || platformCode : '';
  const mode = resolvePreviewMode(platformCode);

  return (
    <div className="w-[380px] shrink-0 border-l border-app-border bg-app-elevated p-4 hidden lg:block sticky top-0 self-start max-h-screen overflow-y-auto">
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
          {mode === 'mobile' ? (
            <MobileFrame>
              {(() => {
                const PC = getPreviewComponent(platformCode);
                return <PC content={contentMd || ''} />;
              })()}
            </MobileFrame>
          ) : (
            <DocumentFrame>
              {(() => {
                const PC = getPreviewComponent(platformCode);
                return <PC content={contentMd || ''} />;
              })()}
            </DocumentFrame>
          )}
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

// ── 移动端手机壳 ──
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="self-center w-full max-w-[300px] h-[600px] rounded-[2.5rem] bg-neutral-900 p-[7px] shadow-2xl shadow-black/50 relative border border-neutral-800">
      <div className="w-full h-full rounded-[2rem] bg-white overflow-hidden relative flex flex-col">
        <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-20 w-[110px] h-[28px] bg-black rounded-[20px] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
        </div>
        <div className="shrink-0 h-[44px] flex items-center justify-between px-8 pt-[13px] pb-0.5 bg-white text-[11px] text-black font-semibold tracking-tight relative z-10">
          <span className="tabular-nums">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="10" viewBox="0 0 17 12" fill="currentColor"><path d="M1 8h2v4H1zm4-3h2v7H5zm4-4h2v11H9zm4-1h2v12h-2z"/></svg>
            <svg width="14" height="10" viewBox="0 0 15 12" fill="currentColor"><path d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3.5-2.5a5 5 0 00-7 0l-1.5-1.5a7 7 0 0110 0L11 8zm3-3a10 10 0 00-13 0L-.5 3.5a12 12 0 0116 0L14 5z"/></svg>
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="0.5" y="0.5" width="18" height="11" rx="2.5"/><path d="M21 4.5v3"/><rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor"/></svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white min-h-0 [&>*]:m-0">
          {children}
        </div>
        <div className="shrink-0 h-[32px] flex justify-center items-center bg-white">
          <div className="w-[120px] h-[5px] rounded-full bg-neutral-300/60" />
        </div>
      </div>
    </div>
  );
}

// ── 桌面端文档框（公众号/邮件/技术文档/SEO 等）──
function DocumentFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="self-stretch w-full max-w-[340px] rounded-xl bg-white border border-neutral-200 shadow-md overflow-hidden flex flex-col">
      {/* 假浏览器顶栏 */}
      <div className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-neutral-100 border-b border-neutral-200">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        <span className="ml-2 text-[10px] text-neutral-500 truncate">preview</span>
      </div>
      {/* 文档正文 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 text-neutral-800">
        {children}
      </div>
    </div>
  );
}