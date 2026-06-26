import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { C } from "../theme.js";

// eslint-disable-next-line react-refresh/only-export-components
export const TOUR_STEPS = [
  {
    title: "Welcome to HackerSwipe",
    body: "HackerSwipe brings you the best of Hacker News. We learn your preferences as you swipe to build a personalized feed.",
    position: { top: "40%", left: "50%", transform: "translate(-50%, -50%)" },
    arrow: null,
    arrowBorder: null,
  },
  {
    title: "Swipe to train your AI",
    body: "Right to save a story and see more like it. Left to dislike and see less. Up to skip neutrally.",
    position: { bottom: "calc(50vh - 80px)", left: "50%", transform: "translateX(-50%)" },
    arrow: { bottom: -10, left: "50%", transform: "translateX(-50%)", borderTop: `10px solid ${C.card}`, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" },
    arrowBorder: { bottom: -12, left: "50%", transform: "translateX(-50%)", borderTop: `12px solid rgba(255,102,0,0.6)`, borderLeft: "12px solid transparent", borderRight: "12px solid transparent" },
    highlight: { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 740, height: 500, borderRadius: "22px" },
  },
  {
    title: "Undo and Discuss",
    body: "Press 'Z' to undo your last swipe. Press 'C' or tap the comments button to read community discussions.",
    position: { bottom: "100px", right: "80px" },
    arrow: { bottom: -10, right: "20px", borderTop: `10px solid ${C.card}`, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" },
    arrowBorder: { bottom: -12, right: "18px", borderTop: `12px solid rgba(255,102,0,0.6)`, borderLeft: "12px solid transparent", borderRight: "12px solid transparent" },
  },
  {
    title: "Your AI Hub",
    body: "Access your evolving Taste Profile and saved stories from the dock on the left.",
    position: { top: "calc(50% - 30px)", left: "130px", transform: "translateY(-50%)" },
    arrow: { top: "50%", left: -10, transform: "translateY(-50%)", borderRight: `10px solid ${C.card}`, borderTop: "10px solid transparent", borderBottom: "10px solid transparent" },
    arrowBorder: { top: "50%", left: -12, transform: "translateY(-50%)", borderRight: `12px solid rgba(255,102,0,0.6)`, borderTop: "12px solid transparent", borderBottom: "12px solid transparent" },
    desktopOnly: true,
  },
  {
    title: "Settings and Reset",
    body: "View shortcuts or clear your swipe history completely from the settings gear below.",
    position: { top: "calc(50% + 80px)", left: "130px", transform: "translateY(-50%)" },
    arrow: { top: "50%", left: -10, transform: "translateY(-50%)", borderRight: `10px solid ${C.card}`, borderTop: "10px solid transparent", borderBottom: "10px solid transparent" },
    arrowBorder: { top: "50%", left: -12, transform: "translateY(-50%)", borderRight: `12px solid rgba(255,102,0,0.6)`, borderTop: "12px solid transparent", borderBottom: "12px solid transparent" },
    desktopOnly: true,
  },
  {
    title: "Need a reminder?",
    body: "Tap the question mark icon here to replay this tour at any time.",
    position: { top: 66, right: 80 },
    arrow: { top: -10, right: 14, borderBottom: `10px solid ${C.card}`, borderLeft: "10px solid transparent", borderRight: "10px solid transparent" },
    arrowBorder: { top: -12, right: 12, borderBottom: `12px solid rgba(0,255,204,0.7)`, borderLeft: "12px solid transparent", borderRight: "12px solid transparent" },
    targetSelector: "[data-tour='help']",
  },
];

export function TutorialOverlay({ onDismiss }) {
  const [step, setStep] = useState(0);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const visibleSteps = TOUR_STEPS.filter(s => !s.desktopOnly || !isMobile);
  const current = visibleSteps[step];
  const isLast = step === visibleSteps.length - 1;
  const next = () => isLast ? onDismiss() : setStep(s => s + 1);

  // Resolve DOM-based highlight rect for steps that use targetSelector
  const getHighlightStyle = (step) => {
    if (step.targetSelector) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 8; // padding around the button
        return {
          top: r.top - pad,
          left: r.left - pad,
          width: r.width + pad * 2,
          height: r.height + pad * 2,
          borderRadius: "50%",
        };
      }
    }
    return step.highlight || null;
  };

  const highlightStyle = getHighlightStyle(current);

  return (
    <Box
      component={motion.div}
      key="tour-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      sx={{
        position: "fixed", inset: 0, zIndex: 9998,
        // Light dim so the UI beneath is readable, but all clicks/drags are captured
        background: "rgba(0,0,0,0.25)",
        cursor: "default",
        userSelect: "none",
        // Block all pointer events from passing through
        "& *": { },
      }}
      // Stop any click from reaching the app underneath
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Pulsing spotlight highlight around the current feature */}
      <AnimatePresence mode="wait">
        {highlightStyle && (
          <Box
            key={`highlight-${step}`}
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            sx={{
              position: "fixed",
              ...highlightStyle,
              border: "2px solid rgba(0,255,204,0.8)",
              boxShadow: "0 0 0 0 rgba(0,255,204,0.4), inset 0 0 30px rgba(0,255,204,0.05)",
              animation: "tourGlow 1.8s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 9998,
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip card */}
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
            ...Object.fromEntries(Object.entries(current.position).map(([k, v]) => [k, v])),
            zIndex: 9999,
            width: { xs: 260, sm: 300 },
            background: C.card,
            border: "1px solid rgba(255,102,0,0.55)",
            borderRadius: "14px",
            p: "18px 20px 16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(255,102,0,0.15)",
          }}
        >
          <Box sx={{ position: "absolute", width: 0, height: 0, ...current.arrowBorder }} />
          <Box sx={{ position: "absolute", width: 0, height: 0, ...current.arrow }} />

          {/* Progress dots */}
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
