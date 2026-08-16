import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C, CATEGORY_COLORS } from "../theme.js";
import { useIsMobile, useGuestSession } from "../hooks.js";
import { track } from "../analytics.js";
import Lenis from "lenis";
import AuthModal from "../components/AuthModal.jsx";

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

// 7 rows, 4 "liked" + 3 deliberate passes (~43% dislike rate) mirroring the
// real product's own discovery mix (a mostly-matched feed with occasional
// trending/"popular" cards and real passes, not a wall of matches - see
// getBadge below). Order matters as much as the ratio: the 3 dislikes are
// spread out (never adjacent, ~2 apart) so a visitor watching the cycle for
// a while sees a pass every couple of swipes instead of one long liked
// streak - an earlier version had both dislikes back-to-back and read as
// "everything gets liked" even at the same ratio. Bullets are 3 fragments
// each, ≤60 chars, no leading articles - the exact contract the backend
// enforces (news-swipe-api/ingest.js:89-102), confirmed by reading that
// prompt rather than guessing at the product's own voice.
const DEMO_ROWS = [
  {
    title: "Show HN: I gave Claude Code root on my prod box",
    bullets: ["Watched closely, ready to revert", "Found memory leak humans missed", "Fixed it before I woke up"],
    pts: 743, readMinutes: 8, comments: 210, matchPct: 96, category: "Artificial Intelligence", illustration: "claudeRoot", liked: true,
  },
  {
    title: "Ask HN: Is remote work already dead again?",
    bullets: ["Same debate, different year again", "No new data driving discussion", "Thread mostly reheated takes"],
    pts: 89, readMinutes: 5, comments: 340, discoveryType: "random", category: "Business & Finance", illustration: "remoteWork", liked: false,
  },
  {
    title: "Researchers jailbroke every major LLM with one emoji",
    bullets: ["Single emoji bypassed guardrails", "Works across GPT, Claude, Gemini", "Vendors scrambling to patch fast"],
    pts: 1240, readMinutes: 6, comments: 512, matchPct: 91, category: "Cybersecurity", illustration: "jailbreak", liked: true,
  },
  {
    title: "Someone got Doom running on a pregnancy test",
    bullets: ["Doom's engine ported to a 128×32 pixel display", "Runs at a playable twenty frames per second", "Battery lasts about four minutes of gameplay"],
    pts: 892, readMinutes: 4, comments: 267, matchPct: 89, category: "Hardware & Systems", illustration: "doomTest", liked: true,
  },
  {
    // Lowest match% of the liked set - passing on a decent-but-not-amazing
    // match reads as plausible, unlike passing on a "97% RARE MATCH."
    title: "AI coding agent caught bug three engineers missed",
    bullets: ["Flagged race condition in minutes", "Senior devs had reviewed twice already", "Merged fix before standup started"],
    pts: 512, readMinutes: 7, comments: 96, matchPct: 88, category: "Software Engineering", illustration: "bugCatch", liked: false,
  },
  {
    title: "A coin-sized device can hack a Boeing 737's autopilot",
    bullets: ["Coin-sized device intercepts the avionics data bus in under a minute", "Exploits an unauthenticated protocol dating back to the 1990s", "FAA says a software-only fix is still months away"],
    pts: 118, readMinutes: 11, comments: 88, matchPct: 97, category: "Cybersecurity", illustration: "boeing737", liked: true,
  },
  {
    title: "Startup rebrands as an AI company, changes nothing else",
    bullets: ["Same product, same team, new landing page", "Pitch deck now says AI eleven times", "Investors reportedly unbothered by this"],
    pts: 64, readMinutes: 3, comments: 152, discoveryType: "random", category: "Startups & VC", illustration: "rebrand", liked: false,
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

// Fixed example content for the taste/saved columns below - deliberately
// static (see TastePanel/SavedListPanel) rather than wired to the demo
// card's cycle, so the features section never changes height as the card
// plays (the two were never visually connected anyway - see direction).
const STATIC_TASTE = [
  { category: "Artificial Intelligence", pct: 82 },
  { category: "Cybersecurity", pct: 67 },
  { category: "Hardware & Systems", pct: 54 },
  { category: "Startups & VC", pct: 41 },
  { category: "Science & Space", pct: 28 },
  { category: "Business & Finance", pct: 19 },
  { category: "Software Engineering", pct: 15 },
  { category: "Design & UI/UX", pct: 9 },
];

const STATIC_SAVED = [
  { id: "s1", title: "Llama-4 weights leaked two weeks early", category: "Artificial Intelligence", pts: 412, readMinutes: 12 },
  { id: "s2", title: "A coin-sized device can hack a Boeing 737's autopilot", category: "Cybersecurity", pts: 118, readMinutes: 11 },
  { id: "s3", title: "Show HN: I built a RISC-V core in a weekend", category: "Hardware & Systems", pts: 198, readMinutes: 6 },
  { id: "s4", title: "YC's W26 batch skews 40% hardware", category: "Startups & VC", pts: 156, readMinutes: 4 },
];

const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#$%";
const SCRAMBLE_DIGITS = "0123456789";

// Rapidly cycles `text` through random characters, then locks the real
// characters in left-to-right, ending exactly on `text` - the same "always
// resolves to the true value" guarantee as this file's NumberTicker, just
// generalized to arbitrary strings (numbers included, as digit strings).
// Ticks fast (~28ms) over a short fixed duration so it reads as a
// deliberate decode rather than a slow, aimless drift.
function useScramble(text, active, { duration = 380, tick = 28, charset = SCRAMBLE_CHARS } = {}) {
  const [display, setDisplay] = useState(text);
  useEffect(() => {
    if (!active) { setDisplay(text); return; }
    const startedAt = Date.now();
    const id = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      const lockedCount = Math.floor(text.length * progress);
      const next = text.split("").map((ch, i) => (i < lockedCount || ch === " " ? ch : charset[Math.floor(Math.random() * charset.length)])).join("");
      setDisplay(next);
      if (progress >= 1) { clearInterval(id); setDisplay(text); }
    }, tick);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text]);
  return display;
}

// Becomes true `delayMs` after `active` turns true - used to stagger each
// row's own scramble start so a hovered column reads as one cascading
// moment rather than every row decoding in lockstep.
function useDelayedActive(active, delayMs) {
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    if (!active) { setDelayed(false); return; }
    const t = setTimeout(() => setDelayed(true), delayMs);
    return () => clearTimeout(t);
  }, [active, delayMs]);
  return delayed;
}

