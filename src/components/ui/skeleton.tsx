interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className = '', lines = 1 }: SkeletonProps) {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-full bg-app-surface"
          style={{
            width: i === lines - 1 && lines > 1 ? '75%' : `${60 + (i * 17) % 35}%`,
          }}
        />
      ))}
    </div>
  );
}

/** 列表骨架屏 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-app-border bg-app-elevated p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-app-surface animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/3 rounded-full bg-app-surface animate-pulse" />
              <div className="h-2 w-1/3 rounded-full bg-app-surface animate-pulse" />
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-app-surface animate-pulse" />
          <div className="h-2 w-4/5 rounded-full bg-app-surface animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/** Agent 运行中消息气泡骨架屏 */
export function MessageBubbleSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] w-full rounded-xl border border-app-border/40 bg-app-elevated p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-app-surface animate-pulse" />
          <div className="h-3 w-16 rounded-full bg-app-surface animate-pulse" />
        </div>
        <div className="space-y-2 pl-5">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-app-surface animate-pulse flex-shrink-0" />
              <div className="flex-1 h-3 rounded-full bg-app-surface animate-pulse" style={{ width: `${40 + i * 20}%` }} />
            </div>
          ))}
        </div>
        <div className="space-y-2 pl-5 border-t border-app-border/30 pt-3">
          <Skeleton lines={3} />
        </div>
      </div>
    </div>
  );
}

/** AI 思考中的对话气泡骨架 */
export function ChatBubbleSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-2xl rounded-tl-sm border border-app-border/40 bg-app-elevated px-4 py-3 space-y-2">
        <Skeleton lines={2} />
      </div>
    </div>
  );
}

/** 编辑器内容卡片骨架 */
export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-app-border bg-app-elevated p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-app-surface animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded-full bg-app-surface animate-pulse" />
            <div className="h-2 w-20 rounded-full bg-app-surface animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-app-surface animate-pulse" />
      </div>
    </div>
  );
}

/** 多行文本骨架 */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-app-border bg-app-elevated p-4">
      <Skeleton lines={lines} />
    </div>
  );
}
