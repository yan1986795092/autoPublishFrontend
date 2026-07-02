# MessageBubble / Agent 输出界面 审计报告

> **审计日期**: 2026-07-01
> **审计范围**: `frontend/src/components/agent/MessageBubble.tsx` + 周边 store / 类型 / SSE 链路
> **关联改造**: spec 2026-07-01 SSE 前端契约收敛
> **版本**: v2

---

## 1. 问题总览

| 编号 | 维度 | 问题 | 严重度 | 状态 |
|------|------|------|--------|------|
| A1 | 功能 | 失败/取消状态对用户不友好（无重试按钮、错误信息丢失） | 🔴 高 | ✅ |
| A2 | 功能 | 长任务中段没有"取消"按钮 | 🔴 高 | ✅ |
| A3 | 交互 | 长内容自动展开体验差 | 🟡 中 | ✅ |
| A4 | 功能 | 复制按钮复制错内容（用了 `renderPayload.body`） | 🟡 中 | ✅ |
| A5 | 交互 | Token/耗时/模型信息散在底部，移动端折行 | 🟢 低 | ✅ |
| B1 | 后端契约 | SPEC.md §6.2 没更新到 v2 schema | 🟡 中 | ✅ |
| B3 | 后端契约 | `done` 事件后无 result 重发机制，中途断网永久卡住 | 🔴 高 | ✅ |
| C1 | 性能 | v2 业务轨仍在监听 `thinking_step` 事件，意外泄露时重复累积 | 🟡 中 | ✅ |
| C2 | 性能 | `streamEvents` 数组无上限 | 🟡 中 | ✅ |
| C3 | 健壮性 | `useEffect` 依赖列表 lint disable，状态变化漏更新 | 🟢 低 | ✅ |
| C4 | 性能 | 每次 SSE 事件触发整个 store 重渲染 | 🟡 中 | ✅ |
| D1 | 健壮性 | `_synthesizeStages` 在 review-flow 下可能少渲染阶段 | 🟢 低 | ✅ |
| D2 | 健壮性 | SSE 重连后状态丢失 | 🔴 高 | ✅ |
| D3 | 健壮性 | 切对话时 abort 失败可能脏写 | 🟢 低 | ✅ |

---

## 2. 详细问题与修复方案

### A1. 失败/取消状态对用户不友好

**问题**（`MessageBubble.tsx:282-284`）：

```typescript
{isFailed && !displayContent && (
  <div className="text-sm text-red-400 py-1">请求失败，请重试</div>
)}
```

- 没有"重试"按钮
- 后端 `result.error` / `result.error_code` 都丢了
- 取消（CANCELLED）和失败（FAILED）显示一样

**修复**：
- 加"重试"按钮（调 `useAgentStore.runStreaming` 同 prompt）
- 显示 `result.error` 详情（折叠二级）
- 区分 `status === 'cancelled'` vs `status === 'failed'`

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### A2. 长任务中段没有"取消"按钮

**问题**：
- 用户跑长任务（30s+）想取消，**当前没有任何 UI** 让他停
- `useAgentStore` 里有 `_abortController.abort()`，但 UI 没暴露

**修复**：
- 在 Header 加 ⏹ 按钮 → `stopStreaming()`
- running 中显示，停后转成 A1 的失败状态

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### A3. 长内容自动展开体验差

**问题**（`MessageBubble.tsx:103-110`）：

```typescript
useEffect(() => {
  if (message.status === 'running') {
    setFinalExpanded(false);
  } else if (message.status === 'completed' || (!message.status && message.content)) {
    setFinalExpanded(true);  // ← 长内容也展开
  }
}, [message.status]);
```

- 长内容（5000+ 字）自动展开，用户得手动折叠才能看 timeline

**修复**：
- 长内容（>800 字）默认折叠
- 响应式：md 以下折叠，桌面默认展开

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### A4. 复制按钮复制错内容

**问题**（`MessageBubble.tsx:166, 205`）：

```typescript
const displayContent = message.renderPayload?.body || message.content || '';
// ...
onClick={() => onCopy(message.id, displayContent)}
```

- 用户**真正想复制的是 `output.full_text`**（业务 schema 已有）
- `renderPayload.body` 可能带 emoji 头 / 平台格式装饰

**修复**：
- 复制 `output.full_text || renderPayload.body || content`

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### A5. Token/耗时/模型信息散在底部

**问题**（`MessageBubble.tsx:298-304`）：

