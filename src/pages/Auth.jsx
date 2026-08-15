import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Box, Typography, TextField, Button, Divider, CircularProgress, IconButton } from "@mui/material";
import { ArrowForward, Check, Close } from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C, CATEGORY_COLORS } from "../theme.js";
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

// 5 rows, 4 "liked" + 1 deliberate pass, mirroring the real product's own
// discovery mix (a mostly-matched feed with an occasional trending/"popular"
// card, not only ranked matches - see getBadge below). Bullets are 3
// fragments each, ≤60 chars, no leading articles - the exact contract the
// backend enforces (news-swipe-api/ingest.js:89-102), confirmed by reading
// that prompt rather than guessing at the product's own voice.
const DEMO_ROWS = [
  {
    title: "Show HN: I gave Claude Code root on my prod box",
    bullets: ["Watched closely, ready to revert", "Found memory leak humans missed", "Fixed it before I woke up"],
    pts: 743, matchPct: 96, category: "Artificial Intelligence", liked: true,
  },
  {
    title: "Ask HN: Is remote work already dead again?",
    bullets: ["Same debate, different year again", "No new data driving discussion", "Thread mostly reheated takes"],
    pts: 89, discoveryType: "random", category: "Business & Finance", liked: false,
  },
  {
    title: "Researchers jailbroke every major LLM with one emoji",
    bullets: ["Single emoji bypassed guardrails", "Works across GPT, Claude, Gemini", "Vendors scrambling to patch fast"],
    pts: 1240, matchPct: 91, category: "Cybersecurity", liked: true,
  },
  {
    title: "AI coding agent caught bug three engineers missed",
    bullets: ["Flagged race condition in minutes", "Senior devs had reviewed twice already", "Merged fix before standup started"],
    pts: 512, matchPct: 88, category: "Software Engineering", liked: true,
  },
  {
    title: "Anthropic's new agent SDK is quietly replacing contractors",
    bullets: ["Freelancers reporting fewer gigs", "SDK ships full task pipelines now", "Opinions split hard on this"],
    pts: 678, discoveryType: "popular", category: "Artificial Intelligence", liked: true,
  },
];

// Mirrors the real card's badge logic (NewsCard.jsx:224-295) exactly,
// including the fallback discovery states - so the demo actually shows the
// "popular" card type too, not just taste-matched ones (the previous
// version's subhead claimed personalization but only ever demoed matches).
function getBadge(row) {
  if (row.matchPct != null) {
    if (row.matchPct >= 95) {
      return { text: `★ ${row.matchPct}% RARE MATCH`, color: C.rareMatchGold, bg: "rgba(255,215,0,0.12)", border: "rgba(255,215,0,0.5)", glow: "0 0 12px rgba(255,215,0,0.25)" };
    }
    return { text: `${row.matchPct}% MATCH`, color: C.teal, bg: "rgba(0,255,204,0.1)", border: "rgba(0,255,204,0.3)" };
  }
  if (row.discoveryType === "popular") return { text: "🔥 POPULAR", color: C.orange, bg: "rgba(255,102,0,0.1)", border: "rgba(255,102,0,0.35)" };
  return { text: "DISCOVERY", color: "#a0a0a0", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };
}

// Short display forms for the taste-profile legend.
const SHORT_CATEGORY = {
  "Artificial Intelligence": "AI",
  "Software Engineering": "SWE",
  "Startups & VC": "STARTUPS",
  "Cybersecurity": "SECURITY",
  "Hardware & Systems": "HARDWARE",
  "Science & Space": "SCIENCE",
  "Business & Finance": "BUSINESS",
  "Design & UI/UX": "DESIGN",
};

// Counts up from 0 to `value` once on mount, then periodically (every ~7s)
// plays a brief, bounded scramble-and-settle flourish around the true value -
// a small "still live" tell rather than a number printed once and forgotten.
// The scramble always ends exactly on `value`, so it can never visibly get
// stuck on a wrong number.
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

  useEffect(() => {
    if (value == null || reduceMotion) return;
    const loop = setInterval(() => {
      let ticks = 0;
      const scramble = setInterval(() => {
        ticks += 1;
        setDisplay(value + Math.round((Math.random() - 0.5) * value * 0.02));
        if (ticks >= 5) {
          clearInterval(scramble);
          setDisplay(value);
        }
      }, 80);
    }, 7000);
    return () => clearInterval(loop);
  }, [value, reduceMotion]);

  return display.toLocaleString();
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
const TASTE_AXIS_ORDER = TASTE_DEMO_PROFILE.map((p) => p.category);
const BASELINE_WEIGHTS = Object.fromEntries(TASTE_DEMO_PROFILE.map((p) => [p.category, p.percentage]));