// One saved row - its own component (not inlined in a .map) so its
// scramble/stagger hooks are legal (hooks can't live inside a loop body).
// Title and stats decode into place, cascaded via useDelayedActive; the
// accent bar's brightness cascade (sv-anim/svPulse) plays alongside it.
function SavedRow({ item, index, hovered }) {
  const color = CATEGORY_COLORS[item.category];
  const active = useDelayedActive(hovered, index * 90);
  const title = useScramble(item.title, active, { duration: 420, tick: 26 });
  const pts = useScramble(String(item.pts), active, { duration: 420, tick: 26, charset: SCRAMBLE_DIGITS });
  const mins = useScramble(String(item.readMinutes), active, { duration: 420, tick: 26, charset: SCRAMBLE_DIGITS });
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, p: 1.4, borderRadius: "11px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <Box className="sv-anim" sx={{ width: 7, height: 34, borderRadius: "4px", flexShrink: 0, background: color, animationDelay: `${index * 90}ms` }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{
          fontFamily: C.fontUi, fontSize: "0.85rem", fontWeight: 600, color: "#fff", lineHeight: 1.3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {title}
        </Typography>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.textDim, mt: 0.35 }}>
          {pts} pts · {mins} min read
        </Typography>
      </Box>
    </Box>
  );
}

// The Saved panel - a fixed, filled example list (not wired to the demo
// card's cycle - see direction: the two aren't meant to read as connected,
// so this stays static and never changes the column's height). On hover,
// each row's title/stats glitch-decode into place, cascaded top to bottom.
function SavedListPanel({ hovered }) {
  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
        {STATIC_SAVED.map((item, i) => (
          <SavedRow key={item.id} item={item} index={i} hovered={hovered} />
        ))}
      </Box>
      <Typography sx={{ mt: "auto", pt: 2, fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, textAlign: "center", letterSpacing: "0.05em" }}>
        {STATIC_SAVED.length} saved — swipe right to add more
      </Typography>
    </>
  );
}

// One taste row - its own component for the same reason as SavedRow above.
// Every row reacts to the same "hovered" flag directly (no per-row delay) so
// all numbers and bars glitch at the exact same instant - unlike SavedRow's
// cascade, a stagger here read as an unwanted top-to-bottom wave.
// Same scramble timing AND charset as SavedRow's title decode (not a plain
// digit cycle) so the two columns' glitch reads as one consistent mechanism
// - it still resolves to the real digits since `text` itself is the number.
// The bar itself never changes shape/position on hover, only a brightness/
// glow pulse (tasteBarGlow) - the "lines" stay put, per direction.
function TasteRow({ r, hovered }) {
  const pct = useScramble(String(r.pct), hovered, { duration: 420, tick: 26 });
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Typography sx={{ width: 84, flexShrink: 0, fontFamily: C.fontMono, fontSize: "0.72rem", color: "rgba(232,232,232,0.7)" }}>
        {SHORT_CATEGORY[r.category] || r.category}
      </Typography>
      <Box sx={{ flex: 1, height: 9, borderRadius: "6px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <Box className="taste-bar" sx={{
          height: "100%", width: `${r.pct}%`, borderRadius: "6px", background: CATEGORY_COLORS[r.category],
          color: CATEGORY_COLORS[r.category],
        }} />
      </Box>
      <Typography sx={{ width: 36, textAlign: "right", flexShrink: 0, fontFamily: C.fontMono, fontSize: "0.74rem", color: C.textDim }}>
        {pct}%
      </Typography>
    </Box>
  );
}

// The Taste panel - ranked horizontal bars across every tracked category
// (not just a top-3 legend beside an unlabeled shape). Fixed, filled example
// values - not wired to the demo card's cycle (see direction), so this
// column's height stays constant.
function TastePanel({ hovered }) {
  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {STATIC_TASTE.map((r) => (
          <TasteRow key={r.category} r={r} hovered={hovered} />
        ))}
      </Box>
      <Box sx={{ mt: "auto", pt: 2, display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
        <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.success, boxShadow: `0 0 8px ${C.success}`, animation: "blink 1.6s ease-in-out infinite" }} />
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.success, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          updating on every swipe
        </Typography>
      </Box>
    </>
  );
}

// Drives the hero's centerpiece: one big auto-cycling demo card (no drag -
// there's nothing real for a visitor to teach a static demo, so dragging
// would be theater). Only ticks while the card is actually mostly in the
// viewport (IntersectionObserver-gated) - no point advancing a demo nobody
// is looking at, and scrolling back into view resumes cleanly on a fresh
// interval rather than replaying any ticks missed while scrolled away.
function useDemoCycle() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState("right");
  const [isVisible, setIsVisible] = useState(true);
  const stageRef = useRef(null);
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
  // advanced indexRef.
  const isCommittingRef = useRef(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const tick = () => {
      if (isCommittingRef.current) return;
      isCommittingRef.current = true;
      const i = indexRef.current;
      const row = DEMO_ROWS[i];
      setDirection(row.liked ? "right" : "left");
      setExiting(true);
      setTimeout(() => {
        indexRef.current = (i + 1) % DEMO_ROWS.length;
        setIndex(indexRef.current);
        setExiting(false);
        isCommittingRef.current = false;
      }, reduceMotion ? 0 : 450);
    };
    // First tick fires quickly (a visitor who scrolled straight to the card
    // should see a swipe almost immediately, not wait out a full cycle) -
    // every tick after that falls back to the normal, calmer cadence.
    let intervalId;
    const firstTimeout = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 3400);
    }, reduceMotion ? 0 : 900);
    return () => { clearTimeout(firstTimeout); clearInterval(intervalId); };
  }, [reduceMotion, isVisible]);

  return { row: DEMO_ROWS[index], exiting, direction, stageRef };
}

