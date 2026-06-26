/** ContentRenderer — 按 content_type 渲染正文内容
 *
 * 平台 Shell 组件在渲染正文区域时使用此组件，
 * 根据内容类型应用不同的排版样式（如产品文案高亮价格/卖点、技术文档用代码块等）。
 *
 * content_type = "" 或未识别时返回纯文本（默认行为）。
 */

import React from 'react';

interface ContentRendererProps {
  content: string;
  contentType?: string;
}

/** 是否为卖点清单行（以 · - * 数字. 开头） */
function isBulletLine(line: string): boolean {
  return /^[·\-*•]\s/.test(line) || /^\d[\.、]\s/.test(line);
}

/** 是否为价格行 */
function isPriceLine(line: string): boolean {
  return /^[\$¥￥]/.test(line) || /限时|特惠|到手[价只]/.test(line);
}

/** 是否为 CTA 行（号召性用语） */
function isCTALine(line: string): boolean {
  return /^(立即|马上|限时|点击|注册|购买|下载|免费|试用|抢购|获取|咨询|了解|下单)/i.test(line)
    && line.length < 50;
}

/** 是否为小标题（短行，不以标点结尾） */
function isSubHeadline(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 40) return false;
  if (/^#+\s/.test(trimmed)) return true;
  if (/[。！？，、：；]$/.test(trimmed)) return false;
  if (/^[\s*·\-•\d.]+$/.test(trimmed)) return false;
  return true;
}

// ── 各类型渲染器 ──

function DefaultRenderer({ lines }: { lines: string[] }) {
  return (
    <div className="whitespace-pre-wrap text-[13px] leading-6">
      {lines.map((line, i) => (
        <p key={i} className="mb-1">{line || ' '}</p>
      ))}
    </div>
  );
}

