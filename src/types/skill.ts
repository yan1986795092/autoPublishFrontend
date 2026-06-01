// ===================== Skill System Types =====================

/** Skill 分类 */
export type SkillCategory = 'writing' | 'analysis' | 'coding' | 'research' | 'design' | 'social' | 'custom';

/** Skill 来源 */
export type SkillSource = 'builtin' | 'user' | 'imported';

/** Skill 元信息（列表展示用） */
export interface SkillMeta {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon: string;         // emoji
  source: SkillSource;  // 来源：内置/用户创建/外部导入
  author?: string;      // 第三方导入时显示作者
  version?: string;
  tags: string[];
  use_count: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** Skill 完整定义（包含执行相关字段） */
export interface Skill extends SkillMeta {
  /** 系统级提示词，拼接在 system prompt 之前 */
  system_prompt: string;
  /** 用户输入的 prompt 模板，{topic} / {content} 等占位符 */
  user_prompt_template?: string;
  /** 预设的执行计划模板（tasks 结构），空则由 orchestrator 自动规划 */
  preset_plan?: {
    complexity: 'simple' | 'medium' | 'complex';
    agent_sequence: string[];  // agent type 列表
  };
  /** 关联的 content type，为空则不限制 */
  content_types?: string[];
  /** Skill 的详细配置项（用户在 UI 上可覆盖） */
  config_schema?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    default?: unknown;
    options?: string[];
    description?: string;
  }>;
}

/** 导入 Skill 的输入（来自 URL 或文件） */
export interface SkillImportInput {
  source: 'url' | 'file';
  url?: string;
  file_content?: string;
  file_name?: string;
}

/** Skill 导入后的校验结果 */
export interface SkillImportResult {
  valid: boolean;
  skill?: Skill;
  errors?: string[];
  warnings?: string[];
}

/** 用户应用的 Skill 配置（运行时） */
export interface AppliedSkill {
  skill_id: string;
  skill_name: string;
  custom_config?: Record<string, unknown>;
}