// Bespoke duotone/halftone illustration for the one demo row that has
// `illustration: "boeing737"` - a coin-sized device reaching into the
// avionics bus of a stylized jet silhouette. Built as line art rather than a
// downloaded photo (self-contained, no licensing risk). A soft under-glow, a
// duplicated drop-shadow silhouette, and a gradient-filled fuselage give it
// real depth instead of reading as a bare wireframe sketch.
function Boeing737Illustration() {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="boeingGlow" cx="55%" cy="55%" r="55%">
          <stop offset="0%" stopColor="#ffb37a" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#ff7a3d" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ff7a3d" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fuselageFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#241209" />
          <stop offset="100%" stopColor="#0a0402" />
        </linearGradient>
        <radialGradient id="deviceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb37a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffb37a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="330" cy="400" r="260" fill="url(#boeingGlow)" />

      <rect x="58" y="70" width="180" height="86" rx="8" stroke="#ffcaa8" strokeWidth="1.4" opacity="0.55" strokeDasharray="4 3" />
      <text x="70" y="98" fill="#ffdcc4" fontFamily="monospace" fontSize="11" opacity="0.75">737 AVIONICS BUS</text>
      <text x="70" y="116" fill="#ffcaa8" fontFamily="monospace" fontSize="11" opacity="0.6">protocol: unauth (1990s)</text>
      <text x="70" y="134" fill="#ffcaa8" fontFamily="monospace" fontSize="11" opacity="0.5">access: granted [51s]</text>

      {/* Drop-shadow silhouette, offset behind the main plane for depth */}
      <g transform="rotate(-11 300 420) translate(8 14)" opacity="0.35">
        <path d="M60,430 C60,414 82,404 128,401 L470,401 C494,401 516,408 516,421 C516,434 494,441 470,441 L128,438 C82,435 60,446 60,430 Z" fill="#000000" />
        <path d="M255,415 L410,540 L438,532 L298,408 Z" fill="#000000" />
      </g>

      <g transform="rotate(-11 300 420)">
        <path d="M60,430 C60,414 82,404 128,401 L470,401 C494,401 516,408 516,421 C516,434 494,441 470,441 L128,438 C82,435 60,446 60,430 Z" fill="url(#fuselageFill)" stroke="#ffb37a" strokeWidth="1.6" opacity="0.95" />
        <path d="M470,405 L512,368 L520,370 L488,412 Z" fill="url(#fuselageFill)" stroke="#ffb37a" strokeWidth="1.4" opacity="0.92" />
        <path d="M255,415 L410,540 L438,532 L298,408 Z" fill="url(#fuselageFill)" stroke="#ffb37a" strokeWidth="1.4" opacity="0.92" />
        <ellipse cx="345" cy="478" rx="20" ry="11" fill="url(#fuselageFill)" stroke="#ffb37a" strokeWidth="1.3" opacity="0.88" />
        <path d="M100,414 C160,410 220,408 280,406" fill="none" stroke="#ffdcc4" strokeWidth="1" opacity="0.35" />
        <g stroke="#ffcaa8" strokeWidth="1.1" opacity="0.5">
          <line x1="150" y1="410" x2="150" y2="424" /><line x1="180" y1="409" x2="180" y2="424" />
          <line x1="210" y1="408" x2="210" y2="424" /><line x1="240" y1="407" x2="240" y2="424" />
        </g>
      </g>

      <circle cx="103" cy="573" r="46" fill="url(#deviceGlow)" />
      <g>
        <rect x="70" y="540" width="66" height="66" rx="13" fill="url(#fuselageFill)" stroke="#ff8f4d" strokeWidth="1.8" />
        <path d="M84 558 h38 M84 570 h38 M84 582 h24" stroke="#ffcaa8" strokeWidth="1.6" opacity="0.8" strokeLinecap="round" />
        <line x1="88" y1="606" x2="88" y2="616" stroke="#ff8f4d" strokeWidth="1.5" />
        <line x1="103" y1="606" x2="103" y2="616" stroke="#ff8f4d" strokeWidth="1.5" />
        <line x1="118" y1="606" x2="118" y2="616" stroke="#ff8f4d" strokeWidth="1.5" />
        <path d="M133 555 C 190 500, 220 470, 262 428" fill="none" stroke="#ffb37a" strokeWidth="2.2" opacity="0.9" />
        <circle cx="133" cy="555" r="4" fill="#ffb37a" />
        <circle cx="195" cy="497" r="4.5" fill="#ffcaa8" />
        <circle cx="262" cy="428" r="7" fill="#fff2e2" />
        <circle cx="262" cy="428" r="14" fill="none" stroke="#fff2e2" strokeWidth="1" opacity="0.4" />
      </g>
    </svg>
  );
}

// Row 0 - "gave Claude Code root on my prod box": a server rack given over
// to an autonomous agent - a glowing terminal prompt and a small connected
// "agent" node reaching into the rack, rather than the old generic glow+node
// template.
function ClaudeRootIllustration({ color }) {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="claudeGlow" cx="45%" cy="45%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="55%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rackFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#132420" />
          <stop offset="100%" stopColor="#050a08" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="350" r="260" fill="url(#claudeGlow)" />
      <rect x="180" y="120" width="200" height="440" rx="12" fill="url(#rackFill)" stroke={color} strokeWidth="1.6" opacity="0.9" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x="198" y={150 + i * 62} width="164" height="42" rx="4" fill="none" stroke={color} strokeWidth="1" opacity={i === 1 ? 0.9 : 0.25} />
          <circle cx="214" cy={171 + i * 62} r="3" fill={i === 1 ? color : "#3a4a46"} opacity={i === 1 ? 1 : 0.6} />
        </g>
      ))}
      <rect x="214" y="163" width="132" height="16" fill={color} opacity="0.12" />
      <text x="222" y="176" fill={color} fontFamily="monospace" fontSize="12" opacity="0.9">root@prod:~#</text>
      <rect x="330" y="163" width="8" height="14" fill={color} opacity="0.8" />
      <circle cx="470" cy="280" r="34" fill="none" stroke={color} strokeWidth="1.4" opacity="0.6" />
      <circle cx="470" cy="280" r="10" fill={color} opacity="0.9" />
      <path d="M436,285 C 400,300 390,320 382,340" fill="none" stroke={color} strokeWidth="1.8" opacity="0.7" />
      <circle cx="382" cy="340" r="4" fill={color} />
      <text x="418" y="248" fill={color} fontFamily="monospace" fontSize="10" opacity="0.6">AGENT</text>
    </svg>
  );
}

