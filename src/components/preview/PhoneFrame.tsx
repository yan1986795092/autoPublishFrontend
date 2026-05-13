import { type ReactNode } from 'react';
import { cn } from '../../utils/helpers';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  variant?: 'mobile' | 'desktop';
}

export function PhoneFrame({ children, className, variant = 'mobile' }: PhoneFrameProps) {
  if (variant === 'desktop') {
    return (
      <div className={cn('bg-white rounded-xl shadow-xl overflow-hidden', className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex justify-center', className)}>
      <div className="relative w-[375px] min-h-[700px] bg-white rounded-[44px] shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Status bar */}
        <div className="relative h-11 bg-white flex items-center justify-between px-6 text-[11px] text-black font-medium select-none">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <rect x="0.5" y="0.5" width="15" height="11" rx="2" stroke="black" strokeOpacity="0.35" />
              <rect x="1" y="1" width="8" height="10" rx="1.5" fill="black" fillOpacity="0.9" />
              <rect x="11" y="4" width="1" height="5" rx="0.5" fill="black" fillOpacity="0.3" />
              <rect x="13" y="2" width="1" height="7" rx="0.5" fill="black" fillOpacity="0.3" />
            </svg>
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
              <path d="M7 1C3.5 1 1 4 1 6s2.5 5 6 5 6-3 6-5-2.5-5-6-5z" fill="black" fillOpacity="0.9" />
              <path d="M7 2.5C4.5 2.5 2.5 5 2.5 6s2 3.5 4.5 3.5S11.5 8 11.5 6 9.5 2.5 7 2.5z" fill="#34c759" />
            </svg>
          </div>
        </div>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-black rounded-b-[18px] z-10">
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#1a1a1a]" />
        </div>
        {/* Content */}
        <div className="relative bg-white min-h-[660px]">
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black/20 rounded-full" />
      </div>
    </div>
  );
}
