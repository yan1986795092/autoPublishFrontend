/** StyleSkinPreview — 写作文体统一皮肤预览
 *
 * 9 个非发布渠道（copywriting / brand-story / ad-copy / fiction / script /
 * tech-doc / tutorial / email / seo）不再各自套场景壳，统一走 Markdown
 * 渲染 + 顶部文体标识栏 + 底部导出按钮组。
 *
 * 保留各文体的视觉差异只通过：
 *   - 顶部标签栏（icon + label + description）
 *   - 内容区的字体 / 间距 / 强调色
 *
 * 渲染逻辑由 ContentRenderer 接管（已有 copywriting/fiction/tech-doc/email
 * 专用渲染器），这里只负责壳。
 */

import type { PlatformPreviewProps } from './index';
import { ContentRenderer } from './ContentRenderer';
import { formatMetric } from './index';
import { Copy, FileDown, ChevronRight } from 'lucide-react';

/** 从 markdown 内容提取章节标题（## / ###），用于目录侧栏 */
function extractChapters(content: string): { level: number; title: string; idx: number }[] {
  const lines = content.split('\n');
  const chapters: { level: number; title: string; idx: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{2,3})\s+(.+)$/);
    if (m) chapters.push({ level: m[1].length, title: m[2].trim(), idx: i });
  }
  return chapters;
}

interface StyleSkin {
  icon: string;
  label: string;
  description: string;
  headerBg: string;
  headerText: string;
  borderColor: string;
  emphasis: string;
  fontFamily?: string;
}

