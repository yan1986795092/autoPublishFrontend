/** 模拟数据工厂
 *
 * 用途：
 *   - 选平台但未生成时，提供一套完整的模拟数据（正文+标题+标签+互动数+作者）
 *   - 真实模式：只补齐 null 字段，保留真实值
 *   - 模拟模式：始终返回完整模拟数据
 *
 * 设计原则：
 *   - 输入稳定：同样的 platform 永远产出同样的模拟数据
 *   - 平台差异：每个平台有专属的 metrics 量级、标签风格、作者形象
 */

import type { AdapterData } from './index';

// ── 简单确定性 PRNG（mulberry32）—— 输入 seed 永远产出同样的随机序列 ──
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── 平台调色板（每个平台生成对应的视觉氛围） ──
// ── 平台默认正文（末尾包含标签行，供 extractTags 分离） ──
// 模板自带占位正文：当 result.output.full_text 为空时（占位态），用此字符串
// 作为 fillMockData 的 content 入参，保证 mockContent 不是 'default' 这种哨兵。
export const DEFAULT_MOCK_CONTENT_RAW = `生活最美的样子，就是遇见更好的自己

在这个快节奏的时代，我们常常忘了停下来好好感受生活。其实幸福很简单，可能是清晨的一杯热咖啡，是傍晚的一场日落，是陌生人一个善意的微笑。

学会在平凡的日子里发现美好，是一种能力，也是一种智慧。

愿你眼里有光，心里有爱，把每一天都过成想要的样子。

[#示例标签]`;

const PLACEHOLDER_TAGS = ['示例标签'];

const PLATFORM_THEMES = {
  xiaohongshu: {
    authors: ['小桃红', '阿橙爱生活', '生活美学家', '元气少女Miya', '种草小能手', 'Lily的日常'],
    cities: ['上海', '北京', '杭州', '成都', '广州', '深圳', '重庆'],
    timeAgo: ['刚刚', '3 分钟前', '12 分钟前', '半小时前', '1 小时前', '2 小时前', '今天 09:24', '昨天 21:30'],
    metricBase: { likes: 1500, comments: 80, collects: 600, shares: 30 },
    spread: 3,
    tagPool: ['好物分享', '日常', '种草', '生活方式', '今日穿搭', '美食', '旅行', '护肤', 'vlog', 'plog'],
    defaultTitle: '生活最美的样子',
  },
  wechat: {
    authors: ['科技前沿观察', '产品经理沉思录', '人间清醒日报', '三联生活周刊', '晚点 LatePost', '远川研究所'],
    timeAgo: ['昨天', '2 天前', '3 天前', '上周', '上周五', '本月 12 日'],
    metricBase: { likes: 280, comments: 0, views: 58000, shares: 0 },
    spread: 2.5,
    tagPool: ['温暖治愈', '生活美学', '晚安文案', '人间值得'],
    defaultTitle: '深度好文',
  },
  weibo: {
    authors: ['娱乐圈大表姐', '科技新观察', '财经老法师', '健身教练阿伟', '旅行菌'],
    timeAgo: ['刚刚', '1 分钟前', '5 分钟前', '12 分钟前', '今天 10:24', '今天 08:00'],
    metricBase: { likes: 3500, comments: 240, shares: 120, collects: 0 },
    spread: 4,
    tagPool: ['今日份快乐', '生活记录', '分享', '热点', '日常碎碎念', '种草', '好物'],
    defaultTitle: '今日份分享',
  },
  douyin: {
    authors: ['生活妙招菌', '健身小张', '美食阿May', '探店北京', '科技大叔', '萌宠日记'],
    timeAgo: ['刚刚', '30 分钟前', '1 小时前', '今天 18:00', '昨天 23:45'],
    metricBase: { likes: 28000, comments: 850, shares: 2400, collects: 0 },
    spread: 5,
    tagPool: ['生活小妙招', '干货分享', '美食教程', '健身打卡', '好物种草', '旅行vlog'],
    defaultTitle: '温暖治愈计划',
  },
  bilibili: {
    authors: ['影视飓风', '罗翔说刑法', '硬核的半佛仙人', '老番茄', '影视区UP主阿斗', '科技美学'],
    timeAgo: ['刚刚', '2 小时前', '今天 12:00', '昨天', '3 天前'],
    metricBase: { likes: 12500, comments: 2100, shares: 4800, views: 142000, collects: 0 },
    spread: 3.5,
    tagPool: ['知识科普', '必看推荐', '硬核分享', '深度解读'],
    defaultTitle: '必看推荐',
  },
  copywriting: {
    authors: ['品牌官方', '产品运营组'],
    metricBase: { views: 0 },
    spread: 1,
    tagPool: ['限时优惠', '新品上市', '福利活动'],
    defaultTitle: '限时优惠',
  },
  default: {
    authors: ['AI 创作者'],
    metricBase: {},
    spread: 1,
    tagPool: ['AI创作', '效率工具', '科技前沿', '实用技巧'],
    defaultTitle: '精选内容',
  },
} as const;

