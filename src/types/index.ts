export interface User {
  id: string;
  email: string;
  nickname?: string;
  quota_daily: number;
  quota_used_today: number;
}

export interface Platform {
  code: string;
  name: string;
  icon_url?: string;
  category: string;
  is_mock: boolean;
  is_active: boolean;
}

export interface Content {
  id: string;
  title?: string;
  topic?: string;
  platform_code?: string;
  content_md?: string;
  content_html?: string;
  content_json?: object;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  view_count?: number;
  like_count?: number;
}

export interface ContentVersion {
  id: string;
  version_number: number;
  content_md?: string;
  content_html?: string;
  change_summary?: string;
  created_at: string;
}

export interface GenerateParams {
  length: 'short' | 'medium' | 'long';
  creativity: number;
  tone: 'friendly' | 'professional' | 'humorous';

  // 高级定制
  target_audience?: 'beginner' | 'intermediate' | 'expert';
  keywords?: string;
  reference_style?: 'informative' | 'storytelling' | 'case-study' | 'guide' | 'collection' | 'immersive' | 'advice-seeking' | 'challenge';
  content_structure?: 'intro-body-conclusion' | 'problem-solution' | 'listicle' | 'flexible';
  call_to_action?: 'ask-follow' | 'ask-share' | 'ask-save' | 'none';
  brand_voice_name?: string;
  language_style?: 'formal' | 'neutral' | 'casual';
  point_of_view?: 'first-person' | 'third-person' | 'brand';
  persona_id?: string;
}

export interface ModelInfo {
  provider: string;
  name: string;
  models: string[];
  available: boolean;
}

export interface ModelsResponse {
  providers: ModelInfo[];
}

export interface PresetListItem {
  id: string;
  name: string;
  description?: string;
  platform_code?: string;
  use_count: number;
  created_at: string;
}

export interface PresetDetail extends PresetListItem {
  parameters: GenerateParams & { topic?: string };
  template_id?: string;
}

export interface GenerateRequest {
  topic: string;
  platform_code: string;
  template_id?: string;
  model?: string;
  parameters?: GenerateParams;
}

export interface GenerateResponse {
  content_id: string;
  title: string;
  content_md: string;
  content_html: string;
  metadata: {
    model: string;
    tokens_used: number;
    tokens_cost_usd: number;
    generation_time_ms: number;
  };
}

export interface PublishRequest {
  content_id: string;
  platform_code: string;
  publish_mode: 'draft' | 'publish';
}

export interface PublishResponse {
  publish_record_id: string;
  status: string;
  platform: string;
  mode: string;
  platform_post_id?: string;
  platform_url?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface SEOScore {
  overall: number;
  title_score: number;
  keyword_score: number;
  readability_score: number;
  engagement_score: number;
  suggestions: Array<{ type: 'warning' | 'error' | 'info'; message: string }>;
}

export interface Persona {
  id: string;
  name: string;
  description?: string;
  tone?: string;
  style_notes?: string;
  is_active: boolean;
  use_count: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface HotTopic {
  title: string;
  category: string;
  heat: number;
  heat_formatted: string;
  trend: 'up' | 'down' | 'stable';
  tags: string[];
}

// ===================== Agent System Types =====================

export type {
  AgentTask,
  ExecutionPlan,
  ThinkingStep,
  AgentUsage,
  AgentResult,
  AsyncTask,
  ChatMessage,
  PreviousGeneration,
  ContentType,
  ContentStyle,
  StreamEvent,
  LLMChunk,
  ReasoningChunk,
  StreamToolUse,
  PlanEventData,
  ThinkingStepEventData,
  ProgressEventData,
  ResultEventData,
  ErrorEventData,
  LLMToolEventData,
  AgentMetrics,
} from './agent';

export type {
  Skill,
  SkillMeta,
  SkillCategory,
  SkillSource,
  SkillImportInput,
  SkillImportResult,
  AppliedSkill,
} from './skill';

// ===================== Operations Center Types =====================

export type {
  ProductionMetrics,
  DailyProductionTrend,
  PlatformProduction,
  PublishingMetrics,
  PlatformHealth,
  PublishFailure,
  CostMetrics,
  TokenDailyTrend,
  CostStage,
  CostDailyDetail,
} from './operations';

// ===================== Chat/Conversation Types =====================

export type {
  ChatMessageRecord,
  ChatConversationSummary,
  ChatConversationDetail,
} from '../services/api';
