/** 邮件预览 — 收件箱阅读视图 */

import type { PlatformPreviewProps } from './index';

function parseEmail(content: string) {
  let subject = '';
  let preheader = '';
  let body = content;

  // 尝试提取标题行
  const subjectMatch = content.match(/^(?:主题|标题|Subject|subject)[：:]\s*(.+)/m);
  if (subjectMatch) {
    subject = subjectMatch[1];
    body = body.replace(subjectMatch[0], '').trim();
  }

  // 尝试提取 preheader
  const preheaderMatch = content.match(/^(?:Preheader|preheader)[：:]\s*(.+)/m);
  if (preheaderMatch) {
    preheader = preheaderMatch[1];
    body = body.replace(preheaderMatch[0], '').trim();
  }

  return { subject, preheader, body };
}

export function EmailPreview({ content }: PlatformPreviewProps) {
  const { subject, preheader, body } = parseEmail(content);

  return (
    <div className="rounded-xl border border-app-border bg-app-surface overflow-hidden max-w-2xl mx-auto shadow-sm">
      {/* 邮件客户端顶栏 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-app-elevated/50 border-b border-app-border/30">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-[10px] text-app-text-tertiary ml-2">邮件预览</span>
      </div>

      {/* 发件人信息 */}
      <div className="px-5 pt-5 pb-3 border-b border-app-border/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-app-text">Newsletter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">订阅</span>
            </div>
            <span className="text-[11px] text-app-text-tertiary">to me</span>
          </div>
        </div>

        {/* 标题行 */}
        {subject && (
          <h2 className="text-base font-bold text-app-text mb-1">{subject}</h2>
        )}
        {preheader && (
          <p className="text-xs text-app-text-tertiary line-clamp-1">{preheader}</p>
        )}
      </div>

      {/* 邮件正文 */}
      <div className="px-5 py-4">
        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {body}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-app-border/20 bg-app-elevated/30">
        <button className="text-xs px-4 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 font-medium hover:bg-blue-500/25 transition-colors">
          回复
        </button>
        <button className="text-xs px-4 py-1.5 rounded-lg border border-app-border/50 text-app-text-secondary hover:text-app-text transition-colors">
          转发
        </button>
        <span className="ml-auto text-[10px] text-app-text-tertiary">不希望收到此类邮件？退订</span>
      </div>
    </div>
  );
}