/** 产品文案：高亮价格、卖点清单 ✓、CTA 强调 */
function CopywritingRenderer({ lines }: { lines: string[] }) {
  return (
    <div className="text-[13px] leading-6">
      {lines.map((line, i) => {
        if (!line.trim()) return <p key={i} className="mb-1">&nbsp;</p>;
        if (isCTALine(line)) {
          return (
            <p key={i} className="mb-2 mt-1">
              <span className="inline-block px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-[12px] font-bold shadow">
                {line}
              </span>
            </p>
          );
        }
        if (isPriceLine(line)) {
          const price = line.replace(/[\$¥￥]/, '');
          return (
            <p key={i} className="mb-1.5">
              <span className="inline-flex items-baseline gap-1 px-2 py-0.5 rounded bg-red-50 text-red-500 font-bold">
                <span className="text-[10px]">¥</span>
                <span className="text-[18px]">{price.replace(/[^0-9.]/g, '')}</span>
                {price.includes('限时') && <span className="text-[10px] ml-1">限时</span>}
              </span>
            </p>
          );
        }
        if (isBulletLine(line)) {
          const text = line.replace(/^[·\-*•\d、.\s]+/, '');
          return (
            <p key={i} className="flex items-start gap-1.5 mb-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="#3B82F6"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </span>
              <span className="flex-1 text-gray-700">{text}</span>
            </p>
          );
        }
        if (isSubHeadline(line)) {
          return (
            <p key={i} className="text-[14px] font-bold text-gray-800 mb-1 mt-2">
              {line.replace(/^#+\s*/, '')}
            </p>
          );
        }
        return <p key={i} className="mb-1 text-gray-700">{line}</p>;
      })}
    </div>
  );
}

/** 技术文档：代码块样式、note 提示、步骤编号 */
function TechDocRenderer({ lines }: { lines: string[] }) {
  let inCodeBlock = false;
  const blocks: React.ReactNode[] = [];
  let blockIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      if (!inCodeBlock) {
        // end of code block — close it in the next iteration
      }
      continue;
    }
    if (inCodeBlock) {
      // Collect code lines
      const codeLines: string[] = [line];
      while (i + 1 < lines.length && !lines[i + 1].trim().startsWith('```')) {
        i++;
        codeLines.push(lines[i]);
      }
      blocks.push(
        <pre key={blockIdx++} className="mb-3 p-3 rounded-lg bg-gray-900 text-gray-100 text-[11px] leading-5 overflow-x-auto font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; // skip closing ```
      continue;
    }
    if (/^(注意|提示|Tip|Note|警告|Caution):/i.test(line.trim())) {
      blocks.push(
        <div key={blockIdx++} className="mb-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[12px] text-amber-800 flex items-start gap-2">
          <span className="text-amber-500 flex-shrink-0">💡</span>
          <span>{line.replace(/^(注意|提示|Tip|Note|警告|Caution):\s*/i, '')}</span>
        </div>
      );
      continue;
    }
    if (isSubHeadline(line)) {
      blocks.push(
        <p key={blockIdx++} className="text-[14px] font-bold text-gray-800 mb-1 mt-2">
          {line.replace(/^#+\s*/, '')}
        </p>
      );
      continue;
    }
    if (/^\d[\.、]\s/.test(line.trim())) {
      blocks.push(
        <p key={blockIdx++} className="flex items-start gap-2 mb-1.5 text-[13px] text-gray-700">
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
            {line.trim().match(/^\d+/)?.[0]}
          </span>
          <span className="flex-1">{line.replace(/^\d[\.、]\s*/, '')}</span>
        </p>
      );
      continue;
    }
    blocks.push(
      <p key={blockIdx++} className="mb-1 text-[13px] text-gray-700 leading-6">{line || ' '}</p>
    );
  }
  return <div>{blocks}</div>;
}

/** 小说故事：段落间距 + 引号样式 */
function FictionRenderer({ lines }: { lines: string[] }) {
  const paragraphs: React.ReactNode[] = [];
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      idx++;
      continue;
    }
    // 对话行（引号开头）
    if (/^[「『""]/.test(line)) {
      paragraphs.push(
        <p key={idx++} className="mb-2 text-[13px] text-gray-700 leading-7 pl-3 border-l-2 border-gray-200 italic">
          {line}
        </p>
      );
    } else {
      paragraphs.push(
        <p key={idx++} className="mb-2 text-[13px] text-gray-700 leading-7 text-justify indent-2">
          {line}
        </p>
      );
    }
  }
  return <div>{paragraphs}</div>;
}

/** 邮件营销：主题行高亮 + 署名区 */
function EmailRenderer({ lines }: { lines: string[] }) {
  const blocks: React.ReactNode[] = [];
  let idx = 0;
  let inSignature = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { idx++; continue; }

    // 主题行（第一行或 ## 开头）
    if (i === 0 || /^##?\s*主题/.test(line)) {
      blocks.push(
        <p key={idx++} className="mb-2 text-[14px] font-bold text-gray-800 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
          📧 {line.replace(/^##?\s*主题[：:]\s*/, '')}
        </p>
      );
      continue;
    }

    // 署名区
    if (/^(此致|敬礼|祝|Best|Cheers|谢谢|感谢)/i.test(line) || inSignature) {
      inSignature = true;
      blocks.push(
        <p key={idx++} className="mb-1 text-[12px] text-gray-500">{line}</p>
      );
      continue;
    }

    // CTA
    if (isCTALine(line)) {
      blocks.push(
        <p key={idx++} className="mb-2 mt-1">
          <span className="inline-block px-5 py-2 rounded-lg bg-blue-600 text-white text-[12px] font-bold shadow">
            {line}
          </span>
        </p>
      );
      continue;
    }

    blocks.push(
      <p key={idx++} className="mb-1.5 text-[13px] text-gray-700 leading-6">{line}</p>
    );
  }
  return <div className="max-w-[95%]">{blocks}</div>;
}

const RENDERER_MAP: Record<string, React.FC<{ lines: string[] }>> = {
  copywriting: CopywritingRenderer,
  'brand-story': DefaultRenderer,
  'ad-copy': DefaultRenderer,
  fiction: FictionRenderer,
  script: DefaultRenderer,
  'tech-doc': TechDocRenderer,
  tutorial: TechDocRenderer,
  email: EmailRenderer,
  seo: DefaultRenderer,
};

export function ContentRenderer({ content, contentType = '' }: ContentRendererProps) {
  const lines = content.split('\n');
  const Renderer = contentType ? RENDERER_MAP[contentType] : null;

  if (Renderer) {
    return <Renderer lines={lines} />;
  }

  // 默认：纯文本
  return (
    <div className="whitespace-pre-wrap text-[13px] leading-6 text-gray-700">
      {lines.map((line, i) => (
        <p key={i} className="mb-1">{line || ' '}</p>
      ))}
    </div>
  );
}
