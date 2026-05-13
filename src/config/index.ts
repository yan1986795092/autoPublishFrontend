export const APP_CONFIG = {
  name: 'AutoPublish',
  version: '2.0.0',
  defaultPlatform: 'xiaohongshu' as const,
  supportedPlatforms: ['xiaohongshu', 'wechat', 'zhihu'] as const,
  contentTypes: ['blog', 'social_post', 'newsletter', 'report', 'copywriting', 'script'] as const,
  defaultModel: 'gpt-4o-mini',
  maxFreeGenerations: 10,
} as const;

export const ROUTES = {
  home: '/',
  login: '/login',
  agent: '/agent',
  agentStudio: '/agent-studio',
  agentHistory: '/agent-history',
  contentEdit: '/content/:id',
  contentManagement: '/contents',
  settings: '/settings',
  templates: '/templates',
} as const;

export const API_TIMEOUTS = {
  default: 30_000,
  agent: 300_000, // 5 min for LLM calls
  stream: 120_000,
} as const;
