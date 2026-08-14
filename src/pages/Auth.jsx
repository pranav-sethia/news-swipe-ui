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

// Each row's bullet mirrors the real per-article AI summary shown on every
// card - short fragments, no filler - so the demo proves the "know before
// you click" claim instead of just showing a title sliding across the screen.
// matchPct mirrors the real card's badge (NewsCard.jsx) - alternating with
// null (rendered as DISCOVERY) so the preview honestly shows both states
// instead of implying every story is always a strong match.
const DEMO_ROWS = [
  { title: "Show HN: I built a CRDT from scratch", pts: 412, bullet: "No server needed, syncs across tabs offline", matchPct: 93 },
  { title: "The case against microservices", pts: 891, bullet: "One team's monolith outperformed 40 services", matchPct: null },
  { title: "Why Rust's borrow checker finally clicked", pts: 234, bullet: "Mental model that finally made it click", matchPct: 85 },
  { title: "Ask HN: How do you review your own PRs?", pts: 156, bullet: "Real review checklists from working devs", matchPct: null },
];

function SwipeStackDemo() {
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [direction, setDirection] = useState("right");

  useEffect(() => {
    const id = setInterval(() => {
      // Deterministic, not random: alternating by row index guarantees both
      // a LIKED and a DISLIKED stamp show up within one 2-row cycle, instead
      // of leaving it to a 75/25 coin flip that could show "liked" for the
      // entire time someone actually watches the demo.
      setDirection(index % 2 === 0 ? "right" : "left");
      setExiting(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % DEMO_ROWS.length);
        setExiting(false);
      }, 450);
    }, 2600);
    return () => clearInterval(id);
  }, [index]);

  const visible = [0, 1, 2].map((offset) => DEMO_ROWS[(index + offset) % DEMO_ROWS.length]);

  return (
    <Box sx={{ position: "relative", height: 190, perspective: "900px" }}>
      {visible.map((row, i) => {
        const isTop = i === 0;
        // Real depth via perspective + translateZ + scale (not just a flat
        // 2D offset) - the back cards genuinely recede instead of merely
        // sitting a few pixels off to the side.
        const backRotate = i === 1 ? -0.75 : i === 2 ? 0.75 : 0;
        const depthScale = 1 - i * 0.04;
        const translateZ = -i * 24;
        return (
          <Box key={`${row.title}-${index}-${i}`} sx={{
            position: "absolute", top: i * 18, left: i * 10, right: i * 10,
            transformStyle: "preserve-3d",
            transform: isTop && exiting
              ? `translateX(${direction === "right" ? 160 : -160}px) rotate(${direction === "right" ? 10 : -10}deg)`
              : `translateZ(${translateZ}px) scale(${depthScale}) rotate(${backRotate}deg)`,
            opacity: isTop && exiting ? 0 : 1 - i * 0.25,
            transition: `all 450ms ${EASE.standard}`,
            zIndex: 3 - i,
            background: "linear-gradient(160deg, rgba(30,30,30,0.95), rgba(16,16,16,0.95))",
            border: `1px solid ${isTop ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`, borderRadius: "10px", p: 2,
            boxShadow: isTop ? "0 12px 28px rgba(0,0,0,0.45)" : "none",
          }}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#fff", fontWeight: 600, lineHeight: 1.4, pr: 8 }}>{row.title}</Typography>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75, mt: 1 }}>
              <Typography sx={{ color: C.orange, fontSize: "0.7rem", mt: "1px" }}>▸</Typography>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: "rgba(220,220,220,0.75)", lineHeight: 1.4 }}>{row.bullet}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.9 }}>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, fontWeight: 700 }}>{row.pts} pts</Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>news.ycombinator.com</Typography>
            </Box>
            {isTop && exiting ? (
              <Box sx={{
                position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: direction === "right" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                border: `1.5px solid ${direction === "right" ? C.success : C.error}`,
                color: direction === "right" ? C.success : C.error,
              }}>
                {direction === "right" ? <Check sx={{ fontSize: "0.95rem" }} /> : <Close sx={{ fontSize: "0.95rem" }} />}
              </Box>
            ) : row.matchPct ? (
              <Typography sx={{
                position: "absolute", top: 12, right: 12,
                fontFamily: C.fontMono, fontSize: "0.55rem", color: row.matchPct >= 95 ? C.rareMatchGold : C.teal,
                background: row.matchPct >= 95 ? "rgba(255,215,0,0.12)" : "rgba(0,255,204,0.1)",
                border: `1px solid ${row.matchPct >= 95 ? "rgba(255,215,0,0.5)" : "rgba(0,255,204,0.3)"}`,
                px: 0.8, py: 0.3, borderRadius: "4px",
              }}>
                {row.matchPct >= 95 ? `★ ${row.matchPct}% RARE MATCH` : `${row.matchPct}% MATCH`}
              </Typography>
            ) : (
              <Typography sx={{
                position: "absolute", top: 12, right: 12,
                fontFamily: C.fontMono, fontSize: "0.55rem", color: "#a0a0a0",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                px: 0.8, py: 0.3, borderRadius: "4px",
              }}>
                DISCOVERY
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// A minimal "browser window" frame around the demo - three muted dots and a
// thin border, like a real screenshot rather than a UI floating in a glow
// halo. Makes the live preview read as "this is the actual app," calmly.
function BrowserChrome({ children }) {
  return (
    <Box sx={{
      borderRadius: "14px", overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(14,14,14,0.6)",
      boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.5, py: 1, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(255,255,255,0.14)" }} />
        ))}
      </Box>
      <Box sx={{ p: 2 }}>{children}</Box>
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
];

// Mirrors the real SavedPanel row treatment (Sidebar.jsx) - same thumbnail
// proportions, left-border category accent, and category-chip styling - so
// this reads as an honest preview of the feature, not an invented mockup.
function SavedStoriesMiniDemo() {
  return (
    <Box sx={{ flex: 1, minWidth: 0, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", p: 1.5 }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.textDim, letterSpacing: "0.08em", mb: 1 }}>
        SAVED FOR LATER
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {SAVED_DEMO_ROWS.map((row) => {
          const categoryColor = CATEGORY_COLORS[row.category];
          return (
            <Box key={row.title} sx={{
              display: "flex", gap: 1.25, p: 1, borderRadius: "6px",
              background: "rgba(255,102,0,0.03)", border: "1px solid rgba(255,255,255,0.05)",
              borderLeft: `3px solid ${categoryColor}`,
            }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: "6px", flexShrink: 0,
                background: `linear-gradient(160deg, ${categoryColor}44, ${categoryColor}11)`,
              }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{
                  fontFamily: C.fontUi, fontSize: "0.68rem", fontWeight: 700, color: "#fff", lineHeight: 1.3,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {row.title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.5, flexWrap: "wrap" }}>
                  <Typography sx={{
                    fontFamily: C.fontMono, fontSize: "0.55rem", fontWeight: 700, color: categoryColor,
                    background: `${categoryColor}1a`, border: `1px solid ${categoryColor}4d`,
                    px: 0.75, py: 0.2, borderRadius: "4px",
                  }}>
                    {row.category.toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.58rem", color: C.textDim }}>{row.source}</Typography>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.58rem", color: C.textDim }}>· {row.time}</Typography>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.58rem", color: C.orange }}>· {row.points} pts</Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
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
// same construction (concentric grid + one filled/stroked data polygon), at
// a scale where per-axis code labels would clip past the SVG's edge, so only
// the "STRONGEST" line (the one piece of copy that matters at a glance) is
// kept.
function TasteProfileMiniDemo() {
  const size = 130, cx = size / 2, cy = size / 2, R = 45;
  const maxPct = Math.max(...TASTE_DEMO_PROFILE.map((p) => p.percentage));
  const axisPoint = (i, frac) => {
    const angle = (i / TASTE_DEMO_PROFILE.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + R * frac * Math.cos(angle), cy + R * frac * Math.sin(angle)];
  };
  const dataPoints = TASTE_DEMO_PROFILE.map((p, i) => axisPoint(i, p.percentage / maxPct).join(",")).join(" ");
  const ring = (frac) => TASTE_DEMO_PROFILE.map((_, i) => axisPoint(i, frac).join(",")).join(" ");
  const top = TASTE_DEMO_PROFILE.reduce((m, p) => (p.percentage > m.percentage ? p : m), TASTE_DEMO_PROFILE[0]);
  const strokeColor = CATEGORY_COLORS[top.category];

  return (
    <Box sx={{
      flex: 1, minWidth: 0, borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)", p: 1.5, display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.textDim, letterSpacing: "0.08em", mb: 1, alignSelf: "flex-start" }}>
        YOUR TASTE PROFILE
      </Typography>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
          return <line key={p.category} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
        })}
        <polygon points={dataPoints} fill="url(#miniRadarFill)" stroke={strokeColor} strokeWidth="1.75" strokeLinejoin="round" />
        {TASTE_DEMO_PROFILE.map((p, i) => {
          const [vx, vy] = axisPoint(i, p.percentage / maxPct);
          return <circle key={p.category} cx={vx} cy={vy} r="2" fill={strokeColor} />;
        })}
      </svg>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: strokeColor, letterSpacing: "0.05em", mt: 0.5 }}>
        STRONGEST: {top.category.toUpperCase()}
      </Typography>
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

        {/* HERO ROW */}
        <Box sx={{
          flex: 1, minHeight: 0, display: "flex", flexDirection: { xs: "column", md: "row" },
          px: { xs: 3, md: 6, lg: 8 }, py: { xs: 4, md: 2 }, gap: { xs: 4, md: 0 },
        }}>
          {/* LEFT - headline, subhead, features, proof stat */}
          <Box sx={{ flex: { md: "1 1 46%" }, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Box sx={{ maxWidth: 600, width: "100%" }}>
              <Box component={motion.div} {...stagger(0)}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: "rgba(232,232,232,0.7)", letterSpacing: "0.14em", mb: 1.5 }}>
                  A SHARPER WAY TO READ HACKER NEWS
                </Typography>
              </Box>

              <Box component={motion.div} {...stagger(0.08)}>
                <Typography sx={{
                  fontFamily: C.fontUi, fontSize: { xs: "2.2rem", md: "2.4rem", lg: "2.75rem" }, fontWeight: 700, color: "#f5f5f5",
                  lineHeight: 1.1, mb: 1.5, letterSpacing: "-0.01em",
                }}>
                  The front page of tech,<br />
                  <Box component="span" sx={{ color: C.orange }}>tuned to you.</Box>
                </Typography>
              </Box>

              <Box component={motion.div} {...stagger(0.16)}>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.05rem", color: "rgba(240,240,240,0.72)", lineHeight: 1.5, mb: 2.5, maxWidth: 520 }}>
                  Hacker News, but tailored to you. Every story previewed, personalized, and sorted by what you're actually into.
                </Typography>
              </Box>

              <Box component={motion.div} {...stagger(0.24)} sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 3 }}>
                {[
                  ["NO DUDS", "Every story pre-chewed into three bullets before you click."],
                  ["TAILORED", "Like something, and the feed remembers instantly."],
                  ["BY TOPIC", "AI, security, startups, hardware, and more."],
                ].map(([tag, body]) => (
                  <Box key={tag} sx={{
                    display: "flex", gap: 1.5, alignItems: "baseline", borderRadius: "8px", px: 1, py: 0.35, mx: -1,
                    transition: `background 150ms ${EASE.standard}`,
                    "&:hover": { background: "rgba(255,255,255,0.03)" },
                  }}>
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, flexShrink: 0, width: 80, fontWeight: 700 }}>{tag}</Typography>
                    <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{body}</Typography>
                  </Box>
                ))}
              </Box>

              <Box component={motion.div} {...stagger(0.4)}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                  Real Hacker News stories.
                  {articleCount != null && <> <NumberTicker value={articleCount} />+ indexed so far.</>}
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
          </Box>

          {/* RIGHT - bento stack of three demos: the big primary swipe-stack
              demo, then a row of two smaller mini-demos mirroring real
              in-app panels (saved stories, taste profile). */}
          <Box sx={{ flex: { md: "1 1 54%" }, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Box sx={{ maxWidth: 620, width: "100%" }}>
              <Box component={motion.div} {...stagger(0.16)}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: "rgba(255,102,0,0.75)", letterSpacing: "0.1em", mb: 0.75 }}>
                  LIVE PREVIEW
                </Typography>
                <BrowserChrome>
                  <SwipeStackDemo />
                </BrowserChrome>
              </Box>

              <Box component={motion.div} {...stagger(0.32)} sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5, mt: 2, alignItems: "stretch" }}>
                <SavedStoriesMiniDemo />
                <TasteProfileMiniDemo />
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