```typescript
{message.result?.usage && (
  <div className="flex flex-wrap gap-3 text-[10px] text-app-text-tertiary">
    <span>Token: {message.result.usage.tokens_used}</span>
    <span>耗时: {message.result.usage.time_elapsed?.toFixed(1)}s</span>
    <span>模型: {message.result.usage.model || 'N/A'}</span>
  </div>
)}
```

- 移动端会折行很难看
- `toFixed(1)` 可能产生 `8.5000000000001`（虽然这里用了 .toFixed 不太可能，但 `formatDuration` 更专业）
- 缺少 aria-label（无障碍差）

**修复**：
- 提取 `UsageBadge` 组件
- 桌面横排 / 移动竖排
- 用 `formatDuration` 替代 toFixed
- 加 aria-label

**文件**：`frontend/src/components/agent/MessageBubble.tsx` + 新建 `UsageBadge.tsx`

---

### B1. SPEC.md §6.2 没更新到 v2 schema

**问题**：
- SPEC.md §6.2 写的还是 v1 schema：`{"output":{"full_text":"...","sections":[...]}, "status":"completed"}`
- 实际 v2 是：`{task_id, status, agent_type, output, usage}`
- SPEC 没记录"运行时缓冲字段下划线前缀"约定

**修复**：
- 更新 SPEC.md §6.2 到 v2 schema
- 记录"运行时缓冲由前端 store 拼接"契约

**文件**：`backend/SPEC.md`

---

### B3. `done` 事件后无 result 重发机制，中途断网永久卡住

**问题**：
- 如果 SSE 在 `done` 前断了，`result` 丢失 → UI 永远 stuck 在"生成中"
- 后端没在 `done` 前补 result 重试
- 前端 `done` 后 5s 没 result 没 fallback

**修复**：
- 后端：在 `done` 前确保 result 已发（或在 done payload 里附 task_id 让前端 fallback）
- 前端：done 后 5s 没 result → `GET /agent/async/status/{task_id}` 兜底

**文件**：`backend/src/agent/api.py` + `frontend/src/stores/useAgentStore.ts`

---

### C1. v2 业务轨仍在监听 `thinking_step` 事件

**问题**（`useAgentStore.ts:500-524`）：
- v2 已经声明不下发 `thinking_step`，但 store 里**仍然在监听**它
- 如果后端某次误发，前端会重复 push

**修复**：
- v2 模式下忽略 `thinking_step` 事件
- 或在 processor 里按 audience 控制 on/off

**文件**：`frontend/src/stores/useAgentStore.ts`

---

### C2. `streamEvents` 数组无上限

**问题**：
- `_pushStreamEvent` 每次都 push，无 FIFO
- 跑长任务时可涨到 1000+ 条
- 每次 push 都触发 store 重渲染

**修复**：
- FIFO 上限 200（与 `thinkingSteps` 一致）

**文件**：`frontend/src/stores/useAgentStore.ts`

---

### C3. `useEffect` 依赖列表 lint disable

