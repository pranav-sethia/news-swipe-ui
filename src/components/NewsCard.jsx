import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, CircularProgress, Link, Tooltip, Button } from "@mui/material";
import { AccessTime, OpenInNew, QuestionAnswer, ChatBubbleOutline } from "@mui/icons-material";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { C, FALLBACK_HUE_SHIFTS } from "../theme.js";
import { useTypewriter } from "../hooks.js";
import { StatBadge } from "./SharedComponents.jsx";

export function NewsCard({ article, onSwipe, onOpenComments, isTop, isInteractive, stackIndex, totalCards, dataTour, showDragHint }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const likeOpacity = useTransform(x, [50, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-50, -140], [0, 1]);
  const neutralOpacity = useTransform(y, [-50, -140], [0, 1]);
  const cardsFromTop = totalCards - 1 - stackIndex;

  // Typewriter only runs on the top card, background cards stay blank to avoid flash
  const { displayed, done } = useTypewriter(article.title, 28, isTop && !isExiting);

  // Keyboard arrow support
  useEffect(() => {
    if (!isTop || !isInteractive) return;
    const handler = async (e) => {
      if (isExiting) return;
      // Ignore typing in any input/textarea (e.g. the Saved panel's search
      // box) so Enter there submits/confirms a search instead of blurring
      // the field and popping the current top article open in a new tab.
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
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

  // When a background card gets promoted to the top of the stack (the
  // previous top card was swiped away), animate it up to full visibility.
  // Needed because once a card is promoted, `animate` switches from a plain
  // target object to `controls`, and controls only ever moves on an
  // explicit .start() call - without this it would just freeze at
  // whatever dimmed peek-card values it last had.
  useEffect(() => {
    if (isTop && !isExiting) {
      controls.start({ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } });
    }
  }, [isTop, isExiting]); // eslint-disable-line

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
      // Animation was interrupted (e.g. component unmounted mid-flight), still complete the swipe
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

  // A brief settle-wiggle on the card until the user's very first swipe
  // (showDragHint = !hasSwiped, passed down from App.jsx - flipped
  // synchronously the moment a swipe is initiated, not on the async
  // swipeCount update, so there's no lag). The arrow-key text/icon hints
  // themselves render in App.jsx now, positioned beside the card rather than
  // on top of it.
  const shouldHint = !!showDragHint && isTop && isInteractive && !isExiting;
  const [playWiggle, setPlayWiggle] = useState(false);
  useEffect(() => {
    if (!shouldHint || playWiggle) return;
    const id = setTimeout(() => setPlayWiggle(true), 900);
    return () => clearTimeout(id);
  }, [shouldHint, playWiggle]);

  const [imageFailed, setImageFailed] = useState(false);
  const fallbackBgIndex = article.id ? (article.id % 5) : 0;
  const isFallback = !article.image_url || imageFailed;
  const imageUrl = isFallback ? `/hacker_bgs/bg_${fallbackBgIndex}.png` : article.image_url;
  const hueShift = article.id ? FALLBACK_HUE_SHIFTS[article.id % FALLBACK_HUE_SHIFTS.length] : 0;

  return (
    <Box
      component={motion.div}
      data-tour={dataTour}
      role="group"
      aria-label={isTop ? `Article: ${article.title}. Swipe right to like, left to dislike, up to skip.` : undefined}
      aria-hidden={!isTop}
      initial={{
        scale: isTop ? 1 : (cardsFromTop === 1 ? 0.96 : 0.93),
        y: isTop ? 0 : (cardsFromTop === 1 ? 10 : 20),
        opacity: isTop ? 1 : (cardsFromTop === 1 ? 0.14 : 0),
      }}
      // Only the card directly below the top is slightly visible as a peek card;
      // any card beyond that is invisible to avoid the glitch. Kept dim
      // enough that a bright real article photo underneath doesn't read
      // clearly through the top card - this is just a "there's more"
      // depth cue, not a second visible image competing with the top one.
      // Background cards animate to a plain target object (auto-tracked by
      // Framer Motion as cardsFromTop changes); the top card is driven by
      // `controls` so triggerSwipe/handleDragEnd/the promotion effect above
      // can imperatively animate it.
      animate={isTop ? controls : {
        scale: cardsFromTop === 1 ? 0.96 : 0.93,
        y: cardsFromTop === 1 ? 10 : 20,
        opacity: cardsFromTop === 1 ? 0.14 : 0,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      style={{
        x, rotate,
        y: isTop ? y : undefined,
        position: "absolute",
        cursor: !isTop || isExiting ? "default" : "grab",
        zIndex: isTop ? 100 : stackIndex,
        pointerEvents: isTop ? "auto" : "none",
      }}
      sx={{ width: { xs: "90vw", sm: 640, md: 860 }, touchAction: "none" }}
      drag={isTop && !isExiting ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: isTop && !isExiting ? "grabbing" : "default" }}
    >
      <Box className="card-glow" sx={{
        width: "100%", height: { xs: "75vh", sm: "min(540px, 56vh)", md: "min(520px, 56vh)" },
        background: "rgba(12, 12, 12, 0.95)", // High opacity to prevent bleed-through
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: isTop
          ? "0 30px 70px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.02), 0 0 50px rgba(255,102,0,0.06)"
          : "none",
        // Layers the one-time drag hint alongside (not instead of) the
        // existing border-pulse glow already applied via the .card-glow
        // class, rather than overriding it.
        animation: playWiggle ? "border-pulse 3s ease-in-out infinite, cardDragHint 1.1s ease-in-out" : undefined,
        borderRadius: "20px",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.2fr 1fr" },
        gridTemplateRows: { xs: "200px 1fr", md: "1fr" },
        position: "relative",
      }}>
        {/* Image OR decorative left panel */}
        <Box sx={{ position: "relative", overflow: "hidden" }}>
          <Box component="img" src={imageUrl} alt={article.title}
            onError={() => setImageFailed(true)}
            sx={{
              width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none",
              filter: isFallback && article.id
                ? `hue-rotate(${hueShift}deg) saturate(${(article.id % 2) ? 1.3 : 1}) brightness(1.4)`
                : "brightness(1.15) contrast(1.05)",
              ...(isFallback && article.id && {
                transform: `scale(${1 + ((article.id % 3) * 0.15)})`,
                objectPosition: `${(article.id * 13) % 100}% ${(article.id * 17) % 100}%`
              })
            }} />
          {/* Genuinely dark/low-quality images (e.g. a near-black video
              thumbnail used as an og:image) are now rejected server-side at
              ingestion - see ingest.js's isImageGoodQuality - so real images
              reaching this component are already a real photo, not a
              placeholder. This is just a light safety-net lift for images
              near the low end of that server-side brightness floor, much
              lighter than the salvage-heavy version this used to be. */}
          <Box sx={{ position: "absolute", inset: 0, background: "rgba(110,110,110,0.4)", mixBlendMode: "screen", pointerEvents: "none" }} />
          {/* Vignette for depth, so the image reads as part of one composed
              card rather than a flat cropped rectangle. Kept lighter than
              before - stacked on top of an already-dark source image, the
              old 0.4/0.65 values could crush a dark photo to near-black. */}
          <Box sx={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 90px rgba(0,0,0,0.25)", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 55%,#0d0d0d 100%)" }} />
          <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(13,13,13,0.5)0%,transparent 55%)" }} />
          {/* Glowing seam where the image meets the content panel */}
          <Box sx={{
            position: "absolute", top: 0, bottom: 0, right: 0, width: "2px",
            display: { xs: "none", md: "block" },
            background: "linear-gradient(180deg, transparent, rgba(255,102,0,0.35) 30%, rgba(255,102,0,0.35) 70%, transparent)",
          }} />
        </Box>

        {/* Content panel */}
        <Box sx={{
          p: { xs: "20px", md: "36px 40px" }, display: "flex", flexDirection: "column",
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
              </Box>
              
              {article.match_pct ? (
                <Tooltip
                  title={
                    article.match_reason ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>
                          Recommended because you liked:
                        </Typography>
                        <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: C.teal, fontWeight: 500, lineHeight: 1.3, fontStyle: "italic" }}>
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
                        border: `1px solid ${C.tealDim}`,
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
                    fontFamily: C.fontMono, fontSize: "0.65rem", color: C.teal, letterSpacing: "0.5px",
                    background: article.match_pct >= 95 ? "rgba(255,215,0,0.12)" : "rgba(0,255,204,0.1)",
                    px: 1, py: 0.5, borderRadius: "4px",
                    border: `1px solid ${article.match_pct >= 95 ? "rgba(255,215,0,0.5)" : "rgba(0,255,204,0.3)"}`,
                    ...(article.match_pct >= 95 && { boxShadow: "0 0 12px rgba(255,215,0,0.25)", color: C.rareMatchGold }),
                    cursor: "help",
                    textDecoration: "underline",
                    textDecorationStyle: "dashed",
                    textUnderlineOffset: "3px",
                    textDecorationColor: article.match_pct >= 95 ? "rgba(255,215,0,0.5)" : "rgba(0,255,204,0.5)",
                    "&:hover": { background: article.match_pct >= 95 ? "rgba(255,215,0,0.2)" : "rgba(0,255,204,0.2)" },
                  }}>
                    {article.match_pct >= 95 ? `★ ${article.match_pct}% RARE MATCH` : `${article.match_pct}% MATCH`}
                  </Typography>
                </Tooltip>
              ) : article.discovery_type === "popular" ? (
                <Tooltip title="One of the biggest stories on HN right now, regardless of your taste match" placement="top">
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.5px", background: "rgba(255,102,0,0.12)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(255,102,0,0.5)", cursor: "help" }}>
                    🔥 POPULAR
                  </Typography>
                </Tooltip>
              ) : article.discovery_type === "random" ? (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "#a0a0a0", letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  DISCOVERY
                </Typography>
              ) : (
                // No taste_vector yet (genuinely new user) - a confident,
                // on-brand touchpoint for "learns your taste" from swipe one,
                // instead of a bare, generic label with no personalization signal at all.
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.5px", background: "rgba(255,102,0,0.08)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(255,102,0,0.35)" }}>
                  ◆ BUILDING YOUR TASTE
                </Typography>
              )}
            </Box>

            {/* Metadata Tags */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
              {article.read_time_minutes != null && (() => {
                const mins = parseInt(article.read_time_minutes, 10);
                let color = C.warning;
                let legend = "Medium read (6 to 15 min)";
                if (mins <= 5) { color = C.success; legend = "Quick read (5 min or less)"; }
                else if (mins > 15) { color = C.error; legend = "Long read (over 15 min)"; }
                return (
                  <Tooltip title={legend} placement="top">
                    <Typography sx={{ display: "flex", alignItems: "center", fontFamily: C.fontMono, fontSize: "0.65rem", color, background: `${color}1a`, border: `1px solid ${color}4d`, px: 1.2, py: 0.4, borderRadius: "6px", cursor: "help" }}>
                      <AccessTime sx={{ fontSize: 12, mr: 0.5 }} />
                      {mins} min read
                    </Typography>
                  </Tooltip>
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

            {/* Title, typewriter runs only on top card, others are blank.
                Moved off the pixel font (kept for short chrome moments like
                the LIKE/DISLIKE/SKIP stamps) to a larger, bolder monospace
                treatment - the title is the card's single most important
                line and needs to read as the primary hierarchy element, not
                compete at similar visual weight with the body bullets. */}
            <Typography sx={{
              fontFamily: C.fontMono,
              fontSize: "1.15rem",
              fontWeight: 700,
              color: "#f5f5f5", lineHeight: 1.35, mb: 2,
              minHeight: "3.4rem",
              maxWidth: "100%",
            }}>
              {displayed}
              {isTop && !done && <span className="cursor-blink" />}
            </Typography>

            {/* Summary is the substance of the card - shown immediately
                rather than waiting on the title's typewriter to finish, so a
                first-time viewer isn't stuck watching an animation on the
                one card where they're deciding if this is worth their time. */}
            <Box>
              {(() => {
                const lines = article.description 
                  ? article.description.split('\n').map(l => l.trim()).filter(l => l.length > 0)
                  : [];
                
                const isBulleted = lines.length > 1 && lines.every(l => l.startsWith('-') || l.startsWith('*') || l.startsWith('•'));

                if (isBulleted) {
                  return (
                    <Box sx={{
                      display: "flex", flexDirection: "column", gap: 1,
                      maxWidth: "100%"
                    }}>
                      {lines.map((line, idx) => {
                        const cleanLine = line.replace(/^[-*•\s]+/, '');
                        return (
                          <Box key={idx} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                            <Typography sx={{ color: C.orange, fontSize: "0.7rem", mt: "2px" }}>▸</Typography>
                            <Typography sx={{
                              fontFamily: C.fontMono,
                              fontSize: "0.82rem",
                              color: "rgba(220,220,220,0.9)",
                              lineHeight: 1.4,
                              letterSpacing: "0.2px",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
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
                    fontSize: "0.78rem",
                    color: "rgba(200,200,200,0.55)",
                    lineHeight: 1.7,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    borderLeft: `2px solid rgba(255,102,0,0.25)`,
                    pl: 2, ml: "1px",
                    maxWidth: "100%",
                  }}>
                    {article.description}
                  </Typography>
                );
              })()}
            </Box>
          </Box>

          {/* Two-tier action area: Read Article is the one action that
              actually matters, so it gets the app's real primary-CTA
              treatment (filled, full-width) on its own row. Comments/HN are
              supporting actions, demoted to a smaller, quieter row beneath
              it instead of competing at equal visual weight. */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: "auto", pt: 3 }}>
            <Button
              component="a" href={article.article_url} target="_blank" rel="noopener noreferrer"
              endIcon={<OpenInNew sx={{ fontSize: "0.85rem !important", mb: "1px" }} />}
              onClick={(e) => e.stopPropagation()}
              sx={{
                fontFamily: C.fontMono, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.03em",
                color: "#000", background: C.orange, borderRadius: "8px", textTransform: "none", py: 1.2,
                boxShadow: "0 4px 16px rgba(255,102,0,0.25)",
                transition: "all 0.2s ease",
                "&:hover": { background: "#e65c00", transform: "scale(1.01)", boxShadow: "0 6px 20px rgba(255,102,0,0.35)" },
                "&:active": { transform: "scale(0.99)" }
              }}
            >
              READ ARTICLE
            </Button>
            {article.hn_id && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  onClick={(e) => { e.stopPropagation(); if (onOpenComments) onOpenComments(); }}
                  endIcon={<QuestionAnswer sx={{ fontSize: "0.7rem !important" }} />}
                  sx={{
                    flex: 1,
                    fontFamily: C.fontMono, fontSize: "0.62rem", color: "rgba(255,255,255,0.5)",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", textTransform: "none", py: 0.6,
                    transition: "all 0.2s ease",
                    "&:hover": { borderColor: "rgba(255,255,255,0.25)", color: "#fff", background: "rgba(255,255,255,0.04)" },
                  }}
                >
                  COMMENTS
                </Button>
                <Tooltip title="Open the real discussion on Hacker News" placement="top">
                  <Button
                    component="a"
                    href={`https://news.ycombinator.com/item?id=${article.hn_id}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      flex: 1,
                      fontFamily: C.fontMono, fontSize: "0.62rem", color: "rgba(255,102,0,0.65)",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", textTransform: "none", py: 0.6,
                      transition: "all 0.2s ease",
                      "&:hover": { borderColor: "rgba(255,102,0,0.3)", color: C.orange, background: "rgba(255,102,0,0.04)" },
                    }}
                  >
                    VIEW ON HN
                  </Button>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Box>

        {/* Swipe feedback overlays */}
        <motion.div style={{ opacity: likeOpacity, position: "absolute", top: 24, right: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: `3px solid ${C.success}`, borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: C.success, transform: "rotate(12deg)" }}>LIKE</Box>
        </motion.div>
        <motion.div style={{ opacity: skipOpacity, position: "absolute", top: 24, left: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: `3px solid ${C.error}`, borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: C.error, transform: "rotate(-12deg)" }}>DISLIKE</Box>
        </motion.div>
        <motion.div style={{ opacity: neutralOpacity, position: "absolute", top: 24, left: "50%", x: "-50%", pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #b0b0b0", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#b0b0b0" }}>SKIP</Box>
        </motion.div>
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
  const isGuest = (() => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return false;
      return !!JSON.parse(atob(token.split(".")[1])).user?.isGuest;
    } catch {
      return false;
    }
  })();

  return (
    <Box sx={{ textAlign: "center", maxWidth: 400 }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.textDim, mb: 3, lineHeight: 2 }}>FEED EXHAUSTED</Typography>
      <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, mb: 4, fontSize: "0.9rem" }}>{">"} You've seen all available stories.</Typography>
      <Button variant="outlined" onClick={onReset}
        sx={{ fontFamily: C.fontMono, color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim } }}>
        RESET &amp; RELOAD
      </Button>
      {isGuest && (
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.textDim, mt: 3 }}>
          Guest tip: <Link href="/register" sx={{ color: C.orange, cursor: "pointer" }}>create an account</Link> to keep unlocking fresh matches from a saved profile.
        </Typography>
      )}
    </Box>
  );
}

