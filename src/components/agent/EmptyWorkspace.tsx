import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Button } from '../ui/button';
import {
  PUBLISHABLE_PLATFORMS,
  CONTENT_STYLES,
  PROFESSIONAL_STYLES,
  type Platform,
} from './PlatformSelector';
import { PlatformIcon } from './PlatformIcons';

// ── Prompt 模板库（点击卡片时填入输入框的示例 prompt） ──
const PROMPT_TEMPLATES: Record<string, string> = {
  xiaohongshu: '推荐一款我最近在用的降噪耳机，戴上后整个世界都安静了',
  wechat:      '聊聊 AI 工具如何改变了我的日常工作流',
  weibo:       '今日份小确幸：通勤路上听完了整张专辑',
  douyin:      '写一段 60 秒的短视频脚本，介绍一个 5 分钟做早餐的技巧',
  bilibili:    '做一期科普视频，解释为什么猫咪能从高处安全落地',
  copywriting: '为我们的新品无线蓝牙耳机写一段 50 字的产品卖点文案',
  'brand-story': '讲一个关于创业者在凌晨 3 点重新站起来的品牌故事',
  'ad-copy':   '为限时折扣活动写一条有紧迫感的广告文案，不超过 30 字',
  fiction:     '续写：地铁门关上的那一刻，她发现包里多了一张陌生人的纸条',
  script:      '写一段两分钟的广告脚本，产品是一款面向职场新人的时间管理 App',
  'tech-doc':  '为 Vue 3 的 Composition API 写一份技术设计文档',
  tutorial:    '写一篇完整的 React Hooks 入门教程，从 useState 到 useEffect',
  email:       '写一封季末促销邮件，引导用户续费年度会员',
  seo:         '针对「如何选择机械键盘」这个关键词，写一篇 SEO 友好的文章',
};

// ── 动画配置 ──
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ── 单张平台/文体卡片 ──
function TemplateCard({
  platform,
  isSelected,
  onSelect,
}: {
  platform: Platform;
  isSelected: boolean;
  onSelect: (prompt: string, platformId: string) => void;
}) {
  const prompt = PROMPT_TEMPLATES[platform.id] ?? '';
  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={() => onSelect(prompt, platform.id)}
      className={cn(
        'group flex flex-col items-start gap-2 rounded-xl border',
        'px-4 py-3 text-left transition-all duration-200',
        isSelected
          ? 'border-primary-500/60 bg-primary-500/10 hover:bg-primary-500/15 hover:border-primary-500/80'
          : 'border-app-border/60 bg-app-surface/60 hover:bg-app-elevated hover:border-primary-500/40',
      )}
    >
      <div className="flex items-center gap-2">
        <PlatformIcon id={platform.id} size={18} />
        <span className="text-xs font-semibold text-app-text">{platform.label}</span>
      </div>
      <p className="text-[10px] leading-relaxed text-app-text-tertiary line-clamp-2">
        {platform.hint}
      </p>
    </motion.button>
  );
}

// ── 引导页主组件 ──
interface EmptyWorkspaceProps {
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
  onSelect: (s: string) => void;
}

export function EmptyWorkspace({ selectedPlatform, onSelectPlatform, onSelect }: EmptyWorkspaceProps) {
  const handleSelect = (prompt: string, platformId: string) => {
    onSelect(prompt);
    onSelectPlatform(platformId);
  };

  // 修复 BUG-26：把 staggered children 控制权放在每个 section 自己的父容器
  // （而非依赖一个全局父容器传播 variants），这样任意顺序渲染都不会丢 stagger。
  const sectionVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
  };

  return (
    <div className="flex flex-col items-center py-6 text-center">
      {/* ── 标题 ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={0}
        className="mb-5"
      >
        <h2 className="text-base font-semibold text-app-text mb-1.5">
          你想写点什么？
        </h2>
        <p className="text-xs text-app-text-secondary leading-relaxed max-w-sm mx-auto">
          选择一个平台或文体，立刻开始创作
        </p>
      </motion.div>

      {/* ── 社媒平台（5 卡横排，可滚动） ── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-3xl mb-3"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">社交平台</span>
          <span className="text-[10px] text-app-text-tertiary">可一键发布</span>
        </motion.div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {PUBLISHABLE_PLATFORMS.map((p) => (
            <TemplateCard key={p.id} platform={p} isSelected={selectedPlatform === p.id} onSelect={handleSelect} />
          ))}
        </div>
      </motion.div>

      {/* ── 文体卡片（7 卡网格） ── */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-3xl mb-5"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">写作文体</span>
          <span className="text-[10px] text-app-text-tertiary">多场景创作</span>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[...CONTENT_STYLES, ...PROFESSIONAL_STYLES].map((p) => (
            <TemplateCard key={p.id} platform={p} isSelected={selectedPlatform === p.id} onSelect={handleSelect} />
          ))}
        </div>
      </motion.div>

      {/* ── 主 CTA ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        custom={4}
        className="w-full max-w-md"
      >
        <Button
          variant="gradient"
          size="xl"
          onClick={() => handleSelect('写一篇关于 ', '')}
          className="w-full justify-between px-5 group"
          aria-label="从示例 prompt 开始：点击后将示例文本放入输入框"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>从一句话开始</span>
          </span>
          <span className="text-xs text-primary-200/70 group-hover:opacity-0 transition-opacity">
            或直接描述你的需求
          </span>
        </Button>
      </motion.div>
    </div>
  );
}