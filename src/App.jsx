import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import {
  Box, Typography, CircularProgress, Button, IconButton,
  Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Link, Tooltip,
} from "@mui/material";
import {
  RotateLeft, Logout, OpenInNew, WarningAmber,
  ThumbDown, ThumbUp, Delete, Visibility, ChatBubbleOutline, ArrowBack, ArrowForward,
} from "@mui/icons-material";
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import * as api from "./api.js";

// ---------------------------------------------------------------------------
// Design Tokens
// ---------------------------------------------------------------------------
const C = {
  orange: "#ff6600",
  orangeDim: "rgba(255,102,0,0.12)",
  bg: "#080808",
  card: "#0d0d0d",
  panel: "rgba(10,10,10,0.88)",
  border: "rgba(255,102,0,0.14)",
  borderHot: "rgba(255,102,0,0.5)",
  textDim: "rgba(232,232,232,0.5)",
  fontPixel: "'Press Start 2P', monospace",
  fontMono: "'Share Tech Mono', monospace",
  fontUi: "'Inter', sans-serif",
};

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { logout } = useOutletContext();
  const [swipeCount, setSwipeCount] = useState(0);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("hs_seen_onboarding")) {
      setShowOnboarding(true);
    }
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem("hs_seen_onboarding", "true");
    setShowOnboarding(false);
  };

  const isInitialMount = useRef(true);
  const fetchTimeoutRef = useRef(null);
  const topCard = articles[articles.length - 1] ?? null;

  const fetchFeed = useCallback(async (isReset = false) => {
    if (isFetchingMore) return;
    setIsFetchingMore(true); setIsLoading(true);
    try {
      const data = await api.getFeed();
      if (data.length === 0 && !isReset) setArticles([]);
      else if (isReset) setArticles(data);
      else setArticles((prev) => [...data, ...prev]);
      setHasError(false);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
      setHasError(true);
    } finally {
      setIsLoading(false); setIsFetchingMore(false);
      if (isInitialMount.current) isInitialMount.current = false;
    }
  }, [isFetchingMore]);

  useEffect(() => { fetchFeed(true); }, []); // eslint-disable-line

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    // Infinite scrolling: pre-fetch next batch from DB when only 3 cards remain in the stack
    if (articles.length <= 3 && !isFetchingMore && !isInitialMount.current && !hasError) {
      fetchTimeoutRef.current = setTimeout(() => fetchFeed(), 100);
    }
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [articles.length, isFetchingMore, fetchFeed, hasError]);

  const handleSwipe = useCallback(async (direction, swipedArticle) => {
    const willBeEmpty = articles.length === 1;
    try { await api.sendSwipe(swipedArticle.id, direction === "right"); setSwipeCount((p) => p + 1); }
    catch { /* fire-and-forget */ }
    setArticles((prev) => prev.slice(0, prev.length - 1));
    if (willBeEmpty) setIsLoading(true);
  }, [articles.length]);

  const handleReset = async () => {
    try { setIsLoading(true); await api.resetSwipes(); setSwipeCount((p) => p + 1); await fetchFeed(true); }
    catch (err) { console.error("Failed to reset:", err); setIsLoading(false); }
  };

  return (
    <Box sx={{
      height: "100vh", width: "100vw",
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "260px 1fr 260px" },
      gridTemplateRows: "56px 1fr",
      backgroundColor: C.bg,
      backgroundImage: `linear-gradient(rgba(255,102,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,102,0,0.03) 1px,transparent 1px)`,
      backgroundSize: "32px 32px",
      overflow: "hidden",
    }}>
      {/* Nav */}
      <Box sx={{
        gridColumn: "1 / -1", display: "flex", alignItems: "center",
        justifyContent: "space-between", px: 3,
        borderBottom: `1px solid ${C.border}`, background: "rgba(8,8,8,0.95)",
        backdropFilter: "blur(12px)", zIndex: 100,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 8px ${C.orange}` }} />
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.6rem", color: C.orange }}>HACKERSWIPE</Typography>
        </Box>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim }}>AI-POWERED HACKER NEWS READER</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Reset taste profile"><IconButton onClick={() => setIsResetModalOpen(true)} size="small" sx={{ color: C.textDim, "&:hover": { color: C.orange, background: C.orangeDim } }}><RotateLeft fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Logout"><IconButton onClick={logout} size="small" sx={{ color: C.textDim, "&:hover": { color: C.orange, background: C.orangeDim } }}><Logout fontSize="small" /></IconButton></Tooltip>
        </Box>
      </Box>

      {/* Left panel: Article details for current card */}
      <SidePanel>
        <ArticleDetailsPanel article={topCard} />
      </SidePanel>

      {/* Center */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", px: 3, overflow: "hidden" }}>
        {isLoading ? <TerminalLoader /> : articles.length === 0 ? <ExhaustedCard onReset={() => setIsResetModalOpen(true)} /> : (
          <AnimatePresence>
            {articles.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                onSwipe={(dir) => handleSwipe(dir, article)}
                isTop={index === articles.length - 1}
                isInteractive={!isResetModalOpen && !showOnboarding}
                stackIndex={index}
                totalCards={articles.length}
              />
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* Right panel: Liked articles */}
      <SidePanel align="right">
        <LikedPanel swipeCount={swipeCount} onUnliked={() => setSwipeCount((p) => p + 1)} />
      </SidePanel>

      {/* Keyboard hint */}
      <Box sx={{
        display: { xs: "none", md: "flex" },
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        alignItems: "center", gap: 2, zIndex: 50,
      }}>
        <KeyHint icon={<ArrowBack sx={{ fontSize: 14 }} />} label="SKIP" />
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>·</Typography>
        <KeyHint label="LIKE" icon={<ArrowForward sx={{ fontSize: 14 }} />} right />
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", ml: 2 }}>or drag the card</Typography>
      </Box>

      {/* Reset modal */}
      <Dialog open={isResetModalOpen} onClose={() => setIsResetModalOpen(false)}
        PaperProps={{ sx: { background: C.card, color: "white", borderRadius: "16px", border: `1px solid ${C.borderHot}` } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: C.fontUi, fontWeight: 700 }}>
          <WarningAmber sx={{ color: "#f39c12" }} /> Reset Taste Profile?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: C.textDim, fontFamily: C.fontUi }}>
            This permanently deletes your swipe history. Your AI profile resets and the feed starts fresh.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setIsResetModalOpen(false)} sx={{ color: C.textDim, fontFamily: C.fontUi }}>Cancel</Button>
          <Button onClick={() => { setIsResetModalOpen(false); handleReset(); }} variant="contained"
            sx={{ background: "#c0392b", fontFamily: C.fontUi, fontWeight: 700, "&:hover": { background: "#e74c3c" } }}>
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* First-time Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay onDismiss={dismissOnboarding} />}
      </AnimatePresence>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Side Panel Wrapper
// ---------------------------------------------------------------------------
function SidePanel({ children, align = "left" }) {
  return (
    <Box sx={{
      display: { xs: "none", md: "flex" },
      borderRight: align === "left" ? `1px solid ${C.border}` : "none",
      borderLeft: align === "right" ? `1px solid ${C.border}` : "none",
      height: "100%", overflowY: "auto",
      background: C.panel, backdropFilter: "blur(10px)",
      p: 2.5, flexDirection: "column", gap: 2,
    }}>
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Left Panel: Article Details for the current top card
// ---------------------------------------------------------------------------
function ArticleDetailsPanel({ article }) {
  if (!article) {
    return (
      <>
        <SectionHeader icon="▸" label="STORY DETAILS" />
        <Mono dim>{"// awaiting story..."}</Mono>
      </>
    );
  }
  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <>
      <SectionHeader icon="▸" label="STORY DETAILS" />

      {/* Points & Comments */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <StatBadge value={article.score ?? article.points ?? "—"} label="POINTS" icon="▲" />
        <StatBadge value={article.num_comments ?? "—"} label="COMMENTS" icon="💬" />
      </Box>

      {/* Title preview */}
      <Box>
        <Label>TITLE</Label>
        <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: "#e8e8e8", lineHeight: 1.5, mt: 0.5 }}>
          {article.title}
        </Typography>
      </Box>

      {publishedDate && (
        <Box>
          <Label>PUBLISHED</Label>
          <Mono>{publishedDate}</Mono>
        </Box>
      )}

      {/* HN Discussion link — only when we have the actual ID */}
      {article.hn_id && (
        <Box>
          <Label>DISCUSS ON HN</Label>
          <Link
            href={`https://news.ycombinator.com/item?id=${article.hn_id}`}
            target="_blank" rel="noopener noreferrer"
            sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.orange, "&:hover": { color: "#ff8533" } }}
          >
            Open discussion ↗
          </Link>
        </Box>
      )}

      {/* Keyboard shortcuts */}
      <Box sx={{ mt: "auto", borderTop: `1px solid ${C.border}`, pt: 2 }}>
        <Label>KEYBOARD</Label>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5 }}>
          <ShortcutRow keys={["←"]} label="Skip story" />
          <ShortcutRow keys={["→"]} label="Like story" />
          <ShortcutRow keys={["Enter"]} label="Open article" />
        </Box>
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Right Panel: Liked Articles with unlike + viewed tracking
// ---------------------------------------------------------------------------
function LikedPanel({ swipeCount, onUnliked }) {
  const [liked, setLiked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("hs_viewed") || "[]")); }
    catch { return new Set(); }
  });
  const isFirst = useRef(true);

  useEffect(() => {
    const fetch = async () => {
      if (isFirst.current) { setLoading(true); isFirst.current = false; }
      try { const d = await api.getLikedArticles(); setLiked(d); }
      catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [swipeCount]);

  const markViewed = (id) => {
    setViewed((prev) => {
      const next = new Set(prev).add(String(id));
      localStorage.setItem("hs_viewed", JSON.stringify([...next]));
      return next;
    });
  };

  const handleUnlike = async (articleId) => {
    try {
      await api.unlikeArticle(articleId);
      setLiked((prev) => prev.filter((a) => a.id !== articleId));
      onUnliked();
    } catch { /* ignore */ }
  };

  return (
    <>
      <SectionHeader icon="♥" label={`MY LIKES (${liked.length})`} color="#ff4757" />
      {loading ? <Mono dim>loading...</Mono> : liked.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {liked.map((a) => {
            const isViewed = viewed.has(String(a.id));
            return (
              <Box key={a.id} sx={{
                p: 1.5, borderRadius: "8px", position: "relative",
                background: isViewed ? "rgba(255,255,255,0.01)" : "rgba(255,102,0,0.04)",
                border: `1px solid ${isViewed ? "rgba(255,255,255,0.05)" : "rgba(255,102,0,0.2)"}`,
                borderLeft: isViewed ? `1px solid rgba(255,255,255,0.05)` : `3px solid ${C.orange}`,
                transition: "all 0.2s ease",
                "&:hover": { background: "rgba(255,102,0,0.08)", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }
              }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                  <Link
                    href={a.article_url} target="_blank" rel="noopener noreferrer"
                    underline="none"
                    onClick={() => markViewed(a.id)}
                    sx={{
                      color: isViewed ? C.textDim : "#ffffff",
                      fontFamily: C.fontUi, fontSize: "0.78rem", fontWeight: isViewed ? 500 : 700, lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
                      transition: "color 0.2s", flexGrow: 1, pr: 1,
                      "&:hover": { color: C.orange }
                    }}
                  >
                    {a.title}
                  </Link>
                  <Tooltip title="Unlike" placement="left">
                    <IconButton onClick={() => handleUnlike(a.id)} size="small"
                      sx={{ color: C.textDim, flexShrink: 0, mt: "-2px", mr: "-4px", "&:hover": { color: "#f87171", background: "rgba(248,113,113,0.1)" } }}>
                      <Delete sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {isViewed && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
                    <Visibility sx={{ fontSize: 10, color: C.textDim }} />
                    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>VIEWED</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ) : <Mono dim>swipe right to save stories here</Mono>}
    </>
  );
}

// ---------------------------------------------------------------------------
// News Card (with keyboard support + richer no-image fallback)
// ---------------------------------------------------------------------------
function NewsCard({ article, onSwipe, isTop, isInteractive, stackIndex, totalCards }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-15, 15]);
  const likeOpacity = useTransform(x, [50, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-50, -140], [0, 1]);
  const cardsFromTop = totalCards - 1 - stackIndex;

  // Keyboard arrow support
  useEffect(() => {
    if (!isTop || !isInteractive) return;
    const handler = async (e) => {
      if (isExiting) return;
      if (e.key === "ArrowRight") triggerSwipe("right");
      if (e.key === "ArrowLeft") triggerSwipe("left");
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
  }, [isTop, isExiting, article]); // eslint-disable-line

  const triggerSwipe = useCallback(async (dir) => {
    setIsExiting(true);
    await controls.start({
      x: dir === "right" ? window.innerWidth : -window.innerWidth,
      rotate: dir === "right" ? 25 : -25,
      opacity: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    });
    onSwipe(dir);
  }, [controls, onSwipe]);

  const handleDragEnd = async (_, info) => {
    if (isExiting || !isTop || !isInteractive) return;
    const liked = info.offset.x > 100 || info.velocity.x > 500;
    const skipped = info.offset.x < -100 || info.velocity.x < -500;
    if (liked) triggerSwipe("right");
    else if (skipped) triggerSwipe("left");
    else controls.start({ x: 0, rotate: 0, opacity: 1, transition: { type: "spring", stiffness: 500, damping: 25 } });
  };

  // Parse points/comments from description if stored there
  const descIsStats = article.description?.includes("points ·");
  const [imageFailed, setImageFailed] = useState(false);
  const showImageSide = !!article.image_url && !imageFailed;

  return (
    <Box
      component={motion.div}
      layout
      initial={{ scale: 0.97, y: 10, opacity: 0.9 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      style={{
        x, rotate,
        position: "absolute",
        cursor: !isTop || isExiting ? "default" : "grab",
        zIndex: isTop ? 100 : stackIndex,
        scale: isTop ? 1 : 1 - cardsFromTop * 0.04,
        y: cardsFromTop * 8,
        opacity: isTop ? 1 : Math.max(0.25, 1 - cardsFromTop * 0.35),
      }}
      sx={{ width: { xs: "90vw", sm: 500, md: 720 }, touchAction: "none" }}
      drag={isTop && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.65}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: isTop && !isExiting ? "grabbing" : "default" }}
    >
      <Box className="card-glow" sx={{
        width: "100%", height: { xs: "75vh", sm: 600, md: 480 },
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: "20px",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: showImageSide ? "1fr 1fr" : "1fr" },
        gridTemplateRows: { xs: showImageSide ? "200px 1fr" : "1fr", md: "1fr" },
        position: "relative",
      }}>
        {/* Decorative Background for No-Image mode */}
        {!showImageSide && (
          <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
            <Box sx={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,102,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,102,0,0.03) 1px,transparent 1px)`, backgroundSize: "30px 30px" }} />
            <Typography sx={{ position: "absolute", right: "-2%", top: "8%", fontFamily: C.fontPixel, fontSize: "28rem", color: "rgba(255,102,0,0.02)", lineHeight: 1, userSelect: "none" }}>Y</Typography>
            <Box sx={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "linear-gradient(180deg, #ff6600, transparent)" }} />
          </Box>
        )}

        {/* Image OR decorative left panel */}
        {showImageSide && (
          <Box sx={{ position: "relative", overflow: "hidden" }}>
            <Box component="img" src={article.image_url} alt={article.title}
              onError={() => setImageFailed(true)}
              sx={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />
            <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 60%,#0d0d0d 100%)" }} />
            <Box sx={{ position: "absolute", inset: 0, background: "linear-gradient(0deg,rgba(13,13,13,0.6)0%,transparent 60%)" }} />
          </Box>
        )}

        {/* Content panel */}
        <Box sx={{ p: { xs: "20px", md: "32px 36px" }, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, zIndex: 1, pr: { xs: "20px", md: showImageSide ? "36px" : "64px" } }}>
          <Box>
            {/* Header: source dot + label + algorithm badge */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, boxShadow: `0 0 6px ${C.orange}` }} />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.orange }}>HACKER NEWS</Typography>
              </Box>
              
              {article.match_pct ? (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "#00ffcc", letterSpacing: "0.5px", background: "rgba(0,255,204,0.1)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(0,255,204,0.3)" }}>
                  {article.match_pct}% MATCH
                </Typography>
              ) : (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "#a0a0a0", letterSpacing: "0.5px", background: "rgba(255,255,255,0.05)", px: 1, py: 0.5, borderRadius: "4px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  DISCOVERY
                </Typography>
              )}
            </Box>

            {/* Title */}
            <Typography sx={{
              fontFamily: C.fontPixel,
              fontSize: showImageSide ? "0.72rem" : "0.85rem",
              color: "#f5f5f5", lineHeight: 1.8, mb: 2,
              minHeight: showImageSide ? "5rem" : "5.5rem",
              maxWidth: showImageSide ? "100%" : "95%",
            }}>
              {article.title}
            </Typography>

            {/* Summary description */}
            <Box>
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
                  {descIsStats
                    ? "A trending story on Hacker News. Click 'Read Article' to explore."
                    : article.description}
                </Typography>
            </Box>
          </Box>

          <Box sx={{ 
            display: "flex", alignItems: "center", justifyContent: "space-between", 
            mt: 3, pt: 2, borderTop: `1px solid rgba(255,255,255,0.05)`, gap: 2, flexWrap: "wrap" 
          }}>
                <Button
                  component="a" href={article.article_url} target="_blank" rel="noopener noreferrer"
                  endIcon={<OpenInNew sx={{ fontSize: "0.8rem !important", mb: "1px" }} />}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim,
                    border: `1px solid ${C.border}`, borderRadius: "4px", textTransform: "none", px: 1.5, py: 0.5,
                    "&:hover": { borderColor: C.orange, color: C.orange, background: C.orangeDim },
                  }}
                >
                  READ ARTICLE
                </Button>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {/* Points + comments subtle badge */}
                  {(article.score != null || article.num_comments != null) && (
                    <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mr: 1 }}>
                      {article.score != null && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, fontWeight: 700 }}>{article.score}</Typography>
                          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>pts</Typography>
                        </Box>
                      )}
                      {article.num_comments != null && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <ChatBubbleOutline sx={{ fontSize: 11, color: C.textDim }} />
                          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{article.num_comments}</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                  <ActionHint icon={<ThumbDown sx={{ fontSize: 14 }} />} label="SKIP" color="rgba(255,70,70,0.7)" />
                  <ActionHint icon={<ThumbUp sx={{ fontSize: 14 }} />} label="LIKE" color="rgba(80,220,80,0.7)" />
                </Box>
              </Box>
        </Box>

        {/* Swipe feedback overlays */}
        <motion.div style={{ opacity: likeOpacity, position: "absolute", top: 24, right: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #4ade80", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#4ade80", transform: "rotate(12deg)" }}>LIKE</Box>
        </motion.div>
        <motion.div style={{ opacity: skipOpacity, position: "absolute", top: 24, left: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{ border: "3px solid #f87171", borderRadius: "8px", px: 2, py: 0.5, fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#f87171", transform: "rotate(-12deg)" }}>SKIP</Box>
        </motion.div>

        <Box sx={{ position: "absolute", bottom: 16, right: 20, fontFamily: C.fontMono, fontSize: "0.6rem", color: C.border }}>{`[${stackIndex + 1}]`}</Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Loading / Exhausted States
// ---------------------------------------------------------------------------
function TerminalLoader() {
  const [dots, setDots] = useState("_");
  useEffect(() => { const id = setInterval(() => setDots((d) => d.length >= 3 ? "_" : d + "_"), 400); return () => clearInterval(id); }, []);
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, mb: 2 }}>LOADING FEED</Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "1rem", color: C.textDim }}>{`> fetching top stories${dots}`}</Typography>
    </Box>
  );
}

function ExhaustedCard({ onReset }) {
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

// ---------------------------------------------------------------------------
// Reusable Small Components
// ---------------------------------------------------------------------------
function SectionHeader({ icon, label, color = C.orange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${C.border}`, pb: 1.5 }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color }}>{icon}</Typography>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.5rem", color, letterSpacing: "0.08em" }}>{label}</Typography>
    </Box>
  );
}

function StatBadge({ value, label, icon }) {
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

function ShortcutRow({ keys, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {keys.map((k) => (
          <Box key={k} sx={{
            fontFamily: C.fontMono, fontSize: "0.65rem", color: C.orange,
            border: `1px solid rgba(255,102,0,0.3)`, borderRadius: "4px",
            px: 0.75, py: 0.25, background: "rgba(255,102,0,0.06)",
          }}>{k}</Box>
        ))}
      </Box>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim }}>{label}</Typography>
    </Box>
  );
}

function Label({ children }) {
  return <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>{children}</Typography>;
}

function Mono({ children, dim, style }) {
  return <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: dim ? C.textDim : "#e8e8e8", lineHeight: 1.6, ...style }}>{children}</Typography>;
}