const SKIN_MAP: Record<string, StyleSkin> = {
  copywriting: {
    icon: '📝', label: '产品文案', description: '卖点直接，看完就想买',
    headerBg: 'bg-blue-50', headerText: 'text-blue-700', borderColor: 'border-blue-200', emphasis: 'text-blue-600',
  },
  'brand-story': {
    icon: '💼', label: '品牌故事', description: '情感共鸣，让人记住你',
    headerBg: 'bg-purple-50', headerText: 'text-purple-700', borderColor: 'border-purple-200', emphasis: 'text-purple-600',
    fontFamily: 'Georgia, "Songti SC", serif',
  },
  'ad-copy': {
    icon: '📢', label: '广告文案', description: '信息流风格，1秒定胜负',
    headerBg: 'bg-orange-50', headerText: 'text-orange-700', borderColor: 'border-orange-200', emphasis: 'text-orange-600',
  },
  fiction: {
    icon: '📖', label: '小说故事', description: '情节抓人，让人想一口气读完',
    headerBg: 'bg-amber-50', headerText: 'text-amber-700', borderColor: 'border-amber-200', emphasis: 'text-amber-700',
    fontFamily: 'Georgia, "Songti SC", serif',
  },
  script: {
    icon: '🎬', label: '剧本脚本', description: '人物对白，场景还原',
    headerBg: 'bg-red-50', headerText: 'text-red-700', borderColor: 'border-red-200', emphasis: 'text-red-600',
    fontFamily: 'Courier New, monospace',
  },
  'tech-doc': {
    icon: '📘', label: '技术文档', description: '看完就能跑通代码',
    headerBg: 'bg-slate-100', headerText: 'text-slate-700', borderColor: 'border-slate-300', emphasis: 'text-slate-700',
    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  tutorial: {
    icon: '📗', label: '教程指南', description: '零基础也能学会',
    headerBg: 'bg-emerald-50', headerText: 'text-emerald-700', borderColor: 'border-emerald-200', emphasis: 'text-emerald-600',
  },
  email: {
    icon: '📧', label: '邮件营销', description: '打开率高，像朋友来信',
    headerBg: 'bg-indigo-50', headerText: 'text-indigo-700', borderColor: 'border-indigo-200', emphasis: 'text-indigo-600',
  },
  seo: {
    icon: '🔍', label: 'SEO 文章', description: '搜索排名好，读者也爱看',
    headerBg: 'bg-cyan-50', headerText: 'text-cyan-700', borderColor: 'border-cyan-200', emphasis: 'text-cyan-600',
  },
};

const DEFAULT_SKIN: StyleSkin = {
  icon: '📄', label: '文档', description: '',
  headerBg: 'bg-gray-50', headerText: 'text-gray-700', borderColor: 'border-gray-200', emphasis: 'text-gray-600',
};

function getSkin(contentType?: string): StyleSkin {
  if (!contentType) return DEFAULT_SKIN;
  return SKIN_MAP[contentType] ?? DEFAULT_SKIN;
}

export function StyleSkinPreview({ content, contentType, data, isPlaceholder }: PlatformPreviewProps) {
  const skin = getSkin(contentType);
  const wordCount = content?.length ?? 0;
  const chapters = contentType === 'tech-doc' ? extractChapters(content ?? '') : [];

  // TechDoc 特殊布局：左侧动态目录 + 右侧内容
  if (contentType === 'tech-doc' && chapters.length > 0) {
    return (
      <div className={`rounded-xl border ${skin.borderColor} bg-white overflow-hidden shadow-sm flex`}>
        {/* 左侧目录 */}
        <aside className="w-36 flex-shrink-0 bg-slate-50 border-r border-slate-200 py-3 max-h-[520px] overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">目录</p>
          <nav>
            {chapters.map((ch, i) => (
              <a
                key={i}
                href={`#chapter-${i}`}
                className={`block px-3 py-1 text-[11px] truncate transition-colors ${
                  ch.level === 2
                    ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 pl-5'
                }`}
                title={ch.title}
              >
                {ch.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* 右侧正文 */}
        <div
          className="flex-1 px-5 py-5 max-h-[480px] overflow-y-auto"
          style={skin.fontFamily ? { fontFamily: skin.fontFamily } : undefined}
        >
          {isPlaceholder ? (
            <PlaceholderSkeleton />
          ) : content ? (
            <ContentRenderer content={content} contentType={contentType} />
          ) : (
            <p className="text-sm text-gray-400 italic">（等待内容生成…）</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${skin.borderColor} bg-white overflow-hidden shadow-sm`}>
      {/* 顶部文体标识栏 */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${skin.headerBg} border-b ${skin.borderColor}`}>
        <span className="text-base leading-none">{skin.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${skin.headerText}`}>{skin.label}</span>
            {skin.description && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-[11px] text-gray-500">{skin.description}</span>
              </>
            )}
          </div>
          {wordCount > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {wordCount} 字
              {data?.metrics?.views != null && (
                <> · 阅读 {formatMetric(data.metrics.views)}</>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 内容区 */}
      <div
        className="px-5 py-5 max-h-[480px] overflow-y-auto"
        style={skin.fontFamily ? { fontFamily: skin.fontFamily } : undefined}
      >
        {isPlaceholder ? (
          <PlaceholderSkeleton />
        ) : content ? (
          <ContentRenderer content={content} contentType={contentType} />
        ) : (
          <p className="text-sm text-gray-400 italic">（等待内容生成…）</p>
        )}
      </div>

      {/* 底部操作栏 — 复制 / 导出 */}
      {!isPlaceholder && content && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(content)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-gray-600 hover:bg-white hover:text-gray-900 transition-colors border border-transparent hover:border-gray-200"
          >
            <Copy className="w-3 h-3" />
            复制全文
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-gray-600 hover:bg-white hover:text-gray-900 transition-colors border border-transparent hover:border-gray-200"
            title="导出 Markdown 文件"
          >
            <FileDown className="w-3 h-3" />
            Markdown
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-gray-600 hover:bg-white hover:text-gray-900 transition-colors border border-transparent hover:border-gray-200"
            title="查看更多格式"
          >
            更多
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function PlaceholderSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-11/12" />
      <div className="h-3 bg-gray-100 rounded w-10/12" />
      <div className="h-3 bg-gray-100 rounded w-9/12" />
      <div className="h-5 bg-gray-200 rounded w-1/3 mt-4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-8/12" />
    </div>
  );
}