**问题**（`MessageBubble.tsx:109`）：

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [message.status]);
```

- 实际内部用了 `message.content`，但依赖列表只列了 `message.status`

**修复**：
- 依赖列表加 `message.content`
- 或重构成 `useEffect` 里读 latest ref

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### C4. 每次 SSE 事件触发整个 store 重渲染

**问题**（`useAgentStore.ts:526-547 on('progress')`）：
- `currentTask` 每次 progress 事件都换引用
- 所有订阅 `currentTask` 的组件全重渲染
- progress 事件频率 ~5 Hz

**修复**：
- `currentTask` 用 `useShallow` 订阅
- 拆 `progress` 为独立 slice
- 或 throttle progress（200ms）

**文件**：`frontend/src/stores/useAgentStore.ts` + 订阅方

---

### D1. `_synthesizeStages` 在 review-flow 下可能少渲染阶段

**问题**（`MessageBubble.tsx:47-78`）：
- 只看 `_llmChunks` 来推断 stages
- 旧消息（DB 里 review_content 存在但 `_llmChunks` 没存）会显示"0 stages"

**修复**：
- 从 `_thinkingSteps` / `_draftContent` 多源推断

**文件**：`frontend/src/components/agent/MessageBubble.tsx`

---

### D2. SSE 重连后状态丢失

**问题**：
- 没看到 SSE 自动重连 + 状态恢复
- 中途断网 UI 永远卡住

**修复**：
- 3 次自动重连（指数退避）
- 失败后 fallback 到 `GET /async/status/{task_id}`

**文件**：`frontend/src/stores/useAgentStore.ts` + `SSEProcessor`

---

### D3. 切对话时 abort 失败可能脏写

**问题**（`useAgentStore.ts:341`）：
- `initialConversationId` 用于"运行时被切换则 abort"的判定
- 但 abort 只是双保险，写入路径是 `messagePromise` 串行化
- 如果 abort 失败，`messagePromise` 还会写，但 `conversationStore` 已切走

**修复**：
- 写之前检查 `currentConversationId === initialConversationId`，不等就放弃写入

**文件**：`frontend/src/stores/useAgentStore.ts`

---

## 3. 修复优先级与工时

| 阶段 | 问题 | 预计工时 |
|------|------|----------|
| Phase 1（本周） | A1 + A2 + B3 + D2 | 2 天 |
| Phase 2（下周） | B1 + C1 + C2 + C4 | 1.5 天 |
| Phase 3（下下周） | A3 + A4 + A5 + C3 + D1 + D3 | 1 天 |
| Phase 4（2026-07-01 第二轮） | P2 + P3 + P4 + P5 + P6 + P7 + P8 + P9 + P10 + P11 + P12 + P13 | 0.5 天 |

---

## 5. 第二轮审计（2026-07-01）

在第一批 12 项之外，发现 13 个新问题，已全部修复：

| 编号 | 维度 | 问题 | 严重度 | 修复方式 |
|------|------|------|--------|----------|
| P1 | 后端契约 | SSE generator 在 result 事件丢失时 fallback 到 task.result | 🟡 中 | **已由现有代码处理**（api.py:932-948），加文档说明 |
| P2 | 功能 | 预览按钮用 `message.content` 而非 `copySource` | 🟡 中 | ✅ 改用 copySource |
| P3 | 一致性 | displayContent 与 copySource 内容不一致 | 🟡 中 | ✅ displayContent 统一以 copySource 为主 |
| P4 | state hygiene | pendingPromptRef 在切对话时不清理 | 🟢 低 | ✅ 监听 app:conversation-switching 事件清理 |
| P5 | 功能 | retry 时丢失 platform + 生成参数 | 🟡 中 | ✅ retry 保留 platform + 4 项参数 |
| P6 | 代码债 | connectWebSocket 死代码（60+ 行） | 🟡 中 | ✅ 删除 connectWebSocket、setWsConnectionState、wsConnectionState、_ws、_reconnectTimer；disconnectWebSocket 保留为 no-op 兼容 |
| P7 | 代码债 | _hasPersistedGenerationResult 死代码 | 🟢 低 | ✅ 删除 |
| P8 | 性能 | body channel 重复 push 到 pendingChunks | 🟢 低 | ✅ body 只走 accumulated+updateMsg，不进 llmChunks |
| P9 | 可读性 | msgUpdatePending 名字误导 | 🟢 低 | ✅ 改名为 _needsRefresh + 加注释 |
| P10 | 后端契约 | D2 fallback 路径 schema 与正常路径不同 | 🟢 低 | ✅ 加注释说明 task.result 含运行时缓冲 |
| P11 | bug | D2 fallback 误用 task.error_code（不存在） | 🟡 中 | ✅ 移除 error_code 字段 |
| P12 | bug | SSE error 事件没提取 code 字段 | 🟡 中 | ✅ 解析 code/error_code + 写入 result.error_code |
| P13 | 健壮性 | safePersist 只检查 conversationId，不检查 msgId | 🟡 中 | ✅ 加 msgId 是否在 messages 列表的检查 |

---

## 4. 回归测试 checklist

修完每条问题，跑以下测试：

- [ ] 单次生成完整流程：start → progress → result → done，UI 各阶段正确
- [ ] 失败流程：后端 mock 503，UI 显示重试按钮，点重试用同 prompt 重新发
- [ ] 取消流程：running 中点 ⏹，UI 显示"已取消"
- [ ] 长内容：>800 字默认折叠；<800 字默认展开
- [ ] 复制：复制后粘贴是 `output.full_text`
- [ ] SSE 中途断网：3 次重连，失败 fallback async/status
- [ ] 历史消息：DB 里 review_content 存在但 `_llmChunks` 缺失 → 渲染 stages 至少 1 条
- [ ] v2 误发 `thinking_step`：前端 store 不重复 push
- [ ] streamEvents 长任务：长度 ≤ 200
- [ ] 切对话时 abort 失败：当前对话不出现脏消息