// Row 1 - "Is remote work already dead again?": deliberately the calmest,
// most muted scene of the six (this is the demo's one "pass"/dislike row) -
// a quiet desk, not a dramatic hack.
function RemoteWorkIllustration({ color }) {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="remoteGlow" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="deskFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1620" />
          <stop offset="100%" stopColor="#08070a" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="380" r="220" fill="url(#remoteGlow)" />
      <path d="M120,470 L480,470" stroke={color} strokeWidth="1" opacity="0.3" />
      <path d="M220,470 L220,340 C220,330 226,324 236,324 L370,324 C380,324 386,330 386,340 L386,470" fill="url(#deskFill)" stroke={color} strokeWidth="1.3" opacity="0.55" />
      <rect x="240" y="344" width="126" height="80" rx="4" fill="#050505" stroke={color} strokeWidth="1" opacity="0.4" />
      <path d="M244,424 L362,424 L372,436 L234,436 Z" fill="url(#deskFill)" stroke={color} strokeWidth="1" opacity="0.45" />
      <ellipse cx="440" cy="460" rx="16" ry="18" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M432,452 C 432,446 448,446 448,452" fill="none" stroke={color} strokeWidth="1.2" opacity="0.4" />
      <path d="M436,452 h8 v10 a4 4 0 0 1 -8 0 z" fill="none" stroke={color} strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

// Second deliberate-pass row - "Startup rebrands as an AI company, changes
// nothing else": same calm/muted register as RemoteWorkIllustration above (a
// signboard getting a fresh coat of paint over the old name, not a dramatic
// hack) - low-key on purpose, since this is a row visitors are meant to pass.
function RebrandIllustration({ color }) {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="rebrandGlow" cx="50%" cy="48%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="signFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#201a10" />
          <stop offset="100%" stopColor="#0a0705" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="340" r="220" fill="url(#rebrandGlow)" />
      <rect x="140" y="80" width="20" height="540" fill="url(#signFill)" stroke={color} strokeWidth="1" opacity="0.4" />
      <rect x="440" y="80" width="20" height="540" fill="url(#signFill)" stroke={color} strokeWidth="1" opacity="0.4" />
      <rect x="150" y="260" width="300" height="160" rx="8" fill="url(#signFill)" stroke={color} strokeWidth="1.4" opacity="0.6" />
      <text x="175" y="320" fill={color} fontFamily="monospace" fontSize="22" opacity="0.3">DataSync Inc.</text>
      <line x1="170" y1="313" x2="400" y2="313" stroke={color} strokeWidth="1.5" opacity="0.4" />
      <rect x="165" y="345" width="270" height="52" rx="4" fill="#0a0705" opacity="0.7" />
      <text x="185" y="380" fill={color} fontFamily="monospace" fontSize="26" opacity="0.85">DataSync AI</text>
      <circle cx="470" cy="380" r="10" fill={color} opacity="0.5" />
      <path d="M470,390 L470,430" stroke={color} strokeWidth="4" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

// Row 2 - "Researchers jailbroke every major LLM with one emoji": a shield
// splitting open along a jagged crack, with the emoji itself as the "key" -
// a distinct security-bypass image, not the device-hack framing Boeing uses.
function JailbreakIllustration({ color }) {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="jailGlow" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.48" />
          <stop offset="55%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1210" />
          <stop offset="100%" stopColor="#0a0403" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="330" r="250" fill="url(#jailGlow)" />
      <path d="M300,120 L440,175 L440,340 C440,430 380,480 300,510 C220,480 160,430 160,340 L160,175 Z"
        fill="url(#shieldFill)" stroke={color} strokeWidth="2" opacity="0.9" />
      <path d="M300,120 L262,300 L330,320 L280,510" fill="none" stroke="#050302" strokeWidth="10" opacity="0.9" />
      <path d="M300,120 L262,300 L330,320 L280,510" fill="none" stroke={color} strokeWidth="2" opacity="0.85" />
      <text x="255" y="330" fontSize="64" opacity="0.95">🙂</text>
      <circle cx="300" cy="330" r="90" fill="none" stroke={color} strokeWidth="1" opacity="0.25" />
    </svg>
  );
}

// Row 3 - "AI coding agent caught bug three engineers missed": a magnifying
// glass over a stack of code lines, one flagged in the category color -
// reads as a bug catch, distinct from the jailbreak/security framing above.
function BugCatchIllustration({ color }) {
  const lineWidths = [120, 165, 90, 150, 60, 130];
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="bugGlow" cx="50%" cy="46%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="55%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="290" cy="340" r="250" fill="url(#bugGlow)" />
      <g fontFamily="monospace">
        {lineWidths.map((w, i) => (
          <rect key={i} x="190" y={230 + i * 34} width={w} height="12" rx="3"
            fill={i === 3 ? color : "#3a3a3a"} opacity={i === 3 ? 0.85 : 0.4} />
        ))}
      </g>
      <circle cx="330" cy="380" r="70" fill="none" stroke={color} strokeWidth="6" opacity="0.85" />
      <circle cx="330" cy="380" r="70" fill="#0a0a0a" opacity="0.3" />
      <line x1="380" y1="430" x2="440" y2="490" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.85" />
      <circle cx="330" cy="380" r="4" fill={color} />
    </svg>
  );
}

// Row 4 - "Someone got Doom running on a pregnancy test": the deliberately
// weird/fun one - a pregnancy-test-shaped device with a tiny pixel-art game
// screen glowing at one end.
function DoomTestIllustration({ color }) {
  return (
    <svg viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <radialGradient id="doomGlow" cx="55%" cy="45%" r="55%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="55%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="testFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1c2226" />
          <stop offset="100%" stopColor="#080a0b" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="360" r="250" fill="url(#doomGlow)" />
      <g transform="rotate(-8 300 360)">
        <rect x="130" y="300" width="360" height="80" rx="40" fill="url(#testFill)" stroke={color} strokeWidth="1.6" opacity="0.9" />
        <rect x="150" y="316" width="110" height="48" rx="6" fill="#050403" stroke="#ff6b3d" strokeWidth="1.4" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={158 + i * 12} y={324 + (i % 2) * 8} width="9" height="9" fill={i === 1 ? "#ffb37a" : "#ff6b3d"} opacity={0.9} />
        ))}
        <rect x="176" y="344" width="26" height="6" fill="#ffcaa8" opacity="0.85" />
        <circle cx="440" cy="340" r="10" fill={color} opacity="0.8" />
      </g>
      <text x="150" y="440" fill={color} fontFamily="monospace" fontSize="11" opacity="0.6">FPS: 20 · BATTERY: 4 MIN</text>
    </svg>
  );
}

const ILLUSTRATIONS = {
  claudeRoot: ClaudeRootIllustration,
  remoteWork: RemoteWorkIllustration,
  rebrand: RebrandIllustration,
  jailbreak: JailbreakIllustration,
  bugCatch: BugCatchIllustration,
  doomTest: DoomTestIllustration,
  boeing737: Boeing737Illustration,
};

