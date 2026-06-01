import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';

export interface MenuItem {
  label: string;
  icon: string;
  description: string;
  command: (editor: Editor) => void;
}

export interface SlashMenuStorage {
  isOpen: boolean;
  position: { top: number; left: number };
  query: string;
  selectedIndex: number;
  slashPos: number;
}

export const SLASH_MENU_ITEMS: MenuItem[] = [
  {
    label: '标题 1', icon: 'H1', description: '一级标题',
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: '标题 2', icon: 'H2', description: '二级标题',
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: '标题 3', icon: 'H3', description: '三级标题',
    command: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: '无序列表', icon: '•', description: '项目符号列表',
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: '有序列表', icon: '1.', description: '编号列表',
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: '引用', icon: '"', description: '添加引用块',
    command: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: '代码块', icon: '</>', description: '添加代码块',
    command: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: '分割线', icon: '—', description: '插入水平分割线',
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

function runItemCommand(editor: Editor, storage: SlashMenuStorage) {
  const { slashPos } = storage;
  storage.isOpen = false;

  const { $from } = editor.state.selection;
  const endPos = $from.pos;

  if (slashPos >= 0 && endPos > slashPos) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.chain().focus().command(({ tr }: any) => {
      tr.delete(slashPos, endPos);
      return true;
    }).run();
  }
}

export const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addStorage(): SlashMenuStorage {
    return {
      isOpen: false,
      position: { top: 0, left: 0 },
      query: '',
      selectedIndex: 0,
      slashPos: -1,
    };
  },

  onUpdate() {
    const storage = this.storage as SlashMenuStorage;
    const { selection } = this.editor.state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);

    const slashIndex = textBefore.lastIndexOf('/');
    if (slashIndex >= 0 && (slashIndex === 0 || textBefore[slashIndex - 1] === ' ')) {
      const query = textBefore.slice(slashIndex + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        const coords = this.editor.view.coordsAtPos($from.pos);
        const editorRect = this.editor.view.dom.getBoundingClientRect();
        storage.isOpen = true;
        storage.query = query;
        storage.slashPos = $from.pos - query.length - 1;
        storage.selectedIndex = 0;
        storage.position = {
          top: coords.bottom - editorRect.top,
          left: coords.left - editorRect.left,
        };
        return;
      }
    }

    if (storage.isOpen) {
      storage.isOpen = false;
    }
  },

  addKeyboardShortcuts() {
    const storage = this.storage as SlashMenuStorage;
    const editor = this.editor;
    const items = SLASH_MENU_ITEMS;
    return {
      Enter: () => {
        if (storage.isOpen) {
          const item = items[storage.selectedIndex];
          if (item) {
            runItemCommand(editor, storage);
            item.command(editor);
          }
          return true;
        }
        return false;
      },
      ArrowUp: () => {
        if (storage.isOpen) {
          storage.selectedIndex = Math.max(0, storage.selectedIndex - 1);
          return true;
        }
        return false;
      },
      ArrowDown: () => {
        if (storage.isOpen) {
          storage.selectedIndex = Math.min(items.length - 1, storage.selectedIndex + 1);
          return true;
        }
        return false;
      },
      Escape: () => {
        if (storage.isOpen) {
          storage.isOpen = false;
          return true;
        }
        return false;
      },
    };
  },
});
