import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Box, Typography, TextField, Button, Divider, CircularProgress, IconButton } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import * as api from "../api.js";
import { C } from "../theme.js";
import { EASE } from "../motion.js";
import { GOOGLE_CLIENT_ID } from "../config.js";
import { track } from "../analytics.js";
import { useGuestSession } from "../hooks.js";

function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

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

// The shared login/register/guest modal, used both by the landing page
// (Auth.jsx) and in-place on top of the main app (App.jsx) - "Sign in"/
// "Create account" should never have to leave wherever the user already is.
// The two exceptions are both genuine, separate destinations rather than
// bugs: Google's own OAuth flow is a hard-redirect (deliberately not a popup
// - see CLAUDE.md, treated as fragile) so it always bounces through
// accounts.google.com and back to /login regardless of where this modal was
// opened from; and "Forgot password?"/"Privacy Policy" are genuinely
// separate standalone pages.
export default function AuthModal({ open, onClose, initialMode = "login", onModeChange, onAuthenticated, showExpiredNotice = false }) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { handleGuest, guestLoading, guestError } = useGuestSession(onAuthenticated);

  // Reset to the caller's requested tab (and clear stale form state) every
  // time the modal goes from closed to open, so re-opening it later never
  // shows a stale mode/error/input from a previous visit.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEmail("");
      setPassword("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const switchMode = (next) => {
    setError("");
    setMode(next);
    onModeChange?.(next);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register" && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    const wasGuest = !!decodeToken(localStorage.getItem("token") || "")?.user?.isGuest;

    try {
      if (mode === "login") {
        const res = await api.login(email, password);
        localStorage.setItem("token", res.data.token);
        track("login_completed", { method: "password" });
        onAuthenticated?.({ action: "login", wasGuest });
      } else {
        const res = await api.register(email, password);
        localStorage.setItem("token", res.data.token);
        if (!wasGuest) localStorage.removeItem("hs_onboarding_done");
        track(wasGuest ? "guest_converted" : "signup_completed");
        onAuthenticated?.({ action: "register", wasGuest });
      }
    } catch (err) {
      setError(err.response?.data?.error || `${mode === "login" ? "Sign in" : "Registration"} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Portaled straight to body (not nested under whatever rendered it) so its
  // fixed positioning is never constrained by an animated/transformed
  // ancestor - the landing page's own hero wrapper scales slightly while this
  // is open, which would otherwise clip a nested fixed-position modal.
  return createPortal(
    <AnimatePresence>
      {open && (
        <Box component={motion.div} key="auth-modal-backdrop"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? {} : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
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
              width: "100%", maxWidth: 440, maxHeight: "95vh", overflow: "hidden",
              borderRadius: "20px", background: "rgba(15,15,15,0.97)", border: `1px solid ${C.border}`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.55)", p: { xs: 3.5, md: 4.5 }, position: "relative",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
                <Typography sx={{ fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.72rem", color: C.orange, letterSpacing: "0.08em" }}>HACKERSWIPE</Typography>
              </Box>
              <IconButton onClick={onClose} aria-label="Close" sx={{ color: C.textDim, "&:hover": { color: "#fff", background: "rgba(255,255,255,0.08)" } }}>
                ✕
              </IconButton>
            </Box>

            {showExpiredNotice && (
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

            {guestError && (
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.error, mb: 1.5, textAlign: "center" }}>
                {guestError}
              </Typography>
            )}

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
  );
}