function DemoCardImage({ row }) {
  const color = CATEGORY_COLORS[row.category];
  const Illustration = ILLUSTRATIONS[row.illustration];
  return (
    <Box sx={{ position: "relative", overflow: "hidden", background: "#1a0d08", height: { xs: 260, md: "100%" }, minHeight: { xs: 260, md: "100%" } }}>
      <Box sx={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 30% 22%, ${color}44, transparent 55%), radial-gradient(circle at 68% 78%, rgba(150,20,30,0.5), transparent 62%), linear-gradient(160deg, #3a0d10, #0d0402 82%)`,
      }} />
      <Box sx={{
        position: "absolute", inset: 0, opacity: 0.32, mixBlendMode: "screen",
        backgroundImage: "radial-gradient(circle, rgba(255,180,150,0.9) 1.4px, transparent 1.6px)", backgroundSize: "14px 14px",
      }} />
      <Illustration color={color} />
      <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(0deg, rgba(0,0,0,0.5), transparent 40%)" }} />
      <Box sx={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent 55%, ${C.card} 100%)`, display: { xs: "none", md: "block" } }} />
      <Box sx={{
        position: "absolute", top: 0, right: 0, width: "2px", height: "100%",
        background: `linear-gradient(180deg, transparent, ${C.orange}, transparent)`, boxShadow: `0 0 16px ${C.orange}`, opacity: 0.7,
        display: { xs: "none", md: "block" },
      }} />
    </Box>
  );
}

// The big, full-width demo card - the one dominant object on the page, per
// direction, large enough that seeing all of it takes a deliberate scroll.
function DemoCard({ row, exiting, direction }) {
  const badge = getBadge(row);
  const liked = direction === "right";
  return (
    <Box component={motion.div}
      animate={{
        x: exiting ? (liked ? 220 : -220) : 0,
        rotate: exiting ? (liked ? 7 : -7) : 0,
        opacity: exiting ? 0 : 1,
      }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      sx={{
        maxWidth: 1360, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", md: "46% 54%" },
        minHeight: { md: 700 }, borderRadius: "24px", overflow: "hidden", border: `1px solid ${C.border}`,
        background: C.card, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", position: "relative",
      }}
    >
      {/* Unambiguous like/pass stamp during the exit - solid fill (not a
          translucent outline, which read as "pretty much invisible" against
          the card) so it's legible at a glance. Rotate/scale are the only
          animated properties on the inner element (Framer Motion owns the
          whole `transform`, so nothing here fights a manually-set CSS
          transform); centering is handled by the plain flex wrapper instead. */}
      {exiting && (
        <Box sx={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <Box component={motion.div}
            initial={{ opacity: 0, scale: 0.6, rotate: liked ? -14 : 14 }}
            animate={{ opacity: 1, scale: 1, rotate: liked ? -7 : 7 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            sx={{
              px: 6, py: 3, borderRadius: "16px", border: "3px solid rgba(255,255,255,0.9)",
              background: liked ? C.success : C.error, color: "#080808",
              fontFamily: C.fontMono, fontWeight: 800, fontSize: { xs: "1.7rem", md: "2.6rem" }, letterSpacing: "0.1em",
              boxShadow: `0 24px 60px ${liked ? "rgba(74,222,128,0.55)" : "rgba(248,113,113,0.55)"}`,
            }}
          >
            {liked ? "LIKED" : "PASSED"}
          </Box>
        </Box>
      )}
      <DemoCardImage row={row} />
      <Box sx={{ p: { xs: 4, md: 7 }, display: "flex", flexDirection: "column", position: "relative" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: C.fontMono }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange }} />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", letterSpacing: "0.1em", color: C.textDim, textTransform: "uppercase" }}>
              HACKER NEWS
            </Typography>
          </Box>
          <Typography sx={{
            fontFamily: C.fontMono, fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.05em", px: 1.75, py: 0.9,
            borderRadius: "999px", color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`, whiteSpace: "nowrap",
          }}>
            {badge.text}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1.25, mt: 4.5, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontFamily: C.fontMono, fontSize: "0.78rem", px: 1.5, py: 0.85, borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: C.textDim }}>
            🕐 {row.readMinutes} min read
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontFamily: C.fontMono, fontSize: "0.78rem", px: 1.5, py: 0.85, borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,102,0,0.25)", color: C.orange }}>
            {row.pts} pts
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, fontFamily: C.fontMono, fontSize: "0.78rem", px: 1.5, py: 0.85, borderRadius: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: C.textDim }}>
            💬 {row.comments}
          </Box>
        </Box>

        <Typography sx={{ fontFamily: C.fontMono, fontSize: { xs: "1.3rem", md: "1.7rem" }, fontWeight: 700, lineHeight: 1.3, mt: 5, maxWidth: 520, color: "#fff" }}>
          {row.title}
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, mt: 4 }}>
          {row.bullets.map((b) => (
            <Box key={b} sx={{ display: "flex", gap: 1.25 }}>
              <Typography sx={{ color: C.orange, fontWeight: 700 }}>▸</Typography>
              <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.05rem", color: "rgba(232,232,232,0.85)", lineHeight: 1.4 }}>
                {b}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: "auto", pt: 5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{
            fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.92rem", letterSpacing: "0.04em", color: "#080806",
            background: `linear-gradient(135deg, #ff8533, ${C.orange})`, py: 2, borderRadius: "10px", textAlign: "center",
            boxShadow: "0 6px 20px rgba(255,102,0,0.3)",
          }}>
            READ ARTICLE ↗
          </Box>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box sx={{ flex: 1, fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, textAlign: "center", py: 1.5, borderRadius: "9px", border: "1px solid rgba(255,255,255,0.1)" }}>
              💬 COMMENTS
            </Box>
            <Box sx={{ flex: 1, fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, textAlign: "center", py: 1.5, borderRadius: "9px", border: "1px solid rgba(255,255,255,0.1)" }}>
              VIEW ON HN ↗
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// The pixel-art "coin/rune" orb that replaces the old eyebrow pill - a small
// glowing light source above the headline. Pulses via plain CSS keyframes
// (orbHalo/orbBright, defined in index.css), never a Framer Motion
// `transition.ease`, so the known EASE.*-is-a-CSS-string bug can't apply here.
function OrbLogo() {
  return (
    <Box sx={{ position: "relative", width: 84, height: 84, mx: "auto", mb: 3.25, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box sx={{
        position: "absolute", inset: -32, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,170,90,0.55), rgba(255,102,0,0.14) 55%, transparent 76%)",
        filter: "blur(4px)", animation: "orbHalo 3.6s ease-in-out infinite",
      }} />
      <Box sx={{ position: "relative", width: 56, height: 56, animation: "orbBright 3.6s ease-in-out infinite" }}>
        <svg viewBox="0 0 80 80" style={{ width: "100%", height: "100%", shapeRendering: "crispEdges", overflow: "visible" }}>
          <rect x="34" y="-6" width="12" height="4" fill="#ffcf78" opacity="0.85" />
          <rect x="34" y="82" width="12" height="4" fill="#a83e00" opacity="0.75" />
          <rect x="-6" y="34" width="4" height="12" fill="#ffcf78" opacity="0.85" />
          <rect x="82" y="34" width="4" height="12" fill="#a83e00" opacity="0.75" />
          <rect x="20" y="0" width="10" height="10" fill="#8a3200" /><rect x="30" y="0" width="10" height="10" fill="#8a3200" /><rect x="40" y="0" width="10" height="10" fill="#8a3200" /><rect x="50" y="0" width="10" height="10" fill="#8a3200" />
          <rect x="10" y="10" width="10" height="10" fill="#8a3200" /><rect x="20" y="10" width="10" height="10" fill="#ffdb99" /><rect x="30" y="10" width="10" height="10" fill="#ffdb99" /><rect x="40" y="10" width="10" height="10" fill="#ff9d3d" /><rect x="50" y="10" width="10" height="10" fill="#ff8a2a" /><rect x="60" y="10" width="10" height="10" fill="#8a3200" />
          <rect x="0" y="20" width="10" height="10" fill="#8a3200" /><rect x="10" y="20" width="10" height="10" fill="#fff0cf" /><rect x="20" y="20" width="10" height="10" fill="#ffdb99" /><rect x="30" y="20" width="10" height="10" fill="#ff9d3d" /><rect x="40" y="20" width="10" height="10" fill="#ff8a2a" /><rect x="50" y="20" width="10" height="10" fill="#ff8a2a" /><rect x="60" y="20" width="10" height="10" fill="#e85d00" /><rect x="70" y="20" width="10" height="10" fill="#8a3200" />
          <rect x="0" y="30" width="10" height="10" fill="#8a3200" /><rect x="10" y="30" width="10" height="10" fill="#ffdb99" /><rect x="20" y="30" width="10" height="10" fill="#ff9d3d" /><rect x="30" y="30" width="10" height="10" fill="#ff8a2a" /><rect x="40" y="30" width="10" height="10" fill="#ff8a2a" /><rect x="50" y="30" width="10" height="10" fill="#e85d00" /><rect x="60" y="30" width="10" height="10" fill="#e85d00" /><rect x="70" y="30" width="10" height="10" fill="#8a3200" />
          <rect x="0" y="40" width="10" height="10" fill="#8a3200" /><rect x="10" y="40" width="10" height="10" fill="#ff9d3d" /><rect x="20" y="40" width="10" height="10" fill="#ff9d3d" /><rect x="30" y="40" width="10" height="10" fill="#ff8a2a" /><rect x="40" y="40" width="10" height="10" fill="#e85d00" /><rect x="50" y="40" width="10" height="10" fill="#e85d00" /><rect x="60" y="40" width="10" height="10" fill="#c24a00" /><rect x="70" y="40" width="10" height="10" fill="#8a3200" />
          <rect x="0" y="50" width="10" height="10" fill="#8a3200" /><rect x="10" y="50" width="10" height="10" fill="#ff8a2a" /><rect x="20" y="50" width="10" height="10" fill="#ff8a2a" /><rect x="30" y="50" width="10" height="10" fill="#e85d00" /><rect x="40" y="50" width="10" height="10" fill="#e85d00" /><rect x="50" y="50" width="10" height="10" fill="#c24a00" /><rect x="60" y="50" width="10" height="10" fill="#c24a00" /><rect x="70" y="50" width="10" height="10" fill="#8a3200" />
          <rect x="10" y="60" width="10" height="10" fill="#8a3200" /><rect x="20" y="60" width="10" height="10" fill="#e85d00" /><rect x="30" y="60" width="10" height="10" fill="#e85d00" /><rect x="40" y="60" width="10" height="10" fill="#c24a00" /><rect x="50" y="60" width="10" height="10" fill="#c24a00" /><rect x="60" y="60" width="10" height="10" fill="#8a3200" />
          <rect x="20" y="70" width="10" height="10" fill="#8a3200" /><rect x="30" y="70" width="10" height="10" fill="#8a3200" /><rect x="40" y="70" width="10" height="10" fill="#8a3200" /><rect x="50" y="70" width="10" height="10" fill="#8a3200" />
        </svg>
      </Box>
    </Box>
  );
}

// A small circular key-button, used in the controls column's bottom row.
function KeyButton({ glyph, label, delay }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box className="kc-anim" sx={{
        width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.55)", fontSize: "1.2rem", animationDelay: delay,
      }}>
        {glyph}
      </Box>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.66rem", letterSpacing: "0.08em", color: C.textDim }}>
        {label}
      </Typography>
    </Box>
  );
}

