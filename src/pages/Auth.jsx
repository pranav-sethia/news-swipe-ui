import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Typography, TextField, Button, Divider, CircularProgress, IconButton } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C, CATEGORY_COLORS, FALLBACK_HUE_SHIFTS } from "../theme.js";
import { EASE } from "../motion.js";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useIsMobile } from "../hooks.js";
import { track } from "../analytics.js";

// A static (non-animated) grain layer - the tactile depth premium dark UIs
// lean on instead of a flat fill, without reading as a visible pattern the
// way the old tiled grid did. Deliberately not animated: moving grain reads
// as TV static, not depth.
const NOISE_TEXTURE = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`
)}")`;

// Each row's bullets mirror the real per-article AI summary shown on every
// card - short fragments, no filler - so the demo proves the "know before
// you click" claim instead of just showing a title. matchPct mirrors the
// real card's badge (NewsCard.jsx) - alternating with null (DISCOVERY) so
// the preview honestly shows both states.
const DEMO_ROWS = [
  { title: "Show HN: I built a CRDT from scratch", bullets: ["No server needed, syncs across tabs offline", "Handles merge conflicts automatically"], pts: 412, readMin: 4, comments: 187, matchPct: 93 },
  { title: "The case against microservices", bullets: ["One team's monolith outperformed 40 services", "Network calls swapped for function calls"], pts: 891, readMin: 8, comments: 342, matchPct: null },
  { title: "Why Rust's borrow checker finally clicked", bullets: ["Mental model that finally made it click", "Ownership rules stop fighting you"], pts: 234, readMin: 6, comments: 98, matchPct: 85 },
  { title: "Ask HN: How do you review your own PRs?", bullets: ["Real review checklists from working devs", "Most say: sleep on it, then read top-down"], pts: 156, readMin: 3, comments: 224, matchPct: null },
];

function StatPill({ label, color }) {
  return (
    <Typography sx={{
      fontFamily: C.fontMono, fontSize: "0.6rem", fontWeight: 700, color,
      background: "rgba(255,255,255,0.04)", border: `1px solid ${color}55`,
      px: 0.7, py: 0.25, borderRadius: "4px",
    }}>
      {label}
    </Typography>
  );
}

