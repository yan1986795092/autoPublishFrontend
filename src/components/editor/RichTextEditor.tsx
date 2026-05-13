import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { SlashMenuExtension } from './SlashMenuExtension';
import { SlashMenuPopover } from './SlashMenuPopover';
import { BannedWordHighlighter } from './BannedWordHighlighter';
import { HeadlineGenerator } from './HeadlineGenerator';
import { SEOScorePanel } from './SEOScorePanel';
import { useEditorStore } from '../../stores/useEditorStore';
import { ScrollArea } from '../ui/scroll-area';
import { useEffect, useRef } from 'react';

/** 基础 Markdown → HTML 转换（块级元素 + 行内元素 + 段落包裹） */
function mdToHtml(md: string): string {
  if (!md.trim()) return '';
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  let html = escaped
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  // 按空行分块，非块级元素用 <p> 包裹
  return html.split(/\n\n+/).map(block => {
    const t = block.trim();
    if (!t) return '';
    if (/^<(h[1-6]|pre|blockquote|ul|ol|li)>/.test(t)) return t;
    return `<p>${t.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

export function RichTextEditor() {
  const { content_md, setContent, setEditorInstance } = useEditorStore();
  const isProgrammaticUpdate = useRef(false);
  const externalContentRef = useRef('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: '在这里编辑你的内容...',
      }),
      SlashMenuExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isProgrammaticUpdate.current) return;
      const md = editor.getText();
      // Mark as synced so external-sync effect skips (prevents cursor jump)
      externalContentRef.current = md;
      setContent(md, editor.getHTML(), editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3 text-app-text focus:border-primary-500 [&_.ProseMirror]:text-app-text [&_.ProseMirror_p]:text-app-text [&_.ProseMirror_h1]:text-app-text [&_.ProseMirror_h2]:text-app-text [&_.ProseMirror_h3]:text-app-text [&_.ProseMirror_strong]:text-app-text [&_.ProseMirror_em]:text-app-text [&_.ProseMirror_u]:text-app-text [&_.ProseMirror_s]:text-app-text [&_.ProseMirror_a]:text-primary-500 [&_.ProseMirror_blockquote]:text-app-text [&_.ProseMirror_code]:text-app-text [&_.ProseMirror_pre]:bg-app-elevated [&_.ProseMirror_ul]:text-app-text [&_.ProseMirror_ol]:text-app-text [&_.ProseMirror_li]:text-app-text',
      },
    },
  });

  // Sync external content changes to editor (NOT user edits — avoids cursor jump)
  useEffect(() => {
    if (!editor) return;
    if (content_md === externalContentRef.current) return; // Already in sync
    isProgrammaticUpdate.current = true;
    externalContentRef.current = content_md;
    editor.commands.setContent(mdToHtml(content_md));
    isProgrammaticUpdate.current = false;
  }, [content_md, editor]);

  // Share editor instance via store
  useEffect(() => {
    setEditorInstance(editor);
    return () => setEditorInstance(null);
  }, [editor, setEditorInstance]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full relative">
      <EditorToolbar editor={editor} />
      <SlashMenuPopover editor={editor} />
      <BannedWordHighlighter editor={editor} />
      <ScrollArea className="flex-1 bg-transparent">
        <div className="bg-transparent border border-transparent focus-within:border-primary-500 rounded-md transition-colors [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:text-app-text [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-app-text-tertiary [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none">
          <EditorContent editor={editor} className="min-h-[300px]" />
        </div>
      </ScrollArea>
      <HeadlineGenerator editor={editor} />
      <SEOScorePanel editor={editor} />
    </div>
  );
}