// A slim frame around just the demo card - three muted dots, thin border -
// so the one dominant object reads as "a real screenshot," not the whole
// composition (the two panels below branch off outside it, per direction).
function BrowserFrame({ children }) {
  return (
    <Box sx={{
      borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(14,14,14,0.6)", boxShadow: "0 20px 48px rgba(0,0,0,0.35)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.75, py: 1.1, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
        ))}
      </Box>
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>{children}</Box>
    </Box>
  );
}

// The Saved panel - real growing list, not a bare counter. A new row lands
// at the top on every like (AnimatePresence slide+fade, the same proven
// pattern already used for the auth modal on this page), caps at 4, then
// clears and starts a fresh batch - "a repeating cycle of a few cards that
// get added then resets," per direction, instead of an abstract number.
function SavedListPanel({ items }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", p: 1.5 }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.64rem", color: C.textDim, letterSpacing: "0.08em", mb: 1 }}>
        SAVED FOR LATER
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.65, minHeight: 96 }}>
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const color = CATEGORY_COLORS[item.category];
            return (
              <Box key={item.id} component={motion.div}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                sx={{ display: "flex", gap: 1, p: 0.85, borderRadius: "6px", background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${color}` }}
              >
                <Box sx={{ width: 28, height: 28, borderRadius: "5px", flexShrink: 0, background: `linear-gradient(160deg, ${color}44, ${color}11)` }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{
                    fontFamily: C.fontUi, fontSize: "0.64rem", fontWeight: 700, color: "#fff", lineHeight: 1.3,
                    display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.54rem", fontWeight: 700, color, mt: 0.25 }}>
                    {item.category.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </AnimatePresence>
        {items.length === 0 && (
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
            waiting for the next like…
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// The Taste panel - the real radar construction, enlarged with a legend
// (kept the idea the user liked, fixed the "random weird symbol at 44px, no
// context" execution). Weights evolve as likes land; rather than tweening
// the raw SVG `points` string (not natively animatable, and exactly the
// fragile-looking technique to avoid), the polygon cross-fades between
// shapes via a keyed AnimatePresence - opacity is always safe to animate.
function TastePanel({ weights, version }) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const ranked = TASTE_AXIS_ORDER
    .map((category) => ({ category, pct: Math.round((weights[category] / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
  const leaderColor = CATEGORY_COLORS[ranked[0].category];
  const maxWeight = Math.max(...Object.values(weights));
  const size = 92, cx = size / 2, cy = size / 2, R = 34;
  const axisPoint = (i, frac) => {
    const angle = (i / TASTE_AXIS_ORDER.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + R * frac * Math.cos(angle), cy + R * frac * Math.sin(angle)];
  };
  const ring = (frac) => TASTE_AXIS_ORDER.map((_, i) => axisPoint(i, frac).join(",")).join(" ");
  const dataPoints = TASTE_AXIS_ORDER.map((category, i) => axisPoint(i, weights[category] / maxWeight).join(",")).join(" ");

  return (
    <Box sx={{ flex: 1, minWidth: 0, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", p: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {[0.5, 1].map((f) => (
            <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          ))}
          <AnimatePresence mode="wait">
            <Box component={motion.polygon} key={version}
              points={dataPoints} fill={`${leaderColor}26`} stroke={leaderColor} strokeWidth="2" strokeLinejoin="round"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
            />
          </AnimatePresence>
        </svg>
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.64rem", color: C.textDim, letterSpacing: "0.08em", mb: 0.5 }}>
          TASTE PROFILE
        </Typography>
        {ranked.slice(0, 3).map((r) => (
          <Box key={r.category} sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.25 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: CATEGORY_COLORS[r.category], flexShrink: 0 }} />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.72)", whiteSpace: "nowrap" }}>
              {SHORT_CATEGORY[r.category] || r.category} · {r.pct}%
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// A thin connector line with a one-shot dash-flow pulse (not a literal
// ball/dot travelling down it - a wave of light along the line instead,
// keyed by `pulseKey` so each like/dislike event replays it once). x1/y1/x2/
// y2 are in the shared 0-100 viewBox coordinate space of the pipe zone.
function Pipe({ x1, y1, x2, y2, color, pulseKey }) {
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      {pulseKey > 0 && (
        <line key={pulseKey} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth="2" strokeDasharray="9 150" strokeLinecap="round"
          style={{ animation: "pipeDashFlow 700ms ease-out" }}
        />
      )}
    </>
  );
}

// The hero's centerpiece: one big auto-cycling card (no drag - there's
// nothing real for a visitor to teach a static demo, so dragging would be
// theater), connected by minimal pipes to two panels that evolve as the
// cycle plays - the saved list and taste profile read as the *consequence*
// of the demo, not two more disconnected boxes beside it.
function HeroDemoSystem() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState("right");
  const [savedList, setSavedList] = useState([]);
  const [weights, setWeights] = useState(BASELINE_WEIGHTS);
  const [profileVersion, setProfileVersion] = useState(0);
  const [likePulse, setLikePulse] = useState(0);
  const [dislikePulse, setDislikePulse] = useState(0);
  const likeCountRef = useRef(0);
  // Authoritative current row, tracked in a ref rather than derived from
  // effect re-creation on every `index` change: a single interval that lives
  // for the component's whole lifetime, reading/advancing this ref, is
  // immune to the fragile "effect must tear down and recreate before the
  // next tick" ordering that a per-index effect depends on - important
  // because a backgrounded tab can throttle timers into firing in bursts,
  // and the previous version double-counted a like when that happened.
  const indexRef = useRef(0);
  // Guards against the interval firing again while the previous tick's
  // 450ms exit/commit window is still open - without this, a throttled
  // background tab catching up on overdue timers can invoke the interval
  // callback twice for the same row before its own setTimeout below has
  // advanced indexRef, double-counting a single like.
  const isCommittingRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (isCommittingRef.current) return;
      isCommittingRef.current = true;
      const i = indexRef.current;
      const row = DEMO_ROWS[i];
      setDirection(row.liked ? "right" : "left");
      if (row.liked) {
        setLikePulse((p) => p + 1);
        const next = likeCountRef.current + 1;
        const entry = { id: `row${i}-like${next}`, title: row.title, category: row.category };
        if (next > 4) {
          // Cap hit - clear the batch and this like starts a fresh one,
          // rather than growing forever.
          likeCountRef.current = 1;
          setSavedList([entry]);
          setWeights({ ...BASELINE_WEIGHTS, [row.category]: BASELINE_WEIGHTS[row.category] + 16 });
        } else {
          likeCountRef.current = next;
          setSavedList((list) => [entry, ...list].slice(0, 4));
          setWeights((w) => ({ ...w, [row.category]: (w[row.category] || 0) + 16 }));
        }
        setProfileVersion((v) => v + 1);
      } else {
        setDislikePulse((p) => p + 1);
      }
      setExiting(true);
      setTimeout(() => {
        indexRef.current = (i + 1) % DEMO_ROWS.length;
        setIndex(indexRef.current);
        setExiting(false);
        isCommittingRef.current = false;
      }, reduceMotion ? 0 : 450);
    }, 3400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const row = DEMO_ROWS[index];
  const badge = getBadge(row);

  return (
    <Box sx={{ width: "100%", maxWidth: 600 }}>
      <BrowserFrame>
        <Box sx={{
          position: "relative", minHeight: 290, borderRadius: "12px", overflow: "hidden",
          background: "linear-gradient(160deg, rgba(30,30,30,0.95), rgba(16,16,16,0.95))",
          border: "1px solid rgba(255,255,255,0.08)",
          p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column",
          animation: reduceMotion ? "none" : "border-pulse 3.4s ease-in-out infinite",
          transform: exiting
            ? `translateX(${direction === "right" ? 280 : -280}px) rotate(${direction === "right" ? 14 : -14}deg)`
            : "translateX(0) rotate(0deg)",
          opacity: exiting ? 0 : 1,
          transition: reduceMotion ? "opacity 200ms linear" : `all 450ms ${EASE.standard}`,
        }}>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: { xs: "1.2rem", md: "1.4rem" }, color: "#fff", fontWeight: 700, lineHeight: 1.32, pr: 7 }}>
            {row.title}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.85, mt: 2 }}>
            {row.bullets.map((b) => (
              <Box key={b} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography sx={{ color: C.orange, fontSize: "0.8rem", mt: "1px" }}>▸</Typography>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: "rgba(225,225,225,0.78)", lineHeight: 1.5 }}>
                  {b}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.orange, fontWeight: 700 }}>{row.pts} pts</Typography>
            <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>news.ycombinator.com</Typography>
          </Box>

          {exiting ? (
            <Box sx={{
              position: "absolute", top: 20, right: 20, width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: direction === "right" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
              border: `1.5px solid ${direction === "right" ? C.success : C.error}`,
              color: direction === "right" ? C.success : C.error,
            }}>
              {direction === "right" ? <Check sx={{ fontSize: "1.25rem" }} /> : <Close sx={{ fontSize: "1.25rem" }} />}
            </Box>
          ) : (
            <Typography sx={{
              position: "absolute", top: 20, right: 20,
              fontFamily: C.fontMono, fontSize: "0.68rem", fontWeight: 700, color: badge.color,
              background: badge.bg, border: `1px solid ${badge.border}`, boxShadow: badge.glow,
              px: 1, py: 0.4, borderRadius: "6px",
            }}>
              {badge.text}
            </Typography>
          )}
        </Box>
      </BrowserFrame>

      {/* Pipe zone - minimal fan of connector lines from the card down to
          the two panels, each playing a one-shot light-flow pulse (not a
          literal ball) when a like/dislike lands. A short third stub peels
          off toward a muted "discarded" mark on a dislike. */}
      <Box sx={{ position: "relative", height: 40 }}>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          <Pipe x1={38} y1={0} x2={16} y2={40} color={C.orange} pulseKey={likePulse} />
          <Pipe x1={62} y1={0} x2={84} y2={40} color={C.orange} pulseKey={likePulse} />
          <Pipe x1={50} y1={0} x2={50} y2={22} color="rgba(255,255,255,0.4)" pulseKey={dislikePulse} />
        </svg>
        <Box sx={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.3)",
        }}>
          <Close sx={{ fontSize: "0.85rem" }} />
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, alignItems: "stretch" }}>
        <SavedListPanel items={savedList} />
        <TastePanel weights={weights} version={profileVersion} />
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
        {/* NAV - just the brand + a quiet way back in for returning users.
            The filled "START SWIPING" button that used to live here was
            doing the exact same thing as the new hero CTA below, visible on
            the same screen at the same time - removed rather than kept as a
            redundant second button. */}
        <Box sx={{
          height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
          px: { xs: 3, md: 6, lg: 8 }, borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 9, height: 9, borderRadius: "50%", background: C.orange, boxShadow: `0 0 10px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
            <Typography sx={{ fontFamily: C.fontMono, fontWeight: 800, fontSize: "1rem", color: C.orange, letterSpacing: "0.08em" }}>
              HACKERSWIPE
            </Typography>
          </Box>
          <Typography
            onClick={() => openAuthModal("login")}
            sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, cursor: "pointer", "&:hover": { color: "#fff" } }}
          >
            Sign in
          </Typography>
        </Box>

        {/* HERO ROW - asymmetric, top-anchored: both columns start at the
            same top edge instead of each independently vertically centering
            (the old justifyContent:"center" per-column pattern is exactly
            what read as "blocky, empty, accidental" - a real content column
            next to a real visual, not two islands). */}
        <Box sx={{
          flex: 1, minHeight: 0, display: "flex", flexDirection: { xs: "column", md: "row" },
          px: { xs: 3, md: 6, lg: 8 }, py: { xs: 4, md: 2.25 }, gap: { xs: 4, md: 5 },
        }}>
          {/* LEFT - lean pitch: eyebrow, headline, one-sentence subhead, a
              real hero-level CTA (previously only lived in the thin nav
              bar), and a bottom-pinned proof stat + category strip using the
              height freed up by cutting the old 3-bullet block. */}
          <Box sx={{ flex: { md: "0 0 500px" }, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <Box sx={{ width: "100%" }}>
              <Box component={motion.div} {...stagger(0)}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: "rgba(232,232,232,0.7)", letterSpacing: "0.14em", mb: 1.5 }}>
                  A SHARPER WAY TO READ HACKER NEWS
                </Typography>
              </Box>

              {/* Two lines, guaranteed: line 1 is forced to never wrap
                  (whiteSpace:nowrap) rather than relying on a hairline fit
                  between font size and column width - that's exactly what
                  broke into 3 lines last round. */}
              <Box component={motion.div} {...stagger(0.08)}>
                <Typography sx={{
                  fontFamily: C.fontUi, fontSize: { xs: "1.85rem", md: "2rem", lg: "2.35rem" }, fontWeight: 700, color: "#f5f5f5",
                  lineHeight: 1.18, mb: 1.75, letterSpacing: "-0.01em",
                }}>
                  <Box component="span" sx={{ whiteSpace: "nowrap" }}>The front page of tech,</Box>
                  <br />
                  <Box
                    component="span"
                    sx={{
                      fontFamily: C.fontMono, color: C.orange, fontSize: "0.85em",
                      background: "rgba(255,102,0,0.1)", border: "1px solid rgba(255,102,0,0.3)",
                      borderRadius: "6px", px: 0.85, py: "2px",
                    }}
                  >
                    tuned
                  </Box>{" "}
                  to you.
                </Typography>
              </Box>

              <Box component={motion.div} {...stagger(0.16)}>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.02rem", color: "rgba(240,240,240,0.72)", lineHeight: 1.55, mb: 3, maxWidth: 460 }}>
                  Every story previewed, personalized, and sorted by what you're actually into.
                </Typography>
              </Box>

              <Box component={motion.div} {...stagger(0.24)} sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2.5 }}>
                <Button
                  onClick={() => openAuthModal("register")}
                  sx={{
                    py: 1.3, px: 3, fontFamily: C.fontMono, fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.05em",
                    background: C.orange, color: "#000", borderRadius: "10px",
                    "&:hover": { background: "#e65c00" },
                  }}
                >
                  START SWIPING →
                </Button>
                <Typography
                  onClick={guestLoading ? undefined : handleGuest}
                  sx={{
                    fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim,
                    cursor: guestLoading ? "default" : "pointer",
                    "&:hover": { color: guestLoading ? C.textDim : "#fff" },
                  }}
                >
                  {guestLoading ? "Starting…" : "or explore as guest"}
                </Typography>
              </Box>

              {isMobile && (
                <Box sx={{
                  mt: 4, p: 2, borderRadius: "10px", maxWidth: 460, textAlign: "left",
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
            </Box>

            <Box component={motion.div} {...stagger(0.4)}>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", mb: 1.5 }}>
                Real Hacker News stories.{" "}
                {articleCount != null && (
                  <>
                    <Box component="span" sx={{ color: C.orange, fontWeight: 700, textShadow: `0 0 14px ${C.orange}55` }}>
                      <NumberTicker value={articleCount} />+
                    </Box>{" "}
                    indexed so far.
                  </>
                )}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", mr: 0.5 }}>
                  TRACKING
                </Typography>
                {["Artificial Intelligence", "Software Engineering", "Startups & VC", "Cybersecurity", "Hardware & Systems"].map((cat) => (
                  <Box key={cat} title={cat} sx={{ width: 7, height: 7, borderRadius: "50%", background: CATEGORY_COLORS[cat] }} />
                ))}
              </Box>
            </Box>
          </Box>

          {/* RIGHT - one dominant demo: the big card, then two panels that
              visibly evolve as it plays, connected by minimal pipes. */}
          <Box sx={{ flex: { md: "1 1 auto" }, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Box sx={{ maxWidth: 600, width: "100%" }}>
              <Box component={motion.div} {...stagger(0.16)} sx={{
                display: "inline-flex", alignItems: "center", gap: 1, px: 1.5, py: 0.6, mb: 2,
                borderRadius: "999px", border: `1px solid ${C.orange}40`, background: "rgba(255,102,0,0.06)",
              }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: C.orange, boxShadow: `0 0 8px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
                <Typography sx={{ fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.82rem", color: C.orange, letterSpacing: "0.08em" }}>
                  LIVE PREVIEW
                </Typography>
              </Box>
              <Box component={motion.div} {...stagger(0.3)}>
                <HeroDemoSystem />
              </Box>
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
