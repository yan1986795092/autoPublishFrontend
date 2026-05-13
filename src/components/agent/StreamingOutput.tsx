import { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';

export function StreamingOutput({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef(text);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    textRef.current = text;
    let i = displayedText.length;
    intervalRef.current = setInterval(() => {
      i += 5;
      if (i >= textRef.current.length) {
        setDisplayedText(textRef.current);
        clearInterval(intervalRef.current);
      } else {
        setDisplayedText(textRef.current.slice(0, i));
      }
    }, 15);
    return () => clearInterval(intervalRef.current);
  }, [text]);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div className="rounded-xl border border-app-border bg-app-elevated p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs text-app-text-secondary">实时生成中...</span>
      </div>
      <div className="prose prose-invert max-w-none text-sm text-app-text-secondary leading-relaxed">
        <Markdown>{displayedText}</Markdown>
      </div>
      <div className="mt-2 h-px bg-gradient-to-r from-blue-500 via-purple-500 to-transparent animate-pulse" />
    </div>
  );
}
