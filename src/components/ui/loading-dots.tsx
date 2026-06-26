interface LoadingDotsProps {
  color?: string;
  size?: number;
  label?: string;
}

export function LoadingDots({ color = 'currentColor', size = 6, label = '加载中' }: LoadingDotsProps) {
  return (
    <span className="flex gap-0.5 items-center" role="status" aria-label={label}>
      <span
        className="rounded-full animate-bounce"
        style={{ width: size, height: size, backgroundColor: color, animationDelay: '0ms' }}
      />
      <span
        className="rounded-full animate-bounce"
        style={{ width: size, height: size, backgroundColor: color, animationDelay: '150ms' }}
      />
      <span
        className="rounded-full animate-bounce"
        style={{ width: size, height: size, backgroundColor: color, animationDelay: '300ms' }}
      />
    </span>
  );
}
