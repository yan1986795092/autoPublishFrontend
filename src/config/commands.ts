export interface Command {
  id: string;
  title: string;
  keys: string[];
  context: 'global' | 'editing' | 'agent-running' | 'home';
  description: string;
}

export const COMMANDS: Command[] = [
  { id: 'save', title: '保存', keys: ['Ctrl', 'S'], context: 'editing', description: '保存当前内容' },
  { id: 'new-content', title: '新建内容', keys: ['Ctrl', 'N'], context: 'global', description: '跳转到创作页' },
  { id: 'toggle-help', title: '快捷键帮助', keys: ['Ctrl', '/'], context: 'global', description: '打开快捷键面板' },
  { id: 'stop-agent', title: '停止 Agent', keys: ['Esc'], context: 'agent-running', description: '终止正在执行的任务' },
  { id: 'toggle-sidebar', title: '切换侧栏', keys: ['Ctrl', 'B'], context: 'global', description: '展开/收起侧栏' },
  { id: 'execute', title: '快速执行', keys: ['Ctrl', 'Enter'], context: 'home', description: '发送提示并执行' },
];

function getShortcutLabel(id: string): string {
  return COMMANDS.find((c) => c.id === id)?.title || id;
}

function getShortcutKeys(id: string): string[] {
  return COMMANDS.find((c) => c.id === id)?.keys || [];
}
