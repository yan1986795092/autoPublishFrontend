/** 邮件预览 — HTML 邮件模板样式，含 Hero 图 / CTA 按钮 / Footer */

import type { PlatformPreviewProps } from './index';

function parseEmail(content: string) {
  let subject = '';
  let preheader = '';
  let body = content;

  const subjectMatch = content.match(/^(?:主题|标题|Subject)[：:]\s*(.+)/m);
  if (subjectMatch) {
    subject = subjectMatch[1];
    body = body.replace(subjectMatch[0], '').trim();
  }
  const preheaderMatch = content.match(/^(?:Preheader|摘要)[：:]\s*(.+)/m);
  if (preheaderMatch) {
    preheader = preheaderMatch[1];
    body = body.replace(preheaderMatch[0], '').trim();
  }

  return { subject, preheader, body };
}

export function EmailPreview({ content }: PlatformPreviewProps) {
  const { subject, preheader, body } = parseEmail(content);
  const senderName = '品牌官方';
  const senderDomain = 'brand.com';

  return (
    <div className="max-w-xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
      {/* HTML 邮件容器 */}
      <div style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif', backgroundColor: '#F4F4F4' }}>
        {/* 邮件顶栏预览条 */}
        <div style={{ backgroundColor: '#1A1A2E', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9CA3AF', fontSize: '11px' }}>点击查看网页版</span>
          <span style={{ color: '#9CA3AF', fontSize: '11px' }}>邮件无法正常显示？<a href="#" style={{ color: '#60A5FA' }}>点击这里</a></span>
        </div>

        {/* 主内容区 */}
        <div style={{ backgroundColor: '#FFFFFF', maxWidth: '600px', margin: '0 auto' }}>
          {/* 发件人信息栏 */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #667EEA, #764BA2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>B</span>
              </div>
              <div>
                <p style={{ color: '#111827', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>{senderName}</p>
                <p style={{ color: '#9CA3AF', fontSize: '11px', margin: 0 }}>noreply@{senderDomain}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['社交媒体', '官网', '退订'].map((label, i) => (
                <a key={i} href="#" style={{ fontSize: '11px', color: i === 2 ? '#9CA3AF' : '#6B7280', textDecoration: 'none' }}>{label}</a>
              ))}
            </div>
          </div>

          {/* 邮件主题 */}
          <div style={{ padding: '24px 24px 16px' }}>
            <h1 style={{ color: '#111827', fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px', lineHeight: 1.3 }}>
              {subject || 'Newsletter 主题'}
            </h1>
            {preheader && (
              <p style={{ color: '#6B7280', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
                {preheader}
              </p>
            )}
          </div>

          {/* Hero 图 */}
          <div style={{ margin: '0 24px 24px', borderRadius: '12px', overflow: 'hidden', background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', padding: '48px 24px', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 12px' }}>Newsletter</p>
              <h2 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold', margin: '0 0 12px', lineHeight: 1.2 }}>
                {subject || '欢迎加入我们'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
                探索更多精彩内容，获取独家优惠
              </p>
              <a href="#" style={{ display: 'inline-block', padding: '12px 32px', backgroundColor: 'white', color: '#667EEA', fontWeight: 'bold', fontSize: '14px', borderRadius: '9999px', textDecoration: 'none' }}>
                立即体验 →
              </a>
            </div>
          </div>

          {/* 正文内容 */}
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ color: '#374151', fontSize: '15px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {body}
            </div>
          </div>

          {/* CTA 按钮区 */}
          <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', gap: '12px' }}>
              <a href="#" style={{ display: 'inline-block', padding: '14px 28px', backgroundColor: '#667EEA', color: 'white', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(102,126,234,0.4)' }}>
                了解更多
              </a>
              <a href="#" style={{ display: 'inline-block', padding: '14px 28px', backgroundColor: 'transparent', color: '#667EEA', fontWeight: 'bold', fontSize: '14px', borderRadius: '8px', textDecoration: 'none', border: '2px solid #E5E7EB' }}>
                访问官网
              </a>
            </div>
          </div>

          {/* 分隔线 */}
          <div style={{ margin: '0 24px 24px', borderTop: '1px solid #E5E7EB', paddingTop: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* 社交图标 */}
            {['weibo', 'wechat', 'xiaohongshu'].map((platform, i) => (
              <a key={i} href="#" style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#6B7280">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              </a>
            ))}
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: '#F9FAFB', padding: '20px 24px', textAlign: 'center', borderTop: '1px solid #E5E7EB' }}>
            <p style={{ color: '#9CA3AF', fontSize: '11px', lineHeight: 1.8, margin: '0 0 8px' }}>
              您收到这封邮件，是因为您订阅了 {senderName} 的 Newsletter
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
              <a href="#" style={{ color: '#6B7280', fontSize: '11px', textDecoration: 'none' }}>隐私政策</a>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <a href="#" style={{ color: '#6B7280', fontSize: '11px', textDecoration: 'none' }}>服务条款</a>
              <span style={{ color: '#D1D5DB' }}>|</span>
              <a href="#" style={{ color: '#6B7280', fontSize: '11px', textDecoration: 'none' }}>联系我们</a>
            </div>
            <p style={{ color: '#D1D5DB', fontSize: '10px', margin: 0 }}>
              © 2024 {senderName} · 上海市浦东新区 · <a href="#" style={{ color: '#9CA3AF' }}>退订邮件</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
