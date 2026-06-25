// ─── Content Editor Types ─────────────────────────────────

export interface ContentStats {
  charCount: number;
  chineseChars: number;
  englishWords: number;
  paragraphs: number;
  headings: number;
  links: number;
  readingTime: number;
}

export function computeContentStats(md: string): ContentStats {
  const text = md || '';
  return {
    charCount: Array.from(text).length,
    chineseChars: (text.match(/[一-鿿]/g) || []).length,
    englishWords: (text.match(/[a-zA-Z]+/g) || []).length,
    paragraphs: text.split(/\n\s*\n/).filter(p => p.trim()).length || 1,
    headings: (text.match(/^#{1,6}\s+/gm) || []).length,
    links: (text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length,
    readingTime: Math.max(1, Math.ceil(Array.from(text).length / 500)),
  };
}

export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    rewrite: '改写', expand: '扩写', summarize: '总结',
    translate: '翻译', tone: '语调优化', headlines: '生成标题',
    seo: 'SEO 分析', tags: '标签推荐', banned: '违禁词检测',
  };
  return labels[action] || action;
}

export interface MoreMenuProps {
  onExportMd: () => void;
  onCopyContent: () => void;
  onHistory: () => void;
  onPublishHistory: () => void;
  onDelete: () => void;
}

export interface SEOAnalysisResult {
  overall: number;
  suggestions: string[];
}

export interface DiffLine {
  type: string;
  text: string;
}

export interface PublishRecord {
  id: string;
  platform_code: string;
  status: string;
  platform_url?: string;
  published_at?: string;
  created_at: string;
}

export type AiEditAction =
  | 'rewrite' | 'expand' | 'summarize'
  | 'translate' | 'tone'
  | 'headlines' | 'seo' | 'tags' | 'banned';
