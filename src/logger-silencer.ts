/**
 * Console 日志门控 ——「DEBUG 前缀精准静默」
 *
 * 设计目标：
 * 1. 默认静默所有以 `[DEBUG ...]` / `[DEBUG ...]` 形式打 tag 的 console.log，
 *    这些是开发期间用来排查 flow 的临时埋点，多在 hot path（每 SSE event / 每个组件渲染）
 *    执行，会让 Console 在 agent run 时持续刷新、占位置。
 * 2. 其它所有 console.log / info / debug / trace / warn / error **全部保留**
 *    —— 包括 React DevTools、axios 库内部的输出，以及业务代码里非 DEBUG 前缀的 log。
 *
 * 逃生通道：
 *   __appDebugOn()        ← 一键开启所有 log（包括 DEBUG 前缀）
 *   __appDebugOff()       ← 恢复默认（DEBUG 前缀静默）
 *   __appDebugActive()    ← 当前是否开启
 *
 * 持久化（localStorage app:log:debug = '1'），刷新后仍生效。
 *
 * 注意：本文件必须最早执行（在 main.tsx 顶部 import）。
 */

declare global {
  interface Window {
    __APP_LOG_DEBUG__?: boolean;
    __appDebugOn?: () => void;
    __appDebugOff?: () => void;
    __appDebugActive?: () => boolean;
  }
}

(() => {
  if (typeof window === 'undefined') return;

  const STORAGE_KEY = 'app:log:debug';

  const isDebugActive = (): boolean => {
    try {
      if (window.__APP_LOG_DEBUG__ === true) return true;
      if (window.localStorage?.getItem(STORAGE_KEY) === '1') {
        window.__APP_LOG_DEBUG__ = true;
        return true;
      }
    } catch {}
    return false;
  };

  // 取 console.log 的第一个参数（如果是字符串），判断是否以 [DEBUG / [debug 开头
  const isDebugPrefixed = (args: unknown[]): boolean => {
    const first = args[0];
    if (typeof first !== 'string') return false;
    return /^\s*\[debug[\s\]_]/i.test(first);
  };

  const original = {
    log: console.log.bind(console),
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    trace: console.trace.bind(console),
  };

  // log 特殊处理：默认静默 [DEBUG ...] 前缀，放行其它
  console.log = (...args: unknown[]) => {
    if (!isDebugActive() && isDebugPrefixed(args)) return;
    original.log(...args);
  };

  // debug/info/trace 原样透传（warn/error 原样未被改）
  console.debug = original.debug;
  console.info = original.info;
  console.trace = original.trace;

  // ── 暴露全局开关 ──────────────────────────────────────────
  window.__appDebugOn = () => {
    window.__APP_LOG_DEBUG__ = true;
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    // 用 original 透传，绕过自身的过滤
    original.log('[app:debug] 已开启 —— [DEBUG ...] 前缀的 log 现在会输出');
  };
  window.__appDebugOff = () => {
    window.__APP_LOG_DEBUG__ = false;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    original.log('[app:debug] 已关闭 —— [DEBUG ...] 前缀的 log 恢复静默');
  };
  window.__appDebugActive = isDebugActive;
})();
