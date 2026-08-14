import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { ArrowForward, ArrowBack, Check, Close } from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C } from "../theme.js";
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
    <Box sx={{ position: "relative", height: 115, perspective: "900px" }}>
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
            position: "absolute", top: i * 12, left: i * 8, right: i * 8,
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
  // Two cases skip straight to the form, no pitch first: a lapsed session
  // (the user needs the form immediately, not the pitch again) and in-app
  // callers that already know the user wants to convert (the guest-nudge
  // banner, the comments-drawer auth prompt) - both pass this via router
  // state rather than showing the pitch to someone who already uses the product.
  const [view, setView] = useState(() => (sessionExpired || location.state?.formIntent) ? "form" : "pitch");

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

  // Opens the form pre-set to a given mode - used by the pitch view's quiet
  // "Sign in / Create account" links.
  const openForm = (next) => {
    switchMode(next);
    setView("form");
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

  // Entrance stagger for the pitch view's content - a deliberate "the page is
  // arriving" moment instead of everything popping in at once. Box+motion.div
  // only (never Typography swapped to a motion component - that combination
  // silently failed to animate in an earlier attempt on this exact page;
  // wrapping plain Typography in a motion Box sidesteps it entirely).
  const stagger = (delay) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: "easeOut" },
  };

  const viewTransition = reduceMotion
    ? { initial: false, animate: {}, exit: {} }
    : { transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } };

  return (
    <Box sx={{
      height: { xs: "auto", md: "100vh" }, minHeight: "100vh", width: "100%",
      display: "flex", flexDirection: { xs: "column", md: "row" }, position: "relative",
      overflow: { xs: "visible", md: "hidden" },
      background: C.bg,
    }}>
      {/* Ambient layers - persist across the pitch/form transition rather
          than resetting, so the background doesn't flicker when switching.
          The diagonal grain-textured glow sweep is the primary personality
          layer (replaces a flat black backdrop); the cursor-glow blobs and
          corner brackets are secondary, quieter details on top of it. */}
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
      <Box sx={{ position: "absolute", top: 32, left: 32, width: 22, height: 22, borderTop: `2px solid rgba(255,102,0,0.25)`, borderLeft: `2px solid rgba(255,102,0,0.25)`, borderTopLeftRadius: "4px", display: { xs: "none", md: "block" } }} />
      <Box sx={{ position: "absolute", bottom: 32, right: 32, width: 22, height: 22, borderBottom: `2px solid rgba(0,255,204,0.12)`, borderRight: `2px solid rgba(0,255,204,0.12)`, borderBottomRightRadius: "4px", display: { xs: "none", md: "block" } }} />

      {/* LEFT - fluid marketing/hero panel. Left-aligned and anchored to a
          real margin instead of centered - the panel absorbs any extra
          width as breathing room around the content, not as dead margins
          on both sides of a narrow centered island. */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1, px: { xs: 3, md: 6, lg: 8 }, py: { xs: 6, md: 4 } }}>
        <Box sx={{ maxWidth: 820, width: "100%" }}>
          <Box component={motion.div} {...stagger(0)} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: C.orange, boxShadow: `0 0 10px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
            <Typography sx={{ fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.8rem", color: C.orange, letterSpacing: "0.08em" }}>
              HACKERSWIPE
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.08)}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: "rgba(232,232,232,0.7)", letterSpacing: "0.14em", mb: 1.5 }}>
              A SHARPER WAY TO READ HACKER NEWS
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.16)}>
            <Typography sx={{
              fontFamily: C.fontUi, fontSize: { xs: "2.3rem", md: "3.4rem", lg: "3.75rem" }, fontWeight: 700, color: "#f5f5f5",
              lineHeight: 1.08, mb: 1.5, letterSpacing: "-0.01em",
            }}>
              The front page of tech,<br />
              <Box component="span" sx={{ color: C.orange }}>tuned to you.</Box>
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.24)}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.05rem", color: "rgba(240,240,240,0.72)", lineHeight: 1.5, mb: 2.5, maxWidth: 520 }}>
              Hacker News, but tailored to you. Every story previewed, personalized, and sorted by what you're actually into.
            </Typography>
          </Box>

          <Box component={motion.div} {...stagger(0.32)} sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 3, maxWidth: 560 }}>
            {[
              ["NO DUDS", "Every story comes pre-chewed into three bullets. Know before you click."],
              ["TAILORED", "Like something, and the feed remembers. Every swipe sharpens what's next."],
              ["BY TOPIC", "AI, security, startups, hardware, and more. Read what you're into, skip the rest."],
            ].map(([tag, body]) => (
              <Box key={tag} sx={{
                display: "flex", gap: 1.5, alignItems: "baseline", borderRadius: "8px", px: 1, py: 0.35, mx: -1,
                transition: `background 150ms ${EASE.standard}`,
                "&:hover": { background: "rgba(255,255,255,0.03)" },
              }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, flexShrink: 0, width: 80, fontWeight: 700 }}>{tag}</Typography>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.9rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.4, textWrap: "pretty" }}>{body}</Typography>
              </Box>
            ))}
          </Box>

          {/* The real hero visual - a genuine product-screenshot moment now
              that it has real width to use, with a few floating accent
              badges (the app's own real match/category badge language, not
              generic decoration) so the space around it reads as deliberate
              rather than empty. */}
          <Box component={motion.div} {...stagger(0.4)} sx={{ maxWidth: 680 }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: "rgba(255,102,0,0.75)", letterSpacing: "0.1em", mb: 0.75 }}>
              LIVE PREVIEW
            </Typography>
            <Box sx={{ position: "relative" }}>
              {/* Floating outside the card's own right edge, not on top of
                  its live per-row badge (top-right, already occupied by the
                  real MATCH/DISCOVERY stamp) - describes the product's
                  capabilities in the abstract, distinct from the demo's own
                  dynamic per-card state. */}
              <Box sx={{ position: "absolute", top: 6, right: -108, transform: "rotate(-5deg)", zIndex: 2, display: { xs: "none", lg: "block" } }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.teal, background: "rgba(0,255,204,0.08)", border: "1px solid rgba(0,255,204,0.3)", px: 0.9, py: 0.4, borderRadius: "5px", whiteSpace: "nowrap" }}>
                  AI-SCORED
                </Typography>
              </Box>
              <Box sx={{ position: "absolute", bottom: 46, right: -122, transform: "rotate(4deg)", zIndex: 2, display: { xs: "none", lg: "block" } }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.orange, background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.3)", px: 0.9, py: 0.4, borderRadius: "5px", whiteSpace: "nowrap" }}>
                  PRE-SUMMARIZED
                </Typography>
              </Box>
              <BrowserChrome>
                <SwipeStackDemo />
              </BrowserChrome>
            </Box>
          </Box>

          <Box component={motion.div} {...stagger(0.48)} sx={{ mt: 2.5 }}>
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

      {/* RIGHT - fixed-width action panel. The permanent "auth module" slot,
          visually distinct from the marketing panel via a subtle divider and
          background tint. Only its content swaps between the CTA pitch and
          the form (the panel itself never moves), mirroring the real
          split-auth-screen pattern (Clerk, Supabase Auth UI, GitHub
          Enterprise SSO, and the CopyUI example researched for this pass). */}
      <Box sx={{
        width: { xs: "100%", md: 480 }, flexShrink: 0,
        borderLeft: { md: "1px solid rgba(255,255,255,0.07)" },
        borderTop: { xs: "1px solid rgba(255,255,255,0.07)", md: "none" },
        background: "rgba(255,255,255,0.015)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 1, px: 3, py: { xs: 6, md: 4 },
      }}>
        <AnimatePresence mode="wait">
          {view === "pitch" ? (
            <Box key="pitch-action" component={motion.div}
              initial={reduceMotion ? false : { opacity: 0, x: 40, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? {} : { opacity: 0, x: 40, filter: "blur(4px)" }}
              {...viewTransition}
              sx={{ width: "100%", maxWidth: 400 }}
            >
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, letterSpacing: "0.14em", mb: 1.75, textAlign: "center" }}>
                GET STARTED
              </Typography>
              <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "10px" }}>
                <Button
                  fullWidth onClick={handleGuest} disabled={guestLoading}
                  sx={{
                    py: 1.3, fontFamily: C.fontMono, fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.05em",
                    background: C.orange, color: "#000", borderRadius: "10px",
                    "&:hover": { background: "#e65c00" },
                    "&:disabled": { background: "rgba(255,102,0,0.4)" },
                  }}
                >
                  {guestLoading ? <CircularProgress size={20} sx={{ color: "#000" }} /> : "START SWIPING FREE"}
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
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim, mt: 0.75, textAlign: "center" }}>
                No signup. Explore free for 24 hours.
              </Typography>

              {error && (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.error, mt: 1, textAlign: "center" }}>
                  {error}
                </Typography>
              )}

              <Divider sx={{ borderColor: "rgba(255,255,255,0.07)", my: 2.5 }} />

              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, textAlign: "center" }}>
                <Box component="span" onClick={() => openForm("login")} sx={{ cursor: "pointer", "&:hover": { color: "#fff" } }}>Sign in</Box>
                {"  ·  "}
                <Box component="span" onClick={() => openForm("register")} sx={{ cursor: "pointer", "&:hover": { color: "#fff" } }}>Create account</Box>
              </Typography>
            </Box>
          ) : (
            <Box key="form-action" component={motion.div}
              initial={reduceMotion ? false : { opacity: 0, x: 40, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={reduceMotion ? {} : { opacity: 0, x: 40, filter: "blur(4px)" }}
              {...viewTransition}
              sx={{ width: "100%", maxWidth: 400 }}
            >
              <Box
                onClick={() => setView("pitch")}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5, mb: 2.5, cursor: "pointer",
                  color: C.textDim, width: "fit-content",
                  "&:hover": { color: "#fff" },
                }}
              >
                <ArrowBack sx={{ fontSize: "1rem" }} />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem" }}>Back</Typography>
              </Box>

              <Box sx={{
                width: "100%", maxHeight: { md: "calc(100vh - 160px)" }, overflowY: "auto",
              }}>
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
                        CONTINUE AS GUEST
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
        </AnimatePresence>
      </Box>
    </Box>
  );
}
