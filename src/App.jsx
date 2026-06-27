import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Button, IconButton,
  Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Link, Tooltip,
} from "@mui/material";
import {
  Logout, OpenInNew, WarningAmber, Undo, AccessTime,
  Delete, Visibility, ChatBubbleOutline, ArrowBack, ArrowForward, ArrowUpward, HelpOutline, QuestionAnswer,
  Psychology, Bookmark, Settings as SettingsIcon, Search
} from "@mui/icons-material";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import * as api from "./api.js";
import { C } from "./theme.js";
import { MagneticBox, SectionHeader, StatBadge, ShortcutRow, Label, Mono, ActionHint, KeyHint } from "./components/SharedComponents.jsx";
import { NewsCard, TerminalLoader, ExhaustedCard } from "./components/NewsCard.jsx";
import { ExpandableSidebar } from "./components/Sidebar.jsx";
import { TutorialOverlay, TOUR_STEPS } from "./components/TutorialOverlay.jsx";
import CommentsDrawer from "./CommentsDrawer.jsx";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

// ---------------------------------------------------------------------------
// Hook: Typewriter Effect (rAF-based, no stale closures)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component: Magnetic Box (Micro-interaction)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExhausted, setIsExhausted] = useState(false);
  const { logout } = useOutletContext();
  const [swipeCount, setSwipeCount] = useState(0);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [lastSwiped, setLastSwiped] = useState(null);

  const handleUndo = useCallback(async () => {
    if (!lastSwiped) return;
    const articleToUndo = lastSwiped.article;
    setArticles(prev => [...prev, articleToUndo]);
    setLastSwiped(null);
    try {
      await api.unlikeArticle(articleToUndo.id);
      setSwipeCount(p => p + 1);
    } catch (err) {
      console.error("Undo failed", err);
    }
  }, [lastSwiped]);

  const [particlesInit, setParticlesInit] = useState(false);
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesInit(true);
    });
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "c" || e.key === "C") {
        if (!isResetModalOpen && !showOnboarding) setIsCommentsOpen(prev => !prev);
      }
      if (e.key === "z" || e.key === "Z") {
        if (!isResetModalOpen && !showOnboarding) handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isResetModalOpen, showOnboarding, handleUndo]);

  useEffect(() => {
    if (!localStorage.getItem("hs_seen_onboarding") && !isLoading && articles.length > 0) {
      setShowOnboarding(true);
    }
  }, [isLoading, articles.length]);

  const dismissOnboarding = () => {
    localStorage.setItem("hs_seen_onboarding", "true");
    setShowOnboarding(false);
  };

  const isInitialMount = useRef(true);
  const isFetchingRef = useRef(false); // Use a ref to avoid stale closures causing deadlocks
  const fetchTimeoutRef = useRef(null);
  const topCard = articles[articles.length - 1] ?? null;

  const fetchFeed = useCallback(async (isReset = false, replaceStale = false) => {
    // Use ref guard — state-based guard causes stale closure deadlocks
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      const data = await api.getFeed();
      if (isReset) {
        setArticles(data);
        setIsExhausted(data.length === 0);
      } else {
        if (data.length === 0) setIsExhausted(true);
        // Prepend new articles. Filter out any IDs already in the current stack
        // to prevent duplicates caused by race conditions between swipe DB writes and feed fetches.
        setArticles((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const fresh = data.filter((a) => !existingIds.has(a.id));
          
          if (replaceStale) {
            // Option B (Seamless UX): We just updated our taste profile!
            // The cards sitting underneath the top ones are STALE. 
            // Keep the top 2 cards to avoid visual jank, but overwrite everything underneath it with the new fresh smart matches.
            const KEEP_TOP = 2;
            if (prev.length <= KEEP_TOP) {
              return [...fresh, ...prev];
            } else {
              const topCards = prev.slice(prev.length - KEEP_TOP);
              return [...fresh, ...topCards];
            }
          }
          
          // Default behavior: just prepend to the bottom of the stack
          return [...fresh, ...prev];
        });
      }
      setHasError(false);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
      setHasError(true);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
      if (isInitialMount.current) isInitialMount.current = false;
    }
  }, []); // No deps — uses refs and functional setState to avoid stale closures

  useEffect(() => { fetchFeed(true); }, [fetchFeed]);

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    // Pre-fetch next batch when only 3 cards remain.
    // Use !isLoading guard so this doesn't fire when we manually setArticles([]) during a reset.
    if (articles.length <= 3 && !isLoading && !isFetchingRef.current && !isInitialMount.current && !isExhausted) {
      fetchTimeoutRef.current = setTimeout(() => fetchFeed(), 300);
    }
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [articles.length, isLoading, fetchFeed, isExhausted]);

  const handleSwipe = useCallback((direction, swipedArticle) => {
    setIsCommentsOpen(false); // Close comments on swipe
    setLastSwiped({ article: swipedArticle, direction });
    // SYNCHRONOUS card removal — no async/await.
    // This prevents rapid-swipe freeze caused by piling up concurrent async promises.
    setArticles((prev) => prev.filter((a) => a.id !== swipedArticle.id));
    
    // Background API call. No blocking.
    const likedValue = direction === "right" ? true : (direction === "left" ? false : null);
    api.sendSwipe(swipedArticle.id, likedValue)
      .then(() => {
        setSwipeCount((p) => p + 1);
        if (direction === "right") {
          // Immediately pull fresh matches generated from the new taste vector
          // and seamlessly replace the stale tail-end of the queue!
          fetchFeed(false, true);
        }
      })
      .catch(() => {
        // If the swipe fails to save, revert the UI state
        setArticles((prev) => [...prev, swipedArticle]);
        setLastSwiped(null); // Clear undo state for this failed swipe
        console.error("Failed to save swipe, reverting card.");
      });
  }, [fetchFeed]);

  const handleReset = async () => {
    try {
      setIsLoading(true);
      setIsExhausted(false);
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      setArticles([]); // Clear old articles immediately so loader shows
      setLastSwiped(null); // Prevent undoing an article from the wiped profile
      await api.resetSwipes();
      setSwipeCount((p) => p + 1);
      
      // Force unlock any pending fetches that might have been inflight before reset
      isFetchingRef.current = false;
      await fetchFeed(true);
    } catch (err) { console.error("Failed to reset:", err); setIsLoading(false); }
  };

  return (
    <>
      {particlesInit && (
        <Particles
          id="tsparticles"
          options={{
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            interactivity: {
              events: { onHover: { enable: true, mode: "repulse" }, resize: true },
              modes: { repulse: { distance: 100, duration: 0.4 } },
            },
            particles: {
              color: { value: ["#ff6600", "#00ffcc"] },
              links: { color: "rgba(255, 102, 0, 0.2)", distance: 150, enable: true, opacity: 0.3, width: 1 },
              move: { enable: true, speed: 0.4, random: true, outModes: { default: "out" } },
              number: { density: { enable: true, area: 800 }, value: 50 },
              opacity: { value: { min: 0.1, max: 0.5 } },
              shape: { type: "circle" },
              size: { value: { min: 1, max: 2 } },
            },
            detectRetina: true,
          }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
        />
      )}
      <Box sx={{
        height: "100vh", width: "100vw", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        backgroundColor: "transparent",
        backgroundImage: `radial-gradient(800px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), rgba(255,102,0,0.04), transparent 40%), linear-gradient(rgba(255,102,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,102,0,0.03) 1px,transparent 1px)`,
        backgroundSize: "100% 100%, 32px 32px, 32px 32px",
        overflow: "hidden",
      }}>
      {/* Nav */}
      <Box sx={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", px: 4, height: "64px", flexShrink: 0,
        background: "linear-gradient(90deg, rgba(12,12,12,0.95) 0%, rgba(18,18,18,0.85) 50%, rgba(12,12,12,0.95) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 100,
        borderBottom: `1px solid rgba(255, 102, 0, 0.15)`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 12px ${C.orange}` }} />
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.05em" }}>HACKERSWIPE</Typography>
        </Box>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, letterSpacing: "0.15em", fontWeight: 700, display: { xs: "none", sm: "block" } }}>
          AI-POWERED HACKER NEWS DISCOVERY
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Tutorial">
            <MagneticBox>
              <IconButton data-tour="help" onClick={() => setShowOnboarding(true)} size="small" sx={{ color: C.textDim, "&:hover": { color: C.orange, background: C.orangeDim } }}><HelpOutline fontSize="small" /></IconButton>
            </MagneticBox>
          </Tooltip>
        </Box>
      </Box>

      <ExpandableSidebar 
        swipeCount={swipeCount} 
        onUnliked={() => setSwipeCount((p) => p + 1)} 
        handleReset={handleReset} 
        setShowOnboarding={setShowOnboarding} 
        onLogout={logout}
      />

      {/* Center */}
      <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", px: 3, overflow: "hidden" }}>
        {/* Only show loader when the stack is truly empty. Background fetches are invisible — no glitch. */}
        {hasError ? (
          <Box sx={{ textAlign: "center", maxWidth: 400 }}>
            <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: "#f39c12", mb: 3, lineHeight: 2 }}>NETWORK ERROR</Typography>
            <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, mb: 4, fontSize: "0.9rem" }}>{">"} Could not connect to the API. Check your connection or server status.</Typography>
            <Button variant="outlined" onClick={() => fetchFeed(true)}
              sx={{ fontFamily: C.fontMono, color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim } }}>
              RETRY CONNECTION
            </Button>
          </Box>
        ) : articles.length === 0 ? (
          isLoading ? <TerminalLoader /> : <ExhaustedCard onReset={() => setIsResetModalOpen(true)} />
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Only render top 3 cards — rest stay invisible until they become top 3 */}
            {articles.slice(-3).map((article, sliceIndex, sliceArr) => {
              const globalIndex = articles.length - sliceArr.length + sliceIndex;
              return (
                <NewsCard
                  key={article.id}
                  article={article}
                  onSwipe={(dir) => handleSwipe(dir, article)}
                  onOpenComments={() => setIsCommentsOpen(true)}
                  isTop={globalIndex === articles.length - 1}
                  isInteractive={!isResetModalOpen && !showOnboarding}
                  stackIndex={globalIndex}
                  totalCards={articles.length}
                />
              );
            })}
          </AnimatePresence>
        )}
      </Box>

      {/* Comments Drawer */}
      <CommentsDrawer 
        open={isCommentsOpen} 
        onClose={() => setIsCommentsOpen(false)} 
        hnId={topCard?.hn_id} 
      />

      {/* Undo button */}
      <AnimatePresence>
        {lastSwiped && (
          <Box component={motion.div}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            style={{ position: "fixed", bottom: 20, right: 32, zIndex: 50 }}
          >
            <Tooltip title="Undo Last Swipe (Z)" placement="top">
              <IconButton 
                onClick={handleUndo}
                sx={{
                  background: C.card,
                  border: `1px solid ${C.borderHot}`,
                  color: C.orange,
                  boxShadow: `0 0 20px ${C.orangeDim}`,
                  "&:hover": { background: C.orangeDim, transform: "scale(1.05)" }
                }}
              >
                <Undo />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </AnimatePresence>

      {/* Keyboard hint */}
      <Box sx={{
        display: { xs: "none", md: "flex" }, flexDirection: "column",
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        alignItems: "center", gap: 1.5, zIndex: 50,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <KeyHint icon={<ArrowBack sx={{ fontSize: 14 }} />} label="DISLIKE" />
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>·</Typography>
          <KeyHint icon={<ArrowUpward sx={{ fontSize: 14 }} />} label="SKIP" />
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>·</Typography>
          <KeyHint label="LIKE" icon={<ArrowForward sx={{ fontSize: 14 }} />} />
        </Box>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>or drag the card</Typography>
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

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showOnboarding && <TutorialOverlay onDismiss={dismissOnboarding} />}
      </AnimatePresence>
    </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Expandable Sidebar (Dock)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Taste Profile Panel
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Liked Panel (with search)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// News Card (with keyboard support + richer no-image fallback)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Loading / Exhausted States
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Reusable Small Components
// ---------------------------------------------------------------------------






