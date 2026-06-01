/**
 * Agent 元数据注册表 — 唯一数据源
 *
 * 所有组件通过 getAgentMeta() / getAgentColor() 等函数引用，
 * 新增 agent 类型只改此文件。
 */

export interface AgentMeta {
  id: string;
  label: string;
  labelCn: string;
  icon: string;        // emoji
  iconName: string;    // lucide icon name
  color: string;       // tailwind classes for AgentThinkingPanel
  actionDesc: { running: string; done: string };
}

export const AGENT_REGISTRY: AgentMeta[] = [
  {
    id: 'ManagerAgent',
    label: 'Manager',
    labelCn: '规划',
    icon: '🧠',
    iconName: 'list-checks',
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    actionDesc: { running: '🧠 规划任务中', done: '✓ 任务规划完成' },
  },
  {
    id: 'WritingAgent',
    label: 'Writing',
    labelCn: '写作',
    icon: '✍️',
    iconName: 'pen',
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    actionDesc: { running: '✍️ 撰写内容中', done: '✓ 内容撰写完成' },
  },
  {
    id: 'SEOAgent',
    label: 'SEO',
    labelCn: 'SEO',
    icon: '🔍',
    iconName: 'search',
    color: 'text-green-400 border-green-500/30 bg-green-500/10',
    actionDesc: { running: '🔍 SEO 优化中', done: '✓ SEO 优化完成' },
  },
  {
    id: 'DiagramAgent',
    label: 'Diagram',
    labelCn: '图表',
    icon: '📊',
    iconName: 'bar-chart',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    actionDesc: { running: '📊 生成图表中', done: '✓ 图表生成完成' },
  },
  {
    id: 'ReviewAgent',
    label: 'Review',
    labelCn: '审核',
    icon: '✅',
    iconName: 'check',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    actionDesc: { running: '✅ 审核内容中', done: '✓ 审核通过' },
  },
  {
    id: 'WebSearch',
    label: 'Search',
    labelCn: '搜索',
    icon: '🌐',
    iconName: 'globe',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    actionDesc: { running: '🔍 搜索相关文章', done: '✓ 搜索完成' },
  },
  {
    id: 'ImageAgent',
    label: 'Image',
    labelCn: '配图',
    icon: '🎨',
    iconName: 'image',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    actionDesc: { running: '🎨 生成配图中', done: '✓ 配图生成完成' },
  },
  {
    id: 'CodeAgent',
    label: 'Code',
    labelCn: '代码',
    icon: '💻',
    iconName: 'code',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    actionDesc: { running: '💻 编写代码中', done: '✓ 代码编写完成' },
  },
  {
    id: 'HotTopicAgent',
    label: 'HotTopic',
    labelCn: '热点',
    icon: '🔥',
    iconName: 'flame',
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    actionDesc: { running: '🔥 分析热点中', done: '✓ 热点分析完成' },
  },
  {
    id: 'PlatformAdapter',
    label: 'Adapt',
    labelCn: '适配',
    icon: '📱',
    iconName: 'smartphone',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    actionDesc: { running: '📱 平台适配中', done: '✓ 平台适配完成' },
  },
  {
    id: 'TranslationAgent',
    label: 'Translate',
    labelCn: '翻译',
    icon: '🌏',
    iconName: 'languages',
    color: 'text-pink-400 border-pink-500/30 bg-pink-500/10',
    actionDesc: { running: '🌏 翻译中', done: '✓ 翻译完成' },
  },
  {
    id: 'URLCrawler',
    label: 'Crawler',
    labelCn: '抓取',
    icon: '🔗',
    iconName: 'link',
    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    actionDesc: { running: '🔗 抓取网页中', done: '✓ 抓取完成' },
  },
];

/* ─── 查找函数 ─── */

export function getAgentMeta(agentType: string): AgentMeta {
  const found = AGENT_REGISTRY.find(a => agentType.includes(a.id));
  return found ?? {
    id: 'unknown',
    label: agentType,
    labelCn: agentType,
    icon: '🤖',
    iconName: 'bot',
    color: 'text-gray-400 border-gray-500/30 bg-gray-500/10',
    actionDesc: { running: '⏳ 执行中...', done: '✓ 完成' },
  };
}

export function getAgentIcon(agentType: string): string {
  return getAgentMeta(agentType).icon;
}

export function getAgentIconName(agentType: string): string {
  return getAgentMeta(agentType).iconName;
}

export function getAgentLabel(agentType: string): string {
  return getAgentMeta(agentType).labelCn;
}

export function getAgentColor(agentType: string): string {
  return getAgentMeta(agentType).color;
}

export function getAgentActionDesc(agentType: string, status: string): string {
  const meta = getAgentMeta(agentType);
  if (status === 'done' || status === 'completed') return meta.actionDesc.done;
  if (status === 'failed') return '✗ 执行失败';
  return meta.actionDesc.running;
}

/** 兼容 ThinkingStep action 标签映射 */
export const AGENT_ACTION_LABELS: Record<string, string> = {
  decompose: '任务拆解',
  analyze_task: '分析任务',
  generate: '生成内容',
  execute_plan: '执行计划',
  merge_and_validate: '合并与验证',
  validate: '质量检查',
  choose_diagram_type: '选择图表类型',
  generate_diagram: '生成图表',
  keyword_research: '关键词研究',
  seo_score: 'SEO 评分',
  optimize: '优化建议',
  fetch_trending: '获取热榜',
  filter_topics: '筛选话题',
  analyze_trends: '趋势分析',
  validate_language: '语言验证',
};
