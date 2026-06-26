import { useState } from 'react';
import { Textarea } from '../../ui/textarea';

export interface EditorContentProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorContent({ value, onChange }: EditorContentProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={[
        'rounded-lg border bg-app-elevated transition-all duration-150',
        focused
          ? 'border-primary-500/40 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]'
          : 'border-app-border hover:border-app-border-light',
      ].join(' ')}
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="在此输入内容…"
        aria-label="正文内容"
        className="min-h-[400px] text-sm leading-relaxed resize-y border-0 rounded-lg bg-transparent px-4 py-3 focus-visible:ring-0"
      />
    </div>
  );
}
