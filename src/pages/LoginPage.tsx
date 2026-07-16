import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import {
  Loader2, Mail, Lock, User,
  ArrowRight, BookOpen, X,
  Sparkles, Layers, BarChart3,
  Wand2, Send, Globe, Eye,
  MessageSquare, Cpu, Link2,
  TrendingUp, TrendingDown, Heart,
  Check, Copy, RefreshCw,
} from 'lucide-react';
import { Switch } from '../components/ui/switch';

// ── Demo modal content ──────────────────────────────────────
type DemoType = 'ai' | 'publish' | 'analytics';

function DemoModal({ type, onClose }: { type: DemoType; onClose: () => void }) {
  const demos = {
    ai: {
      title: 'AI 智能创作',
      icon: Sparkles,
      color: 'indigo',
      description: '输入主题，AI 自动为你生成高质量、多风格的内容',
      features: [
        { icon: Wand2, label: '智能生成', desc: '基于大语言模型，理解语境，生成流畅自然的文案' },
        { icon: MessageSquare, label: '多场景适配', desc: '社交媒体、技术文章、产品卖点，一键切换风格' },
        { icon: Cpu, label: '持续优化', desc: '根据反馈迭代内容，直到你满意为止' },
      ],
      preview: {
        title: '输入主题',
        input: '分享一个提高工作效率的小技巧',
        output: [
          '💡 番茄工作法：专注 25 分钟，休息 5 分钟',
          '',
          '• 设置计时器，在一个番茄时间内只做一件事',
          '• 完成后打勾记录，积累成就感',
          '• 每 4 个番茄后休息 15-30 分钟',
          '',
          '坚持一周，你会发现专注力明显提升！',
        ],
      },
    },
    publish: {
      title: '多平台发布',
      icon: Layers,
      color: 'purple',
      description: '一次创作，同步发布到 10+ 主流内容平台',
      features: [
        { icon: Send, label: '一键多发', desc: '选择平台，点击发布，自动适配各平台格式' },
        { icon: Globe, label: '平台覆盖', desc: '微博、小红书、知乎、抖音、B站等主流平台' },
        { icon: Link2, label: '智能排版', desc: '自动识别图片、链接、视频，适配各平台样式' },
      ],
      preview: {
        title: '选择平台，一键发布',
        platforms: [
          { name: '微博', emoji: '📱', checked: true },
          { name: '小红书', emoji: '📸', checked: true },
          { name: '知乎', emoji: '💬', checked: true },
          { name: '抖音', emoji: '🎵', checked: false },
          { name: 'B站', emoji: '📺', checked: false },
        ],
      },
    },
    analytics: {
      title: '数据洞察',
      icon: BarChart3,
      color: 'emerald',
      description: '统一查看所有平台的内容表现，数据驱动创作优化',
      features: [
        { icon: Eye, label: '全景数据', desc: '阅读量、互动、评论、分享，所有数据一目了然' },
        { icon: TrendingUp, label: '趋势分析', desc: '追踪内容表现，发现最佳发布时机' },
        { icon: Heart, label: '互动洞察', desc: '了解用户喜好，持续优化内容方向' },
      ],
      preview: {
        title: '数据总览',
        stats: [
          { label: '总阅读', value: '128.5K', trend: '+12.3%' },
          { label: '总互动', value: '8.2K', trend: '+8.7%' },
          { label: '互动率', value: '6.4%', trend: '+2.1%' },
        ],
        chart: [
          { name: 'Mon', value: 65 },
          { name: 'Tue', value: 78 },
          { name: 'Wed', value: 52 },
          { name: 'Thu', value: 91 },
          { name: 'Fri', value: 84 },
          { name: 'Sat', value: 73 },
          { name: 'Sun', value: 96 },
        ],
      },
    },
  };

  const demo = demos[type];
  const Icon = demo.icon;
  const colorMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-purple-600',
    purple: 'from-purple-500 to-pink-600',
    emerald: 'from-emerald-500 to-green-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', duration: 0.45, bounce: 0.1 }}
        className="relative bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorMap[demo.color]} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{demo.title}</h2>
            <p className="text-sm text-white/40 mt-0.5">{demo.description}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Features */}
          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">核心能力</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {demo.features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <f.icon className={`w-5 h-5 mb-2 text-${demo.color}-400`} />
                  <div className="text-sm font-medium text-white/80">{f.label}</div>
                  <div className="text-xs text-white/40 mt-1 leading-relaxed">{f.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider mb-3">界面预览</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]"
            >
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>
                <span className="text-xs text-white/30 ml-2">{demo.preview.title}</span>
              </div>

              <div className="p-5">
                {type === 'ai' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-white/30 mb-1.5">主题输入</p>
                      <div className="bg-white/[0.04] rounded-lg p-3 text-sm text-white/60">
                        {demo.preview.input}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1.5">生成结果</p>
                      <div className="bg-white/[0.04] rounded-lg p-3">
                        {(demo.preview.output as string[]).map((line, i) => (
                          <p key={i} className={`text-sm text-white/70 ${line ? '' : 'h-2'}`}>{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {type === 'publish' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {(demo.preview.platforms as { name: string; emoji: string; checked: boolean }[]).map(p => (
                        <div
                          key={p.name}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                            p.checked
                              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                              : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                          }`}
                        >
                          {p.emoji}
                          {p.name}
                          {p.checked && <Check className="w-3.5 h-3.5 ml-0.5" />}
                        </div>
                      ))}
                    </div>
                    <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium">
                      一键发布至 3 个平台
                    </button>
                  </div>
                )}

                {type === 'analytics' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {(demo.preview.stats as { label: string; value: string; trend: string }[]).map(s => (
                        <div key={s.label} className="bg-white/[0.04] rounded-lg p-3">
                          <div className="text-lg font-semibold text-white">{s.value}</div>
                          <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
                          <div className="text-xs text-green-400 mt-1">{s.trend}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end gap-1.5 h-20">
                      {(demo.preview.chart as { name: string; value: number }[]).map((d, i) => (
                        <motion.div
                          key={d.name}
                          initial={{ height: 0 }}
                          animate={{ height: `${d.value}%` }}
                          transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500/60 to-indigo-400/80"
                        />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {(demo.preview.chart as { name: string; value: number }[]).map(d => (
                        <span key={d.name} className="flex-1 text-center text-xs text-white/30">{d.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-sm text-white/40">登录后即可使用全部功能</p>
          <Button variant="primary" size="sm" onClick={onClose} className="h-9 px-4 rounded-lg">
            知道了
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Glass card ─────────────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
    >
      {children}
    </div>
  );
}

// ── Icon badge ─────────────────────────────────────────────
function IconBadge({ icon: Icon, color = 'blue' }: { icon: React.ElementType; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border backdrop-blur-sm ${colors[color]}`}>
      <Icon className="w-5 h-5" />
    </div>
  );
}

// ── Animated word ───────────────────────────────────────────
function AnimatedWord({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex overflow-hidden">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </span>
  );
}

// ── Terms dialog ────────────────────────────────────────────
interface TermsDialogProps {
  type: 'terms' | 'privacy';
  onClose: () => void;
}

function TermsDialog({ type, onClose }: TermsDialogProps) {
  const content = type === 'terms' ? {
    title: '服务条款',
    lastUpdated: '2024年1月1日',
    sections: [
      { heading: '1. 服务说明', body: '墨掌柜（以下简称"我们"）提供 AI 内容创作与多平台发布服务。使用我们的服务即表示您同意遵守本条款。' },
      { heading: '2. 账号注册', body: '您需要提供真实、准确的信息进行注册。您负责保管好您的账号和密码，因账号被盗用造成的损失由您自行承担。' },
      { heading: '3. 内容规范', body: '您承诺通过墨掌柜生成和发布的所有内容均符合以下要求：遵守法律法规、尊重他人权益、不发布虚假信息、不侵犯他人知识产权。' },
      { heading: '4. 知识产权', body: '您保留通过墨掌柜生成内容的知识产权。但我们有权使用匿名化的使用数据进行服务改进。' },
      { heading: '5. 服务变更', body: '我们保留随时修改或中断服务的权利，并会提前通知用户。因服务变更造成的损失，在法律允许范围内免责。' },
      { heading: '6. 隐私保护', body: '我们重视您的隐私，您的个人信息受隐私政策保护。详细说明请查阅《隐私政策》。' },
      { heading: '7. 免责声明', body: '墨掌柜不对用户通过平台发布的内容准确性、合法性负责。用户应自行承担发布行为的法律风险。' },
      { heading: '8. 争议解决', body: '本条款的解释和执行均适用中华人民共和国法律。如有争议，双方应友好协商解决。' },
    ],
  } : {
    title: '隐私政策',
    lastUpdated: '2024年1月1日',
    sections: [
      { heading: '1. 信息收集', body: '我们收集您主动提供的信息（如邮箱、昵称）以及服务使用过程中产生的日志信息，以改进服务质量。' },
      { heading: '2. 信息使用', body: '您的信息用于：提供和维护服务、发送重要通知、处理您的请求、改进产品功能。我们不会将您的个人信息出售给第三方。' },
      { heading: '3. 信息共享', body: '我们仅在以下情况共享您的信息：获得您的明确同意、法律要求、保护我们的权利、整合第三方服务（如登录、支付）时。' },
      { heading: '4. 信息安全', body: '我们采用加密存储、访问控制等安全措施保护您的数据。但互联网传输存在固有风险，我们不能保证 100% 安全。' },
      { heading: '5. Cookie 使用', body: '我们使用 Cookie 维持您的登录状态和偏好设置。您可以在浏览器中禁用 Cookie，但这可能影响部分功能。' },
      { heading: '6. 第三方服务', body: '墨掌柜可能包含第三方服务链接。第三方服务的隐私保护由其各自政策负责，我们不对其内容负责。' },
      { heading: '7. 您的权利', body: '您有权访问、更正、删除您的个人信息。如需行使这些权利，请通过产品内联系渠道与我们联系。' },
      { heading: '8. 政策变更', body: '我们会不时更新隐私政策。重大变更将通过产品内公告或邮件通知您。继续使用服务即表示您接受更新后的政策。' },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', duration: 0.5, bounce: 0.12 }}
        className="relative bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold text-white">{content.title}</h2>
            <p className="text-xs text-white/40 mt-0.5">最后更新：{content.lastUpdated}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {content.sections.map((section, i) => (
            <motion.div key={section.heading} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <h3 className="text-sm font-medium text-white/90 mb-1.5">{section.heading}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{section.body}</p>
            </motion.div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button onClick={onClose} className="w-full h-10 rounded-xl bg-white text-[#0a0a0a] text-sm font-medium hover:opacity-90 transition-opacity">
            我已阅读并同意
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main login page ─────────────────────────────────────────
export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [termsDialog, setTermsDialog] = useState<'terms' | 'privacy' | null>(null);
  const [demoModal, setDemoModal] = useState<DemoType | null>(null);

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const validateEmail = (val: string) => {
    if (!val) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '请输入有效的邮箱地址';
    return '';
  };

  const validatePassword = (val: string) => {
    if (!val) return '';
    if (isRegister && val.length < 6) return '密码至少 6 位';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr) { setEmailError(eErr); return; }
    if (pErr) { setPasswordError(pErr); return; }
    setEmailError(''); setPasswordError('');
    setIsLoading(true);
    try {
      const api = isRegister ? authApi.register(email, password, nickname) : authApi.login(email, password);
      const res = await api;
      if (res.data.success && res.data.data) {
        const data = res.data.data as { access_token: string; refresh_token: string; user: import('../types').User };
        login(data.user, data.access_token, data.refresh_token);
        showToast(isRegister ? '注册成功，欢迎加入墨掌柜' : '登录成功', 'success');
        navigate('/');
      } else {
        showToast(res.data.error?.message || '操作失败', 'error');
      }
    } catch (err: unknown) {
      let msg = '网络错误';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        msg = axiosErr.response?.data?.detail || '登录失败';
      } else if (err instanceof Error) { msg = err.message; }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] flex overflow-hidden relative">
      {/* Ambient gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-cyan-600/15 via-blue-600/10 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* ═══════════════════════════════════════════════════
          LEFT — Brand showcase
         ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[520px] flex-col justify-between p-12 xl:p-16 relative z-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3.5">
            <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.6, type: 'spring', stiffness: 200 }} className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <BookOpen className="w-5.5 h-5.5 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 blur-lg opacity-40 -z-10" />
            </motion.div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">墨掌柜</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                <span className="text-xs text-white/40">服务运行中</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-10"
        >
          {/* Headline */}
          <div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-[1.2] tracking-tight">
              <AnimatedWord text="让内容创作" delay={0.2} /><br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                <AnimatedWord text="更高效" delay={0.5} />
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-sm text-white/40 leading-relaxed mt-5 max-w-[340px]"
            >
              专注内容本身，告别繁琐的发布流程。一站式管理你的所有内容资产。
            </motion.p>
          </div>

          {/* Feature cards */}
          <div className="space-y-3">
            {[
              { icon: Sparkles, color: 'blue' as const, title: 'AI 智能创作', desc: '输入主题，AI 自动生成高质量内容', delay: 1.0, key: 'ai' as DemoType },
              { icon: Layers, color: 'purple' as const, title: '多平台发布', desc: '一键同步至 10+ 主流内容平台', delay: 1.15, key: 'publish' as DemoType },
              { icon: BarChart3, color: 'emerald' as const, title: '数据洞察', desc: '统一查看所有平台的内容表现', delay: 1.3, key: 'analytics' as DemoType },
            ].map((feature) => (
              <motion.button
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: feature.delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 6, borderColor: 'rgba(255,255,255,0.2)' }}
                onClick={() => setDemoModal(feature.key)}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm transition-all cursor-pointer group"
              >
                <IconBadge icon={feature.icon} color={feature.color} />
                <div>
                  <div className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{feature.title}</div>
                  <div className="text-xs text-white/30 mt-0.5">{feature.desc}</div>
                </div>
                <div className="ml-auto text-white/20 group-hover:text-white/40 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.5 }}
            className="flex gap-10 pt-2"
          >
            {[
              { value: '10+', label: '支持平台' },
              { value: 'AI驱动', label: '智能创作' },
              { value: '一键', label: '全网发布' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + i * 0.1 }}>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-white/30 mt-0.5">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="text-xs text-white/20">
          © 2024 墨掌柜. All rights reserved.
        </motion.p>
      </div>

      {/* Vertical divider */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex w-px self-stretch my-16 bg-gradient-to-b from-transparent via-white/10 to-transparent"
      />

      {/* ═══════════════════════════════════════════════════
          RIGHT — Login Form
         ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 relative z-10">
        <GlassCard className="rounded-3xl p-8 w-full max-w-[440px]">

          {/* Mobile logo */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-base font-bold text-white">墨掌柜</span>
          </motion.div>

          {/* Heading */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.h2
                key={isRegister ? 'register' : 'login'}
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-2xl font-bold text-white"
              >
                {isRegister ? '创建账号' : '欢迎回来'}
              </motion.h2>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={isRegister ? 'register-sub' : 'login-sub'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: 0.05 }}
                className="text-sm text-white/40 mt-2"
              >
                {isRegister ? '填写信息即可开始使用墨掌柜' : '登录以继续管理你的内容资产'}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname */}
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  key="nickname"
                  initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
                  exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="space-y-1.5 pb-4">
                    <label className="text-xs font-medium text-white/40">昵称</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                      <Input
                        placeholder="你的昵称"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="h-12 pl-10 text-sm bg-white/[0.04] border border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10 transition-all text-white placeholder:text-white/20 rounded-xl"
                        autoComplete="nickname"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/40">邮箱</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={() => setEmailError(validateEmail(email))}
                  className={`h-12 pl-10 text-sm bg-white/[0.04] border border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10 transition-all text-white placeholder:text-white/20 rounded-xl ${emailError ? 'border-red-500/50' : ''}`}
                  autoComplete="email"
                  required
                />
              </div>
              <AnimatePresence>
                {emailError && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-400 pl-1">{emailError}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-white/40">密码</label>
                {!isRegister && (
                  <button type="button" className="text-xs text-white/30 hover:text-indigo-400 transition-colors">
                    忘记密码？
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  type="password"
                  placeholder={isRegister ? '至少 6 位' : ''}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  onBlur={() => setPasswordError(validatePassword(password))}
                  className={`h-12 pl-10 text-sm bg-white/[0.04] border border-white/10 focus:border-indigo-500/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-indigo-500/10 transition-all text-white placeholder:text-white/20 rounded-xl ${passwordError ? 'border-red-500/50' : ''}`}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required minLength={6}
                />
              </div>
              <AnimatePresence>
                {passwordError && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-400 pl-1">{passwordError}</motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <motion.div whileTap={{ scale: 0.88 }}>
                  <Switch checked={rememberMe} onCheckedChange={setRememberMe} />
                </motion.div>
                <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors">记住登录状态</span>
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-12 text-sm mt-2 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  处理中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? '创建账号' : '登录'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-sm text-white/40 text-center">
              {isRegister ? '已有账号？' : '还没有账号？'}
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-white/70 hover:text-white font-medium ml-1.5 transition-colors hover:underline"
              >
                {isRegister ? '登录' : '注册'}
              </button>
            </p>
          </div>
        </GlassCard>

        {/* Terms */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-white/25 mt-6"
        >
          登录即表示同意
          <button onClick={() => setTermsDialog('terms')} className="text-white/30 hover:text-indigo-400 mx-1 transition-colors hover:underline">
            服务条款
          </button>
          和
          <button onClick={() => setTermsDialog('privacy')} className="text-white/30 hover:text-indigo-400 mx-1 transition-colors hover:underline">
            隐私政策
          </button>
        </motion.p>
      </div>

      {/* Demo modal */}
      <AnimatePresence>
        {demoModal && <DemoModal type={demoModal} onClose={() => setDemoModal(null)} />}
      </AnimatePresence>

      {/* Terms dialog */}
      <AnimatePresence>
        {termsDialog && <TermsDialog type={termsDialog} onClose={() => setTermsDialog(null)} />}
      </AnimatePresence>
    </div>
  );
}
