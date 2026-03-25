import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Tooltip,
} from "@mui/material";
import {
  RotateLeft,
  Logout,
  OpenInNew,
  BarChart,
  WarningAmber,
  Favorite,
  ThumbDown,
  ThumbUp,
} from "@mui/icons-material";
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
  AnimatePresence,
} from "framer-motion";
import { useOutletContext } from "react-router-dom";
import * as api from "./api.js";

// ---------------------------------------------------------------------------
// Design Tokens (match CSS variables)
// ---------------------------------------------------------------------------
const C = {
  orange: "#ff6600",
  orangeDim: "rgba(255,102,0,0.12)",
  orangeGlow: "rgba(255,102,0,0.35)",
  bg: "#080808",
  card: "rgba(13,13,13,0.98)",
  panel: "rgba(10,10,10,0.88)",
  border: "rgba(255,102,0,0.14)",
  borderHot: "rgba(255,102,0,0.5)",
  textDim: "rgba(232,232,232,0.5)",
  fontPixel: "'Press Start 2P', monospace",
  fontMono: "'Share Tech Mono', monospace",
  fontUi: "'Inter', sans-serif",
};

// ---------------------------------------------------------------------------
// Hook: Typewriter Effect
// ---------------------------------------------------------------------------
function useTypewriter(text, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);

  return { displayed, done };
}

