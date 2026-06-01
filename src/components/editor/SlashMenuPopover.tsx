import { Editor } from '@tiptap/react';
import { SLASH_MENU_ITEMS } from './SlashMenuExtension';
import type { SlashMenuStorage } from './SlashMenuExtension';
import { cn } from '../../utils/helpers';

interface Props {
  editor: Editor | null;
}

export function SlashMenuPopover({ editor }: Props) {
  if (!editor) return null;

  const storage = (editor.storage as unknown as { slashMenu: SlashMenuStorage }).slashMenu;

  if (!storage.isOpen) return null;

  const filtered = storage.query
    ? SLASH_MENU_ITEMS.filter((item) =>
        item.label.includes(storage.query),
      )
    : SLASH_MENU_ITEMS;

  if (filtered.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => { storage.isOpen = false; editor.commands.focus(); }} />
      <div
        className="absolute z-50 w-48 bg-app-elevated border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden py-1"
        style={{
          top: Math.max(0, Math.min(storage.position.top, 300)),
          left: Math.max(0, storage.position.left),
        }}
      >
        {filtered.map((item, i) => (
          <button
            key={item.label}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[11px] transition-colors',
              i === storage.selectedIndex
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-app-text hover:bg-white/[0.06]',
            )}
            onClick={() => {
              storage.isOpen = false;
              const { state } = editor;
              const { $from } = state.selection;
              const endPos = $from.pos;
              const slashPos = ((editor.storage as unknown as { slashMenu: SlashMenuStorage }).slashMenu).slashPos;
              if (slashPos >= 0 && endPos > slashPos) {
                editor.chain().focus().command(({ tr }) => {
                  tr.delete(slashPos, endPos);
                  return true;
                }).run();
              }
              item.command(editor);
            }}
            onMouseEnter={() => { storage.selectedIndex = i; }}
          >
            <span className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-[10px] font-mono text-app-text-secondary shrink-0">
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium">{item.label}</div>
              <div className="text-[8px] text-app-text-tertiary truncate">{item.description}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
