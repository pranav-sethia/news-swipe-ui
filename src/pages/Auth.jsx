import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C } from "../theme.js";
import { EASE } from "../motion.js";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useTypewriter, useIsMobile } from "../hooks.js";
import { track } from "../analytics.js";

// A layered text-shadow stack: an isometric orange extrusion trailing down-right,
// plus a teal chromatic-aberration ghost, so the headline reads as a distinct
// hacker/CRT signature instead of a flat sans-serif hero treatment.
const GLITCH_SHADOW = [
  "-1.5px 0 0 rgba(0,255,204,0.35)",
  "0.5px 0.5px 0 rgba(255,102,0,0.9)",
  "1px 1px 0 rgba(255,102,0,0.7)",
  "1.5px 1.5px 0 rgba(255,102,0,0.5)",
  "2px 2px 0 rgba(255,102,0,0.32)",
  "2.5px 2.5px 0 rgba(255,102,0,0.18)",
  "4px 4px 10px rgba(0,0,0,0.6)",
].join(", ");

const STATUS_LINES = [
  "indexing today's front page...",
  "computing your taste profile...",
  "match found: 94% relevance",
];

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
      setDirection(Math.random() > 0.25 ? "right" : "left");
      setExiting(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % DEMO_ROWS.length);
        setExiting(false);
      }, 450);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const visible = [0, 1, 2].map((offset) => DEMO_ROWS[(index + offset) % DEMO_ROWS.length]);

  return (
    <Box sx={{ position: "relative", height: 125 }}>
      <Box sx={{
        position: "absolute", inset: "-30px -40px", borderRadius: "24px",
        background: "radial-gradient(circle at 30% 40%, rgba(255,102,0,0.16), transparent 65%)",
        filter: "blur(20px)", pointerEvents: "none",
      }} />
      {visible.map((row, i) => {
        const isTop = i === 0;
        return (
          <Box key={`${row.title}-${index}-${i}`} sx={{
            position: "absolute", top: i * 14, left: i * 6, right: i * 6,
            transform: isTop && exiting
              ? `translateX(${direction === "right" ? 160 : -160}px) rotate(${direction === "right" ? 10 : -10}deg)`
              : "translateY(0)",
            opacity: isTop && exiting ? 0 : 1 - i * 0.22,
            transition: `all 450ms ${EASE.standard}`,
            zIndex: 3 - i,
            background: "linear-gradient(160deg, rgba(28,28,28,0.95), rgba(15,15,15,0.95))",
            border: `1px solid ${isTop ? "rgba(255,102,0,0.3)" : C.border}`, borderRadius: "12px", p: 2,
            boxShadow: isTop ? "0 16px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,102,0,0.05)" : "none",
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
                position: "absolute", top: 12, right: 12,
                color: direction === "right" ? C.success : C.error,
                fontFamily: C.fontPixel, fontSize: "0.5rem",
                border: "2px solid currentColor", borderRadius: "4px", px: 0.6, py: 0.3,
                transform: "rotate(8deg)",
              }}>
                {direction === "right" ? "LIKED" : "SKIP"}
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

export default function Auth() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState(location.pathname === "/register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [articleCount, setArticleCount] = useState(null);

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
  const [statusIndex, setStatusIndex] = useState(0);
  const { displayed, done } = useTypewriter(STATUS_LINES[statusIndex], 22, true);
  const sessionExpired = new URLSearchParams(location.search).get("expired") === "true";

  useEffect(() => {
    setMode(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setStatusIndex((i) => (i + 1) % STATUS_LINES.length), 1400);
    return () => clearTimeout(id);
  }, [done]);

  const switchMode = (next) => {
    setError("");
    setMode(next);
    navigate(next === "register" ? "/register" : "/login", { replace: true });
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

  return (
    <Box sx={{
      minHeight: "100vh", width: "100%", display: "flex", flexDirection: { xs: "column", md: "row" }, position: "relative", overflow: "visible",
      background: C.bg,
      backgroundImage: `radial-gradient(900px circle at 15% 12%, rgba(255,102,0,0.14), transparent 55%), radial-gradient(700px circle at 85% 85%, rgba(0,255,204,0.06), transparent 55%), linear-gradient(rgba(255,102,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.04) 1px, transparent 1px)`,
      backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
    }}>
      {/* Decorative corner brackets, terminal-window framing over the whole page */}
      <Box sx={{ position: "absolute", top: 32, left: 32, width: 22, height: 22, borderTop: `2px solid rgba(255,102,0,0.4)`, borderLeft: `2px solid rgba(255,102,0,0.4)`, borderTopLeftRadius: "4px", display: { xs: "none", md: "block" } }} />
      <Box sx={{ position: "absolute", bottom: 32, right: 32, width: 22, height: 22, borderBottom: `2px solid rgba(0,255,204,0.2)`, borderRight: `2px solid rgba(0,255,204,0.2)`, borderBottomRightRadius: "4px", display: { xs: "none", md: "block" } }} />

      {/* Shared bounded row: the outer page Box stays full-bleed for the
          background texture, but the two content panels are wrapped here so
          they read as one composed unit on wide viewports instead of a left
          island and a right island with a growing void between them. */}
      <Box sx={{
        display: "flex", flexDirection: { xs: "column", md: "row" },
        width: "100%", maxWidth: 1240, mx: "auto", position: "relative",
        gap: { md: 6 },
      }}>

      {/* Left: value proposition. Visible on every viewport now - a phone
          visitor arriving via a shared link should see the actual pitch, not
          a dead end, even though the swipe app itself stays desktop-only. */}
      <Box sx={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        flex: 1, minWidth: 0, px: { xs: 3, md: 8 }, py: { xs: 6, md: 4 }, position: "relative",
      }}>
        <Box sx={{ maxWidth: 540, mx: { xs: "auto", md: 0 }, position: "relative" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: C.orange, boxShadow: `0 0 10px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
            <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.7rem", color: C.orange, letterSpacing: "0.1em" }}>
              HACKERSWIPE
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: "rgba(232,232,232,0.8)", letterSpacing: "0.15em", mb: 1.5 }}>
            A SHARPER WAY TO READ HACKER NEWS
          </Typography>
          <Typography sx={{
            fontFamily: C.fontMono, fontSize: { xs: "2.2rem", md: "3rem" }, fontWeight: 700, color: "#f9f9f9",
            lineHeight: 1.02, mb: 1.5, letterSpacing: "0.01em", textTransform: "uppercase",
            textShadow: GLITCH_SHADOW,
          }}>
            The front<br />page of tech,<br />
            <Box component="span" sx={{ color: C.orange, textShadow: GLITCH_SHADOW }}>tuned to you.</Box>
          </Typography>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.05rem", color: "rgba(240,240,240,0.78)", lineHeight: 1.5, mb: 2, maxWidth: 460 }}>
            Hacker News, but tailored to you. Every story previewed, personalized, and sorted by what you're actually into.
          </Typography>

          {/* Proof comes right after the claim, before three more paragraphs
              of elaboration - the demo is the strongest evidence on the page,
              so it shouldn't be buried below the bullets that describe it. */}
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.orange, letterSpacing: "0.1em", mb: 1 }}>
            [ LIVE PREVIEW ]
          </Typography>
          <SwipeStackDemo />

          {/* Plain rows (no boxed chrome) so the copy itself - the actual
              differentiators - can run at a real reading size instead of
              competing with border/background decoration for space. */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2, mt: 1.5, mb: 1.5 }}>
            {[
              ["NO DUDS", "Every story comes pre-chewed into three bullets. Know before you click."],
              ["TAILORED", "Like something, and the feed remembers. Every swipe sharpens what's next."],
              ["BY TOPIC", "AI, security, startups, hardware, and more. Read what you're into, skip the rest."],
            ].map(([tag, body]) => (
              <Box key={tag} sx={{ display: "flex", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.orange, flexShrink: 0, width: 82, fontWeight: 700 }}>[{tag}]</Typography>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.98rem", color: "rgba(255,255,255,0.92)", lineHeight: 1.45, textWrap: "pretty" }}>{body}</Typography>
              </Box>
            ))}
          </Box>

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.85rem", color: "rgba(232,232,232,0.8)", mb: 1.5 }}>
            {"> "}{displayed}
            <span className="cursor-blink" />
          </Typography>

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
            Real Hacker News stories. A sharper way to read them.
            {articleCount != null ? ` ${articleCount.toLocaleString()}+ indexed so far.` : ""}
          </Typography>

          {isMobile && (
            <Box sx={{
              mt: 4, p: 2, borderRadius: "10px",
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

      {/* A faint vertical seam tying the two panels into one composition
          instead of a blank gap between two unrelated blocks - fades out top
          and bottom rather than reading as a hard divider line. */}
      {!isMobile && (
        <Box sx={{
          display: { xs: "none", md: "block" }, width: "1px", flexShrink: 0, alignSelf: "stretch", my: 8,
          background: `linear-gradient(180deg, transparent, ${C.border} 30%, ${C.border} 70%, transparent)`,
        }} />
      )}

      {/* Right: auth form, a floating glass panel on the same shared canvas
          rather than a competing full-height block. Hidden on mobile - see
          the notice above instead - since the app itself is desktop-only. */}
      {!isMobile && (
      <Box sx={{
        display: "flex", alignItems: "center",
        width: { xs: "100%", md: 440 }, flexShrink: 0,
        p: { xs: 3, md: 0 },
        my: { md: 6 },
      }}>
        <Box sx={{
          width: "100%", maxHeight: "100%", overflowY: "auto",
          px: { xs: 3, md: 4.5 }, py: { xs: 4, md: 5 },
          borderRadius: "20px",
          // Lighter than before and tinted with the same border/glow tokens
          // as the rest of the page (C.border, not a generic white opacity)
          // so the ambient grid/glow bleeds through faintly and this reads
          // as the same surface as the left panel, not a card pasted on top.
          background: "linear-gradient(165deg, rgba(20,20,20,0.78) 0%, rgba(10,10,10,0.82) 100%)",
          border: `1px solid ${C.border}`,
          borderTop: "1px solid rgba(255,102,0,0.22)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
        }}>
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center", mb: 4 }}>
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.1em" }}>HACKERSWIPE</Typography>
        </Box>

        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.1em", mb: 2, display: { xs: "none", md: "block" } }}>
          [ GET STARTED ]
        </Typography>

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
      </Box>
    </Box>
  );
}
