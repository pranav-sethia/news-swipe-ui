import React, { useState, useEffect } from "react";
import { Box, Typography, Button } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "../theme.js";

// eslint-disable-next-line react-refresh/only-export-components
// eslint-disable-next-line react-refresh/only-export-components
export const TOUR_STEPS = [
  {
    title: "Welcome to HackerSwipe",
    body: "HackerSwipe brings you the best of Hacker News. We learn your preferences as you swipe to build a personalized feed.",
    placement: "center",
  },
  {
    title: "Swipe to train your AI",
    body: "Right to save a story and see more like it. Left to dislike and see less. Up to skip neutrally.",
    targetSelector: "[data-tour='card']",
    placement: "center",
  },
  {
    title: "Undo and Discuss",
    body: "Press 'Z' to undo your last swipe. Press 'C' or tap the comments button to read community discussions.",
    targetSelector: "[data-tour='undo']",
    placement: "top-end",
  },
  {
    title: "Your AI Hub",
    body: "Access your evolving Taste Profile and saved stories from the dock on the left.",
    targetSelector: "[data-tour='sidebar']",
    placement: "right",
    desktopOnly: true,
  },
  {
    title: "Need a reminder?",
    body: "Tap the question mark icon here to replay this tour at any time.",
    targetSelector: "[data-tour='help']",
    placement: "bottom-end",
  },
];

