import React, { useState, useRef } from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { C } from "../theme.js";

export function MagneticBox({ children, onClick, sx }) {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Box
      component={motion.div}
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        cursor: "pointer",
        ...sx
      }}
    >
      {children}
    </Box>
  );
}

export function SectionHeader({ icon, label, color = C.orange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Typography sx={{ color: color, display: "flex" }}>{icon}</Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: color, letterSpacing: "0.05em", fontWeight: 700 }}>
        {label}
      </Typography>
    </Box>
  );
}

export function StatBadge({ value, label, icon }) {
  return (
    <Box sx={{ flex: 1, background: "rgba(255,102,0,0.06)", border: `1px solid rgba(255,102,0,0.12)`, borderRadius: "10px", p: 1.5, textAlign: "center" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 0.5 }}>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim }}>{icon}</Typography>
        <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.9rem", color: C.orange }}>{value}</Typography>
      </Box>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.55rem", color: C.textDim, letterSpacing: "0.1em" }}>{label}</Typography>
    </Box>
  );
}

export function ShortcutRow({ keys, label, code }) {
  const [active, setActive] = useState(false);

  React.useEffect(() => {
    if (!code) return;
    const handleDown = (e) => { if (e.code === code) setActive(true); };
    const handleUp = (e) => { if (e.code === code) setActive(false); };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, [code]);

  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.8 }}>
      <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.75rem", color: active ? "#fff" : C.textDim, transition: "color 0.1s" }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {keys.map((k, i) => (
          <Box key={i} sx={{
            px: 1, py: 0.3,
            background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "4px",
            color: active ? "#fff" : "rgba(255,255,255,0.6)",
            fontFamily: C.fontMono, fontSize: "0.7rem",
            transform: active ? "scale(0.95)" : "none",
            transition: "all 0.1s"
          }}>
            {k}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function Label({ children }) {
  return (
    <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.45rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", mb: 1 }}>
      {children}
    </Typography>
  );
}

export function Mono({ children, dim, style }) {
  return (
    <Typography component="span" sx={{ fontFamily: C.fontMono, color: dim ? C.textDim : C.orange, ...style }}>
      {children}
    </Typography>
  );
}

export function ActionHint({ icon, label, color }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color }}>
      {React.cloneElement(icon, { sx: { fontSize: 13 } })}
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.05em", display: { xs: "none", sm: "block" } }}>
        {label}
      </Typography>
    </Box>
  );
}

export function KeyHint({ icon, label }) {
  return (
    <Box sx={{ opacity: 0.4, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Box sx={{ p: 1.5, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", color: "#fff" }}>
        {icon}
      </Box>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "#fff" }}>
        {label}
      </Typography>
    </Box>
  );
}