// The landing page's hero demo - reuses the real swipe card's exact drag
// mechanics (NewsCard.jsx: dragConstraints locked to origin, dragElastic
// 0.65, 100px/500px-per-sec like/dislike thresholds, matching exit
// rotation/duration) so dragging it actually feels like the real app, not
// an approximation. Only the top card carries real content/drag; the two
// cards behind it are plain depth-cue placeholders.
function SwipeStackDemo() {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState("right");
  const [paused, setPaused] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const likeOpacity = useTransform(x, [40, 120], [0, 1]);
  const dislikeOpacity = useTransform(x, [-120, -40], [1, 0]);

  const commitSwipe = (dir) => {
    setDirection(dir);
    setExiting(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % DEMO_ROWS.length);
      setExiting(false);
      x.set(0);
      y.set(0);
    }, 320);
  };

  // Auto-cycle pauses while the user is holding the card - modeled as the
  // effect itself skipping its timer while paused/exiting, so resuming
  // always starts a fresh window instead of restarting a stale one.
  useEffect(() => {
    if (paused || exiting) return;
    const id = setTimeout(() => {
      commitSwipe(index % 2 === 0 ? "right" : "left");
    }, 2800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, exiting]);

  const handleDragEnd = (_, info) => {
    setPaused(false);
    if (info.offset.x > 100 || info.velocity.x > 500) commitSwipe("right");
    else if (info.offset.x < -100 || info.velocity.x < -500) commitSwipe("left");
    // Otherwise: framer's own dragConstraints+dragTransition spring the card
    // back to origin - no manual animate call needed for the non-match case.
  };

  const visible = [0, 1, 2].map((offset) => DEMO_ROWS[(index + offset) % DEMO_ROWS.length]);

  return (
    <Box sx={{ position: "relative", height: "100%", perspective: "900px" }}>
      {visible.map((row, i) => {
        if (i !== 0) {
          const backRotate = i === 1 ? -0.75 : 0.75;
          const inset = i * 14;
          return (
            <Box key={`${row.title}-${index}-${i}`} sx={{
              position: "absolute", top: inset, left: inset * 0.7, right: inset * 0.7, bottom: inset,
              transformStyle: "preserve-3d",
              transform: `translateZ(${-i * 28}px) scale(${1 - i * 0.05}) rotate(${backRotate}deg)`,
              opacity: 1 - i * 0.3,
              transition: `all 300ms ${EASE.standard}`,
              zIndex: 3 - i,
              background: "linear-gradient(160deg, rgba(30,30,30,0.95), rgba(16,16,16,0.95))",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px",
            }} />
          );
        }
        return (
          <Box key={`${row.title}-${index}-top`} component={motion.div}
            style={{ x, y, rotate }}
            drag={!exiting}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.65}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 25 }}
            onDragStart={() => setPaused(true)}
            onDragEnd={handleDragEnd}
            animate={exiting ? { x: direction === "right" ? 320 : -320, rotate: direction === "right" ? 20 : -20, opacity: 0 } : undefined}
            transition={exiting ? { duration: 0.3, ease: "easeOut" } : undefined}
            sx={{
              position: "absolute", inset: 0, cursor: "grab",
              borderRadius: "12px", overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
              display: "grid", gridTemplateColumns: "1.15fr 1fr", gridTemplateRows: "100%",
              zIndex: 3,
            }}
          >
            <Box sx={{ position: "relative", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
              <Box component="img" src={`/hacker_bgs/bg_${index % 5}.png`} draggable={false} sx={{
                width: "100%", height: "100%", objectFit: "cover", display: "block",
                filter: `hue-rotate(${FALLBACK_HUE_SHIFTS[index % 5]}deg) saturate(1.2) brightness(1.35)`,
              }} />
              <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(100deg, transparent 50%, rgba(13,13,13,0.97) 100%)" }} />
            </Box>
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "rgba(16,16,16,0.97)", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
              <Box>
                <Typography sx={{ fontFamily: C.fontUi, fontWeight: 700, color: "#fff", fontSize: "1rem", lineHeight: 1.3, mb: 1 }}>
                  {row.title}
                </Typography>
                {row.bullets.map((b) => (
                  <Box key={b} sx={{ display: "flex", gap: 0.6, mb: 0.5 }}>
                    <Typography sx={{ color: C.orange, fontSize: "0.7rem" }}>▸</Typography>
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: "rgba(220,220,220,0.75)", lineHeight: 1.35 }}>{b}</Typography>
                  </Box>
                ))}
              </Box>
              <Box>
                <Box sx={{ display: "flex", gap: 0.6, mb: 1.25, flexWrap: "wrap" }}>
                  <StatPill label={`${row.readMin} MIN`} color={C.teal} />
                  <StatPill label={`${row.pts} PTS`} color={C.orange} />
                  <StatPill label={`${row.comments} CMTS`} color="rgba(255,255,255,0.55)" />
                </Box>
                <Button fullWidth sx={{
                  background: C.orange, color: "#000", fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.7rem", py: 0.85,
                  "&:hover": { background: "#e65c00" },
                }}>
                  READ ARTICLE
                </Button>
              </Box>
            </Box>

            <Box sx={{
              position: "absolute", top: 10, right: 10, zIndex: 2,
              fontFamily: C.fontMono, fontSize: "0.58rem", fontWeight: 700,
              color: row.matchPct >= 95 ? C.rareMatchGold : row.matchPct ? C.teal : "#a0a0a0",
              background: row.matchPct >= 95 ? "rgba(255,215,0,0.12)" : row.matchPct ? "rgba(0,255,204,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${row.matchPct >= 95 ? "rgba(255,215,0,0.5)" : row.matchPct ? "rgba(0,255,204,0.3)" : "rgba(255,255,255,0.1)"}`,
              px: 0.8, py: 0.3, borderRadius: "4px",
            }}>
              {row.matchPct ? (row.matchPct >= 95 ? `★ ${row.matchPct}% RARE MATCH` : `${row.matchPct}% MATCH`) : "DISCOVERY"}
            </Box>

            {/* Live drag-feedback glow, driven by the same x motion value the
                drag gesture controls - fades in as you drag, not just on a
                committed swipe, so trying it yourself is visibly rewarded. */}
            <Box component={motion.div} style={{ opacity: likeOpacity }} sx={{ position: "absolute", inset: 0, borderRadius: "12px", border: `3px solid ${C.success}`, boxShadow: `0 0 30px ${C.success}`, pointerEvents: "none", zIndex: 2 }} />
            <Box component={motion.div} style={{ opacity: dislikeOpacity }} sx={{ position: "absolute", inset: 0, borderRadius: "12px", border: `3px solid ${C.error}`, boxShadow: `0 0 30px ${C.error}`, pointerEvents: "none", zIndex: 2 }} />
          </Box>
        );
      })}
    </Box>
  );
}

