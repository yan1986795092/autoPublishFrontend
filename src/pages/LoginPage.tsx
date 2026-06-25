import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import {
  Loader2, Sparkles, Mail, Lock, User,
  Wand2, Globe, BarChart3, Zap, ArrowRight,
} from 'lucide-react';
import { Switch } from '../components/ui/switch';

const FEATURES = [
  {
    icon: Wand2,
    title: 'AI 智能创作',
    desc: '输入主题，AI 批量生成多平台适配内容',
    color: '#818cf8',
  },
  {
    icon: Globe,
    title: '一键多平台发布',
    desc: '同步至小红书、公众号、微博等主流平台',
    color: '#34d399',
  },
  {
    icon: BarChart3,
    title: '实时数据洞察',
    desc: '追踪发布效果，阅读量与互动一览无余',
    color: '#fbbf24',
  },
  {
    icon: Zap,
    title: '批量自动化',
    desc: '定时发布与批量管理，省时省力',
    color: '#f87171',
  },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
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
      const api = isRegister
        ? authApi.register(email, password, nickname)
        : authApi.login(email, password);
      const res = await api;

      if (res.data.success && res.data.data) {
        const data = res.data.data as { access_token: string; refresh_token: string; user: import('../types').User };
        login(data.user, data.access_token, data.refresh_token);
        showToast(isRegister ? '注册成功，欢迎使用 AutoPublish' : '登录成功', 'success');
        navigate('/');
      } else {
        showToast(res.data.error?.message || '操作失败', 'error');
      }
    } catch (err: unknown) {
      let msg = '网络错误';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        msg = axiosErr.response?.data?.detail || '登录失败';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex">
      {/* ═══════════════════════════════════════════════════
          LEFT — Product showcase (hidden on mobile)
         ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden order-1">

        {/* Deep gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/40 via-app-bg to-purple-950/20" />

        {/* Animated mesh orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-[-15%] left-[10%] w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)' }}
            animate={{ x: [0, 80, -40, 0], y: [0, -50, 60, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-[-15%] right-[5%] w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 65%)' }}
            animate={{ x: [0, -60, 50, 0], y: [0, 60, -40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[30%] left-[40%] w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 65%)' }}
            animate={{ x: [0, -40, 30, 0], y: [0, 30, -20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24 py-12 w-full">

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-[28px] xl:text-[32px] font-bold text-app-text leading-tight">
              AI 驱动的内容创作平台
            </h2>
            <p className="text-sm text-app-text-secondary mt-3 leading-relaxed max-w-[400px]">
              从创意到发布，AutoPublish 让你的内容创作效率提升 10 倍。
              告别重复劳动，专注真正重要的事。
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="space-y-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon className="w-4.5 h-4.5" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-app-text leading-tight">{f.title}</h3>
                  <p className="text-xs text-app-text-secondary mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-12 pt-8 border-t border-white/[0.06]"
          >
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: '50,000+', label: '创作者' },
                { value: '200万+', label: '已发布内容' },
                { value: '99.9%', label: '服务可用性' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-lg font-bold text-app-text">{s.value}</p>
                  <p className="text-[11px] text-app-text-tertiary mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Edge fade */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-app-bg to-transparent" />
      </div>

      {/* ═══════════════════════════════════════════════════
          RIGHT — Login Form
         ═══════════════════════════════════════════════════ */}
      <div className="w-full lg:max-w-[520px] flex-shrink-0 flex flex-col justify-center px-8 lg:px-16 xl:px-20 py-12 relative order-2">

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-app-text">AutoPublish</span>
          </div>
        </motion.div>

        {/* Heading */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isRegister ? 'register' : 'login'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-app-text leading-tight">
              {isRegister ? '创建账号' : '欢迎回来'}
            </h1>
            <p className="text-sm text-app-text-secondary mt-1.5 leading-relaxed">
              {isRegister
                ? '开启 AI 内容创作之旅，几秒钟完成注册'
                : '登录以继续管理你的内容资产与发布流程'}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Form card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8"
        >
          <div className="rounded-2xl border border-app-border bg-app-surface overflow-hidden">
            {/* Top accent */}
            <div className="h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Nickname — register only */}
                <AnimatePresence>
                  {isRegister && (
                    <motion.div
                      key="nickname"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="space-y-1.5 pb-4">
                        <label className="text-[11px] font-medium text-app-text-secondary">昵称</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
                          <Input
                            placeholder="你想让大家怎么称呼你"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="h-10 pl-9 text-xs"
                            autoComplete="nickname"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-app-text-secondary">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      onBlur={() => setEmailError(validateEmail(email))}
                      className={`h-10 pl-9 text-xs ${emailError ? 'border-red-500/50' : ''}`}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <AnimatePresence>
                    {emailError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-[10px] text-red-400"
                      >
                        {emailError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-app-text-secondary">密码</label>
                    {!isRegister && (
                      <button type="button" className="text-[10px] text-primary-500 hover:text-primary-400 transition-colors">
                        忘记密码？
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-tertiary pointer-events-none" />
                    <Input
                      type="password"
                      placeholder={isRegister ? '至少 6 位，建议混合字母和数字' : '输入密码'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      onBlur={() => setPasswordError(validatePassword(password))}
                      className={`h-10 pl-9 text-xs ${passwordError ? 'border-red-500/50' : ''}`}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                      required
                      minLength={6}
                    />
                  </div>
                  <AnimatePresence>
                    {passwordError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-[10px] text-red-400"
                      >
                        {passwordError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <Switch checked={rememberMe} onCheckedChange={setRememberMe} />
                    <span className="text-[11px] text-app-text-secondary">记住登录状态</span>
                  </label>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-10 text-xs mt-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      处理中...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isRegister ? '创建账号' : '登录'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Toggle */}
              <div className="mt-5 pt-4 border-t border-app-border/50">
                <p className="text-xs text-app-text-secondary text-center">
                  {isRegister ? '已有账号？' : '还没有账号？'}
                  <button
                    type="button"
                    onClick={() => setIsRegister(!isRegister)}
                    className="text-primary-400 hover:text-primary-300 font-medium ml-1.5 transition-colors"
                  >
                    {isRegister ? '登录' : '免费注册'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-app-text-tertiary text-[10px] mt-6 leading-relaxed"
        >
          登录即表示同意
          <button className="text-app-text-secondary hover:text-app-text transition-colors mx-0.5">服务条款</button>
          和
          <button className="text-app-text-secondary hover:text-app-text transition-colors mx-0.5">隐私政策</button>
        </motion.p>
      </div>
    </div>
  );
}
