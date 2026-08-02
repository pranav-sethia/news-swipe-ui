import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Menu, MenuItem, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { C } from "../theme.js";
import { EASE } from "../motion.js";

function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

function formatCountdown(ms) {
  if (ms == null) return null;
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}H ${m}M LEFT` : `${m}M LEFT`;
}

export default function AuthStatusPill({ onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const decoded = token ? decodeToken(token) : null;
  const user = decoded?.user;
  const isGuest = !!user?.isGuest;

  useEffect(() => {
    if (!isGuest || !decoded?.exp) return;
    const update = () => setRemaining(Math.max(0, decoded.exp * 1000 - Date.now()));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [isGuest, decoded?.exp]);

  if (!user) return null;

  const urgent = isGuest && remaining != null && remaining < 2 * 60 * 60 * 1000;
  const critical = isGuest && remaining != null && remaining < 15 * 60 * 1000;

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "flex", alignItems: "center", gap: 0.8, cursor: "pointer",
          px: 1.2, py: 0.6, borderRadius: "999px",
          border: `1px solid ${isGuest ? (urgent ? "rgba(243,156,18,0.4)" : "rgba(255,255,255,0.12)") : C.tealDim}`,
          background: "rgba(255,255,255,0.02)",
          transition: `all 200ms ${EASE.standard}`,
          "&:hover": { background: "rgba(255,255,255,0.06)" },
        }}
      >
        <Box sx={{
          width: 6, height: 6, borderRadius: "50%",
          background: isGuest ? (critical || urgent ? C.warning : C.textDim) : C.teal,
          animation: isGuest ? "brandPulse 2s ease-in-out infinite" : "none",
        }} />
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", letterSpacing: "0.05em", color: isGuest ? (urgent ? C.warning : C.textDim) : "#fff" }}>
          {isGuest ? `GUEST · ${formatCountdown(remaining) || "..."}` : user.email?.split("@")[0]}
        </Typography>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { background: C.card, border: `1px solid ${C.border}`, borderRadius: "12px", mt: 1, minWidth: 260 } } }}
      >
        {isGuest ? (
          <Box sx={{ p: 2 }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, letterSpacing: "0.05em", mb: 1 }}>
              YOU'RE BROWSING AS A GUEST
            </Typography>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: "#e8e8e8", mb: 1 }}>
              {remaining != null ? `Session ends in ${formatCountdown(remaining).replace(" LEFT", "")}.` : "Session is temporary."}
            </Typography>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.75rem", color: C.textDim, mb: 2, lineHeight: 1.5 }}>
              After that you're logged out and this browser can't get back in. Your swipes and taste profile are lost unless you save them first.
            </Typography>
            <Button
              fullWidth variant="contained"
              onClick={() => { setAnchorEl(null); navigate("/register"); }}
              sx={{ background: C.orange, color: "#000", fontFamily: C.fontMono, fontWeight: 700, mb: 1, "&:hover": { background: "#e65c00" } }}
            >
              CREATE FREE ACCOUNT
            </Button>
            <Typography
              onClick={() => { setAnchorEl(null); navigate("/login"); }}
              sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.textDim, textAlign: "center", cursor: "pointer", "&:hover": { color: "#fff" } }}
            >
              Already have an account? Sign in
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#fff", fontWeight: 700 }}>{user.email}</Typography>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.teal, mt: 0.3 }}>SIGNED IN · SYNCED</Typography>
            </Box>
            <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
            <MenuItem onClick={() => { setAnchorEl(null); onLogout(); }} sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.error }}>
              Sign out
            </MenuItem>
          </Box>
        )}
      </Menu>
    </>
  );
}