// The controls column - static (not tied to the live demo state, this is
// just documentation of what each key does), with a small illustrated
// key-row pinned to the bottom so the column never ends in empty space.
// The keycap-shaped color chips (both here and in KeyButton above) share a
// "kc-anim" class - the parent column's "&:hover .kc-anim" rule (set in
// FeaturesSection) fires the same kcPulse keyframe on all of them at once;
// each one's own animationDelay (set here, unconditionally) is what turns
// that into a staggered ripple rather than everything popping together.
function ControlsColumn() {
  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.25, mt: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box className="kc-anim" sx={{
            width: 50, height: 50, borderRadius: "11px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", fontFamily: C.fontMono, color: C.error, animationDelay: "0ms",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.14)",
          }}>←</Box>
          <Box>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Pass</Typography>
            <Typography sx={{ fontSize: "0.83rem", color: C.textDim, mt: 0.3 }}>Embedding nudged away · weight −0.05</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box className="kc-anim" sx={{
            width: 50, height: 50, borderRadius: "11px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", fontFamily: C.fontMono, color: C.success, animationDelay: "90ms",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.14)",
          }}>→</Box>
          <Box>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Like</Typography>
            <Typography sx={{ fontSize: "0.83rem", color: C.textDim, mt: 0.3, whiteSpace: "nowrap" }}>Embedding pulled toward this story</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box className="kc-anim" sx={{
            width: 50, height: 50, borderRadius: "11px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", fontFamily: C.fontMono, color: C.warning, animationDelay: "180ms",
            background: "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))", border: "1px solid rgba(255,255,255,0.14)",
          }}>↑</Box>
          <Box>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Skip topic</Typography>
            <Typography sx={{ fontSize: "0.83rem", color: C.textDim, mt: 0.3, whiteSpace: "nowrap" }}>Category weight suppressed</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: "auto", pt: 3, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <KeyButton glyph="←" label="DISLIKE" delay="0ms" />
        <Box sx={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)", mt: 3 }} />
        <KeyButton glyph="↑" label="SKIP" delay="90ms" />
        <Box sx={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)", mt: 3 }} />
        <KeyButton glyph="→" label="LIKE" delay="180ms" />
      </Box>
    </>
  );
}

