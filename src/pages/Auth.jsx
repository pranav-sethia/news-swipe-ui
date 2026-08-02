import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C } from "../theme.js";
import { EASE } from "../motion.js";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useTypewriter } from "../hooks.js";
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
  "computing your taste vector...",
  "match found: 94% relevance",
];

const DEMO_ROWS = [
  { title: "Show HN: I built a CRDT from scratch", pts: 412 },
  { title: "The case against microservices", pts: 891 },
  { title: "Why Rust's borrow checker finally clicked", pts: 234 },
  { title: "Ask HN: How do you review your own PRs?", pts: 156 },
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
    <Box sx={{ position: "relative", height: 190 }}>
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
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#fff", fontWeight: 600, lineHeight: 1.4 }}>{row.title}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.8 }}>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, fontWeight: 700 }}>{row.pts} pts</Typography>
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>news.ycombinator.com</Typography>
            </Box>
            {isTop && exiting && (
              <Box sx={{
                position: "absolute", top: 12, right: 12,
                color: direction === "right" ? C.success : C.error,
                fontFamily: C.fontPixel, fontSize: "0.5rem",
                border: "2px solid currentColor", borderRadius: "4px", px: 0.6, py: 0.3,
                transform: "rotate(8deg)",
              }}>
                {direction === "right" ? "LIKED" : "SKIP"}
              </Box>
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
  const [mode, setMode] = useState(location.pathname === "/register" ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
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
      track("guest_started");
      navigate("/onboarding", { replace: true });
    } catch {
      setError("Failed to start guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUri = encodeURIComponent(window.location.origin + "/login");
    const scope = encodeURIComponent("openid email profile");
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}&prompt=select_account`;
    window.location.href = url;
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        window.history.replaceState(null, null, window.location.pathname);
        setLoading(true);
        api.loginWithGoogle(accessToken)
          .then((res) => {
            localStorage.setItem("token", res.data.token);
            localStorage.removeItem("hs_onboarding_done");
            track("login_completed", { method: "google" });
            navigate("/", { replace: true });
          })
          .catch(() => {
            setError("Google sign in failed. Please try again.");
            setLoading(false);
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
        localStorage.removeItem("hs_onboarding_done");
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

  return (
    <Box sx={{
      height: "100vh", width: "100%", display: "flex", position: "relative", overflow: "hidden",
      background: C.bg,
      backgroundImage: `radial-gradient(900px circle at 15% 12%, rgba(255,102,0,0.14), transparent 55%), radial-gradient(700px circle at 85% 85%, rgba(0,255,204,0.06), transparent 55%), linear-gradient(rgba(255,102,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.04) 1px, transparent 1px)`,
      backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px",
    }}>
      {/* Decorative corner brackets, terminal-window framing over the whole page */}
      <Box sx={{ position: "absolute", top: 32, left: 32, width: 22, height: 22, borderTop: `2px solid rgba(255,102,0,0.4)`, borderLeft: `2px solid rgba(255,102,0,0.4)`, borderTopLeftRadius: "4px" }} />
      <Box sx={{ position: "absolute", bottom: 32, right: 32, width: 22, height: 22, borderBottom: `2px solid rgba(0,255,204,0.2)`, borderRight: `2px solid rgba(0,255,204,0.2)`, borderBottomRightRadius: "4px" }} />

      {/* Left: value proposition, shares the page background rather than owning its own */}
      <Box sx={{
        display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "center",
        flex: 1, minWidth: 0, px: 8, position: "relative",
      }}>
        <Box sx={{ maxWidth: 480, position: "relative" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, boxShadow: `0 0 8px ${C.orange}`, animation: "brandPulse 2s ease-in-out infinite" }} />
            <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.6rem", color: C.orange, letterSpacing: "0.1em" }}>
              HACKERSWIPE
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(232,232,232,0.65)", letterSpacing: "0.15em", mb: 3.5 }}>
            AI-POWERED HACKER NEWS DISCOVERY
          </Typography>
          <Typography sx={{
            fontFamily: C.fontMono, fontSize: "3rem", fontWeight: 700, color: "#f2f2f2",
            lineHeight: 1.05, mb: 1.5, letterSpacing: "0.01em", textTransform: "uppercase",
            textShadow: GLITCH_SHADOW,
          }}>
            Stop<br />scrolling.<br />
            Start{" "}
            <Box component="span" sx={{ color: C.orange, textShadow: GLITCH_SHADOW }}>swiping.</Box>
          </Typography>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.95rem", color: "rgba(232,232,232,0.6)", lineHeight: 1.5, mb: 4, maxWidth: 380 }}>
            Hacker News, filtered by an algorithm that actually learns your taste.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 4 }}>
            {[
              ["SWIPE", "Right to like, left to skip. Two seconds per story."],
              ["LEARN", "Every swipe sharpens what the feed shows you next."],
              ["DIGEST", "Ask the AI to boil a long thread down to one paragraph."],
            ].map(([tag, body]) => (
              <Box key={tag} sx={{
                display: "flex", gap: 1.5, alignItems: "baseline",
                px: 1.5, py: 1.1, borderRadius: "8px",
                background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, flexShrink: 0, width: 56, fontWeight: 700 }}>[{tag}]</Typography>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.5, textWrap: "pretty" }}>{body}</Typography>
              </Box>
            ))}
          </Box>

          <SwipeStackDemo />

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: "rgba(232,232,232,0.7)", mt: 4, mb: 2 }}>
            {"> "}{displayed}
            <span className="cursor-blink" />
          </Typography>

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
            Built on real Hacker News data. Not a clone, a better way to read it.
          </Typography>
        </Box>
      </Box>

      {/* Right: auth form, a floating glass panel on the same shared canvas
          rather than a competing full-height block */}
      <Box sx={{
        display: "flex", alignItems: "center",
        width: { xs: "100%", md: 460 }, flexShrink: 0,
        p: { xs: 3, md: 0 },
        my: { md: 5 }, mr: { md: 5 },
      }}>
        <Box sx={{
          width: "100%", maxHeight: "100%", overflowY: "auto",
          px: { xs: 3, md: 4.5 }, py: { xs: 4, md: 5 },
          borderRadius: "20px",
          background: "linear-gradient(165deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.92) 100%)",
          border: `1px solid ${C.border}`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}>
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center", mb: 4 }}>
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.1em" }}>HACKERSWIPE</Typography>
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
    </Box>
  );
}
