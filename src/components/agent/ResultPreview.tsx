import { Eye } from 'lucide-react';
import type { AgentResult } from '../../types';
import { getPreviewComponent } from '../preview/index';
import { fillMockData } from '../preview/mockDataFactory';
import type { AdapterData } from '../preview/index';

interface ResultPreviewProps {
  result: AgentResult | null;
  selectedPlatform: string | null;
  selectedContentType?: string | null;
  /** 占位态：true 时组件渲染骨架/引导，不传死字符串内容 */
  isPlaceholder?: boolean;
}

/**
 * 统一手机壳 + 平台 App 适配
 *
 * 关键原则：
 * - 外层只画**系统级 UI**（手机边框、刘海、状态栏、Home 指示条）
 * - 内层直接渲染平台 App 真实界面，**不嵌套圆角、不重复画顶栏**
 * - 每个平台决定自己适配什么样的 App 顶栏 / 底部 Tab
 */
export function ResultPreview({
  result,
  selectedPlatform,
  selectedContentType,
  isPlaceholder = false,
}: ResultPreviewProps) {
  const previewKey = selectedPlatform || selectedContentType || null;

  if (!result && !isPlaceholder) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Eye className="w-8 h-8 text-app-text-tertiary mb-2" />
        <p className="text-xs text-app-text-tertiary">执行完成后查看预览</p>
      </div>
    );
  }

  const content = result
    ? (result.output?.full_text as string) ||
      (result.output?.content as string) ||
      JSON.stringify(result.output, null, 2)
    : '';

  // 始终用 mock 数据作为 base（包含完整的作者/互动数/标签）
  let data: AdapterData | undefined;
  if (selectedPlatform) {
    data = fillMockData(selectedPlatform, content || 'default');
  } else {
    data = undefined;
  }

  // 合并真实数据：有真实结果时用真实数据覆盖，否则保留完整 mock
  if (result && data) {
    const realTitle = extractRealTitle(result);
    const realTags = extractRealTags(result);
    if (realTitle || realTags.length > 0) {
      data = {
        ...data,
        title: realTitle || data.title,
        tags: realTags.length > 0 ? realTags : data.tags,
      };
    }
  }

  // content：优先真实，没有时用 mockContent
  const displayContent = content || data?.mockContent || '';

  return (
    <div className="relative w-full">
      {!result && (
        <div className="absolute top-2 right-2 z-40 px-2 py-0.5 rounded bg-yellow-400/90 text-yellow-900 text-[9px] font-bold shadow-sm pointer-events-none">
          预览示意 · 数据为模拟
        </div>
      )}
      <PhoneFrame>
        {(() => {
          const PC = getPreviewComponent(previewKey);
          return <PC content={displayContent} contentType={selectedContentType || undefined} data={data} isPlaceholder={isPlaceholder} />;
        })()}
      </PhoneFrame>
    </div>
  );
}

// ── 从真实结果提取标题 ──
function extractRealTitle(result: AgentResult): string | null {
  const output = result.output as Record<string, unknown>;
  if (typeof output?.topic === 'string' && output.topic.trim()) return output.topic.trim();
  const text = (output?.full_text as string) || (output?.content as string) || '';
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const first = lines[0].replace(/^#+\s*/, '');
  if (first.length >= 4 && first.length <= 60) return first;
  if (lines[1]) {
    const second = lines[1].replace(/^#+\s*/, '');
    if (second.length >= 4 && second.length <= 60) return second;
  }
  return null;
}

// ── 从真实结果提取标签 ──
function extractRealTags(result: AgentResult): string[] {
  const output = result.output as Record<string, unknown>;
  if (Array.isArray(output?.tags)) return output.tags as string[];
  const text = (output?.full_text as string) || (output?.content as string) || '';
  const tags = text.match(/#[^#\s]+/g) ?? [];
  return tags.slice(0, 4);
}

// ── 统一手机壳 ──
// 只画系统级 UI：边框、刘海、状态栏、底部 Home 指示条
// 内部就是平台 App 的真实界面
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[300px] h-[600px] rounded-[2.5rem] bg-neutral-900 p-[7px] shadow-2xl shadow-black/50 relative border border-neutral-800 mx-auto">
      <div className="w-full h-full rounded-[2rem] bg-white relative flex flex-col overflow-hidden">
        {/* 刘海 — 更真实的灵动岛样式 */}
        <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-30 w-[110px] h-[28px] bg-black rounded-[20px] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
        </div>
        {/* 系统状态栏 — iPhone 真实布局 */}
        <div className="shrink-0 h-[44px] flex items-center justify-between px-8 pt-[13px] pb-0.5 bg-white text-[11px] text-black font-semibold tracking-tight relative z-20">
          <span className="tabular-nums">9:41</span>
          <div className="flex items-center gap-1.5">
            {/* 信号 */}
            <svg width="14" height="10" viewBox="0 0 17 12" fill="currentColor">
              <path d="M1 8h2v4H1zm4-3h2v7H5zm4-4h2v11H9zm4-1h2v12h-2z"/>
            </svg>
            {/* WiFi */}
            <svg width="14" height="10" viewBox="0 0 15 12" fill="currentColor">
              <path d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm3.5-2.5a5 5 0 00-7 0l-1.5-1.5a7 7 0 0110 0L11 8zm3-3a10 10 0 00-13 0L-.5 3.5a12 12 0 0116 0L14 5z"/>
            </svg>
            {/* 电池 */}
            <svg width="22" height="11" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="0.5" y="0.5" width="18" height="11" rx="2.5"/>
              <path d="M21 4.5v3"/>
              <rect x="2.5" y="2.5" width="12" height="7" rx="1.5" fill="currentColor"/>
            </svg>
          </div>
        </div>
        {/* 内容区 */}
        <div className="flex-1 min-h-0 bg-white relative">
          {children}
        </div>
        {/* Home 指示条 */}
        <div className="shrink-0 h-[32px] flex justify-center items-center bg-white">
          <div className="w-[120px] h-[5px] rounded-full bg-neutral-300/60" />
        </div>
      </div>
    </div>
  );
}