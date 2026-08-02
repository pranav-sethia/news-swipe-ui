import React, { useState, useEffect } from "react";
import { Box, Typography, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import * as api from "../api.js";
import { C } from "../theme.js";
import { EASE } from "../motion.js";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { useTypewriter } from "../hooks.js";
import { track } from "../analytics.js";

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
    <Box sx={{ position: "relative", height: 150, mt: 4, mb: 2 }}>
      {visible.map((row, i) => {
        const isTop = i === 0;
        return (
          <Box key={`${row.title}-${index}-${i}`} sx={{
            position: "absolute", top: i * 12, left: i * 4, right: i * 4,
            transform: isTop && exiting
              ? `translateX(${direction === "right" ? 160 : -160}px) rotate(${direction === "right" ? 10 : -10}deg)`
              : "translateY(0)",
            opacity: isTop && exiting ? 0 : 1 - i * 0.22,
            transition: `all 450ms ${EASE.standard}`,
            zIndex: 3 - i,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px", p: 1.75,
            boxShadow: isTop ? "0 12px 30px rgba(0,0,0,0.5)" : "none",
          }}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.82rem", color: "#fff", fontWeight: 600 }}>{row.title}</Typography>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, mt: 0.4 }}>{row.pts} pts</Typography>
            {isTop && exiting && (
              <Box sx={{
                position: "absolute", top: 10, right: 10,
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
      track("guest_started");
      navigate("/onboarding");
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
            track("login_completed", { method: "google" });
            navigate("/");
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
        track("login_completed", { method: "password" });
        navigate("/");
      } else {
        const res = await api.register(email, password);
        localStorage.setItem("token", res.data.token);
        track(wasGuest ? "guest_converted" : "signup_completed");
        navigate(wasGuest ? "/" : "/onboarding");
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
      height: "100vh", display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "minmax(560px, 1fr) 440px" },
      background: C.bg,
    }}>
      {/* Left: value proposition */}
      <Box sx={{
        display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "center",
        px: 8, position: "relative", overflow: "hidden",
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,102,0,0.06) 0%, transparent 50%), linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
      }}>
        <Box sx={{ maxWidth: 480 }}>
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.6rem", color: C.orange, letterSpacing: "0.1em", mb: 1 }}>
            ● HACKERSWIPE
          </Typography>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, letterSpacing: "0.15em", mb: 3 }}>
            AI-POWERED HACKER NEWS DISCOVERY
          </Typography>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: "2.1rem", fontWeight: 800, color: "#fff", lineHeight: 1.2, mb: 4 }}>
            Stop scrolling Hacker News.<br />Start swiping it.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
            {[
              ["SWIPE", "Right to like, left to skip, up to skip neutrally. Two seconds a story."],
              ["LEARN", "Your taste vector sharpens the feed after every swipe you make."],
              ["DIGEST", "Ask the AI to summarize a long comment thread into one paragraph."],
            ].map(([tag, body]) => (
              <Box key={tag} sx={{ display: "flex", gap: 1.5, alignItems: "baseline" }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, flexShrink: 0, width: 56 }}>[{tag}]</Typography>
                <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>{body}</Typography>
              </Box>
            ))}
          </Box>

          <SwipeStackDemo />

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: C.textDim, mb: 3 }}>
            {"> "}{displayed}
            <span className="cursor-blink" />
          </Typography>

          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
            Built on real Hacker News data. Not a clone, a better way to read it.
          </Typography>
        </Box>
      </Box>

      {/* Right: auth form, docked full height */}
      <Box sx={{
        display: "flex", flexDirection: "column", justifyContent: "center",
        px: { xs: 4, md: 5 }, py: 6,
        background: C.card,
        borderLeft: { xs: "none", md: `1px solid ${C.border}` },
      }}>
        <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", justifyContent: "center", mb: 4 }}>
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.1em" }}>HACKERSWIPE</Typography>
        </Box>

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

        <Typography
          onClick={handleGuest}
          sx={{
            fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, textAlign: "center",
            cursor: guestLoading ? "default" : "pointer",
            "&:hover": { color: guestLoading ? C.textDim : "#fff" },
          }}
        >
          {guestLoading ? <CircularProgress size={14} sx={{ color: C.textDim, verticalAlign: "middle", mr: 1 }} /> : null}
          Just browsing? Continue as guest for 24 hours, no signup needed.
        </Typography>
      </Box>
    </Box>
  );
}
