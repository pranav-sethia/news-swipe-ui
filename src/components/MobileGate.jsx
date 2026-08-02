import React from "react";
import { Box, Typography } from "@mui/material";
import { C } from "../theme.js";
import { useIsMobile } from "../hooks.js";

export default function MobileGate({ children }) {
  const isMobile = useIsMobile();

  if (!isMobile) return children;

  return (
    <Box sx={{
      height: "100vh", width: "100vw", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      background: C.bg, color: "#fff", px: 4,
    }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 12px ${C.orange}`, mb: 3 }} />
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.7rem", color: C.orange, mb: 3, letterSpacing: "0.05em" }}>
        HACKERSWIPE
      </Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.95rem", color: "#fff", mb: 2, maxWidth: 340 }}>
        The mobile version is still in progress.
      </Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.85rem", color: C.textDim, maxWidth: 340 }}>
        Open this site on a laptop or desktop for now.
      </Typography>
    </Box>
  );
}
