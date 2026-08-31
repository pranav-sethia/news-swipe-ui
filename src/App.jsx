import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, Button, IconButton,
  Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Link, Tooltip, TextField,
} from "@mui/material";
import {
  Logout, OpenInNew, WarningAmber, Undo, AccessTime,
  Delete, Visibility, ChatBubbleOutline, ArrowBack, ArrowForward, ArrowUpward, HelpOutline, QuestionAnswer,
  Psychology, Bookmark, Settings as SettingsIcon, Search
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { useOutletContext, useNavigate } from "react-router-dom";
import * as api from "./api.js";
import { C } from "./theme.js";
import { MagneticBox, SectionHeader, StatBadge, ShortcutRow, Label, Mono, ActionHint, KeyHint } from "./components/SharedComponents.jsx";
import { NewsCard, TerminalLoader, ExhaustedCard } from "./components/NewsCard.jsx";
import { ExpandableSidebar } from "./components/Sidebar.jsx";
import AuthStatusPill from "./components/AuthStatusPill.jsx";
import { TutorialOverlay, TOUR_STEPS } from "./components/TutorialOverlay.jsx";
import CommentsDrawer from "./CommentsDrawer.jsx";
import AuthModal from "./components/AuthModal.jsx";
import { track } from "./analytics.js";

// Cards kept on-screen (unswiped) across a replaceStale refresh - see
// fetchFeed's excludeIds logic and the replaceStale branch below. Must match
// on both sides, so hoisted to one shared constant.
const KEEP_TOP = 2;

// Must stay in sync with the same-named constant in news-swipe-api's
// routes/feed.js. Used only to drive the live, client-side progress badge
// below (see badgePhase/likeProgress) - never to gate which cards actually
// get real match percentages, which remains entirely server-decided.
const LIKES_NEEDED_FOR_MATCHES = 3;

// The two states of the reserved badge slot above the card stack (see the
// "Center" layout in App below). Rendered as siblings of the card, never
// layered over it - and the slot they live in has a fixed height regardless
// of which of these (or neither) is showing, so the card never shifts.
function ProgressPill({ likeProgress }) {
  const remaining = Math.max(0, LIKES_NEEDED_FOR_MATCHES - likeProgress);
  return (
    <Tooltip title={`Skipping or disliking doesn't count here - only liking does. ${remaining} more to unlock your matches.`} placement="bottom">
      <Box component={motion.div}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        sx={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 0.8,
          px: 2.5, py: 1.2, borderRadius: "12px", cursor: "help",
          background: "rgba(20,20,20,0.8)", border: `1px solid rgba(255,102,0,0.3)`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}
      >
        <Typography sx={{
          fontFamily: C.fontPixel, fontSize: "0.52rem", color: C.orange,
          letterSpacing: "0.04em", textAlign: "center", whiteSpace: "nowrap",
        }}>
          {remaining > 0 ? `LIKE ${remaining} MORE ${remaining === 1 ? "CARD" : "CARDS"} TO UNLOCK MATCHES` : "BUILDING YOUR TASTE"}
        </Typography>
        <Box sx={{ display: "flex", gap: "6px" }}>
          {Array.from({ length: LIKES_NEEDED_FOR_MATCHES }).map((_, i) => (
            <Box key={i} sx={{
              width: 8, height: 8, borderRadius: "50%",
              background: i < likeProgress ? C.orange : "rgba(255,255,255,0.15)",
              boxShadow: i < likeProgress ? `0 0 6px ${C.orange}` : "none",
              transition: "background 0.3s ease, box-shadow 0.3s ease",
            }} />
          ))}
        </Box>
      </Box>
    </Tooltip>
  );
}

function CelebratePill() {
  return (
    <Box component={motion.div}
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      sx={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 0.3,
        px: 2.5, py: 1.2, borderRadius: "12px",
        background: "rgba(20,20,20,0.8)", border: `1px solid ${C.tealDim}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3), 0 0 20px rgba(0,255,204,0.08)",
      }}
    >
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.55rem", color: C.teal, letterSpacing: "0.04em" }}>
        MATCHES UNLOCKED
      </Typography>
      <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.7rem", color: "rgba(232,232,232,0.7)" }}>
        Here's what we think you'll like
      </Typography>
    </Box>
  );
}

function isGuestUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return false;
    return !!JSON.parse(atob(token.split(".")[1])).user?.isGuest;
  } catch {
    return false;
  }
}

export default function App() {
  // The swipe app is the one page in this whole site that needs a hard,
  // fixed-height, non-scrolling viewport (its card stack is absolutely
  // positioned and self-contained). That lock used to live directly on
  // html/body/#root in index.css, applied globally to every route - which
  // silently broke scrolling on plain-content pages that render outside this
  // component entirely (Privacy, ForgotPassword, ResetPassword) once their
  // content grew taller than the viewport. Scoping the lock to only be
  // active while this component is mounted fixes that at the root instead of
  // patching each affected page individually.
  useEffect(() => {
    document.body.classList.add("swipe-app-active");
    return () => document.body.classList.remove("swipe-app-active");
  }, []);

  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExhausted, setIsExhausted] = useState(false);
  const { logout } = useOutletContext();
  const navigate = useNavigate();
  const [swipeCount, setSwipeCount] = useState(0);
  // Distinct from swipeCount on purpose: swipeCount only increments once the
  // sendSwipe network call resolves, but the arrow-key hint needs to hide in
  // the very same render pass the next card is promoted to top, not one
  // round-trip later - flipped synchronously at the top of handleSwipe below.
  const [hasSwiped, setHasSwiped] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  // Drives the shared AuthModal from anywhere in the app (nav, sidebar,
  // comments drawer, exhausted card, the like-milestone banner) so "Sign
  // in"/"Create account" opens right here on the feed instead of navigating
  // away to the landing page - only the logo itself is a real navigation.
  const [authPrompt, setAuthPrompt] = useState({ open: false, mode: "register" });
  const onRequestAuth = (mode) => setAuthPrompt({ open: true, mode });
  const [showOnboarding, setShowOnboarding] = useState(false);
  // True only for the brief window between the feed finishing load and a
  // fresh tour actually appearing - computed once, synchronously, whether a
  // tour is even going to show, so a *returning* guest (tour already seen)
  // never sees this and never gets any added delay.
  const willShowOnboardingRef = useRef(!localStorage.getItem("hs_seen_onboarding"));
  const [onboardingDelayActive, setOnboardingDelayActive] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastSwiped, setLastSwiped] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(message);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // Live "N more to unlock matches" progress badge. Tracked entirely
  // client-side and updated synchronously the instant a like swipe happens -
  // deliberately NOT derived from whichever card happens to be on top of the
  // stack. Per-card taste_progress/swipes_until_matches fields are baked in
  // at fetch time and go stale for up to KEEP_TOP+BATCH_SIZE swipes (see
  // fetchFeed's replaceStale branch), so a badge driven by the current top
  // card can sit un-updated through 2+ real likes. This counter can't go
  // stale the same way because nothing about it depends on fetch timing.
  const [badgePhase, setBadgePhase] = useState("progress"); // "progress" | "celebrate" | "done"
  const [likeProgress, setLikeProgress] = useState(0);
  const badgePhaseRef = useRef("progress");
  useEffect(() => { badgePhaseRef.current = badgePhase; }, [badgePhase]);
  const badgeSeededRef = useRef(false);
  const celebrateTimeoutRef = useRef(null);

  const triggerMatchesUnlocked = useCallback(() => {
    setBadgePhase((prev) => (prev === "done" ? prev : "celebrate"));
    localStorage.setItem("hs_seen_matches_unlocked", "1");
    if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current);
    celebrateTimeoutRef.current = setTimeout(() => setBadgePhase("done"), 3500);
  }, []);

  useEffect(() => () => { if (celebrateTimeoutRef.current) clearTimeout(celebrateTimeoutRef.current); }, []);

  // One-time nudge for guests once their feed has genuinely had a chance to
  // improve, rather than leaning solely on the session countdown to convert.
  const LIKE_MILESTONE = 5;
  const likeCountRef = useRef(0);
  const [showLikeBanner, setShowLikeBanner] = useState(false);

  useEffect(() => {
    if (!isGuestUser() || localStorage.getItem("hs_seen_like_milestone") === "1") return;
    api.getDetailedStats()
      .then((d) => {
        likeCountRef.current = d.likes || 0;
        if (likeCountRef.current >= LIKE_MILESTONE) {
          localStorage.setItem("hs_seen_like_milestone", "1");
          setShowLikeBanner(true);
        }
      })
      .catch(() => {});
  }, []);

  const [undoSuccess, setUndoSuccess] = useState(false);
  const handleUndo = useCallback(async () => {
    if (!lastSwiped) return;
    const articleToUndo = lastSwiped.article;
    setArticles(prev => [...prev, articleToUndo]);
    setLastSwiped(null);
    // Mirror the live progress counter: undoing a like that hasn't yet
    // unlocked matches gives back its progress, same as the existing "only
    // liking counts" rule already applies going forward.
    if (lastSwiped.direction === "right" && badgePhaseRef.current === "progress") {
      setLikeProgress((p) => Math.max(0, p - 1));
    }
    try {
      await api.unlikeArticle(articleToUndo.id);
      // Undoing a swipe removes it from the backend entirely, so the count
      // should go down to match - this used to increment instead, which
      // could fire the swipe_milestone analytics event early/inaccurately.
      setSwipeCount(p => Math.max(0, p - 1));
      setUndoSuccess(true);
      setTimeout(() => setUndoSuccess(false), 500);
    } catch (err) {
      console.error("Undo failed", err);
      showToast("Undo didn't save. Try again.");
    }
  }, [lastSwiped, showToast]);


  // Ambient cursor glow, smoothed rather than tracking 1:1, so it trails
  // gently instead of reading as a flat circle glued to the pointer.
  // Moved via transform on dedicated fixed-size layers (GPU compositing only)
  // rather than animating a radial-gradient's center point, which forces a
  // full repaint of that background every frame and was the main source of
  // the jank under the nav bar's backdrop-blur.
  const orangeGlowRef = useRef(null);
  const tealGlowRef = useRef(null);
  useEffect(() => {
    let target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let current = { ...target };
    let raf;

    const handleMouseMove = (e) => { target = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handleMouseMove);

    const tick = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      if (orangeGlowRef.current) {
        orangeGlowRef.current.style.transform = `translate3d(${current.x - 450}px, ${current.y - 450}px, 0)`;
      }
      if (tealGlowRef.current) {
        tealGlowRef.current.style.transform = `translate3d(${current.x - 160}px, ${current.y - 160}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      const blocked = isResetModalOpen || isDeleteAccountModalOpen || showOnboarding || isSidebarOpen || onboardingDelayActive;
      if (e.key === "c" || e.key === "C") {
        if (!blocked) setIsCommentsOpen(prev => !prev);
      }
      if (e.key === "z" || e.key === "Z") {
        if (!blocked) handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isResetModalOpen, isDeleteAccountModalOpen, showOnboarding, isSidebarOpen, onboardingDelayActive, handleUndo]);

  useEffect(() => {
    if (!willShowOnboardingRef.current || isLoading || articles.length === 0) return;
    // A brief pause so the user's real first card is visible before the tour
    // appears, instead of the tour slamming down the instant the feed loads.
    // Swiping is blocked for this same window (via onboardingDelayActive,
    // added to isInteractive below) so nothing can happen to the card before
    // the app has "decided" a tour is coming.
    setOnboardingDelayActive(true);
    const id = setTimeout(() => {
      setOnboardingDelayActive(false);
      setShowOnboarding(true);
    }, 500);
    return () => clearTimeout(id);
  }, [isLoading, articles.length]);

  const dismissOnboarding = () => {
    localStorage.setItem("hs_seen_onboarding", "true");
    // Without this, the ref stays true for the rest of the session (it's
    // only ever computed once, at mount) - the show-tour effect above reads
    // it on every swipe (articles.length is one of its deps), so a stale
    // true here re-opened the tour after every single swipe.
    willShowOnboardingRef.current = false;
    setShowOnboarding(false);
  };

  const isInitialMount = useRef(true);
  const isFetchingRef = useRef(false); // Use a ref to avoid stale closures causing deadlocks
  const fetchTimeoutRef = useRef(null);
  const topCard = articles[articles.length - 1] ?? null;
  // Mirrors `articles` state for fetchFeed's excludeIds computation, which
  // needs the current stack without becoming a dependency of that callback
  // (it intentionally has no deps, to avoid the stale-closure deadlocks
  // called out below).
  const articlesRef = useRef([]);
  useEffect(() => { articlesRef.current = articles; }, [articles]);

  const fetchFeed = useCallback(async (isReset = false, replaceStale = false) => {
    // Use ref guard: state-based guard causes stale closure deadlocks
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    try {
      // Tell the server which cards are currently kept on-screen (unswiped)
      // so its diversity checks (run-length cap, portfolio cap, near-dup
      // filter) aren't blind to them - matters most on a replaceStale fetch,
      // where KEEP_TOP cards stay put while everything else is replaced.
      const currentIds = articlesRef.current.map((a) => a.id);
      const excludeIds = replaceStale ? currentIds.slice(-KEEP_TOP) : currentIds;
      const data = await api.getFeed(excludeIds);
      // The backend gates every card in a single response on the same
      // badgeEligible check, so all cards in one fetch are consistently
      // either all taste-building (taste_progress set) or all past it -
      // this single check is a reliable signal for the whole batch.
      const matchesUnlocked = data.length > 0 && data.every((c) => c.taste_progress == null);
      // Reconciliation safety net for the live progress badge (see its
      // declaration above): if the server reports matches already unlocked
      // while our locally-tracked counter hasn't caught up - e.g. a swipe
      // write failed so the optimistic increment in handleSwipe never ran,
      // or this is a resumed session - self-correct here instead of leaving
      // the badge stuck mid-progress. Never the PRIMARY trigger, so this
      // can't reintroduce the network-timing staleness being fixed.
      if (matchesUnlocked && badgePhaseRef.current === "progress") {
        triggerMatchesUnlocked();
      }
      if (isReset) {
        setArticles(data);
        setIsExhausted(data.length === 0);
        if (!badgeSeededRef.current) {
          badgeSeededRef.current = true;
          if (matchesUnlocked || localStorage.getItem("hs_seen_matches_unlocked")) {
            setBadgePhase("done");
          } else {
            setLikeProgress(data[0]?.taste_progress ?? 0);
            setBadgePhase("progress");
          }
        }
      } else {
        if (data.length === 0) setIsExhausted(true);
        // Prepend new articles. Filter out any IDs already in the current stack
        // to prevent duplicates caused by race conditions between swipe DB writes and feed fetches.
        setArticles((prev) => {
          // No active purge of stale (pre-milestone) cards here on purpose -
          // an earlier version of this filtered them out of `prev` once
          // matches unlocked, but that ran over the WHOLE array with no
          // concept of "currently on screen," so it could (and did) remove
          // the card the user was actively looking at mid-view, unmounting
          // and replacing it. Stale cards are instead handled passively: a
          // card still carrying onboarding-era taste_progress fields just
          // renders NewsCard's graceful "matches unlocked but this one
          // predates that" fallback badge (see the matchesUnlocked prop)
          // until the user naturally swipes past it and a fresh,
          // correctly-badged card takes its place from the next fetch.
          const existingIds = new Set(prev.map((a) => a.id));
          const fresh = data.filter((a) => !existingIds.has(a.id));

          if (replaceStale) {
            // Option B (Seamless UX): We just updated our taste profile!
            // The cards sitting underneath the top ones are STALE.
            // Keep the top KEEP_TOP cards to avoid visual jank, but overwrite everything underneath it with the new fresh smart matches.
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
  }, []); // No deps, uses refs and functional setState to avoid stale closures

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
    setHasSwiped(true);
    setIsCommentsOpen(false); // Close comments on swipe
    setLastSwiped({ article: swipedArticle, direction });
    // Synchronous card removal, no async/await.
    // This prevents rapid-swipe freeze caused by piling up concurrent async promises.
    setArticles((prev) => prev.filter((a) => a.id !== swipedArticle.id));

    // Live progress badge: incremented synchronously, in this same swipe -
    // not inside the .then() below, which only resolves after a network
    // round-trip. Waiting on that round-trip is exactly the staleness bug
    // this counter exists to avoid.
    if (direction === "right" && badgePhaseRef.current === "progress") {
      setLikeProgress((p) => {
        const next = p + 1;
        if (next >= LIKES_NEEDED_FOR_MATCHES) triggerMatchesUnlocked();
        return next;
      });
    }

    // Background API call. No blocking.
    const likedValue = direction === "right" ? true : (direction === "left" ? false : null);
    api.sendSwipe(swipedArticle.id, likedValue)
      .then(() => {
        setSwipeCount((p) => {
          const next = p + 1;
          if (next === 1) track("first_swipe");
          else if ([5, 10, 25, 50, 100].includes(next)) track("swipe_milestone", { count: next });
          return next;
        });
        // Immediately pull a fresh batch reflecting this swipe and seamlessly
        // replace the stale tail-end of the queue. Every direction, not just
        // likes: dislikes and skips now carry real signal too (the
        // skip-cooldown rule, the disliked-category exclusion) that's meant
        // to react within the current session, not wait for the next
        // "3 cards remain" refetch.
        fetchFeed(false, true);

        if (direction === "right") {
          if (isGuestUser() && localStorage.getItem("hs_seen_like_milestone") !== "1") {
            likeCountRef.current += 1;
            if (likeCountRef.current >= LIKE_MILESTONE) {
              localStorage.setItem("hs_seen_like_milestone", "1");
              setShowLikeBanner(true);
            }
          }
        }
      })
      .catch(() => {
        // If the swipe fails to save, we just log it instead of jarringly reverting the UI state
        // Roll back the optimistic progress increment too, so the badge
        // can't drift ahead of what the server actually recorded. Only while
        // still mid-progress - if this swipe already triggered the unlock
        // celebration, leave it be rather than yanking it back into progress.
        if (direction === "right" && badgePhaseRef.current === "progress") {
          setLikeProgress((p) => Math.max(0, p - 1));
        }
        setLastSwiped(null); // Clear undo state for this failed swipe
        console.error("Failed to save swipe.");
        showToast("That swipe didn't save. Check your connection.");
      });
  }, [fetchFeed, showToast, triggerMatchesUnlocked]);

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

  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountNeedsPassword, setDeleteAccountNeedsPassword] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteAccountError("");
    setDeleteAccountLoading(true);
    try {
      await api.deleteAccount(deleteAccountPassword);
      logout();
    } catch (err) {
      const code = err.response?.data?.error;
      if (code === "password_required") {
        // Guests and Google accounts skip this and delete on the first try -
        // only a password account lands here, revealing the field inline
        // instead of a scary error, since this is the expected first step.
        setDeleteAccountNeedsPassword(true);
      } else if (err.response?.status === 401) {
        setDeleteAccountError("Incorrect password.");
      } else {
        console.error("Failed to delete account:", err);
        setIsDeleteAccountModalOpen(false);
        showToast("Couldn't delete your account. Try again.");
      }
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  return (
    <>

      <Box sx={{
        height: "100vh", width: "100vw", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        backgroundColor: "transparent",
        backgroundImage: `linear-gradient(rgba(255,102,0,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,102,0,0.06) 1px,transparent 1px)`,
        backgroundSize: "32px 32px, 32px 32px",
        overflow: "hidden",
      }}>
      {/* Ambient cursor glow: fixed-size layers moved via transform only, so
          the mouse-follow animation never repaints the gradient itself */}
      <Box ref={orangeGlowRef} sx={{
        position: "absolute", top: 0, left: 0, width: 900, height: 900,
        background: "radial-gradient(circle, rgba(255,102,0,0.1), transparent 40%)",
        pointerEvents: "none", zIndex: 0, willChange: "transform",
      }} />
      <Box ref={tealGlowRef} sx={{
        position: "absolute", top: 0, left: 0, width: 320, height: 320,
        background: "radial-gradient(circle, rgba(0,255,204,0.05), transparent 60%)",
        pointerEvents: "none", zIndex: 0, willChange: "transform",
      }} />
      {/* Nav - position:relative so the tagline can be truly centered via
          absolute positioning below, independent of the left/right groups'
          widths (a plain 3-child space-between row only equalizes the gaps
          between items, not the middle item's actual position - since the
          right group's width varies with guest-vs-signed-in state, that made
          the tagline visibly drift left or right depending on auth state). */}
      <Box sx={{
        display: "flex", alignItems: "center", position: "relative",
        justifyContent: "space-between", px: 4, height: "64px", flexShrink: 0,
        background: "linear-gradient(90deg, rgba(12,12,12,0.95) 0%, rgba(18,18,18,0.85) 50%, rgba(12,12,12,0.95) 100%)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", zIndex: 150,
        borderBottom: `1px solid rgba(255, 102, 0, 0.15)`,
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }}>
        <Box
          onClick={() => navigate("/register")}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 12px ${C.orange}` }} />
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, letterSpacing: "0.05em" }}>HACKERSWIPE</Typography>
        </Box>
        <Typography sx={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, letterSpacing: "0.15em", fontWeight: 700, display: { xs: "none", sm: "block" },
        }}>
          HACKER NEWS TUNED TO YOU
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <AuthStatusPill onLogout={logout} onRequestAuth={onRequestAuth} />
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
        onRequestReset={() => setIsResetModalOpen(true)}
        onRequestDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
        setShowOnboarding={setShowOnboarding}
        onLogout={logout}
        onRequestAuth={onRequestAuth}
        onActiveTabChange={setIsSidebarOpen}
      />

      {/* Center - position:absolute,inset:0 rather than a flex child of the
          nav-inclusive column above, so the card centers on the TRUE full
          viewport height, same reference frame the sidebar dock and comments
          pull-tab already use (both position:fixed, centered at true vh/2,
          ignoring the nav bar entirely). Centering inside a flex child of the
          nav column instead pulled the card's center down by the nav's
          height - a small, unnoticed offset before the badge existed, and a
          real regression (overlapping the keyboard hints) once it did.
          zIndex kept below the nav's (150) so the nav still paints on top,
          exactly as it already visually does today. */}
      <Box sx={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", px: 3 }}>
        {/* Badge pill - floats independently just below the nav, deliberately
            NOT part of the card-centering flex math above (an earlier version
            reserved flow space for it here, which both pulled the card's
            center off true vh/2 again AND - worse - placed the reserved slot
            inside the nav's own [0,64] range, where the nav's opaque,
            higher-zIndex background painted over it, making it invisible
            despite rendering "correctly" per every DOM measurement). A fixed
            offset below the nav is safe here because there's always
            substantial headroom between the nav and the card's own top edge
            at any realistic viewport height (confirmed live down to a ~745px
            window, the shortest this dev machine's screen allows - 90px+ to
            spare there, and only more at taller viewports, since the card's
            own height is capped while this offset stays constant). */}
        <Box sx={{ position: "absolute", top: 76, left: "50%", transform: "translateX(-50%)", zIndex: 3, width: "100%", display: "flex", justifyContent: "center", px: 3, pointerEvents: "none" }}>
          <Box sx={{ pointerEvents: "auto" }}>
            <AnimatePresence mode="wait">
              {badgePhase === "progress" && articles.length > 0 && (
                <ProgressPill key="progress" likeProgress={likeProgress} />
              )}
              {badgePhase === "celebrate" && <CelebratePill key="celebrate" />}
            </AnimatePresence>
          </Box>
        </Box>

        {/* Only fall back to a full-screen state when there are truly no cards on
            screen. A background prefetch failing must never blank out cards the
            user still has to swipe (hasError alone used to gate this, which did
            exactly that). */}
        {articles.length === 0 ? (
          hasError ? (
            <Box sx={{ textAlign: "center", maxWidth: 400 }}>
              <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.warning, mb: 3, lineHeight: 2 }}>NETWORK ERROR</Typography>
              <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, mb: 4, fontSize: "0.9rem" }}>{">"} Could not connect to the API. Check your connection or server status.</Typography>
              <Button variant="outlined" onClick={() => fetchFeed(true)}
                sx={{ fontFamily: C.fontMono, color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim } }}>
                RETRY CONNECTION
              </Button>
            </Box>
          ) : isLoading ? <TerminalLoader /> : <ExhaustedCard onReset={() => setIsResetModalOpen(true)} onRequestAuth={onRequestAuth} />
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Only render top 3 cards, rest stay invisible until they become top 3 */}
            {articles.slice(-3).map((article, sliceIndex, sliceArr) => {
              const globalIndex = articles.length - sliceArr.length + sliceIndex;
              return (
                <NewsCard
                  key={article.id}
                  article={article}
                  matchesUnlocked={badgePhase !== "progress"}
                  onSwipe={(dir) => handleSwipe(dir, article)}
                  onOpenComments={() => setIsCommentsOpen(true)}
                  isTop={globalIndex === articles.length - 1}
                  isInteractive={!isResetModalOpen && !isDeleteAccountModalOpen && !showOnboarding && !isCommentsOpen && !isSidebarOpen && !onboardingDelayActive}
                  stackIndex={globalIndex}
                  totalCards={articles.length}
                  dataTour={globalIndex === articles.length - 1 ? "card" : undefined}
                  showDragHint={!hasSwiped}
                />
              );
            })}
          </AnimatePresence>
        )}

        {/* Keyboard hint inside Center Box for alignment */}
        <Box sx={{
          display: { xs: "none", md: "flex" }, flexDirection: "column",
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          alignItems: "center", gap: 1.5, zIndex: 50,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <KeyHint icon={<ArrowBack sx={{ fontSize: 14 }} />} label="DISLIKE" code="ArrowLeft" />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>·</Typography>
            <KeyHint icon={<ArrowUpward sx={{ fontSize: 14 }} />} label="SKIP" code="ArrowUp" />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.2)" }}>·</Typography>
            <KeyHint label="LIKE" icon={<ArrowForward sx={{ fontSize: 14 }} />} code="ArrowRight" />
          </Box>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.05em" }}>or drag the card</Typography>
        </Box>

        {/* First-swipe arrow-key hint - beside the card, not on top of it, so
            it never competes with the card's own content. Anchored to the
            card's own edge (its responsive half-width from NewsCard.jsx:
            320 at sm, 430 at md) plus a fixed gap, not the container's edge -
            otherwise the gap to the card grows with viewport width instead
            of staying constant. The left hint additionally floors at 140px
            via max() so it never ducks under the sidebar dock (position:
            fixed, left:32, width:72, zIndex:9999 - floats on top of this box
            rather than reserving space in the flex layout).
            hasSwiped flips synchronously in handleSwipe (not the async
            swipeCount), so this can't linger onto the next card. */}
        {!hasSwiped && articles.length > 0 && !isResetModalOpen && !isDeleteAccountModalOpen && !showOnboarding && !isCommentsOpen && !isSidebarOpen && !onboardingDelayActive && (
          <>
            <Box sx={{
              position: "absolute",
              left: { sm: "max(140px, calc(50% - 412px))", md: "max(140px, calc(50% - 522px))" },
              top: "50%", transform: "translateY(-50%)",
              display: { xs: "none", md: "flex" },
              zIndex: 5, pointerEvents: "none", animation: "arrowHintPulse 1.8s ease-in-out infinite",
            }}>
              <Box sx={{
                width: 76, height: 74, borderRadius: "12px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 0.5, px: 0.5,
                background: "rgba(20,20,20,0.92)", border: `1.5px solid ${C.error}`,
                boxShadow: "0 0 20px rgba(248,113,113,0.3)", color: C.error,
              }}>
                <ArrowBack sx={{ fontSize: "1.3rem" }} />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.15, textAlign: "center" }}>
                  LEFT ARROW KEY
                </Typography>
              </Box>
            </Box>
            <Box sx={{
              position: "absolute",
              right: { sm: "calc(50% - 412px)", md: "calc(50% - 522px)" },
              top: "50%", transform: "translateY(-50%)",
              display: { xs: "none", md: "flex" },
              zIndex: 5, pointerEvents: "none", animation: "arrowHintPulse 1.8s ease-in-out infinite",
            }}>
              <Box sx={{
                width: 76, height: 74, borderRadius: "12px", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 0.5, px: 0.5,
                background: "rgba(20,20,20,0.92)", border: `1.5px solid ${C.success}`,
                boxShadow: "0 0 20px rgba(74,222,128,0.3)", color: C.success,
              }}>
                <ArrowForward sx={{ fontSize: "1.3rem" }} />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.15, textAlign: "center" }}>
                  RIGHT ARROW KEY
                </Typography>
              </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Triangular Pull Tab */}
      <AnimatePresence>
        {!isCommentsOpen && !isExhausted && !showOnboarding && articles.length > 0 && topCard?.hn_id && (
          <Box component={motion.div}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            whileHover={{ x: -4, filter: 'drop-shadow(-8px 0 20px rgba(255, 102, 0, 0.4))' }}
            onClick={() => setIsCommentsOpen(true)}
            sx={{
              position: 'fixed',
              right: -1,
              top: '50%',
              marginTop: '-36px', // offset half height since translateY doesn't work perfectly with motion.div sometimes
              width: 28,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 90,
              filter: 'drop-shadow(-4px 0 12px rgba(0, 0, 0, 0.5))',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:active': { transform: 'scale(0.95)' }
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 28 72" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', zIndex: -1 }}>
              <path d="M28 0 L 6 28 Q 0 36 6 44 L 28 72 Z" fill="rgba(18,18,18,0.95)" stroke="rgba(255,102,0,0.5)" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            <ArrowBack sx={{ color: C.orange, fontSize: 16, ml: 1.5, opacity: 0.9 }} />
          </Box>
        )}
      </AnimatePresence>

      {/* Comments Drawer */}
      <CommentsDrawer
        open={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        hnId={topCard?.hn_id}
        onRequestAuth={onRequestAuth}
      />

      {/* Sign in / create account, opened in place from anywhere in the app -
          reloads on success (rather than navigating) so every piece of app
          state - feed, taste vector, swipe history - refreshes cleanly under
          the new/upgraded identity without having to hand-refresh each one. */}
      <AuthModal
        open={authPrompt.open}
        onClose={() => setAuthPrompt((p) => ({ ...p, open: false }))}
        initialMode={authPrompt.mode}
        onAuthenticated={() => window.location.reload()}
      />

      {/* Undo button */}
      <AnimatePresence>
        {(lastSwiped || showOnboarding) && (
          <Box component={motion.div}
            data-tour="undo"
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

      {/* Brief confirmation that undo actually saved, since the button above
          unmounts the instant undo starts (lastSwiped clears immediately). */}
      {undoSuccess && (
        <Box sx={{
          position: "fixed", bottom: 20, right: 32, zIndex: 50,
          width: 48, height: 48, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: C.card, border: `1px solid ${C.success}`, color: C.success,
          boxShadow: `0 0 20px ${C.success}55`,
          animation: "undoConfirm 500ms ease-out",
        }}>
          <Undo sx={{ fontSize: 20 }} />
        </Box>
      )}



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
            sx={{ background: C.error, fontFamily: C.fontUi, fontWeight: 700, "&:hover": { background: "#e65a5a" } }}>
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete account modal */}
      <Dialog
        open={isDeleteAccountModalOpen}
        onClose={() => {
          setIsDeleteAccountModalOpen(false);
          setDeleteAccountPassword("");
          setDeleteAccountNeedsPassword(false);
          setDeleteAccountError("");
        }}
        PaperProps={{ sx: { background: C.card, color: "white", borderRadius: "16px", border: `1px solid ${C.borderHot}` } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: C.fontUi, fontWeight: 700 }}>
          <WarningAmber sx={{ color: "#f39c12" }} /> Delete your account?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: C.textDim, fontFamily: C.fontUi, mb: deleteAccountNeedsPassword ? 2 : 0 }}>
            This permanently deletes your account, swipe history, and taste profile. This can't be undone.
          </DialogContentText>
          {deleteAccountNeedsPassword && (
            <TextField
              autoFocus fullWidth type="password" label="Current password" variant="outlined"
              value={deleteAccountPassword}
              onChange={(e) => setDeleteAccountPassword(e.target.value)}
              error={!!deleteAccountError}
              helperText={deleteAccountError}
              onKeyDown={(e) => { if (e.key === "Enter") handleDeleteAccount(); }}
              sx={{
                '& .MuiOutlinedInput-root': { color: 'white', fontFamily: C.fontMono },
                '& .MuiInputLabel-root': { color: C.textDim, fontFamily: C.fontMono },
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setIsDeleteAccountModalOpen(false)} sx={{ color: C.textDim, fontFamily: C.fontUi }}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            disabled={deleteAccountLoading || (deleteAccountNeedsPassword && !deleteAccountPassword)}
            variant="contained"
            sx={{ background: C.error, fontFamily: C.fontUi, fontWeight: 700, "&:hover": { background: "#e65a5a" }, "&:disabled": { background: "rgba(248,113,113,0.3)" } }}>
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showOnboarding && <TutorialOverlay onDismiss={dismissOnboarding} />}
      </AnimatePresence>

      {/* One-time guest conversion nudge, shown once their feed has genuinely improved */}
      <AnimatePresence>
        {showLikeBanner && (
          <Box component={motion.div}
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            sx={{
              position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)",
              zIndex: 200, width: { xs: "90vw", sm: 420 },
              background: "linear-gradient(160deg, rgba(24,24,24,0.98) 0%, rgba(13,13,13,0.98) 100%)",
              border: `1px solid ${C.border}`, borderRadius: "16px", p: 2.5,
              boxShadow: "0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(255,102,0,0.1)",
              display: "flex", alignItems: "flex-start", gap: 1.5,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.orange, letterSpacing: "0.06em", mb: 0.5 }}>
                YOUR FEED JUST GOT SHARPER
              </Typography>
              <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "rgba(232,232,232,0.8)", lineHeight: 1.5, mb: 1.5 }}>
                5 likes in, and the feed already knows more about what you want. Create a free account to keep it, no guest countdown.
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                <Button
                  onClick={() => { setShowLikeBanner(false); onRequestAuth("register"); }}
                  sx={{
                    background: C.orange, color: "#000", fontFamily: C.fontMono, fontWeight: 700, fontSize: "0.7rem",
                    px: 2, py: 0.8, borderRadius: "8px", letterSpacing: "0.05em",
                    "&:hover": { background: "#e65c00" },
                  }}
                >
                  CREATE ACCOUNT
                </Button>
                <Typography
                  onClick={() => setShowLikeBanner(false)}
                  sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, cursor: "pointer", "&:hover": { color: "#fff" } }}
                >
                  Not now
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setShowLikeBanner(false)} size="small" sx={{ color: C.textDim, "&:hover": { color: "#fff" } }}>
              <Typography sx={{ fontSize: "1rem", lineHeight: 1 }}>✕</Typography>
            </IconButton>
          </Box>
        )}
      </AnimatePresence>

      {/* Toast: surfaces failures that used to be silent (swipe/undo not saving) */}
      {toast && (
        <Box sx={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          background: C.card, border: `1px solid ${C.border}`, borderRadius: "10px",
          px: 3, py: 1.5, zIndex: 200, boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          // fill-mode forwards: without it, the toastIn keyframes' own
          // translate(-50%, ...) only applies while the 0.25s entrance
          // animation is actually running - once it finishes, the element
          // snaps back to this static sx's transform. That static transform
          // used to be absent entirely, so the toast visibly jumped off-
          // center for the rest of its ~4s lifetime. Now it just matches.
          animation: "toastIn 0.25s ease-out forwards",
        }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim }}>{toast}</Typography>
        </Box>
      )}
    </Box>
    </>
  );
}
