import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Paper,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
} from "@mui/material";
import { 
  RotateLeft, 
  Logout, 
  Link as LinkIcon,
  BarChart,
  WarningAmber,
  Favorite,
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

// --- Main App Component ---
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
    // Prevent multiple simultaneous fetches
    if (isFetchingMore) {
      console.log("Already fetching, skipping...");
      return;
    }
    
    console.log(`🔄 Starting fetch (isReset: ${isReset})`);
    setIsFetchingMore(true);
    setIsLoading(true);
    
    try {
      const data = await api.getFeed();
      console.log(`✅ Received ${data.length} articles from API`);
      
      if (data.length === 0 && !isReset) {
        console.log("❌ Feed exhausted. No new articles found.");
        setArticles([]);
      } else if (isReset) {
        console.log(`🔄 Reset: Loaded ${data.length} new articles`);
        setArticles(data);
      } else {
        console.log(`➕ Appending ${data.length} new articles to stack`);
        setArticles((prev) => [...data, ...prev]);
      }
    } catch (error) {
      console.error("❌ Failed to fetch feed:", error);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      if (isInitialMount.current) {
        isInitialMount.current = false;
      }
    }
  }, [isFetchingMore]);

  // Initial fetch on mount only
  useEffect(() => {
    console.log("🚀 Initial mount - fetching feed");
    fetchFeed(true);
  }, []); 

  // Auto-fetch when stack becomes empty
  useEffect(() => {
    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Only trigger if:
    // 1. Stack is empty
    // 2. Not currently fetching
    // 3. Not on initial mount
    if (articles.length === 0 && !isFetchingMore && !isInitialMount.current) {
      console.log("📭 Stack is empty! Scheduling auto-fetch...");
      
      // Use a small timeout to ensure state has settled
      fetchTimeoutRef.current = setTimeout(() => {
        console.log("🎯 Executing auto-fetch now");
        fetchFeed();
      }, 100);
    }

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [articles.length, isFetchingMore, fetchFeed]);

  const handleSwipe = async (direction, swipedArticle) => {
    console.log(`👆 Swiped ${direction} on: ${swipedArticle.title}`);
    
    // Calculate if this is the last card before updating state
    const willBeEmpty = articles.length === 1;
    
    try {
      // Send swipe to API
      await api.sendSwipe(swipedArticle.id, direction === "right");
      console.log(`✅ Sent swipe to API for article ${swipedArticle.id}`);
      setSwipeCount(prev => prev + 1); 
    } catch (error) {
      console.error("❌ Failed to send swipe:", error);
    }
    
    // Remove the card from the stack
    setArticles((prev) => {
      const newStack = prev.slice(0, prev.length - 1);
      console.log(`📚 Stack after swipe: ${newStack.length} articles remaining`);
      return newStack;
    });
    
    // If this was the last card, show loading state immediately
    // The useEffect will trigger the fetch
    if (willBeEmpty) {
      console.log("🎴 Last card swiped! Stack will be empty.");
      setIsLoading(true);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      await api.resetSwipes();
      setSwipeCount(prev => prev + 1);
      await fetchFeed(true);
    } catch (error) {
      console.error("Failed to reset feed:", error);
      setIsLoading(false);
    }
  };
  
  const handleConfirmReset = () => {
    setIsResetModalOpen(false);
    handleReset();
  };

  const renderContent = () => {
    // Show spinner when loading
    if (isLoading) {
      console.log("🔄 Rendering loading spinner");
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "550px",
            color: "white",
            width: 400,
          }}
        >
          <CircularProgress color="inherit" />
        </Box>
      );
    }

    // Show "no more news" only when truly exhausted
    if (articles.length === 0 && !isFetchingMore) {
      console.log("📭 Rendering 'No More News' card");
      return (
        <Card
          sx={{
            background: "rgba(20, 20, 20, 0.85)",
            color: "white",
            borderRadius: "20px",
            boxShadow: "0px 0px 30px rgba(0,255,255,0.12)",
            backdropFilter: "blur(10px)",
            width: "400px",
            height: "550px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            No More News
          </Typography>
          <Typography sx={{ color: "rgba(200,200,200,0.9)", mb: 3 }}>
            You've seen all available articles.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setIsResetModalOpen(true)}
            sx={{
              background: "rgba(0,255,255,0.15)",
              "&:hover": { background: "rgba(0,255,255,0.25)" },
            }}
          >
            Reset Swipes & Reload
          </Button>
        </Card>
      );
    }

    // Render the card stack
    console.log(`🎴 Rendering ${articles.length} cards`);
    return (
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
    );
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "radial-gradient(circle at 30% 50%, #050505, #000)",
      }}
    >
      <StarsBackground />

      <UserStats swipeCount={swipeCount} />

      <Box sx={{ position: 'relative', width: 420, height: 550, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {renderContent()}
      </Box>
      
      <LikedArticlesPanel swipeCount={swipeCount} />

      <Box
        sx={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 200,
          display: 'flex',
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => setIsResetModalOpen(true)}
          sx={{
            color: "white",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            },
          }}
          title="Reset Swipes & Reload"
        >
          <RotateLeft />
        </IconButton>
        
        <IconButton
          onClick={logout}
          sx={{
            color: "white",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            },
          }}
          title="Logout"
        >
          <Logout />
        </IconButton>
      </Box>
      
      <Dialog
        open={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        PaperProps={{
          sx: {
            background: 'rgba(30, 30, 30, 0.9)',
            color: 'white',
            borderRadius: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
          <WarningAmber sx={{ mr: 1, color: '#f39c12' }} />
          Reset Taste Profile?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(200, 200, 200, 0.9)' }}>
            This will permanently delete all of your swipe history. Your feed will be reset to random articles.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button 
            onClick={() => setIsResetModalOpen(false)} 
            sx={{ 
              color: 'white',
              '&:hover': { background: 'rgba(255, 255, 255, 0.1)'} 
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmReset} 
            variant="contained"
            color="error"
            autoFocus
            sx={{
              background: '#c0392b',
              '&:hover': { background: '#e74c3c' }
            }}
          >
            Confirm Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// --- User Stats Component ---
function UserStats({ swipeCount }) {
  const [stats, setStats] = useState({ totalSwipes: 0, topTopics: [] });
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (isFirstLoad.current) {
        setIsLoading(true);
        isFirstLoad.current = false;
      }
      
      try {
        const data = await api.getStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, [swipeCount]);

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        left: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
        minHeight: '240px',
        background: 'rgba(20, 20, 20, 0.65)',
        color: 'white',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        boxShadow: '0px 0px 30px rgba(0,255,255,0.12)',
        display: { xs: 'none', lg: 'block' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <BarChart sx={{ mr: 1.5, color: 'rgba(0,255,255,0.7)' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          My Stats
        </Typography>
      </Box>

      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
        Top Liked Sources:
      </Typography>
      
      {isLoading ? (
        <Typography variant="body2" sx={{ color: 'rgba(200,200,200,0.9)', mb: 3 }}>
          Loading...
        </Typography>
      ) : stats.topTopics.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {stats.topTopics.map((topic) => (
            <Chip 
              key={topic} 
              label={topic} 
              size="small" 
              sx={{ 
                color: 'white', 
                background: 'rgba(0,255,255,0.15)' 
              }} 
            />
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'rgba(200,200,200,0.9)', mb: 3, fontStyle: 'italic' }}>
          Swipe right on articles to see your top sources!
        </Typography>
      )}
      
      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
        Total Swipes:
      </Typography>
      
      {isLoading ? (
        <Typography variant="body2" sx={{ color: 'rgba(200,200,200,0.9)' }}>
          Loading...
        </Typography>
      ) : (
        <Typography variant="h4" sx={{ color: 'rgba(0,255,255,0.7)', fontWeight: 'bold' }}>
          {stats.totalSwipes}
        </Typography>
      )}
    </Paper>
  );
}

// --- Liked Articles Panel Component ---
function LikedArticlesPanel({ swipeCount }) {
  const [liked, setLiked] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const fetchLiked = async () => {
      if (isFirstLoad.current) {
        setIsLoading(true);
        isFirstLoad.current = false;
      }
      try {
        const data = await api.getLikedArticles();
        setLiked(data);
      } catch (error) {
        console.error("Failed to fetch liked articles:", error);
      }
      setIsLoading(false);
    };

    fetchLiked();
  }, [swipeCount]);

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'absolute',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 280,
        height: 'calc(100vh - 160px)',
        maxHeight: '600px',
        minHeight: '240px',
        background: 'rgba(20, 20, 20, 0.65)',
        color: 'white',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        padding: '24px',
        boxShadow: '0px 0px 30px rgba(0,255,255,0.12)',
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Favorite sx={{ mr: 1.5, color: 'rgba(255, 82, 82, 0.8)' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          My Likes
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Typography variant="body2" sx={{ color: 'rgba(200,200,200,0.9)' }}>
            Loading...
          </Typography>
        ) : liked.length > 0 ? (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {liked.map((article) => (
              <Box component="li" key={article.id} sx={{ mb: 2 }}>
                <Link
                  href={article.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{
                    color: 'rgba(200, 200, 200, 0.9)',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    "&:hover": { color: 'white' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {article.title}
                </Link>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(200, 200, 200, 0.6)', mt: 0.5 }}>
                  {article.source_name}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'rgba(200,200,200,0.9)', fontStyle: 'italic' }}>
            Swipe right on articles to save them here!
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

// --- News Card Component ---
function NewsCard({ article, onSwipe, isTop, stackIndex, totalCards }) {
  const [isExiting, setIsExiting] = useState(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-12, 12]);
  const opacity = useTransform(x, [-300, -150, 0, 150, 300], [0.4, 1, 1, 1, 0.4]);
  const likeOpacity = useTransform(x, [60, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-60, -150], [0, 1]);
  const threshold = 120;
  const cardsFromTop = totalCards - 1 - stackIndex;

  const handleDragEnd = async (_, info) => {
    if (isExiting || !isTop) return;
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const shouldLike = offsetX > threshold || velocityX > 600;
    const shouldNope = offsetX < -threshold || velocityX < -600;

    if (shouldLike) {
      setIsExiting(true);
      await controls.start({
        x: 280,
        rotate: 8,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.4, ease: "easeOut" },
      });
      onSwipe("right");
    } else if (shouldNope) {
      setIsExiting(true);
      await controls.start({
        x: -280,
        rotate: -8,
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.4, ease: "easeOut" },
      });
      onSwipe("left");
    } else {
      await controls.start({
        x: 0,
        rotate: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 420, damping: 35 },
      });
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.98, y: 12, opacity: 1 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      style={{
        x,
        rotate,
        opacity,
        position: "absolute",
        width: 420,
        cursor: !isTop || isExiting ? "default" : "grab",
        display: "flex",
        justifyContent: "center",
        scale: isTop ? 1 : 1 - cardsFromTop * 0.05,
        y: 0,
        zIndex: isTop ? 100 : stackIndex,
      }}
      drag={isTop && !isExiting ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      whileTap={{ cursor: isTop && !isExiting ? "grabbing" : "default" }}
    >
      <Card
        sx={{
          background: "rgba(20, 20, 20, 0.85)",
          color: "white",
          borderRadius: "20px",
          boxShadow: "0px 0px 30px rgba(0,255,255,0.12)",
          backdropFilter: "blur(10px)",
          overflow: "hidden",
          width: "400px",
          height: "550px",
        }}
      >
        <CardMedia
          component="img"
          height="280"
          image={article.image_url || 'https://placehold.co/600x400/333/FFF?text=No+Image'}
          alt={article.title}
          onError={(e) => {
            e.target.onerror = null; 
            e.target.src = 'https://placehold.co/600x400/333/FFF?text=Image+Not+Available';
          }}
          sx={{ 
            pointerEvents: 'none',
            objectFit: 'cover'
          }}
        />
        
        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            height: "calc(550px - 280px)",
            padding: '16px 24px'
          }}
        >
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {article.title}
          </Typography>
          <Typography
            variant="body2"
            sx={{ 
              color: "rgba(200,200,200,0.9)", 
              mt: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: '4',
              WebkitBoxOrient: 'vertical',
            }} 
          >
            {article.description}
          </Typography>

          <Box sx={{ pt: 2, pointerEvents: 'auto' }}> 
            <Button
              variant="outlined"
              size="small"
              startIcon={<LinkIcon />}
              href={article.article_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'rgba(0,255,255,0.7)',
                borderColor: 'rgba(0,255,255,0.3)',
                textTransform: 'none',
                "&:hover": {
                  background: 'rgba(0,255,255,0.1)',
                  borderColor: 'rgba(0,255,255,0.7)',
                }
              }}
            >
              Read Full Article
            </Button>
          </Box>
        </CardContent>
      </Card>
      
      {/* Like/Dislike Emojis */}
      <motion.div
        initial={{ opacity: 0 }}
        style={{
          position: "absolute",
          top: "18%",
          left: 18,
          color: "#f87171",
          fontSize: "2.6rem",
          fontWeight: "700",
          pointerEvents: "none",
          opacity: nopeOpacity,
          transform: "translateY(-10px)",
        }}
        animate={{
          y: isExiting ? -20 : 0,
          transition: { duration: 0.25, ease: "easeOut" },
        }}
      >
        ❌
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        style={{
          position: "absolute",
          top: "18%",
          right: 18,
          color: "#4ade80",
          fontSize: "2.6rem",
          fontWeight: "700",
          pointerEvents: "none",
          opacity: likeOpacity,
          transform: "translateY(-10px)",
        }}
        animate={{
          y: isExiting ? -20 : 0,
          transition: { duration: 0.25, ease: "easeOut" },
        }}
      >
        ❤️
      </motion.div>
    </motion.div>
  );
}

// --- Stars Background Component ---
function StarsBackground() {
  const stars = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 100; i++) {
      arr.push({
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }
    return arr;
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
      }}
    >
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: "white",
            borderRadius: "50%",
            opacity: s.opacity,
            boxShadow: `0 0 ${s.size * 2}px white`,
          }}
        />
      ))}
    </div>
  );
}