/** 平台数据适配器 — 从 AgentResult.output 抽取平台结构化数据
 *
 * 解决的问题：预览组件需要封面、互动数、作者等元数据，但 currentResult.output
 * 是 Record<string, unknown>，各平台 Agent 后端可能输出不同字段名。
 *
 * 使用方式：
 *   const adapter = getAdapter('xiaohongshu');
 *   const data = adapter.extract(result);
 *   <XiaohongshuPreview content={...} data={data} />
 *
 * 设计原则：
 *   - 所有 extract 方法都是"尽力而为"：字段不存在就返回 null，绝不编造数据
 *   - 支持多字段别名（如 cover_url / cover / images[0]）以适配不同后端
 *   - 单一注册表，新增平台只需加一个 adapter
 */

import type { AgentResult, PlatformStructuredData } from '../../types';
import type { AdapterData } from './index';

// ── 单平台 Adapter ──
export interface PlatformAdapter {
  platformId: string;
  /** 从 AgentResult 中抽取该平台需要的结构化数据 */
  extract(result: AgentResult): AdapterData;
}

// ── 辅助：从 output 中按多个候选 key 抽取字符串字段 ──
function pickStr(output: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = output[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

/** 从 images 数组里取第一张 */
function pickImage(output: Record<string, unknown>): string | null {
  const direct = pickStr(output, 'cover_url', 'coverUrl', 'cover', 'image', 'thumbnail', 'thumb');
  if (direct) return direct;
  const arr = output.images ?? output.cover_images ?? output.media;
  if (Array.isArray(arr) && arr.length > 0) {
    const first = arr[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first && typeof (first as Record<string, unknown>).url === 'string') {
      return (first as Record<string, unknown>).url as string;
    }
  }
  return null;
}

/** 抽取标签 */
function pickTags(output: Record<string, unknown>): string[] {
  const arr = output.tags ?? output.topics ?? output.keywords ?? output.hashtags;
  if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === 'string');
  if (typeof arr === 'string') {
    return arr.split(/[,，\s#]+/).map(s => s.replace(/^#/, '').trim()).filter(Boolean);
  }
  return [];
}

/** 抽取 metrics */
function pickMetrics(output: Record<string, unknown>): AdapterData['metrics'] {
  const m = (output.metrics ?? output.stats ?? output.engagement) as Record<string, unknown> | undefined;
  if (!m || typeof m !== 'object') return null;
  const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v)) ? v : null;
  return {
    likes: num(m.likes ?? m.like_count ?? m.favorite_count),
    comments: num(m.comments ?? m.comment_count ?? m.reply_count),
    shares: num(m.shares ?? m.share_count ?? m.repost_count),
    views: num(m.views ?? m.view_count ?? m.read_count ?? m.impression_count),
    collects: num(m.collects ?? m.collect_count ?? m.bookmark_count ?? m.favorites),
  };
}

/** 抽取作者 */
function pickAuthor(output: Record<string, unknown>): AdapterData['author'] {
  const a = (output.author ?? output.user ?? output.account ?? output.creator ?? output.publisher) as Record<string, unknown> | undefined;
  if (!a || typeof a !== 'object') return null;
  return {
    name: typeof a.name === 'string' ? a.name : typeof a.nickname === 'string' ? a.nickname : null,
    avatar: typeof a.avatar === 'string' ? a.avatar : typeof a.avatar_url === 'string' ? a.avatar_url : null,
    verified: a.verified === true,
  };
}

/** 抽取发布时间 */
function pickTime(output: Record<string, unknown>): string | null {
  return pickStr(output, 'publish_time', 'publishTime', 'published_at', 'created_at', 'post_time');
}

/** 抽取标题 */
function pickTitle(output: Record<string, unknown>): string | null {
  return pickStr(output, 'title', 'headline', 'subject');
}

// ── 通用 extractor（5 个发布平台用同一份，只是 platformId 不同）──
function makePublishableAdapter(platformId: string): PlatformAdapter {
  return {
    platformId,
    extract(result: AgentResult): AdapterData {
      const output = result.output ?? {};
      // 兼容：output.structured 是新约定（后端结构化字段），否则直接从 output 抽取
      const structured = (output.structured ?? output) as PlatformStructuredData | Record<string, unknown>;
      const data: AdapterData = {
        cover: pickImage(output),
        title: pickTitle(structured as Record<string, unknown>) ?? pickTitle(output),
        tags: pickTags(structured as Record<string, unknown>).length ? pickTags(structured as Record<string, unknown>) : pickTags(output),
        metrics: pickMetrics(structured as Record<string, unknown>) ?? pickMetrics(output),
        author: pickAuthor(structured as Record<string, unknown>) ?? pickAuthor(output),
        publishTime: pickTime(structured as Record<string, unknown>) ?? pickTime(output),
      };
      return data;
    },
  };
}

// ── 注册表 ──
export const adapterRegistry: Record<string, PlatformAdapter> = {
  xiaohongshu: makePublishableAdapter('xiaohongshu'),
  wechat: makePublishableAdapter('wechat'),
  weibo: makePublishableAdapter('weibo'),
  douyin: makePublishableAdapter('douyin'),
  bilibili: makePublishableAdapter('bilibili'),
};

export function getAdapter(platform: string | null | undefined): PlatformAdapter | null {
  if (!platform) return null;
  return adapterRegistry[platform] ?? null;
}

/** 便捷函数：直接从 AgentResult 抽取 AdapterData（找不到 adapter 返回 null） */
export function extractAdapterData(
  platform: string | null | undefined,
  result: AgentResult | null,
): AdapterData | undefined {
  if (!result) return undefined;
  const adapter = getAdapter(platform);
  if (!adapter) return undefined;
  return adapter.extract(result);
}