// A minimal "browser/desktop window" frame - three muted dots and an
// optional title in the bar, like a real screenshot rather than a UI
// floating in a glow halo. Shared by all three demo tiles so the row reads
// as one deliberate system rather than three unrelated boxes.
function BrowserChrome({ children, title, sx }) {
  return (
    <Box sx={{
      borderRadius: "14px", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(14,14,14,0.6)",
      boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
      display: "flex", flexDirection: "column",
      ...sx,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 1, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <Box sx={{ display: "flex", gap: 0.6 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
          ))}
        </Box>
        {title && (
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>
            {title}
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 2, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
    </Box>
  );
}

// Counts up from 0 to `value` once, on mount - ties an effect to a real,
// honest number instead of pure decoration. Collapses to the final value
// instantly under reduced motion.
function NumberTicker({ value }) {
  const [display, setDisplay] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (value == null) return;
    if (reduceMotion) { setDisplay(value); return; }
    let start = null;
    let raf;
    const duration = 1200;
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(progress * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduceMotion]);

  return display.toLocaleString();
}

const SAVED_DEMO_ROWS = [
  { title: "Rust's async runtime internals, explained", category: "Software Engineering", source: "blog.rust-lang.org", time: "2h", points: 341 },
  { title: "New attention variant claims 4x inference speedup", category: "Artificial Intelligence", source: "arxiv.org", time: "5h", points: 512 },
  { title: "Zero-day found in a decade-old crypto library", category: "Cybersecurity", source: "blog.trailofbits.com", time: "1d", points: 288 },
];
const SAVED_FILTERS = ["All", "Software Engineering", "Artificial Intelligence", "Cybersecurity"];

// Mirrors the real SavedPanel row treatment (Sidebar.jsx) - same thumbnail
// proportions, left-border category accent, and category-chip styling - so
// this reads as an honest preview of the feature. The filter pills are the
// one piece of light interactivity this tile needed, per feedback that it
// should do something, not just sit there.
function SavedStoriesMiniDemo() {
  const [filter, setFilter] = useState("All");
  const rows = filter === "All" ? SAVED_DEMO_ROWS : SAVED_DEMO_ROWS.filter((r) => r.category === filter);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", gap: 0.6, mb: 1.5, flexWrap: "wrap" }}>
        {SAVED_FILTERS.map((cat) => {
          const active = filter === cat;
          const color = cat === "All" ? "rgba(255,255,255,0.6)" : CATEGORY_COLORS[cat];
          return (
            <Box key={cat} onClick={() => setFilter(cat)} sx={{
              cursor: "pointer", px: 1, py: 0.4, borderRadius: "999px", whiteSpace: "nowrap",
              fontFamily: C.fontMono, fontSize: "0.58rem", fontWeight: 700,
              color: active ? "#000" : color,
              background: active ? color : `${color}14`,
              border: `1px solid ${active ? color : `${color}55`}`,
              transition: `all 150ms ${EASE.standard}`,
            }}>
              {cat === "All" ? "ALL" : cat.split(" ")[0].toUpperCase()}
            </Box>
          );
        })}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0, overflow: "hidden" }}>
        <AnimatePresence mode="popLayout">
          {rows.map((row) => {
            const categoryColor = CATEGORY_COLORS[row.category];
            return (
              <Box key={row.title} component={motion.div} layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                sx={{
                  display: "flex", gap: 1.25, p: 1.25, borderRadius: "8px",
                  background: "rgba(255,102,0,0.03)", border: "1px solid rgba(255,255,255,0.05)",
                  borderLeft: `3px solid ${categoryColor}`,
                }}
              >
                <Box sx={{ width: 48, height: 48, borderRadius: "6px", flexShrink: 0, background: `linear-gradient(160deg, ${categoryColor}44, ${categoryColor}11)` }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{
                    fontFamily: C.fontUi, fontSize: "0.74rem", fontWeight: 700, color: "#fff", lineHeight: 1.3,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {row.title}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.6, flexWrap: "wrap" }}>
                    <Typography sx={{
                      fontFamily: C.fontMono, fontSize: "0.58rem", fontWeight: 700, color: categoryColor,
                      background: `${categoryColor}1a`, border: `1px solid ${categoryColor}4d`,
                      px: 0.75, py: 0.2, borderRadius: "4px",
                    }}>
                      {row.category.toUpperCase()}
                    </Typography>
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>{row.source}</Typography>
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>· {row.time}</Typography>
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.orange }}>· {row.points} pts</Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </AnimatePresence>
        {rows.length === 0 && (
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, textAlign: "center", mt: 3 }}>
            Nothing saved in this category yet.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

const TASTE_DEMO_PROFILE = [
  { category: "Artificial Intelligence", percentage: 38 },
  { category: "Software Engineering", percentage: 27 },
  { category: "Startups & VC", percentage: 14 },
  { category: "Cybersecurity", percentage: 9 },
  { category: "Hardware & Systems", percentage: 6 },
  { category: "Science & Space", percentage: 4 },
  { category: "Business & Finance", percentage: 1 },
  { category: "Design & UI/UX", percentage: 1 },
];

// A smaller version of the real TasteRadar chart (Sidebar.jsx ProfilePanel) -
// same construction (concentric grid + one filled/stroked data polygon).
// The mouse-driven interaction: track the pointer's angle from center and
// snap to the nearest axis (always resolves to a valid index - no fragile
// hit-testing against the polygon's actual geometry), highlighting that
// axis and swapping the label, with a dead-zone near center to avoid
// flicker at the one ambiguous point.
function TasteProfileMiniDemo() {
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);
  const size = 200, cx = size / 2, cy = size / 2, R = 76;
  const N = TASTE_DEMO_PROFILE.length;
  const maxPct = Math.max(...TASTE_DEMO_PROFILE.map((p) => p.percentage));
  const topIdx = TASTE_DEMO_PROFILE.reduce((bi, p, i, arr) => (p.percentage > arr[bi].percentage ? i : bi), 0);

  const axisPoint = (i, frac) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    return [cx + R * frac * Math.cos(angle), cy + R * frac * Math.sin(angle)];
  };
  const dataPoints = TASTE_DEMO_PROFILE.map((p, i) => axisPoint(i, p.percentage / maxPct).join(",")).join(" ");
  const ring = (frac) => TASTE_DEMO_PROFILE.map((_, i) => axisPoint(i, frac).join(",")).join(" ");
  const strokeColor = CATEGORY_COLORS[TASTE_DEMO_PROFILE[topIdx].category];

  const handlePointerMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left - cx;
    const py = e.clientY - rect.top - cy;
    if (Math.hypot(px, py) < 14) { setHoverIdx(null); return; }
    let angle = Math.atan2(py, px) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    setHoverIdx(Math.round(angle / (2 * Math.PI / N)) % N);
  };

  const activeIdx = hoverIdx ?? topIdx;
  const activeCategory = TASTE_DEMO_PROFILE[activeIdx].category;
  const activeColor = CATEGORY_COLORS[activeCategory];
  const top3 = [...TASTE_DEMO_PROFILE].sort((a, b) => b.percentage - a.percentage).slice(0, 3);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1.5 }}>
      <svg ref={svgRef} width={size} height={size} onPointerMove={handlePointerMove} onPointerLeave={() => setHoverIdx(null)} style={{ cursor: "pointer" }}>
        <defs>
          <radialGradient id="miniRadarFill" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.06" />
          </radialGradient>
        </defs>
        {[0.5, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        {TASTE_DEMO_PROFILE.map((p, i) => {
          const [x2, y2] = axisPoint(i, 1);
          const isActive = i === activeIdx;
          return <line key={p.category} x1={cx} y1={cy} x2={x2} y2={y2} stroke={isActive ? activeColor : "rgba(255,255,255,0.08)"} strokeWidth={isActive ? 2 : 1} style={{ transition: "all 150ms ease" }} />;
        })}
        <polygon points={dataPoints} fill="url(#miniRadarFill)" stroke={strokeColor} strokeWidth="1.75" strokeLinejoin="round" />
        {TASTE_DEMO_PROFILE.map((p, i) => {
          const [vx, vy] = axisPoint(i, p.percentage / maxPct);
          const isActive = i === activeIdx;
          return <circle key={p.category} cx={vx} cy={vy} r={isActive ? 5 : 2.5} fill={isActive ? activeColor : strokeColor} style={{ transition: "r 150ms ease, fill 150ms ease" }} />;
        })}
      </svg>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: activeColor, letterSpacing: "0.04em", fontWeight: 700, textAlign: "center" }}>
        {hoverIdx == null
          ? `STRONGEST: ${TASTE_DEMO_PROFILE[topIdx].category.toUpperCase()}`
          : `${activeCategory.toUpperCase()}: ${TASTE_DEMO_PROFILE[activeIdx].percentage}%`}
      </Typography>
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 0.5 }}>
        {top3.map((p) => (
          <Box key={p.category} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.56rem", color: C.textDim, width: 58, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.category.split(" ")[0]}
            </Typography>
            <Box sx={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <Box sx={{ width: `${(p.percentage / maxPct) * 100}%`, height: "100%", background: CATEGORY_COLORS[p.category] }} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState(location.pathname === "/register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [articleCount, setArticleCount] = useState(null);
  const sessionExpired = new URLSearchParams(location.search).get("expired") === "true";
  // Two cases open the modal immediately on mount instead of waiting for a
  // click: a lapsed session (the user needs the form right away) and in-app
  // callers that already know the user wants to convert (the guest-nudge
  // banner, the comments-drawer auth prompt) - both pass this via router state.
  const [authModalOpen, setAuthModalOpen] = useState(() => sessionExpired || !!location.state?.formIntent);

  // A real, honest proof-of-life number instead of an invented one - fails
  // silently if the request doesn't come back, since this is a nice-to-have
  // credibility line, not something worth ever showing an error for.
  useEffect(() => {
    api.getPublicStats().then((data) => setArticleCount(data.articleCount)).catch(() => {});
  }, []);
  // Lazy initializer so this is already true on the very first render, before
  // paint - otherwise the full landing page (hero + form) flashes on screen
  // for a moment after the Google redirect lands back here, before the async
  // token exchange resolves and navigates away.
  const [googleCallbackPending, setGoogleCallbackPending] = useState(() =>
    typeof window !== "undefined" && window.location.hash.includes("id_token=")
  );

  useEffect(() => {
    setMode(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

  useEffect(() => {
    if (!authModalOpen) return;
    const handleKey = (e) => { if (e.key === "Escape") setAuthModalOpen(false); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [authModalOpen]);

  // Ambient cursor-following glow, smoothed rather than tracking 1:1, matching
  // the same treatment used on the main feed page - gives the landing page a
  // touch of the same "alive" motion instead of two static gradients, and
  // keeps the two surfaces feeling like one product.
  const orangeGlowRef = useRef(null);
  const tealGlowRef = useRef(null);
  useEffect(() => {
    if (isMobile) return;
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let current = { ...target };
    let raf;
    const handleMouseMove = (e) => { target = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouseMove);
    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      if (orangeGlowRef.current) orangeGlowRef.current.style.transform = `translate3d(${current.x - 450}px, ${current.y - 450}px, 0)`;
      if (tealGlowRef.current) tealGlowRef.current.style.transform = `translate3d(${current.x - 160}px, ${current.y - 160}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener("mousemove", handleMouseMove); cancelAnimationFrame(raf); };
  }, [isMobile]);

  const switchMode = (next) => {
    setError("");
    setMode(next);
    navigate(next === "register" ? "/register" : "/login", { replace: true });
  };

  // Opens the modal pre-set to a given mode - used by the nav's "Sign in"
  // link (login) and "Start Swiping" button (register - nudges signup first,
  // guest is the de-emphasized escape hatch inside the modal).
  const openAuthModal = (next) => {
    switchMode(next);
    setAuthModalOpen(true);
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError("");
    try {
      const res = await api.loginAsGuest();
      localStorage.setItem("token", res.data.token);
      localStorage.removeItem("hs_onboarding_done");
      // hs_seen_onboarding gates the separate in-app tutorial overlay (the
      // swipe walkthrough on the feed) and was never cleared anywhere - once
      // any guest on this browser saw it once, every later guest session
      // silently skipped it forever, even though each new guest is a fresh,
      // isolated account. Clear it here too so a new guest session actually
      // gets a fresh tour, same as the category picker already does.
      localStorage.removeItem("hs_seen_onboarding");
      // Same story for the 5-like guest-conversion nudge (App.jsx) - it's
      // meant to fire once per guest session on their 5th like, but the flag
      // lived in localStorage with nothing ever clearing it, so a second
      // guest session on the same browser silently never saw it again even
      // starting from 0 likes. Clear it here too.
      localStorage.removeItem("hs_seen_like_milestone");
      track("guest_started");
      navigate("/onboarding", { replace: true });
    } catch {
      setError("Failed to start guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // A nonce is required by Google whenever an id_token is requested via the
    // implicit/hybrid flow, and doubles as replay protection: it's minted
    // here, stashed in sessionStorage (survives the full-page redirect to
    // Google and back), embedded in the returned id_token's own nonce claim,
    // and checked again server-side against what we send back.
    const nonce = window.crypto.randomUUID();
    sessionStorage.setItem("hs_google_oauth_nonce", nonce);
    const redirectUri = encodeURIComponent(window.location.origin + "/login");
    const scope = encodeURIComponent("openid email profile");
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=id_token&scope=${scope}&prompt=select_account&nonce=${nonce}`;
    window.location.href = url;
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      const nonce = sessionStorage.getItem("hs_google_oauth_nonce");
      sessionStorage.removeItem("hs_google_oauth_nonce");
      if (idToken) {
        window.history.replaceState(null, null, window.location.pathname);
        setLoading(true);
        api.loginWithGoogle(idToken, nonce)
          .then((res) => {
            localStorage.setItem("token", res.data.token);
            // Only force the category picker for a genuinely new account -
            // a returning user signing back in with Google should never see
            // onboarding again just because they logged in.
            if (res.data.isNewUser) localStorage.removeItem("hs_onboarding_done");
            track("login_completed", { method: "google" });
            navigate("/", { replace: true });
          })
          .catch((err) => {
            setError(err.response?.data?.error || "Google sign in failed. Please try again.");
            setLoading(false);
            setGoogleCallbackPending(false);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    const wasGuest = (() => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return false;
        return !!JSON.parse(atob(token.split(".")[1])).user?.isGuest;
      } catch {
        return false;
      }
    })();

    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        localStorage.setItem("token", res.data.token);
        // A returning password login should never re-trigger onboarding -
        // that flag only matters for a genuinely new account (see the
        // register branch below).
        track("login_completed", { method: "password" });
        navigate("/", { replace: true });
      } else {
        const res = await api.register(email, password);
        localStorage.setItem("token", res.data.token);
        if (!wasGuest) localStorage.removeItem("hs_onboarding_done");
        track(wasGuest ? "guest_converted" : "signup_completed");
        navigate(wasGuest ? "/" : "/onboarding", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || `${mode === "login" ? "Sign in" : "Registration"} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      color: "white",
      fontFamily: C.fontMono,
      "& fieldset": { borderColor: "rgba(255,255,255,0.12)" },
      "&:hover fieldset": { borderColor: C.border },
      "&.Mui-focused fieldset": { borderColor: C.orange },
    },
    "& .MuiInputLabel-root": { color: C.textDim, fontFamily: C.fontMono },
    "& .MuiInputLabel-root.Mui-focused": { color: C.orange },
  };

  if (googleCallbackPending) {
    return (
      <Box sx={{
        height: "100vh", width: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", background: C.bg,
      }}>
        <CircularProgress size={28} sx={{ color: C.orange, mb: 2.5 }} />
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, letterSpacing: "0.05em" }}>
          SIGNING YOU IN WITH GOOGLE...
        </Typography>
      </Box>
    );
  }

  // Entrance stagger for the hero content - a deliberate "the page is
  // arriving" moment instead of everything popping in at once. Box+motion.div
  // only (never Typography swapped to a motion component - that combination
  // silently failed to animate in an earlier attempt on this exact page;
  // wrapping plain Typography in a motion Box sidesteps it entirely).
  const stagger = (delay) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: "easeOut" },
  };

  return (
    <Box sx={{
      height: { xs: "auto", md: "100vh" }, minHeight: "100vh", width: "100%",
      display: "flex", flexDirection: "column", position: "relative",
      overflow: { xs: "visible", md: "hidden" },
      background: C.bg,
    }}>
      {/* Ambient layers - static regardless of the auth modal's state, so the
          background never flickers when it opens/closes. The diagonal
          grain-textured glow sweep is the primary personality layer; the
          cursor-glow blobs and corner brackets are secondary, quieter
          details on top of it. */}
      <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <Box sx={{
          position: "absolute", top: "-25%", left: "-15%", width: "95%", height: "150%",
          background: `linear-gradient(115deg, transparent 32%, ${C.orange}1f 47%, ${C.orange}10 55%, transparent 68%)`,
          filter: "blur(50px)", transform: "rotate(-8deg)",
        }} />
        <Box sx={{
          position: "absolute", bottom: "-35%", right: "-20%", width: "65%", height: "130%",
          background: `linear-gradient(115deg, transparent 40%, ${C.teal}16 52%, transparent 66%)`,
          filter: "blur(60px)", transform: "rotate(-8deg)",
        }} />
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: NOISE_TEXTURE, opacity: 0.05, mixBlendMode: "overlay" }} />
      </Box>
      <Box ref={orangeGlowRef} sx={{
        position: "absolute", top: 0, left: 0, width: 900, height: 900,
        background: "radial-gradient(circle, rgba(255,102,0,0.05), transparent 65%)",
        pointerEvents: "none", zIndex: 0, willChange: "transform", display: { xs: "none", md: "block" },
      }} />
      <Box ref={tealGlowRef} sx={{
        position: "absolute", top: 0, left: 0, width: 320, height: 320,
        background: "radial-gradient(circle, rgba(0,255,204,0.04), transparent 65%)",
        pointerEvents: "none", zIndex: 0, willChange: "transform", display: { xs: "none", md: "block" },
      }} />
      <Box sx={{ position: "absolute", top: 88, left: 32, width: 22, height: 22, borderTop: `2px solid rgba(255,102,0,0.25)`, borderLeft: `2px solid rgba(255,102,0,0.25)`, borderTopLeftRadius: "4px", display: { xs: "none", md: "block" } }} />
      <Box sx={{ position: "absolute", bottom: 32, right: 32, width: 22, height: 22, borderBottom: `2px solid rgba(0,255,204,0.12)`, borderRight: `2px solid rgba(0,255,204,0.12)`, borderBottomRightRadius: "4px", display: { xs: "none", md: "block" } }} />

      {/* Nav + hero content - pushed back (scaled/dimmed) slightly while the
          auth modal is open, for a bit of physical depth. Kept as its own
          wrapper, separate from the modal below, since a transform/filter
          here would otherwise constrain the modal's fixed positioning if the
          modal were nested inside it. */}
      <Box component={motion.div}
        animate={reduceMotion ? {} : { scale: authModalOpen ? 0.985 : 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}
      >
        {/* NAV */}
        <Box sx={{
          height: 72, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          px: { xs: 3, md: 6, lg: 8 }, borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", background: C.orange, boxShadow: `0 0 10px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
            <Typography sx={{ fontFamily: C.fontMono, fontWeight: 800, fontSize: "1rem", color: C.orange, letterSpacing: "0.08em" }}>
              HACKERSWIPE
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Typography
              onClick={() => openAuthModal("login")}
              sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, cursor: "pointer", "&:hover": { color: "#fff" } }}
            >
              Sign in
            </Typography>
            <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "8px" }}>
              <Button
                onClick={() => openAuthModal("register")}
                sx={{
                  py: 1, px: 2.5, fontFamily: C.fontMono, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.05em",
                  background: C.orange, color: "#000", borderRadius: "8px",
                  "&:hover": { background: "#e65c00" },
                }}
              >
                START SWIPING
              </Button>
              {!reduceMotion && (
                <Box sx={{
                  position: "absolute", top: 0, left: 0, width: "40%", height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                  animation: "ctaShine 1.1s ease-out 1.1s 1 forwards",
                  pointerEvents: "none",
                }} />
              )}
            </Box>
          </Box>
        </Box>

        {/* HEADER + DEMO ROW - anchored directly below the nav (no vertical
            centering, which was the direct cause of the earlier empty
            top-left gap), full width throughout. */}
        <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", px: { xs: 3, md: 6, lg: 8 }, pt: 3, pb: 2.5 }}>
          <Box component={motion.div} {...stagger(0)} sx={{ maxWidth: 880 }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: "rgba(232,232,232,0.7)", letterSpacing: "0.14em", mb: 1 }}>
              A SHARPER WAY TO READ HACKER NEWS
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.08)} sx={{ maxWidth: 880 }}>
            <Typography sx={{
              fontFamily: C.fontUi, fontSize: { xs: "2.3rem", md: "2.8rem", lg: "3.2rem" }, fontWeight: 800, color: "#f5f5f5",
              lineHeight: 1.05, mb: 1, letterSpacing: "-0.015em",
            }}>
              The front page of tech,{" "}
              <Box component="span" sx={{ color: C.orange }}>tuned to you.</Box>
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.16)} sx={{ maxWidth: 700 }}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.05rem", color: "rgba(240,240,240,0.72)", lineHeight: 1.5 }}>
              Every story previewed, personalized, and sorted by what you're actually into.
              {articleCount != null && (
                <Box component="span" sx={{ fontFamily: C.fontMono, fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
                  {" "}· <NumberTicker value={articleCount} />+ indexed.
                </Box>
              )}
            </Typography>
          </Box>

          {isMobile && (
            <Box sx={{
              mt: 3, p: 2, borderRadius: "10px", maxWidth: 460, textAlign: "left",
              background: "rgba(255,102,0,0.06)", border: `1px solid ${C.border}`,
            }}>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: "#fff", fontWeight: 700, mb: 0.5 }}>
                Laptop or desktop only, for now
              </Typography>
              <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.82rem", color: "rgba(232,232,232,0.65)", lineHeight: 1.5 }}>
                The swipe experience isn't built for phones yet. Open this link on a laptop to sign in and start swiping.
              </Typography>
            </Box>
          )}

          {/* DEMO ROW - the visual centerpiece of the page: the swipe demo as
              the big/bold primary tile, then saved-stories and taste-profile
              as secondary/tertiary tiles, all sharing the same window-chrome
              framing so the row reads as one deliberate system. */}
          <Box component={motion.div} {...stagger(0.24)} sx={{
            flex: 1, minHeight: 0, mt: 3, display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3,
          }}>
            <Box sx={{ flex: { md: "0 0 46%" }, minWidth: 0, minHeight: { xs: 300, md: 0 } }}>
              <BrowserChrome title="LIVE PREVIEW · DRAG TO TRY IT" sx={{ height: "100%" }}>
                <SwipeStackDemo />
              </BrowserChrome>
            </Box>
            <Box sx={{ flex: { md: "0 0 32%" }, minWidth: 0, minHeight: { xs: 260, md: 0 } }}>
              <BrowserChrome title="SAVED FOR LATER" sx={{ height: "100%" }}>
                <SavedStoriesMiniDemo />
              </BrowserChrome>
            </Box>
            <Box sx={{ flex: { md: "0 0 22%" }, minWidth: 0, minHeight: { xs: 260, md: 0 } }}>
              <BrowserChrome title="TASTE PROFILE" sx={{ height: "100%" }}>
                <TasteProfileMiniDemo />
              </BrowserChrome>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* AUTH MODAL - portaled, sibling of the depth-push wrapper above (not
          nested inside it - a transform/filter ancestor would otherwise
          constrain this modal's fixed positioning). Backdrop darkens+blurs
          the landing page; card scales/blurs in; closes via backdrop click,
          the close button, or Escape. AnimatePresence stays permanently
          mounted with the content conditionally keyed inside it (rather than
          the whole block being conditionally rendered) so the close actually
          plays its exit animation instead of snapping away. */}
      {createPortal(
        <AnimatePresence>
          {authModalOpen && (
            <Box component={motion.div} key="auth-modal-backdrop"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? {} : { opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setAuthModalOpen(false)}
              sx={{
                position: "fixed", inset: 0, zIndex: 2000,
                background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center", px: 3,
              }}
            >
              <Box component={motion.div}
                onClick={(e) => e.stopPropagation()}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, scale: 0.94, y: 16 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                sx={{
                  width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto",
                  borderRadius: "20px", background: "rgba(15,15,15,0.97)", border: `1px solid ${C.border}`,
                  boxShadow: "0 24px 60px rgba(0,0,0,0.55)", p: { xs: 3.5, md: 4.5 }, position: "relative",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
                    <Typography sx={{ fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.72rem", color: C.orange, letterSpacing: "0.08em" }}>HACKERSWIPE</Typography>
                  </Box>
                  <IconButton onClick={() => setAuthModalOpen(false)} aria-label="Close" sx={{ color: C.textDim, "&:hover": { color: "#fff", background: "rgba(255,255,255,0.08)" } }}>
                    ✕
                  </IconButton>
                </Box>

                {sessionExpired && (
                  <Box sx={{ mb: 3, p: 1.8, borderRadius: "10px", background: "rgba(243,156,18,0.08)", border: "1px solid rgba(243,156,18,0.3)" }}>
                    <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: "#e8e8e8", lineHeight: 1.5 }}>
                      Your guest session ended. Create an account to keep a saved taste profile, or start a new guest session below.
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: "flex", mb: 4, borderRadius: "10px", border: `1px solid ${C.border}`, p: "3px" }}>
                  {["login", "register"].map((m) => (
                    <Box
                      key={m}
                      onClick={() => switchMode(m)}
                      sx={{
                        flex: 1, textAlign: "center", py: 1, borderRadius: "8px", cursor: "pointer",
                        fontFamily: C.fontMono, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em",
                        color: mode === m ? "#000" : C.textDim,
                        background: mode === m ? C.orange : "transparent",
                        transition: `all 200ms ${EASE.standard}`,
                      }}
                    >
                      {m === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
                    </Box>
                  ))}
                </Box>

                <Button
                  fullWidth variant="outlined" onClick={handleGoogleLogin}
                  sx={{
                    mb: 3, py: 1.4, color: "#fff", borderColor: "rgba(255,255,255,0.2)",
                    fontFamily: C.fontUi, fontSize: "0.85rem", fontWeight: 600,
                    borderRadius: "10px", textTransform: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5,
                    background: "rgba(255,255,255,0.02)",
                    "&:hover": { background: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.4)" },
                    "&:active": { transform: "scale(0.99)" },
                    transition: `all 200ms ${EASE.standard}`,
                  }}
                >
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" style={{ width: 18, height: 18 }} />
                  Continue with Google
                </Button>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", mb: 3 }}>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, px: 1 }}>or</Typography>
                </Divider>

                <form onSubmit={handleSubmit}>
                  <TextField label="Email" type="email" variant="outlined" fullWidth margin="normal"
                    value={email} onChange={(e) => setEmail(e.target.value)} required sx={inputSx} />
                  <TextField label="Password" type="password" variant="outlined" fullWidth margin="normal"
                    value={password} onChange={(e) => setPassword(e.target.value)} required sx={inputSx} />

                  {mode === "login" && (
                    <Typography
                      onClick={() => navigate("/forgot-password")}
                      sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, textAlign: "right", mt: 1, cursor: "pointer", "&:hover": { color: "#fff" } }}
                    >
                      Forgot password?
                    </Typography>
                  )}

                  {error && (
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.error, mt: 1.5, textAlign: "center" }}>
                      {error}
                    </Typography>
                  )}

                  <Button type="submit" variant="contained" fullWidth disabled={loading}
                    sx={{
                      mt: 2.5, mb: 3, py: 1.5,
                      fontFamily: C.fontMono, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.05em",
                      background: C.orange, color: "#000", borderRadius: "10px",
                      "&:hover": { background: "#e65c00" },
                      "&:disabled": { background: "rgba(255,102,0,0.4)" },
                    }}>
                    {loading ? <CircularProgress size={20} sx={{ color: "#000" }} /> : (mode === "login" ? "SIGN IN" : "CREATE ACCOUNT")}
                  </Button>
                  {mode === "register" && (
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", textAlign: "center", mt: -1.5, mb: 2 }}>
                      By creating an account you agree to our{" "}
                      <Box component="span" onClick={() => navigate("/privacy")} sx={{ color: C.textDim, cursor: "pointer", "&:hover": { color: "#fff" } }}>
                        Privacy Policy
                      </Box>.
                    </Typography>
                  )}
                </form>

                <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", my: 3 }} />

                <Button
                  fullWidth onClick={handleGuest} disabled={guestLoading}
                  endIcon={!guestLoading && <ArrowForward sx={{ fontSize: "1rem !important" }} />}
                  sx={{
                    py: 1.3, borderRadius: "10px", textTransform: "none",
                    border: "1.5px dashed rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.02)",
                    display: "flex", flexDirection: "column", gap: 0.3,
                    "&:hover": { borderColor: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.06)" },
                    "&:active": { transform: "scale(0.99)" },
                    transition: `all 200ms ${EASE.standard}`,
                  }}
                >
                  {guestLoading ? (
                    <CircularProgress size={18} sx={{ color: C.textDim }} />
                  ) : (
                    <>
                      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.04em", color: "#fff" }}>
                        EXPLORE AS GUEST
                      </Typography>
                      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim }}>
                        No signup. Explore free for 24 hours.
                      </Typography>
                    </>
                  )}
                </Button>
              </Box>
            </Box>
          )}
        </AnimatePresence>,
        document.body
      )}
    </Box>
  );
}
