// Single source of truth for color and font tokens. index.css's CSS custom
// properties mirror these values for plain-CSS contexts (keep both in sync).
export const C = {
  orange: "#ff6600",
  orangeDim: "rgba(255,102,0,0.12)",
  borderHot: "rgba(255,102,0,0.5)",
  bg: "#080808",
  card: "rgba(13,13,13,0.97)",
  panel: "rgba(10,10,10,0.85)",
  border: "rgba(255,102,0,0.18)",
  textDim: "rgba(232,232,232,0.5)",

  // Teal is reserved specifically for AI-feature moments (comment summaries,
  // match badges, the AI archetype). Do not reuse it for generic accents.
  teal: "#00ffcc",
  tealDim: "rgba(0,255,204,0.12)",

  // Semantic colors, used consistently instead of hardcoding these hexes
  // independently per component.
  success: "#4ade80",
  error: "#f87171",
  warning: "#f39c12",

  fontPixel: "'Press Start 2P', monospace",
  fontMono: "'Share Tech Mono', monospace",
  fontUi: "Inter, sans-serif",
};

// Breakpoint below which the mobile gate applies. Kept in one place so the
// gate, any future responsive work, and useIsMobile all agree.
export const MOBILE_BREAKPOINT = 900;

// One color per taste category, shared by the Profile archetype panel, the
// Saved panel's category chips/filter, and the main card's category chip -
// a single source of truth so a category means the same color everywhere.
// A curated set of tasteful hue shifts, rather than the full 0-360 range, so
// fallback images read as designed variety instead of a broken/wrong photo.
// Shared by the main card and the Saved panel's thumbnails.
export const FALLBACK_HUE_SHIFTS = [0, -18, 18, -32, 168];

export const CATEGORY_COLORS = {
  "Artificial Intelligence": C.teal,
  "Software Engineering": C.orange,
  "Hardware & Systems": "#3498db",
  "Cybersecurity": "#e74c3c",
  "Startups & VC": "#f39c12",
  "Business & Finance": "#9b59b6",
  "Science & Space": C.success,
  "Design & UI/UX": "#e67e22",
  "Other": "#95a5a6",
};