// ---------------------------------------------------------------------------
// Main App Component
// ---------------------------------------------------------------------------
export default function App() {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { logout } = useOutletContext();
  const [swipeCount, setSwipeCount] = useState(0);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const isInitialMount = useRef(true);
  const fetchTimeoutRef = useRef(null);

  const fetchFeed = useCallback(async (isReset = false) => {
    if (isFetchingMore) return;
    setIsFetchingMore(true);
    setIsLoading(true);
    try {
      const data = await api.getFeed();
      if (data.length === 0 && !isReset) {
        setArticles([]);
      } else if (isReset) {
        setArticles(data);
      } else {
        setArticles((prev) => [...data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      if (isInitialMount.current) isInitialMount.current = false;
    }
  }, [isFetchingMore]);

  useEffect(() => { fetchFeed(true); }, []); // eslint-disable-line

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    if (articles.length === 0 && !isFetchingMore && !isInitialMount.current) {
      fetchTimeoutRef.current = setTimeout(() => fetchFeed(), 100);
    }
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [articles.length, isFetchingMore, fetchFeed]);

  const handleSwipe = async (direction, swipedArticle) => {
    const willBeEmpty = articles.length === 1;
    try {
      await api.sendSwipe(swipedArticle.id, direction === "right");
      setSwipeCount((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to send swipe:", err);
    }
    setArticles((prev) => prev.slice(0, prev.length - 1));
    if (willBeEmpty) setIsLoading(true);
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      await api.resetSwipes();
      setSwipeCount((prev) => prev + 1);
      await fetchFeed(true);
    } catch (err) {
      console.error("Failed to reset feed:", err);
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "grid",
        gridTemplateColumns: "260px 1fr 260px",
        gridTemplateRows: "56px 1fr",
        gap: 0,
        backgroundColor: C.bg,
        backgroundImage: `
          linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "32px 32px",
        overflow: "hidden",
      }}
    >
      {/* ---- Top Nav Bar ---- */}
      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(8,8,8,0.95)",
          backdropFilter: "blur(12px)",
          zIndex: 100,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 8, height: 8, borderRadius: "50%",
              background: C.orange,
              boxShadow: `0 0 8px ${C.orange}`,
            }}
          />
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.6rem", color: C.orange, letterSpacing: "0.05em" }}>
            HACKERSWIPE
          </Typography>
        </Box>

        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim }}>
          AI-POWERED HACKER NEWS READER
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Reset taste profile">
            <IconButton
              onClick={() => setIsResetModalOpen(true)}
              size="small"
              sx={{ color: C.textDim, "&:hover": { color: C.orange, background: C.orangeDim } }}
            >
              <RotateLeft fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout">
            <IconButton
              onClick={logout}
              size="small"
              sx={{ color: C.textDim, "&:hover": { color: C.orange, background: C.orangeDim } }}
            >
              <Logout fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ---- Left Stats Panel ---- */}
      <SidePanel>
        <StatsPanel swipeCount={swipeCount} />
      </SidePanel>

      {/* ---- Center Card Stack ---- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          px: 3,
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <TerminalLoader />
        ) : articles.length === 0 ? (
          <ExhaustedCard onReset={() => setIsResetModalOpen(true)} />
        ) : (
          <AnimatePresence>
            {articles.map((article, index) => (
              <NewsCard
                key={article.id}
                article={article}
                onSwipe={(dir) => handleSwipe(dir, article)}
                isTop={index === articles.length - 1}
                stackIndex={index}
                totalCards={articles.length}
              />
            ))}
          </AnimatePresence>
        )}
      </Box>

      {/* ---- Right Liked Panel ---- */}
      <SidePanel align="right">
        <LikedPanel swipeCount={swipeCount} />
      </SidePanel>

      {/* ---- Reset Modal ---- */}
      <Dialog
        open={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        PaperProps={{
          sx: {
            background: C.card,
            color: "white",
            borderRadius: "16px",
            border: `1px solid ${C.borderHot}`,
            fontFamily: C.fontUi,
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontFamily: C.fontUi, fontWeight: 700 }}>
          <WarningAmber sx={{ color: "#f39c12" }} />
          Reset Taste Profile?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: C.textDim, fontFamily: C.fontUi }}>
            This permanently deletes your swipe history. Your feed resets to random articles and your AI profile starts fresh.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setIsResetModalOpen(false)}
            sx={{ color: C.textDim, fontFamily: C.fontUi, "&:hover": { color: "white", background: "rgba(255,255,255,0.06)" } }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => { setIsResetModalOpen(false); handleReset(); }}
            variant="contained"
            sx={{ background: "#c0392b", fontFamily: C.fontUi, fontWeight: 700, "&:hover": { background: "#e74c3c" } }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Side Panel Wrapper
// ---------------------------------------------------------------------------
function SidePanel({ children, align = "left" }) {
  return (
    <Box
      sx={{
        borderRight: align === "left" ? `1px solid ${C.border}` : "none",
        borderLeft: align === "right" ? `1px solid ${C.border}` : "none",
        height: "100%",
        overflowY: "auto",
        background: C.panel,
        backdropFilter: "blur(10px)",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Stats Panel
// ---------------------------------------------------------------------------
function StatsPanel({ swipeCount }) {
  const [stats, setStats] = useState({ totalSwipes: 0, topTopics: [] });
  const isFirst = useRef(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (isFirst.current) { setLoading(true); isFirst.current = false; }
      try { const d = await api.getStats(); setStats(d); } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [swipeCount]);

  return (
    <>
      <SectionHeader icon="▸" label="MY STATS" />

      <Box>
        <Label>TOTAL SWIPES</Label>
        <Typography sx={{ fontFamily: C.fontPixel, fontSize: "1rem", color: C.orange, mt: 0.5 }}>
          {loading ? "..." : stats.totalSwipes}
        </Typography>
      </Box>

      <Box>
        <Label>TOP SOURCES</Label>
        {loading ? (
          <Mono dim>loading...</Mono>
        ) : stats.topTopics.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.75 }}>
            {stats.topTopics.map((t) => (
              <Chip
                key={t}
                label={t}
                size="small"
                sx={{
                  color: C.orange,
                  background: C.orangeDim,
                  border: `1px solid ${C.border}`,
                  fontFamily: C.fontMono,
                  fontSize: "0.7rem",
                }}
              />
            ))}
          </Box>
        ) : (
          <Mono dim>swipe right to build profile</Mono>
        )}
      </Box>

      <Box sx={{ mt: "auto" }}>
        <Mono dim>{"// swipe right = LIKE"}</Mono>
        <Mono dim>{"// swipe left = SKIP"}</Mono>
      </Box>
    </>
  );
}

// ---------------------------------------------------------------------------
// Liked Panel
// ---------------------------------------------------------------------------
function LikedPanel({ swipeCount }) {
  const [liked, setLiked] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirst = useRef(true);

  useEffect(() => {
    const fetch = async () => {
      if (isFirst.current) { setLoading(true); isFirst.current = false; }
      try { const d = await api.getLikedArticles(); setLiked(d); } catch { /* ignore */ }
      setLoading(false);
    };
    fetch();
  }, [swipeCount]);

  return (
    <>
      <SectionHeader icon="♥" label="MY LIKES" color="#ff4757" />
      {loading ? (
        <Mono dim>loading...</Mono>
      ) : liked.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {liked.map((a) => (
            <Box key={a.id}>
              <Link
                href={a.article_url}
                target="_blank"
                rel="noopener noreferrer"
                underline="none"
                sx={{
                  color: "#e8e8e8",
                  fontFamily: C.fontUi,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  "&:hover": { color: C.orange },
                  transition: "color 0.2s",
                }}
              >
                {a.title}
              </Link>
              <Mono dim style={{ fontSize: "0.65rem", marginTop: 2 }}>
                hn://hacker-news
              </Mono>
            </Box>
          ))}
        </Box>
      ) : (
        <Mono dim>swipe right on articles to save them here</Mono>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// News Card
// ---------------------------------------------------------------------------
function NewsCard({ article, onSwipe, isTop, stackIndex, totalCards }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-350, 350], [-10, 10]);
  const likeOpacity = useTransform(x, [50, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-50, -140], [0, 1]);
  const cardsFromTop = totalCards - 1 - stackIndex;

  // Typewriter for title only fires when this is the top card
  const { displayed, done } = useTypewriter(article.title, 22, isTop);

  const handleDragEnd = async (_, info) => {
    if (isExiting || !isTop) return;
    const { offset: { x: ox }, velocity: { x: vx } } = info;
    const liked = ox > 120 || vx > 600;
    const skipped = ox < -120 || vx < -600;
    if (liked) {
      setIsExiting(true);
      await controls.start({ x: 500, rotate: 10, opacity: 0, transition: { duration: 0.38, ease: "easeOut" } });
      onSwipe("right");
    } else if (skipped) {
      setIsExiting(true);
      await controls.start({ x: -500, rotate: -10, opacity: 0, transition: { duration: 0.38, ease: "easeOut" } });
      onSwipe("left");
    } else {
      await controls.start({ x: 0, rotate: 0, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  const cardWidth = 720;
  const cardHeight = 480;

  return (
    <motion.div
      layout
      initial={{ scale: 0.97, y: 10, opacity: 0.9 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      style={{
        x,
        rotate,
        position: "absolute",
        width: cardWidth,
        cursor: !isTop || isExiting ? "default" : "grab",
        zIndex: isTop ? 100 : stackIndex,
        scale: isTop ? 1 : 1 - cardsFromTop * 0.03,
        y: cardsFromTop * 8,
      }}
      drag={isTop && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: isTop && !isExiting ? "grabbing" : "default" }}
    >
      {/* Card */}
      <Box
        className="card-glow"
        sx={{
          width: cardWidth,
          height: cardHeight,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: "20px",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: article.image_url ? "1fr 1fr" : "1fr",
          position: "relative",
        }}
      >
        {/* === Left: Image === */}
        {article.image_url && (
          <Box sx={{ position: "relative", overflow: "hidden" }}>
            <Box
              component="img"
              src={article.image_url}
              alt={article.title}
              onError={(e) => { e.target.parentElement.style.display = "none"; }}
              sx={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
            />
            {/* Gradient overlay on image */}
            <Box sx={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent 60%, rgba(13,13,13,0.95) 100%)",
            }} />
            <Box sx={{
              position: "absolute", inset: 0,
              background: "linear-gradient(0deg, rgba(13,13,13,0.6) 0%, transparent 60%)",
            }} />
          </Box>
        )}

        {/* === Right (or full): Content === */}
        <Box sx={{ p: "32px 36px", display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
          {/* Top: meta */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, flexShrink: 0, boxShadow: `0 0 6px ${C.orange}` }} />
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.orange, letterSpacing: "0.08em" }}>
                HACKER NEWS
              </Typography>
            </Box>

            {/* Pixel font typewriter title */}
            <Typography
              sx={{
                fontFamily: C.fontPixel,
                fontSize: article.image_url ? "0.72rem" : "0.9rem",
                color: "#f5f5f5",
                lineHeight: 1.8,
                mb: 2.5,
                minHeight: article.image_url ? "5rem" : "8rem",
              }}
            >
              {displayed}
              {!done && <span className="cursor-blink" />}
            </Typography>

            {/* Description: only show when typing is done */}
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Typography
                  sx={{
                    fontFamily: C.fontUi,
                    fontSize: "0.88rem",
                    color: C.textDim,
                    lineHeight: 1.7,
                    display: "-webkit-box",
                    WebkitLineClamp: article.image_url ? 3 : 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {article.description}
                </Typography>
              </motion.div>
            )}
          </Box>

          {/* Bottom: action button area */}
          {done && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 3 }}>
                <Button
                  component="a"
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  endIcon={<OpenInNew sx={{ fontSize: "0.9rem !important" }} />}
                  sx={{
                    fontFamily: C.fontMono,
                    fontSize: "0.75rem",
                    color: C.orange,
                    borderColor: C.border,
                    borderRadius: "8px",
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    "&:hover": { borderColor: C.orange, background: C.orangeDim },
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  READ ARTICLE
                </Button>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <Mono dim style={{ fontSize: "0.65rem" }}>or swipe</Mono>
                  <ActionHint icon={<ThumbDown sx={{ fontSize: 14 }} />} label="SKIP" color="rgba(255,70,70,0.8)" />
                  <ActionHint icon={<ThumbUp sx={{ fontSize: 14 }} />} label="LIKE" color="rgba(80,220,80,0.8)" />
                </Box>
              </Box>
            </motion.div>
          )}
        </Box>

        {/* === Swipe Feedback Overlays === */}
        <motion.div style={{ opacity: likeOpacity, position: "absolute", top: 24, right: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{
            border: "3px solid #4ade80", borderRadius: "8px", px: 2, py: 0.5,
            fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#4ade80",
            transform: "rotate(12deg)",
          }}>
            LIKE
          </Box>
        </motion.div>
        <motion.div style={{ opacity: skipOpacity, position: "absolute", top: 24, left: 24, pointerEvents: "none", zIndex: 10 }}>
          <Box sx={{
            border: "3px solid #f87171", borderRadius: "8px", px: 2, py: 0.5,
            fontFamily: C.fontPixel, fontSize: "0.7rem", color: "#f87171",
            transform: "rotate(-12deg)",
          }}>
            SKIP
          </Box>
        </motion.div>

        {/* Corner decoration */}
        <Box sx={{ position: "absolute", bottom: 16, right: 20, fontFamily: C.fontMono, fontSize: "0.6rem", color: C.border }}>
          {`[${stackIndex + 1}]`}
        </Box>
      </Box>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------
function TerminalLoader() {
  const [dots, setDots] = useState("_");
  useEffect(() => {
    const id = setInterval(() => setDots((d) => d.length >= 3 ? "_" : d + "_"), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.orange, mb: 2, letterSpacing: "0.1em" }}>
        LOADING FEED
      </Typography>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "1rem", color: C.textDim }}>
        {`> fetching top stories${dots}`}
      </Typography>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Exhausted Card
// ---------------------------------------------------------------------------
function ExhaustedCard({ onReset }) {
  return (
    <Box sx={{ textAlign: "center", maxWidth: 400 }}>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.65rem", color: C.textDim, mb: 3, lineHeight: 2 }}>
        FEED EXHAUSTED
      </Typography>
      <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, mb: 4, fontSize: "0.9rem" }}>
        {">"} You've seen all available stories.
      </Typography>
      <Button
        variant="outlined"
        onClick={onReset}
        sx={{ fontFamily: C.fontMono, color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim } }}
      >
        RESET &amp; RELOAD
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Small Reusable Components
// ---------------------------------------------------------------------------
function SectionHeader({ icon, label, color = C.orange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, borderBottom: `1px solid ${C.border}`, pb: 1.5 }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color }}>
        {icon}
      </Typography>
      <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.5rem", color, letterSpacing: "0.08em" }}>
        {label}
      </Typography>
    </Box>
  );
}

function Label({ children }) {
  return (
    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.5 }}>
      {children}
    </Typography>
  );
}

function Mono({ children, dim, style }) {
  return (
    <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: dim ? C.textDim : "#e8e8e8", lineHeight: 1.6, ...style }}>
      {children}
    </Typography>
  );
}

function ActionHint({ icon, label, color }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color, fontFamily: C.fontMono, fontSize: "0.6rem" }}>
      {icon}
      <span>{label}</span>
    </Box>
  );
}