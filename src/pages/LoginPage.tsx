import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { LogIn, UserPlus, Loader2, Sparkles } from 'lucide-react';
import { Switch } from '../components/ui/switch';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nickname, setNickname] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const api = isRegister
        ? authApi.register(email, password, nickname)
        : authApi.login(email, password);

      const res = await api;

      if (res.data.success && res.data.data) {
        const data = res.data.data as { access_token: string; refresh_token: string; user: import('../types').User };
        // 一次性原子地写入 user + tokens + isAuthenticated，避免两次 set 之间的不一致
        login(data.user, data.access_token, data.refresh_token);
        showToast(isRegister ? '注册成功' : '登录成功', 'success');
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
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/4 -left-20 w-[300px] h-[300px] rounded-full bg-primary-500/10 blur-[100px]"
          animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-[250px] h-[250px] rounded-full bg-purple-500/10 blur-[100px]"
          animate={{ x: [0, -20, 30, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-amber-500/8 blur-[100px]"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[400px] relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3 mb-8 justify-center"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.3)]">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gradient">AutoPublish</span>
        </motion.div>

        {/* Glass card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-app-elevated/80 backdrop-blur-xl p-6 shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        >
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary-600/20 flex items-center justify-center">
              {isRegister
                ? <UserPlus className="w-4 h-4 text-primary-400" />
                : <LogIn className="w-4 h-4 text-primary-400" />
              }
            </div>
            <div>
              <h1 className="text-base font-semibold text-app-text">
                {isRegister ? '创建账号' : '欢迎回来'}
              </h1>
              <p className="text-[11px] text-app-text-tertiary mt-0.5">
                {isRegister ? '开始你的 AI 内容创作之旅' : '继续使用 AutoPublish'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence mode="wait">
                {isRegister && (
                  <motion.div
                    key="nickname"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <Input
                      placeholder="昵称（选填）"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-1.5">
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Input
                  type="password"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 text-xs"
                  required
                  minLength={6}
                />
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Switch checked={rememberMe} onCheckedChange={setRememberMe} />
                  <span className="text-[11px] text-app-text-secondary">记住我</span>
                </label>
                <Button variant="link" className="text-[11px] h-auto p-0">
                  忘记密码？
                </Button>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full h-9 text-xs"
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.span
                    className="flex items-center gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    处理中...
                  </motion.span>
                ) : isRegister ? (
                  '注册'
                ) : (
                  '登录'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 text-app-text-tertiary bg-app-elevated/80">或</span>
              </div>
            </div>

            {/* Toggle */}
            <motion.button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="w-full text-xs text-center text-app-text-secondary hover:text-primary-400 transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isRegister ? '已有账号？' : '没有账号？'}
              <span className="text-primary-400 ml-1">
                {isRegister ? '登录' : '注册'}
              </span>
            </motion.button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-app-text-tertiary text-[10px] mt-6"
        >
          登录即表示同意服务条款和隐私政策
        </motion.p>
      </motion.div>
    </div>
  );
}