function ActionHint({ icon, label, color }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color, fontFamily: C.fontMono, fontSize: "0.6rem" }}>
      {icon}<span>{label}</span>
    </Box>
  );
}

function KeyHint({ icon, label, right }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexDirection: right ? "row-reverse" : "row" }}>
      <Box sx={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 22, height: 22, border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "5px", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)",
      }}>{icon}</Box>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)" }}>{label}</Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Onboarding Walkthrough Overlay
// ---------------------------------------------------------------------------
function OnboardingOverlay({ onDismiss }) {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      sx={{
        position: "fixed",
        bottom: { xs: 20, md: 30 },
        left: { xs: "5%", md: 280 },
        width: { xs: "90%", md: 380 },
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${C.orange}`,
        borderRadius: "16px",
        padding: "24px",
        zIndex: 9999,
        boxShadow: `0 12px 40px rgba(0,0,0,0.8), 0 0 30px rgba(255,102,0,0.15)`,
      }}
    >
      {/* CSS Triangle pointing left (Desktop Only) */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <motion.div
          animate={{ boxShadow: ["0 0 0 0 rgba(255,102,0,0.4)", "0 0 0 15px rgba(255,102,0,0)"] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            position: "absolute", left: -6, bottom: 46, width: 12, height: 12,
            borderRadius: "50%", background: C.orange, zIndex: 1
          }}
        />
        <Box sx={{
          position: "absolute", left: -14, bottom: 42,
          width: 0, height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderRight: `14px solid ${C.orange}`,
          zIndex: 0
        }} />
        <Box sx={{
          position: "absolute", left: -12, bottom: 44,
          width: 0, height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderRight: `12px solid #0d0d0d`,
          zIndex: 1
        }} />
      </Box>

      <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.2rem", fontWeight: 800, color: "white", mb: 1, letterSpacing: "-0.5px" }}>
        Welcome to HackerSwipe! ⚡️
      </Typography>
      
      <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#ccc", lineHeight: 1.6, mb: 3 }}>
        <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
          Use the <strong>controls on the left</strong> or simply drag the cards to swipe.
        </Box>
        <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
          <strong>Swipe right</strong> to save, <strong>swipe left</strong> to skip.
        </Box>
        <br/><br/>
        <strong style={{color: C.orange}}>1. AI Summaries:</strong> Every article is compressed to 1-2 sentences.
        <br/><br/>
        <strong style={{color: C.orange}}>2. The Algorithm:</strong> When you Like a story, our ML backend analyzes the topic and rewires your feed to find highly technical matches. Watch the Match % badge adapt!
      </Typography>

      <Button 
        fullWidth variant="contained" onClick={onDismiss}
        disableElevation
        sx={{ 
          background: C.orange, color: "black", fontWeight: 800, fontFamily: C.fontUi, textTransform: "none", py: 1,
          "&:hover": { background: "#ff8533" }
        }}
      >
        Got it, let's explore
      </Button>
    </Box>
  );
}