import * as React from 'react';
import { cn } from '../../utils/helpers';

interface AvatarProps {
  name?: string;
  email?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  editable?: boolean;
}

const sizeMap = {
  xs: { outer: 'w-6 h-6', inner: 'text-[10px]', icon: 'w-3 h-3' },
  sm: { outer: 'w-8 h-8', inner: 'text-xs', icon: 'w-3.5 h-3.5' },
  md: { outer: 'w-10 h-10', inner: 'text-sm', icon: 'w-4 h-4' },
  lg: { outer: 'w-16 h-16', inner: 'text-xl', icon: 'w-6 h-6' },
  xl: { outer: 'w-20 h-20', inner: 'text-2xl', icon: 'w-7 h-7' },
};

const gradientMap: Record<string, string> = {
  a: 'from-blue-600 to-blue-500',
  b: 'from-violet-600 to-violet-500',
  c: 'from-emerald-600 to-emerald-500',
  d: 'from-amber-600 to-amber-500',
  e: 'from-rose-600 to-rose-500',
  f: 'from-cyan-600 to-cyan-500',
  g: 'from-indigo-600 to-indigo-500',
  h: 'from-pink-600 to-pink-500',
  i: 'from-teal-600 to-teal-500',
  j: 'from-orange-600 to-orange-500',
};

function getGradient(name: string): string {
  const first = (name || 'U').charAt(0).toLowerCase();
  return gradientMap[first] || 'from-primary-600 to-primary-500';
}

function getInitial(name?: string, email?: string): string {
  const src = name || email || '';
  return src.charAt(0).toUpperCase() || 'U';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, email, src, size = 'md', className, onClick, editable }, ref) => {
    const sizes = sizeMap[size];
    const initial = getInitial(name, email);
    const gradient = getGradient(name || email || 'U');

    const content = src ? (
      <img
        src={src}
        alt={name || email || 'avatar'}
        className={cn('rounded-xl object-cover', sizes.outer)}
      />
    ) : (
      <div
        className={cn(
          'rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-white shadow-sm shrink-0',
          gradient,
          sizes.outer,
          sizes.inner,
          className
        )}
      >
        {initial}
      </div>
    );

    if (editable || onClick) {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          className={cn(
            'relative group rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
            sizes.outer,
            className
          )}
        >
          {content}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
            <svg
              className={cn('text-white', sizes.icon)}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
        </button>
      );
    }

    return (
      <div ref={ref} className={cn('shrink-0', className)}>
        {content}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