type PlatformKey = keyof typeof PLATFORM_THEMES;

function getTheme(platform: string | null | undefined) {
  const k = (platform as PlatformKey) ?? 'default';
  return PLATFORM_THEMES[k] ?? PLATFORM_THEMES.default;
}

// ── 头像：用首字母 + 渐变色，模拟各平台常见头像风格 ──
const AVATAR_COLORS: Array<[string, string]> = [
  ['#FF6B6B', '#FFB4A2'],  // 红橙
  ['#4ECDC4', '#A8E6CF'],  // 青绿
  ['#FFD93D', '#FFEEA8'],  // 暖黄
  ['#A78BFA', '#DDD6FE'],  // 紫
  ['#60A5FA', '#BFDBFE'],  // 蓝
  ['#F472B6', '#FBCFE8'],  // 粉
];

// ── 主入口：为指定平台生成完整 mock AdapterData ──
//
// 注意：tags **默认返回空数组**。
// 占位标签（`[#示例标签]` / `温暖治愈/生活美学/晚安文案/人间值得`）是 mock 视觉骨架，
// 不应该被当作产物数据的兜底——产物没标签时必须留空，由上层 UI 决定是否提示"未设置"。
export function fillMockData(
  platform: string | null | undefined,
  content: string,
  _existing?: AdapterData,
): AdapterData {
  const theme = getTheme(platform);
  const rng = makeRng(hashStr(`${platform ?? 'unknown'}::${content.slice(0, 80)}`));

  const authorName = pick(rng, [...theme.authors]);

  const metrics: AdapterData['metrics'] = {
    likes: pickMetric(rng, 'likes', theme.metricBase.likes, theme.spread),
    comments: pickMetric(rng, 'comments', theme.metricBase.comments, theme.spread),
    shares: pickMetric(rng, 'shares', theme.metricBase.shares, theme.spread),
    views: pickMetric(rng, 'views', theme.metricBase.views, theme.spread),
    collects: pickMetric(rng, 'collects', (theme.metricBase as Record<string, number>).collects ?? 0, theme.spread),
  };

  const title = existingTitle(content) || theme.defaultTitle;
// 注意：tags 是模板自带的"占位标签"（从正文 hash 派生），
// 不是产物数据。产物真实 tags 由调用方通过 AdapterData.tags 传入并覆盖；
// 这里只补齐元数据骨架，给用户一个"看起来正常"的初始视觉。
// 用 hash 派生是为了不同 prompt 跑出来的默认标签不一样，避免所有产物
// 都显示同一批"温暖治愈/生活美学/晚安文案/人间值得"。
const tags: string[] = (() => {
  // 32 个通用占位标签池（按 hash 稳定抽样 2-4 个）
  const pool = [
    '日常分享', '生活记录', '随笔', '点滴感悟',
    '午后时光', '城市漫步', '窗边随想', '周末心情',
    '笔记整理', '心得体会', '读书摘抄', '片段记录',
    '思考碎片', '经验分享', '方法总结', '踩坑记录',
    '成长日记', '自我提升', '习惯养成', '计划复盘',
    '工作随笔', '创作灵感', '设计笔记', '产品思考',
    '学习心得', '技能进阶', '工具心得', '效率实践',
    '生活美学', '灵感速写', '心情碎片', '夜读笔记',
  ];
  const seedRng = makeRng(hashStr(`tags::${platform ?? 'unknown'}::${content.slice(0, 120)}`));
  const count = 2 + Math.floor(seedRng() * 3); // 2~4 个
  const picked: string[] = [];
  const used = new Set<number>();
  while (picked.length < count && used.size < pool.length) {
    let idx = Math.floor(seedRng() * pool.length);
    while (used.has(idx)) idx = (idx + 1) % pool.length;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
})();
  const publishTime = 'timeAgo' in theme ? pick(rng, [...theme.timeAgo]) : null;

  return {
    cover: null,
    title,
    tags,
    metrics,
    author: {
      name: authorName,
      avatar: pickAvatar(rng, authorName, platform),
      verified: platform === 'weibo' || platform === 'wechat' ? rng() > 0.3 : rng() > 0.7,
    },
    publishTime,
    mockContent: content || DEFAULT_MOCK_CONTENT_RAW,
  };
}

function existingTitle(content: string): string | null {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const first = lines[0];
  const cleaned = first.replace(/^#+\s*/, '');
  if (cleaned.length <= 60 && cleaned.length >= 4) return cleaned;
  if (lines[1]) {
    const second = lines[1].replace(/^#+\s*/, '');
    if (second.length <= 60 && second.length >= 4) return second;
  }
  return null;
}

function pickMetric(rng: () => number, _key: string, base: number, spread: number): number | null {
  if (!base) return null;
  const factor = 0.5 + rng() * spread;
  return Math.round(base * factor);
}

function extractTags(content: string): { tags: string[]; content: string } {
  // 支持 #xxx #yyy、#xxx  或单 tag 占位 [#示例标签]
  const tagPattern = /^\s*(?:#[^\s#]+(?:\s+#[^\s#]+)*|\[#?[^\]]+\])\s*$/;
  const lines = content.split('\n');
  const tagLines: string[] = [];
  const bodyLines: string[] = [];
  for (const line of lines) {
    if (tagPattern.test(line)) {
      const raw = line.trim().replace(/^\[|\]$/g, '');
      const tokens = raw.split(/\s+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
      tagLines.push(...tokens);
    } else {
      bodyLines.push(line);
    }
  }
  return {
    tags: tagLines,
    content: bodyLines.join('\n'),
  };
}

function pickTags(rng: () => number, pool: readonly string[], content: string): string[] {
  const count = 2 + Math.floor(rng() * 3); // 2~4 个
  const picked: string[] = [];
  // 简单抽样：不重复
  const used = new Set<number>();
  for (let i = 0; i < count && used.size < pool.length; i++) {
    let idx = Math.floor(rng() * pool.length);
    while (used.has(idx)) idx = (idx + 1) % pool.length;
    used.add(idx);
    picked.push(pool[idx]);
  }
  // 若内容里有 #tag，也合并进去
  const inlineTags = content.match(/#[^#\s]+/g)?.map(t => t.replace(/^#/, '')).filter(Boolean) ?? [];
  return [...new Set([...picked, ...inlineTags])];
}

/** 为指定名字生成一张稳定的远程头像 URL
 *
 * 策略：
 * - 用名字 hash 作为 seed，挑一个稳定的头像服务 URL
 * - 优先使用 DiceBear（SVG，可离线缓存，符合 UI 设计预期）+ 备选 i.pravatar
 * - 服务对中文/英文名字都支持（DiceBear 用 initials 风格时只用 ASCII 哈希）
 */
function pickAvatar(rng: () => number, name: string, platform?: string | null): string {
  const seed = hashStr(name || 'default');
  // 平台专属风格：让小红书/微博/抖音/B站头像看起来不一样
  const styleByPlatform: Record<string, string> = {
    xiaohongshu: 'shapes',   // 几何图形（小红书偏设计感）
    weibo: 'avataaars',       // 卡通人偶（微博偏生活感）
    douyin: 'fun-emoji',      // emoji 风格（抖音偏年轻活泼）
    bilibili: 'bottts',       // 机器人/萌系（B站偏二次元）
    wechat: 'notionists',     // 中性插画（公众号偏专业）
  };
  const style = styleByPlatform[(platform as string) ?? ''] ?? 'avataaars';
  // dicebear 8.x — https://api.dicebear.com/8.x/{style}/svg?seed={seed}
  return `https://api.dicebear.com/8.x/${style}/svg?seed=${seed}&backgroundType=gradientLinear&radius=50`;
}

/** 从平台名获取示例头像配色（用于将来扩展头像渐变） */
export function mockAvatarGradient(name: string): [string, string] {
  const rng = makeRng(hashStr(name || 'default'));
  return AVATAR_COLORS[Math.floor(rng() * AVATAR_COLORS.length)];
}

// ── 抖音评论池 ──
export interface MockComment {
  author: string;
  avatarColor: [string, string];
  body: string;
  likes: number;
  time: string;
  replies: MockComment[];
}

const DOUYIN_COMMENT_BODIES = [
  '写得真好，看哭了😭',
  '这也太真实了吧',
  '收藏了慢慢看',
  '太有道理了，点赞！',
  '终于有人说出来了',
  '这文案绝了，运镜也很棒',
  '我也遇到过一模一样的情况',
  '建议大家都看看',
  '写得很有深度，支持',
  '这个一定要艾特闺蜜来看',
  '太戳心了',
  '写得真好，已点赞',
  '转发出去了哈哈哈',
  '这就是我想要的感觉',
  '太真实了 呜呜',
  '神仙文案！',
  '狠狠共情了',
  '这个话题太戳了',
];

const DOUYIN_COMMENT_AUTHORS = [
  '星河漫步', '晴天娃娃', '晚风吹过', '小确幸', '云边杂货铺',
  '森林来信', '月下独酌', '晴天见', '时光旅客', '流浪猫日记',
  '深海鱼', '风铃草', '草莓甜心', '追光者', '人间烟火气',
];

export function generateDouyinComments(
  content: string,
  existingComments?: MockComment[],
): MockComment[] {
  const rng = makeRng(hashStr(`douyin-comments::${content.slice(0, 80)}`));
  const count = existingComments?.length ?? (3 + Math.floor(rng() * 4)); // 3~6条

  if (existingComments && existingComments.length >= 3) return existingComments;

  return Array.from({ length: count }, (_, i) => {
    const author = DOUYIN_COMMENT_AUTHORS[Math.floor(rng() * DOUYIN_COMMENT_AUTHORS.length)];
    const avatarColor = AVATAR_COLORS[Math.floor(rng() * AVATAR_COLORS.length)];
    const body = DOUYIN_COMMENT_BODIES[Math.floor(rng() * DOUYIN_COMMENT_BODIES.length)];
    const likes = Math.round(10 + rng() * 5000);
    const times = ['刚刚', '3分钟前', '10分钟前', '30分钟前', '1小时前', '今天', '昨天'];
    const time = times[Math.floor(rng() * times.length)];

    const replyCount = rng() > 0.6 ? Math.floor(rng() * 3) + 1 : 0;
    const replies: MockComment[] = Array.from({ length: replyCount }, () => ({
      author: DOUYIN_COMMENT_AUTHORS[Math.floor(rng() * DOUYIN_COMMENT_AUTHORS.length)],
      avatarColor: AVATAR_COLORS[Math.floor(rng() * AVATAR_COLORS.length)],
      body: DOUYIN_COMMENT_BODIES[Math.floor(rng() * DOUYIN_COMMENT_BODIES.length)],
      likes: Math.round(rng() * 200),
      time: times[Math.floor(rng() * times.length)],
      replies: [],
    }));

    return { author, avatarColor, body, likes, time, replies };
  });
}