// Top navigation bar
export const TOPNAV = {
  HEIGHT: 52,
} as const;

// Page section header (used by Settings, Operations, ContentManagement, etc.)
export const PAGE_HEADER = {
  HEIGHT: 52,
  ICON_SIZE: 32,
  PADDING_X: 24, // px-6
  PADDING_Y: 14, // py-3.5
} as const;

// Content area max widths
export const CONTENT_WIDTH = {
  NARROW: 'max-w-[680px]',    // Settings / form pages
  DEFAULT: 'max-w-4xl',       // List / editor pages (~896px)
  WIDE: 'max-w-[1024px]',     // Dashboard / monitoring pages
} as const;

// Sidebar widths
export const SIDEBAR = {
  WIDTH: 240,                  // Settings sidebar
  CONVERSATION_WIDTH: 260,     // HomePage conversation history
  LEFT_WIDTH: 360,             // PANELS.LEFT_WIDTH (kept for existing usage)
  RIGHT_WIDTH: 420,             // PANELS.RIGHT_WIDTH (kept for existing usage)
} as const;

// Backward-compatible aliases
export const PANELS = {
  LEFT_WIDTH: 360,
  RIGHT_WIDTH: 420,
} as const;
