# AutoPublish Frontend Fix Plan

## P0 — Critical Bugs

### 1. LoginPage: Registration doesn't set auth tokens ✅ FIXED
- **File**: `src/pages/LoginPage.tsx:33-39`
- **Fix**: Backend `/auth/register` now returns `access_token`, `refresh_token`, and `user` (same as login)
- **Also**: Frontend `api.ts` `authApi.register` type updated to `AuthResponse`

### 2. TemplatePage: "使用此模板" button is a no-op ✅ FIXED
- **File**: `src/pages/TemplatePage.tsx:215`
- **Fix**: Button navigates to `/` with `state: { templatePrompt: system_prompt }`
- **Fix**: HomePage now reads `location.state.templatePrompt` and pre-fills the prompt input
- **Also**: `glass-card` replaced with Tailwind utilities

### 3. App.tsx missing routes for 4 orphaned pages ✅ ALREADY FIXED
- Routes for AgentPage, AgentStudioPage, AgentHistoryPage, TemplatePage were already present
- Sidebar already had all nav items

## P1 — Consistency & Structure

### 4. Delete SurfaceCard.tsx (redundant with Card component) ✅ ALREADY FIXED
- `SurfaceCard.tsx` doesn't exist — no SurfaceCard usage found in codebase

### 5. Replace `glass-card` CSS class with Tailwind utilities ✅ FIXED
- **Files fixed**:
  - `components/editor/ContentEditor.tsx`
  - `components/generator/AIStatusPanel.tsx`
  - `components/generator/AIGeneratedContent.tsx` (4 instances)
  - `components/generator/TopicInputPanel.tsx`
  - `components/preview/PreviewPanel.tsx`
  - `components/content/ContentCalendar.tsx`
  - `components/ui/Skeleton.tsx`
- **Fix**: `glass-card` → `rounded-lg border border-app-border bg-app-elevated`
- **Note**: `styles/index.css` `.glass-card` class left in place for any future use

### 6. AgentPage: Replace manual dialog + emoji icons ✅ FIXED
- **Dialog**: Already using Radix Dialog — no manual fixed dialog found
- **Emoji → Lucide**: Created `components/agent/AgentIcon.tsx` component that maps
  `iconName` (from `config/agents.ts`) to Lucide icons
- **Updated**:
  - `AgentLiveView.tsx` — 3 emoji replaced with `AgentIcon`
  - `AgentThinkingPanel.tsx` — 1 emoji replaced with `AgentIcon`
  - `AgentThinkingStream.tsx` — 1 emoji replaced with `AgentIcon`
  - `ExecutionPlanEditor.tsx` — 1 emoji replaced with `AgentIcon`
  - `StudioComponents.tsx` — 1 emoji replaced with `AgentIcon`

## P2 — Feature Completeness

### 7. ContentEditPage: Remove duplicate Badge import ✅ ALREADY FIXED
- No duplicate `Badge as BadgePrimitive` import found

### 8. ContentManagementPage: Word count + batch delete ✅ ALREADY FIXED
- `getWordCount()` correctly splits by whitespace: `.split(/\s+/).length`
- Batch delete uses `Promise.allSettled()`

### 9. AgentStudioPage: Fix ContentTypeSelector no-op + raw checkbox ✅ ALREADY FIXED
- `ContentTypeSelector` already has proper `onChange` wired to store
- Streaming toggle already uses `Switch` component

## P3 — Polish & Accessibility

### 10. ripple.tsx: setTimeout cleanup + prefers-reduced-motion ✅ ALREADY FIXED
- `timeoutRef` already cleans up on unmount
- `usePrefersReducedMotion` hook already skips effect when enabled

### 11. loading-spinner.tsx: prefers-reduced-motion ✅ ALREADY FIXED
- `usePrefersReducedMotion` hook already stops animation when enabled

### 12. Sidebar: Fix logout button positioning in non-collapsed state ✅ ALREADY FIXED
- Logout button already uses `relative` positioning when not collapsed
- Only uses `absolute` when collapsed

### 13. AppShell: Extract sidebar width to CSS variable ✅ ALREADY FIXED
- Already using `--sidebar-w` and `--sidebar-w-collapsed` CSS custom properties

### 14. AgentHistoryPage: Add year to date format ✅ ALREADY FIXED
- `toLocaleString('zh-CN', { year: 'numeric', month: 'short', ... })` already includes year

## P2 — Additional: LoginPage raw checkbox ✅ FIXED
- "记住我" checkbox replaced with `Switch` component in `LoginPage.tsx`