export function TutorialOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const visibleSteps = TOUR_STEPS.filter(s => !s.desktopOnly || !isMobile);
  const current = visibleSteps[step];
  const isLast = step === visibleSteps.length - 1;
  const next = () => isLast ? onDismiss() : setStep(s => s + 1);

  // Continually track the element's bounding box
  useEffect(() => {
    if (!current.targetSelector) {
      setRect(null);
      return;
    }
    
    let animationFrameId;
    const updateRect = () => {
      const el = document.querySelector(current.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        // Add a slight padding to the highlight ring
        const pad = current.targetSelector.includes("card") ? -8 : 12;
        setRect({
          top: r.top - pad,
          left: r.left - pad,
          width: r.width + pad * 2,
          height: r.height + pad * 2,
          bottom: r.bottom + pad,
          right: r.right + pad,
        });
      }
      animationFrameId = requestAnimationFrame(updateRect);
    };
    
    updateRect();
    return () => cancelAnimationFrame(animationFrameId);
  }, [current]);

  // Calculate Tooltip position based on rect and placement
  const getTooltipStyle = () => {
    const w = isMobile ? 260 : 300;
    
    if (current.placement === "center" || !rect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    
    const margin = 20; // Distance from highlight to tooltip
    
    if (current.placement === "bottom") {
      return { top: rect.bottom + margin, left: rect.left + (rect.width / 2) - (w / 2) };
    }
    if (current.placement === "top") {
      return { bottom: window.innerHeight - rect.top + margin, left: rect.left + (rect.width / 2) - (w / 2) };
    }
    if (current.placement === "right") {
      return { top: rect.top + (rect.height / 2) - 80, left: rect.right + margin };
    }
    if (current.placement === "bottom-end") {
      return { top: rect.bottom + margin, right: window.innerWidth - rect.right };
    }
    if (current.placement === "top-end") {
      return { bottom: window.innerHeight - rect.top + margin, right: window.innerWidth - rect.right };
    }
    
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  };

  // Calculate Arrow position
  const getArrowStyle = () => {
    if (current.placement === "center" || !rect) return { border: null, arrow: null };
    
    const size = 10;
    if (current.placement === "bottom") {
      return {
        arrow: { top: -size, left: "50%", transform: "translateX(-50%)", borderBottom: `${size}px solid ${C.card}`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent` },
        border: { top: -(size + 2), left: "50%", transform: "translateX(-50%)", borderBottom: `${size + 2}px solid rgba(255,102,0,0.55)`, borderLeft: `${size + 2}px solid transparent`, borderRight: `${size + 2}px solid transparent` }
      };
    }
    if (current.placement === "top") {
      return {
        arrow: { bottom: -size, left: "50%", transform: "translateX(-50%)", borderTop: `${size}px solid ${C.card}`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent` },
        border: { bottom: -(size + 2), left: "50%", transform: "translateX(-50%)", borderTop: `${size + 2}px solid rgba(255,102,0,0.55)`, borderLeft: `${size + 2}px solid transparent`, borderRight: `${size + 2}px solid transparent` }
      };
    }
    if (current.placement === "right") {
      return {
        arrow: { top: 80 - size, left: -size, borderRight: `${size}px solid ${C.card}`, borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent` },
        border: { top: 80 - (size + 2), left: -(size + 2), borderRight: `${size + 2}px solid rgba(255,102,0,0.55)`, borderTop: `${size + 2}px solid transparent`, borderBottom: `${size + 2}px solid transparent` }
      };
    }
    if (current.placement === "bottom-end") {
      return {
        arrow: { top: -size, right: 24, borderBottom: `${size}px solid ${C.card}`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent` },
        border: { top: -(size + 2), right: 22, borderBottom: `${size + 2}px solid rgba(255,102,0,0.55)`, borderLeft: `${size + 2}px solid transparent`, borderRight: `${size + 2}px solid transparent` }
      };
    }
    if (current.placement === "top-end") {
      return {
        arrow: { bottom: -size, right: 24, borderTop: `${size}px solid ${C.card}`, borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent` },
        border: { bottom: -(size + 2), right: 22, borderTop: `${size + 2}px solid rgba(255,102,0,0.55)`, borderLeft: `${size + 2}px solid transparent`, borderRight: `${size + 2}px solid transparent` }
      };
    }
    return { border: null, arrow: null };
  };

  const tooltipStyle = getTooltipStyle();
  const arrowStyle = getArrowStyle();
  const isCircle = current.targetSelector && !current.targetSelector.includes("card");

  return (
    <Box
      component={motion.div}
      key="tour-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(0,0,0,0.4)",
        cursor: "default", userSelect: "none",
        "& *": { },
      }}
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <AnimatePresence mode="wait">
        {rect && (
          <Box
            key={`highlight-${step}`}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            sx={{
              position: "fixed",
              top: rect.top, left: rect.left, width: rect.width, height: rect.height,
              borderRadius: isCircle ? "50px" : "24px",
              border: "2px solid rgba(0,255,204,0.8)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,204,0.4), inset 0 0 30px rgba(0,255,204,0.1)",
              animation: "tourGlow 1.8s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 10000,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <Box
          key={step}
          component={motion.div}
          initial={{ opacity: 0, scale: 0.93, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={e => e.stopPropagation()}
          sx={{
            position: "fixed",
            ...tooltipStyle,
            zIndex: 10001,
            width: { xs: 260, sm: 300 },
            background: C.card,
            border: "1px solid rgba(255,102,0,0.55)",
            borderRadius: "14px",
            p: "18px 20px 16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255,102,0,0.15)",
          }}
        >
          {arrowStyle.border && <Box sx={{ position: "absolute", width: 0, height: 0, ...arrowStyle.border }} />}
          {arrowStyle.arrow && <Box sx={{ position: "absolute", width: 0, height: 0, ...arrowStyle.arrow }} />}

          <Box sx={{ display: "flex", gap: 0.75, mb: 1.5 }}>
            {visibleSteps.map((_, i) => (
              <Box key={i} sx={{
                height: 4, borderRadius: 2,
                width: i === step ? 16 : 4,
                background: i === step ? C.orange : "rgba(255,102,0,0.2)",
                transition: "all 0.25s ease",
              }} />
            ))}
          </Box>

          <Typography sx={{ fontFamily: C.fontUi, fontWeight: 700, fontSize: "0.95rem", color: "#fff", mb: 0.75 }}>
            {current.title}
          </Typography>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.55, mb: 2 }}>
            {current.body}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button onClick={onDismiss} size="small"
              sx={{ fontFamily: C.fontUi, fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", textTransform: "none", p: 0, minWidth: "auto", "&:hover": { color: "rgba(255,255,255,0.6)", background: "none" } }}>
              Skip
            </Button>
            <Box sx={{ display: "flex", gap: 1 }}>
              {step > 0 && (
                <Button onClick={() => setStep(s => s - 1)} size="small"
                  sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: C.textDim, textTransform: "none", px: 1.5, "&:hover": { background: "rgba(255,255,255,0.05)" } }}>
                  Back
                </Button>
              )}
              <Button onClick={next} variant="contained" disableElevation size="small"
                      sx={{
                        fontFamily: C.fontUi, fontWeight: 700, fontSize: "0.75rem",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%), #ff6600",
                        color: "#000",
                        textTransform: "none", borderRadius: "8px", px: 2, py: 0.5,
                        boxShadow: "0 4px 14px rgba(255,102,0,0.4), inset 0 1px 1px rgba(255,255,255,0.4)",
                        transition: "all 0.2s ease",
                        "&:hover": { background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%), #ff7700", transform: "scale(1.03)", boxShadow: "0 6px 20px rgba(255,102,0,0.6), inset 0 1px 1px rgba(255,255,255,0.5)" },
                        "&:active": { transform: "scale(0.97)" }
                      }}
                    >{isLast ? "Done" : "Next"}
              </Button>
            </Box>
          </Box>
        </Box>
      </AnimatePresence>
    </Box>
  );
}