// One bordered plate, divided into 3 hairline-separated columns - controls,
// taste profile, and the saved list - replacing the old pipe-connected
// side panels now that the demo card is full-width above this section.
// Scroll-triggered entrance (once, not re-triggered on every pass) - the
// heading and each column fade/slide up with a slight stagger, so the
// section arrives as a considered moment instead of snapping into place.
// Hovering a column never moves/scales the column itself (only a subtle
// CSS background/shadow cue) - just its own content animates:
// - Controls: each key does a quick scale-bounce, staggered (pure CSS,
//   ".kc-anim").
// - Taste: numbers decode digit-by-digit while bars do their own springy
//   refill, all simultaneously (JS state + CSS - see TastePanel).
// - Saved: each row's title/meta decode into place, cascaded with the
//   existing accent-bar pulse (".sv-anim").
// Plain "easeOut" strings throughout, never EASE.standard (the known raw-
// CSS-string-in-a-Motion-prop bug class from earlier rounds).
function FeaturesSection() {
  const reduceMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState(null);
  const cols = [
    { key: "controls", prompt: "cat controls.sh", title: "Every key moves your taste vector", content: <ControlsColumn /> },
    { key: "taste", prompt: "tail -f taste.vec", title: "Your vector, ranked live", content: <TastePanel hovered={hoveredKey === "taste"} /> },
    { key: "saved", prompt: "ls ./saved", title: "Nothing gets lost", content: <SavedListPanel hovered={hoveredKey === "saved"} /> },
  ];
  const revealHeading = reduceMotion ? {} : {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: 0.5, ease: "easeOut" },
  };
  const colVariants = (i) => ({
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.12, ease: "easeOut" } },
  });
  return (
    <Box sx={{ px: { xs: 3, md: 6, lg: 8 }, py: { xs: 8, md: 10 } }}>
      <Box component={motion.div} {...revealHeading}>
        <Typography sx={{ textAlign: "center", fontSize: { xs: "1.9rem", md: "2.4rem" }, fontWeight: 800, letterSpacing: "-0.01em", mb: { xs: 5, md: 6.5 } }}>
          Features
        </Typography>
      </Box>
      <Box sx={{
        maxWidth: 1360, mx: "auto", border: `1px solid ${C.border}`, borderRadius: "24px", background: C.panel, overflow: "hidden",
        backgroundImage: "linear-gradient(rgba(255,102,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.035) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
      }}>
        {cols.map((col, i) => (
          <Box key={col.key} component={motion.div}
            variants={reduceMotion ? undefined : colVariants(i)}
            initial={reduceMotion ? undefined : "hidden"}
            whileInView={reduceMotion ? undefined : "visible"}
            viewport={{ once: true, amount: 0.2 }}
            onMouseEnter={() => setHoveredKey(col.key)}
            onMouseLeave={() => setHoveredKey((k) => (k === col.key ? null : k))}
            sx={{
              // minWidth:0 + overflow:hidden on this grid item itself (not just
              // on descendants) is required so its automatic min-width doesn't
              // track a scrambling child's fluctuating intrinsic text width -
              // without it, the shared 1fr/1fr/1fr track-sizing recomputes and
              // every column's divider visibly shifts, not just this one's.
              p: { xs: 4, md: 4.5 }, display: "flex", flexDirection: "column", minHeight: 440, minWidth: 0, overflow: "hidden", position: "relative",
              borderLeft: i > 0 ? { md: "1px solid rgba(255,255,255,0.08)" } : "none",
              borderTop: i > 0 ? { xs: "1px solid rgba(255,255,255,0.08)", md: "none" } : "none",
              "&:hover": { background: "rgba(255,255,255,0.02)" },
              "&:hover .kc-anim": { animationName: "kcPulse", animationDuration: "480ms", animationTimingFunction: "ease-out" },
              "&:hover .sv-anim": { animationName: "svPulse", animationDuration: "450ms", animationTimingFunction: "ease-out" },
              "&:hover .taste-bar": { animationName: "tasteBarGlow", animationDuration: "420ms", animationTimingFunction: "ease-out" },
            }}
          >
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, letterSpacing: "0.05em", mb: 1 }}>
              <Box component="span" sx={{ opacity: 0.55 }}>$ </Box>{col.prompt}
            </Typography>
            <Typography sx={{ fontWeight: 700, fontSize: "1.22rem", mb: 2.75 }}>{col.title}</Typography>
            {col.content}
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
  const sessionExpired = new URLSearchParams(location.search).get("expired") === "true";
  // Two cases open the modal immediately on mount instead of waiting for a
  // click: a lapsed session (the user needs the form right away) and in-app
  // callers that already know the user wants to convert (the guest-nudge
  // banner, the comments-drawer auth prompt) - both pass this via router state.
  const [authModalOpen, setAuthModalOpen] = useState(() => sessionExpired || !!location.state?.formIntent);

  // Lazy initializer so this is already true on the very first render, before
  // paint - otherwise the full landing page (hero + form) flashes on screen
  // for a moment after the Google redirect lands back here, before the async
  // token exchange resolves and navigates away.
  const [googleCallbackPending, setGoogleCallbackPending] = useState(() =>
    typeof window !== "undefined" && window.location.hash.includes("id_token=")
  );

  // Drives the big demo card - called unconditionally here (never after the
  // googleCallbackPending early return below) so the hook order stays
  // stable across renders.
  const { row: demoRow, exiting: demoExiting, direction: demoDirection, stageRef } = useDemoCycle();

  // Exposes the mounted Lenis instance to the auth-modal-lock effect below,
  // since it's otherwise a local const inside this effect's own closure.
  const lenisRef = useRef(null);

  // Real smooth scrolling (Lenis) - purely a feel/speed adjustment on the
  // user's own scroll input, nothing auto-moves the page and there's no
  // pull toward any section (a snap-to-section assist was tried across
  // multiple rounds and always read as the page taking control away from
  // the user, however lightly tuned - removed for good). Scoped entirely to
  // this component's mount lifecycle (created on mount, destroyed on
  // unmount) so no other route in the app is affected.
  useEffect(() => {
    if (reduceMotion) return;
    const lenis = new Lenis({ duration: 0.5, easing: (t) => 1 - Math.pow(1 - t, 2), autoRaf: true });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduceMotion]);

  // Locks the background page while the sign-in/create-account popup is
  // open - pauses Lenis directly (it intercepts wheel/touch input and drives
  // scroll via its own rAF loop independent of the browser's native
  // overflow-gated scrolling, so the CSS class alone doesn't stop it), and
  // pins body via position:fixed at the negative of its current scroll
  // offset (the standard body-scroll-lock technique - see index.css) rather
  // than just overflow:hidden, since that alone collapsed the page's
  // scrollable height and snapped the view back to the top. Restoring real
  // scroll position via scrollTo on close means the user ends up exactly
  // where they were, with no visible jump.
  useEffect(() => {
    if (!authModalOpen) return;
    const scrollY = window.scrollY;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add("auth-modal-open");
    lenisRef.current?.stop();
    return () => {
      document.body.classList.remove("auth-modal-open");
      document.body.style.top = "";
      window.scrollTo(0, scrollY);
      lenisRef.current?.start();
    };
  }, [authModalOpen]);

  useEffect(() => {
    setMode(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

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

  // Keeps the URL in sync with the modal's current tab (so /login and
  // /register are shareable/bookmarkable) - passed to AuthModal as
  // onModeChange, since the modal owns the actual tab-switch state itself.
  const syncModeToUrl = (next) => {
    setMode(next);
    navigate(next === "register" ? "/register" : "/login", { replace: true });
  };

  // Opens the modal pre-set to a given mode - used by the nav's "Sign in"
  // link (login) and "Start Swiping" button (register - nudges signup first,
  // guest is the de-emphasized escape hatch inside the modal).
  const openAuthModal = (next) => {
    syncModeToUrl(next);
    setAuthModalOpen(true);
  };

  // Where a successful login/register/guest action from AuthModal sends the
  // user next - the modal itself only stores the token and reports what
  // happened, since this landing page is the only place that needs to
  // navigate afterward (App.jsx's in-app usage just reloads in place).
  const handleAuthenticated = ({ action, wasGuest, resumedExistingGuest }) => {
    if (action === "guest") {
      navigate(resumedExistingGuest ? "/" : "/onboarding", { replace: true });
    } else if (action === "login") {
      navigate("/", { replace: true });
    } else {
      navigate(wasGuest ? "/" : "/onboarding", { replace: true });
    }
  };

  // The hero's own "or explore as guest" shortcut bypasses the modal
  // entirely - shares AuthModal's guest-session hook so it gets the exact
  // same resume-existing-session fix rather than a second copy of it.
  const { handleGuest, guestLoading } = useGuestSession(handleAuthenticated);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");
      const nonce = sessionStorage.getItem("hs_google_oauth_nonce");
      sessionStorage.removeItem("hs_google_oauth_nonce");
      if (idToken) {
        window.history.replaceState(null, null, window.location.pathname);
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
          .catch(() => {
            // Falls through to the normal landing page below, modal closed -
            // same as before this was extracted into AuthModal, the user can
            // just retry from there.
            setGoogleCallbackPending(false);
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      minHeight: "100vh", width: "100%",
      display: "flex", flexDirection: "column", position: "relative",
      background: C.bg,
      // A few decorative absolutely-positioned layers (the hero ray-burst,
      // the cursor-following ambient glow blobs) are wider than the
      // viewport by design and aren't individually clipped - this catches
      // all of them in one place rather than re-containing each one.
      overflowX: "hidden",
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
        {/* Breathes in sync with the hero orb's pulse (same keyframe timing)
            so the orb reads as an actual light source for the page, not just
            a self-contained animated icon. */}
        <Box sx={{
          position: "absolute", top: -40, left: "50%", transform: "translateX(-50%)", width: 1000, height: 700,
          background: "radial-gradient(circle, rgba(255,140,45,0.16), transparent 55%)",
          animation: "ambientPulse 3.6s ease-in-out infinite",
        }} />
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

        {/* HERO - centered: pixel orb, headline, one-sentence subhead, CTA.
            Shifted up (no forced full-viewport centering, no scroll cue)
            so the whole headline is visible on load without scrolling. */}
        <Box sx={{ textAlign: "center", px: { xs: 3, md: 6 }, pt: { xs: 6, md: 8 }, pb: { xs: 2.5, md: 3 } }}>
          <Box component={motion.div} {...stagger(0)} sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
            {/* Rays behind the orb, hero-only - rotate slowly and pulse in
                brightness independently of the orb's own halo, giving the
                background real depth without touching any other section. */}
            <Box sx={{
              position: "absolute", top: "50%", left: "50%", width: 900, height: 900, zIndex: -1,
              transform: "translate(-50%, -50%)", pointerEvents: "none",
              background: `conic-gradient(from 0deg,
                transparent 0deg, ${C.orange}2e 10deg, transparent 22deg,
                transparent 52deg, ${C.orange}22 62deg, transparent 74deg,
                transparent 104deg, ${C.orange}2a 114deg, transparent 126deg,
                transparent 156deg, ${C.orange}1e 166deg, transparent 178deg,
                transparent 208deg, ${C.orange}2e 218deg, transparent 230deg,
                transparent 260deg, ${C.orange}22 270deg, transparent 282deg,
                transparent 312deg, ${C.orange}2a 322deg, transparent 334deg,
                transparent 360deg)`,
              maskImage: "radial-gradient(circle, black 0%, black 32%, transparent 68%)",
              WebkitMaskImage: "radial-gradient(circle, black 0%, black 32%, transparent 68%)",
              animation: "heroRaysRotate 46s linear infinite, heroRaysPulse 4.2s ease-in-out infinite",
            }} />
            <Box sx={{ position: "relative", zIndex: 1 }}>
              <OrbLogo />
            </Box>
          </Box>

          {/* Two lines, guaranteed: line 1 is forced to never wrap
              (whiteSpace:nowrap) rather than relying on a hairline fit
              between font size and column width - that's exactly what
              broke into 3 lines a few rounds ago. Accent phrase is one
              whole-color unit, not a mixed-font chip on a single word. */}
          <Box component={motion.div} {...stagger(0.08)}>
            <Typography sx={{
              fontFamily: C.fontUi, fontSize: { xs: "2.1rem", md: "3.2rem", lg: "4.2rem" }, fontWeight: 800, color: "#f5f5f5",
              lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: 920, mx: "auto",
            }}>
              <Box component="span" sx={{ whiteSpace: "nowrap" }}>The front page of tech,</Box>
              <br />
              <Box component="span" sx={{ color: C.orange }}>tuned to you.</Box>
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.16)}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: { xs: "1rem", md: "1.25rem" }, color: "rgba(240,240,240,0.72)", lineHeight: 1.5, mt: 3.25, mb: 5, maxWidth: 560, mx: "auto" }}>
              Every story previewed, personalized, and sorted by what you're actually into.
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.24)} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Button
              onClick={() => openAuthModal("register")}
              sx={{
                py: 2.4, px: 5.5, fontFamily: C.fontMono, fontSize: "1rem", fontWeight: 700, letterSpacing: "0.04em",
                background: `linear-gradient(135deg, #ff8533, ${C.orange})`, color: "#080808", borderRadius: "10px",
                boxShadow: "0 8px 30px rgba(255,102,0,0.35)",
                transition: "transform 200ms ease, box-shadow 200ms ease",
                "&:hover": { background: `linear-gradient(135deg, #ff8533, ${C.orange})`, transform: "translateY(-2px)", boxShadow: "0 12px 36px rgba(255,102,0,0.45)" },
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
              mt: 4, p: 2, borderRadius: "10px", maxWidth: 460, mx: "auto", textAlign: "left",
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

        {/* DEMO STAGE - the one big card, large enough that a visitor must
            scroll to see all of it (per direction), auto-cycling through
            DEMO_ROWS via useDemoCycle above. */}
        <Box ref={stageRef} sx={{ px: { xs: 3, md: 5 }, pb: { xs: 10, md: 17 } }}>
          <Typography sx={{ textAlign: "center", fontFamily: C.fontMono, fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.error, mb: 2.5 }}>
            — live preview —
          </Typography>
          <DemoCard row={demoRow} exiting={demoExiting} direction={demoDirection} />
        </Box>

        <Box>
          <FeaturesSection />
        </Box>

        {/* BOTTOM CTA */}
        <Box sx={{ textAlign: "center", px: 3, py: { xs: 10, md: 14 } }}>
          <Typography sx={{ fontSize: { xs: "1.6rem", md: "2.2rem" }, fontWeight: 800, mb: 2 }}>
            Your feed, actually worth opening.
          </Typography>
          <Typography sx={{ color: C.textDim, fontSize: "1.05rem", mb: 4.5 }}>
            Free to start. No credit card.
          </Typography>
          <Button
            onClick={() => openAuthModal("register")}
            sx={{
              py: 2.4, px: 5.5, fontFamily: C.fontMono, fontSize: "1rem", fontWeight: 700, letterSpacing: "0.04em",
              background: `linear-gradient(135deg, #ff8533, ${C.orange})`, color: "#080808", borderRadius: "10px",
              boxShadow: "0 8px 30px rgba(255,102,0,0.35)",
              transition: "transform 200ms ease, box-shadow 200ms ease",
              "&:hover": { background: `linear-gradient(135deg, #ff8533, ${C.orange})`, transform: "translateY(-2px)", boxShadow: "0 12px 36px rgba(255,102,0,0.45)" },
            }}
          >
            START SWIPING →
          </Button>
        </Box>
      </Box>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={mode}
        onModeChange={syncModeToUrl}
        showExpiredNotice={sessionExpired}
        onAuthenticated={handleAuthenticated}
      />
    </Box>
  );
}
