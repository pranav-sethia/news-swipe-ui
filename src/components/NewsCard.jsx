import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, CircularProgress, Link, Tooltip, Button } from "@mui/material";
import { AccessTime, OpenInNew, QuestionAnswer, ChatBubbleOutline, ArrowBack, ArrowUpward, ArrowForward } from "@mui/icons-material";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { C } from "../theme.js";
import { useTypewriter } from "../hooks.js";
import { StatBadge } from "./SharedComponents.jsx";

export function NewsCard({ article, onSwipe, onOpenComments, isTop, isInteractive, stackIndex, totalCards, dataTour }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const likeOpacity = useTransform(x, [50, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-50, -140], [0, 1]);
  const neutralOpacity = useTransform(y, [-50, -140], [0, 1]);
  const cardsFromTop = totalCards - 1 - stackIndex;

  // Typewriter only runs on the top card — background cards stay blank to avoid flash
  const { displayed, done } = useTypewriter(article.title, 28, isTop && !isExiting);

  // Keyboard arrow support
  useEffect(() => {
    if (!isTop || !isInteractive) return;
    const handler = async (e) => {
      if (isExiting) return;
      if (e.key === "ArrowRight") triggerSwipe("right");
      if (e.key === "ArrowLeft") triggerSwipe("left");
      if (e.key === "ArrowUp") triggerSwipe("up");
      if (e.key === "Enter") {
        e.preventDefault();
        if (document.activeElement) document.activeElement.blur();
        const a = document.createElement("a");
        a.href = article.article_url; a.target = "_blank"; a.rel = "noopener noreferrer";
        a.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTop, isInteractive, isExiting, article]); // eslint-disable-line

  const triggerSwipe = useCallback(async (dir) => {
    // Guard: if already animating out, ignore
    if (isExiting) return;
    setIsExiting(true);
    try {
      await controls.start({
        x: dir === "right" ? window.innerWidth : (dir === "left" ? -window.innerWidth : 0),
        y: dir === "up" ? -window.innerHeight : 0,
        rotate: dir === "right" ? 25 : (dir === "left" ? -25 : 0),
        opacity: 0,
        transition: { duration: 0.25, ease: "easeOut" },
      });
    } catch {
      // Animation was interrupted (e.g. component unmounted mid-flight) — still complete the swipe
    }
    onSwipe(dir);
  }, [controls, onSwipe, isExiting]);

  const handleDragEnd = async (_, info) => {
    if (isExiting || !isTop || !isInteractive) return;
    const liked = info.offset.x > 100 || info.velocity.x > 500;
    const disliked = info.offset.x < -100 || info.velocity.x < -500;
    const skipped = info.offset.y < -100 || info.velocity.y < -500;
    if (liked) triggerSwipe("right");
    else if (disliked) triggerSwipe("left");
    else if (skipped) triggerSwipe("up");
    else controls.start({ x: 0, y: 0, rotate: 0, opacity: 1, transition: { type: "spring", stiffness: 500, damping: 25 } });
  };

  const [imageFailed, setImageFailed] = useState(false);
  const fallbackBgIndex = article.id ? (article.id % 5) : 0;
  const isFallback = !article.image_url || imageFailed;
  const imageUrl = isFallback ? `/hacker_bgs/bg_${fallbackBgIndex}.png` : article.image_url;
  const showImageSide = true; // We always show the image side now to standardize the cards

  return (
    <Box
      component={motion.div}
      data-tour={dataTour}
      initial={{ scale: 0.96, y: 12, opacity: 0.85 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      style={{
        x, rotate,
        position: "absolute",
        cursor: !isTop || isExiting ? "default" : "grab",
        zIndex: isTop ? 100 : stackIndex,
        // Only the card directly below the top is slightly visible as a peek card;
        // any card beyond that is invisible to avoid the glitch.
        scale: isTop ? 1 : (cardsFromTop === 1 ? 0.96 : 0.93),
        y: isTop ? y : (cardsFromTop === 1 ? 10 : 20),
        opacity: isTop ? 1 : (cardsFromTop === 1 ? 0.4 : 0),
        pointerEvents: isTop ? "auto" : "none",
      }}
      sx={{ width: { xs: "90vw", sm: 600, md: 800 }, touchAction: "none" }}
      drag={isTop && !isExiting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: isTop && !isExiting ? "grabbing" : "default" }}
    >
      <Box className="card-glow" sx={{
        width: "100%", height: { xs: "75vh", sm: 500, md: 460 },
        background: "rgba(12, 12, 12, 0.95)", // High opacity to prevent bleed-through
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: isTop ? "0 24px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 40px rgba(255,102,0,0.05)" : "none",
        borderRadius: "20px",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: showImageSide ? "1.2fr 1fr" : "1fr" },
        gridTemplateRows: { xs: showImageSide ? "200px 1fr" : "1fr", md: "1fr" },
        position: "relative",
      }}>
        {/* Image OR decorative left panel */}
        {showImageSide && (
          <Box sx={{ position: "relative", overflow: "hidden" }}>
            <Box component="img" src={imageUrl} alt={article.title}
              onError={() => setImageFailed(true)}
              sx={{ 
                width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
                ...(isFallback && article.id && {
                  filter: `hue-rotate(${(article.id * 37) % 360}deg) saturate(${(article.id % 2) ? 1.5 : 1})`,
                  transform: `scale(${1 + ((article.id % 3) * 0.15)})`,
                  objectPosition: `${(article.id * 13) % 100}% ${(article.id * 17) % 100}%`
                })
              }} />
            <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 60%,#0d0d0d 100%)" }} />
            <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(13,13,13,0.6)0%,transparent 60%)" }} />
          </Box>
        )}

        {/* Content panel */}
        <Box sx={{ 
          p: { xs: "20px", md: "32px 36px" }, display: "flex", flexDirection: "column", 
          justifyContent: "space-between", minWidth: 0, zIndex: 1, 
          opacity: isTop ? 1 : 0, // FIX: Hides text on background cards to prevent double-vision bleed
          transition: "opacity 0.2s ease"
        }}>
          <Box>
            {/* Header: source dot + label + algorithm badge */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, boxShadow: `0 0 6px ${C.orange}` }} />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.orange }}>HACKER NEWS</Typography>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.border, ml: 1 }}>[{stackIndex + 1}]</Typography>
              </Box>
              
              {article.match_pct ? (
                <Tooltip 
                  title={
                    article.match_reason ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
                          Recommended because you liked:
                        </Typography>
                        <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: "#00ffcc", fontWeight: 500, lineHeight: 1.3, fontStyle: "italic" }}>
                          "{article.match_reason}"
                        </Typography>
                      </Box>
                    ) : (
                      "Personalized for you based on your taste"
                    )
                  } 
                  placement="top"
                  arrow
                  slotProps={{
                    tooltip: {
                      sx: {
                        background: "rgba(13,13,13,0.95)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(0,255,204,0.3)",
                        color: "#e8e8e8",
                        fontFamily: C.fontUi,
                        fontSize: "0.75rem",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        p: 1.5,
                        borderRadius: "8px",
                        maxWidth: 250
                      }
                    },
                    arrow: {
                      sx: { color: "rgba(13,13,13,0.95)" }
                    }
                  }}
                >
                  <Typography sx={{ 
                    fontFamily: C.fontMono, fontSize: "0.65rem", color: "#00ffcc", letterSpacing: "0.5px", 
                    background: "rgba(0,255,204,0.1)", px: 1, py: 0.5, borderRadius: "4px", 
                    border: "1px solid rgba(0,255,204,0.3)",
                    cursor: "help",
                    textDecoration: "underline",
                    textDecorationStyle: "dashed",
                    textUnderlineOffset: "3px",
                    textDecorationColor: "rgba(0,255,204,0.5)",
                    "&:hover": { background: "rgba(0,255,204,0.2)", textDecorationColor: "#00ffcc" }
                  }}>
                    {article.match_pct}% MATCH
                  </Typography>
                </Tooltip>
              ) : (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "#a0a0a0", letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  DISCOVERY
                </Typography>
              )}
            </Box>

            {/* Metadata Tags */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
              {article.read_time_minutes != null && (() => {
                const mins = parseInt(article.read_time_minutes, 10);
                let color = "#f39c12"; // Yellow/Orange
                let bg = "rgba(243, 156, 18, 0.1)";
                let border = "rgba(243, 156, 18, 0.3)";
                if (mins <= 5) { color = "#4ade80"; bg = "rgba(74, 222, 128, 0.1)"; border = "rgba(74, 222, 128, 0.3)"; }
                else if (mins > 15) { color = "#f87171"; bg = "rgba(248, 113, 113, 0.1)"; border = "rgba(248, 113, 113, 0.3)"; }
                return (
                  <Typography sx={{ display: "flex", alignItems: "center", fontFamily: C.fontMono, fontSize: "0.65rem", color: color, background: bg, border: `1px solid ${border}`, px: 1.2, py: 0.4, borderRadius: "6px" }}>
                    <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                    {mins} min read
                  </Typography>
                );
              })()}
              
              {article.score != null && (
                <Typography sx={{ display: "flex", alignItems: "center", fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, background: "rgba(255,102,0,0.1)", border: `1px solid rgba(255,102,0,0.25)`, px: 1.2, py: 0.4, borderRadius: "6px", fontWeight: 700 }}>
                  {article.score} pts
                </Typography>
              )}
              {article.num_comments != null && (
                <Typography sx={{ display: "flex", alignItems: "center", fontFamily: C.fontMono, fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", background: "rgba(255,255,255,0.1)", border: `1px solid rgba(255,255,255,0.2)`, px: 1.2, py: 0.4, borderRadius: "6px" }}>
                  <ChatBubbleOutline sx={{ fontSize: 12, mr: 0.5 }} />
                  {article.num_comments}
                </Typography>
              )}
            </Box>

            {/* Title — typewriter runs only on top card; others are blank */}
            <Typography sx={{
              fontFamily: C.fontPixel,
              fontSize: showImageSide ? "0.72rem" : "0.85rem",
              color: "#f5f5f5", lineHeight: 1.8, mb: 2,
              minHeight: showImageSide ? "5rem" : "5.5rem",
              maxWidth: showImageSide ? "100%" : "95%",
            }}>
              {displayed}
              {isTop && !done && <span className="cursor-blink" />}
            </Typography>

            {/* Summary description — fades in only after title is done typing */}
            <Box sx={{ opacity: done ? 1 : 0, transition: "opacity 0.5s ease" }}>
              {(() => {
                const lines = article.description 
                  ? article.description.split('\n').map(l => l.trim()).filter(l => l.length > 0)
                  : [];
                
                const isBulleted = lines.length > 1 && lines.every(l => l.startsWith('-') || l.startsWith('*') || l.startsWith('•'));

                if (isBulleted) {
                  return (
                    <Box sx={{ 
                      display: "flex", flexDirection: "column", gap: 1,
                      maxWidth: showImageSide ? "100%" : "90%"
                    }}>
                      {lines.map((line, idx) => {
                        const cleanLine = line.replace(/^[-*•\s]+/, '');
                        return (
                          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <Typography sx={{ color: C.orange, fontSize: "0.7rem", mt: "2px" }}>▸</Typography>
                            <Typography sx={{
                              fontFamily: C.fontMono,
                              fontSize: showImageSide ? "0.82rem" : "0.86rem",
                              color: "rgba(220,220,220,0.9)",
                              lineHeight: 1.4,
                              letterSpacing: "0.2px",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {cleanLine}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  );
                }

                // Fallback for non-bulleted descriptions
                return (
                  <Typography sx={{
                    fontFamily: C.fontMono,
                    fontSize: showImageSide ? "0.78rem" : "0.82rem",
                    color: "rgba(200,200,200,0.55)",
                    lineHeight: 1.7,
                    display: "-webkit-box",
                    WebkitLineClamp: showImageSide ? 3 : 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    borderLeft: `2px solid rgba(255,102,0,0.25)`,
                    pl: 2, ml: "1px",
                    maxWidth: showImageSide ? "100%" : "90%",
                  }}>
                    {article.description}
                  </Typography>
                );
              })()}
            </Box>
          </Box>

          <Box sx={{ 
            display: "flex", alignItems: "center", gap: 1.5,
            mt: "auto", pt: 3
          }}>
            <Button
              component="a" href={article.article_url} target="_blank" rel="noopener noreferrer"
              endIcon={<OpenInNew sx={{ fontSize: "0.8rem !important", mb: "1px" }} />}
              onClick={(e) => e.stopPropagation()}
              sx={{
                flex: 1,
                fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange,
                background: "rgba(255,102,0,0.05)",
                border: `1px solid rgba(255,102,0,0.3)`, borderRadius: "8px", textTransform: "none", py: 1,
                transition: "all 0.2s ease",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
                "&:hover": { borderColor: C.orange, background: "rgba(255,102,0,0.15)", transform: "scale(1.02)", boxShadow: "0 0 15px rgba(255,102,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" },
                "&:active": { transform: "scale(0.98)" }
              }}
            >
              READ ARTICLE
            </Button>
            {article.hn_id && (
              <Button
                onClick={(e) => { e.stopPropagation(); if (onOpenComments) onOpenComments(); }}
                endIcon={<QuestionAnswer sx={{ fontSize: "0.8rem !important", mb: "1px" }} />}
                sx={{
                  flex: 1,
                  fontFamily: C.fontMono, fontSize: "0.65rem", color: "#fff",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid rgba(255,255,255,0.1)`, borderRadius: "8px", textTransform: "none", py: 1,
                  transition: "all 0.2s ease",
                  "&:hover": { borderColor: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", transform: "scale(1.02)" },
                  "&:active": { transform: "scale(0.98)" }
                }}
              >
                COMMENTS
              </Button>
            )}
          </Box>
        </Box>

        {/* Swipe feedback overlays */}
        <motion.div style={{ opacity: likeOpacity, position: "absolute", top: 24, right: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #4ade80", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#4ade80", transform: "rotate(12deg)" }}>LIKE</Box>
        </motion.div>
        <motion.div style={{ opacity: skipOpacity, position: "absolute", top: 24, left: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #f87171", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#f87171", transform: "rotate(-12deg)" }}>DISLIKE</Box>
        </motion.div>
        <motion.div style={{ opacity: neutralOpacity, position: "absolute", top: 24, left: "50%", x: "-50%", pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #b0b0b0", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#b0b0b0" }}>SKIP</Box>
        </motion.div>

        <Box sx={{ display: "none" }}></Box>
      </Box>
    </Box>
  );
}

export function TerminalLoader() {
  const [dots, setDots] = useState("_");
  useEffect(() => { const id = setInterval(() => setDots((d) => d.length >= 3 ? "_" : d + "_"), 400); return () => clearInterval(id); }, []);
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, mb: 2 }}>LOADING FEED</Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "1rem", color: C.textDim }}>{`> fetching top stories${dots}`}</Typography>
    </Box>
  );
}

export function ExhaustedCard({ onReset }) {
  return (
    <Box sx={{ textAlign: "center", maxWidth: 400 }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.textDim, mb: 3, lineHeight: 2 }}>FEED EXHAUSTED</Typography>
      <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, mb: 4, fontSize: "0.9rem" }}>{">"} You've seen all available stories.</Typography>
      <Button variant="outlined" onClick={onReset}
        sx={{ fontFamily: C.fontMono, color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim } }}>
        RESET &amp; RELOAD
      </Button>
    </Box>
  );
}

