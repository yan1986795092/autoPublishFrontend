import { Textarea } from '../../ui/textarea';

export interface EditorContentProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorContent({ value, onChange }: EditorContentProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="在此输入内容…"
      aria-label="正文内容"
      className="min-h-[400px] font-mono text-sm leading-relaxed resize-y border-0 rounded-none focus-visible:ring-0 bg-transparent px-4 py-3"
    />
  );
}
