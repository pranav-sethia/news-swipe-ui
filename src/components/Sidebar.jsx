import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Chip, Link, Tooltip } from "@mui/material";
import { WarningAmber, OpenInNew, ArrowForward, ArrowBack, Search, Visibility, Settings as SettingsIcon, Bookmark, Psychology, Undo, Delete } from "@mui/icons-material";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import * as api from "../api.js";
import { C } from "../theme.js";
import { MagneticBox, SectionHeader, ShortcutRow, Label, Mono } from "./SharedComponents.jsx";

export function ExpandableSidebar({ swipeCount, onUnliked, handleReset, setShowOnboarding }) {
  const [activeTab, setActiveTab] = useState(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTab && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab]);

  const toggleTab = (tab) => {
    setActiveTab(prev => prev === tab ? null : tab);
  };

  const navItems = [
    { id: 'taste', icon: <Psychology />, label: 'Taste Profile' },
    { id: 'saved', icon: <Bookmark />, label: 'Saved Library' },
  ];

  return (
    <Box sx={{ position: "fixed", top: 0, bottom: 0, left: 32, display: "flex", alignItems: "center", zIndex: 9999, pointerEvents: "none" }}>
      <motion.div
        ref={sidebarRef}
        layout
        style={{
          pointerEvents: "auto",
          height: activeTab ? "80vh" : "auto",
          maxHeight: "800px",
          background: "linear-gradient(135deg, rgba(20,20,20,0.7) 0%, rgba(10,10,10,0.8) 100%)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "28px",
          display: "flex",
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)",
        }}
      initial={{ width: 72 }}
      animate={{ width: activeTab ? 380 : 72 }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
    >
      {/* Icon Column */}
      <Box sx={{ 
        width: 72, minWidth: 72, display: "flex", flexDirection: "column", 
        alignItems: "center", py: 3, position: "relative"
      }}>
        
        {/* Animated Brand Dot */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 16px ${C.orange}`, mb: 3 }} />
        </motion.div>

        {/* Top Nav Items */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", alignItems: "center" }}>
          {navItems.map(item => (
            <Tooltip key={item.id} title={item.label} placement="right">
              <Box sx={{ position: "relative" }}>
                {activeTab === item.id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    style={{
                      position: "absolute",
                      inset: -4,
                      background: "rgba(255,102,0,0.15)",
                      borderRadius: "16px",
                      border: `1px solid rgba(255,102,0,0.3)`,
                      boxShadow: `0 0 20px rgba(255,102,0,0.1)`,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <MagneticBox onClick={() => toggleTab(item.id)}>
                  <IconButton sx={{ 
                    position: "relative", zIndex: 1,
                    color: activeTab === item.id ? C.orange : C.textDim, 
                    transition: "all 0.3s ease",
                    "&:hover": { color: activeTab === item.id ? C.orange : "#fff" }
                  }}>
                    {item.icon}
                  </IconButton>
                </MagneticBox>
              </Box>
            </Tooltip>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Settings Icon (Bottom) */}
        <Tooltip title="Settings" placement="right">
          <Box sx={{ position: "relative", mt: activeTab ? 0 : 3 }}>
            {activeTab === 'settings' && (
              <motion.div
                layoutId="activeTabIndicator"
                style={{
                  position: "absolute",
                  inset: -4,
                  background: "rgba(255,102,0,0.15)",
                  borderRadius: "16px",
                  border: `1px solid rgba(255,102,0,0.3)`,
                  boxShadow: `0 0 20px rgba(255,102,0,0.1)`,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <MagneticBox onClick={() => toggleTab('settings')}>
              <IconButton sx={{ 
                position: "relative", zIndex: 1,
                color: activeTab === 'settings' ? C.orange : C.textDim, 
                transition: "all 0.3s ease",
                "&:hover": { color: activeTab === 'settings' ? C.orange : "#fff" }
              }}>
                <SettingsIcon />
              </IconButton>
            </MagneticBox>
          </Box>
        </Tooltip>
      </Box>

      {/* Smooth Fade Divider */}
      <AnimatePresence>
        {activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: "1px", height: "100%", background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent)" }}
          />
        )}
      </AnimatePresence>

      {/* Content Area */}
      <AnimatePresence>
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            transition={{ delay: 0.05, duration: 0.3, ease: "easeOut" }}
            style={{ width: "307px", height: "100%", overflowY: "auto", padding: "32px 24px", position: "relative" }}
          >
            <IconButton 
              onClick={() => setActiveTab(null)} 
              sx={{ position: "absolute", top: 20, right: 16, color: C.textDim, "&:hover": { color: "#fff", background: "rgba(255,255,255,0.1)" } }}
            >
              <ArrowBack sx={{ fontSize: 18 }} />
            </IconButton>

            {activeTab === 'taste' && <TasteProfilePanel swipeCount={swipeCount} />}
            {activeTab === 'saved' && <LikedPanel swipeCount={swipeCount} onUnliked={onUnliked} />}
            {activeTab === 'settings' && (
              <Box>
                <SectionHeader icon={<SettingsIcon sx={{ fontSize: 16 }} />} label="SETTINGS" />
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, mt: 3, mb: 1 }}>AI Profile Management</Typography>
                <Button fullWidth variant="outlined" onClick={() => handleReset()} sx={{ color: "#f87171", borderColor: "rgba(248,113,113,0.3)", "&:hover": { borderColor: "#f87171", background: "rgba(248,113,113,0.1)" }, mb: 3 }}>
                  Nuclear Reset
                </Button>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, mb: 1 }}>App Interface</Typography>
                <Button fullWidth variant="outlined" onClick={() => setShowOnboarding(true)} sx={{ color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim }, mb: 3 }}>
                  Replay Tutorial
                </Button>

                {/* Keyboard shortcuts */}
                <Box sx={{ mt: 2, pt: 3, borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                  <Label>KEYBOARD SHORTCUTS</Label>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5 }}>
                    <ShortcutRow keys={["←"]} label="Dislike story" code="ArrowLeft" />
                    <ShortcutRow keys={["↑"]} label="Skip neutrally" code="ArrowUp" />
                    <ShortcutRow keys={["→"]} label="Like story" code="ArrowRight" />
                    <ShortcutRow keys={["Z"]} label="Undo last swipe" code="KeyZ" />
                    <ShortcutRow keys={["C"]} label="Read comments" code="KeyC" />
                    <ShortcutRow keys={["ENT"]} label="Open article" code="Enter" />
                  </Box>
                </Box>
              </Box>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </Box>
  );
}

export function TasteProfilePanel({ swipeCount }) {
  const [profile, setProfile] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.getTasteProfile().then(data => {
      setProfile(data.profile || []);
      setTotal(data.totalLiked || 0);
    }).catch(console.error);
  }, [swipeCount]);

  const colors = ["#00ffcc", "#ff6600", "#9b59b6", "#3498db", "#e74c3c"];

  return (
    <>
      <SectionHeader icon={<Psychology sx={{ fontSize: 16 }} />} label="TASTE PROFILE" />
      
      {total === 0 ? (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim }}>
            {"// Swipe right to build your profile"}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 3, overflowY: "auto", pr: 1 }}>
          {profile.map((p, i) => {
            const radius = 22;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (p.percentage / 100) * circumference;
            const color = colors[i % colors.length];

            return (
              <Box key={p.category} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                <Box sx={{ position: "relative", width: 50, height: 50 }}>
                  <svg width="50" height="50">
                    <circle cx="25" cy="25" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                    <motion.circle 
                      cx="25" cy="25" r={radius} 
                      stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                    />
                  </svg>
                  <Typography sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.fontMono, fontSize: "0.6rem", color: "#fff" }}>
                    {p.percentage}%
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.8rem", color: "#e8e8e8", fontWeight: 600 }}>{p.category.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\s*/g, '')}</Typography>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>{p.count} saved</Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

    </>
  );
}

export function LikedPanel({ swipeCount, onUnliked }) {
  const [liked, setLiked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const filtered = liked.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SectionHeader icon={<Bookmark sx={{ fontSize: 16 }} />} label={`MY LIKES (${liked.length})`} color="#ff4757" />
      <Box sx={{ mt: 1.5, mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", px: 1, py: 0.5 }}>
          <Search sx={{ fontSize: 16, color: C.textDim, mr: 1 }} />
          <input 
            type="text" 
            placeholder="Search saved..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: C.fontUi, fontSize: "0.8rem", width: "100%" }}
          />
        </Box>
      </Box>
      {loading ? <Mono dim>loading...</Mono> : filtered.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map((a) => {
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
      ) : <Mono dim>{liked.length === 0 ? "swipe right to save stories here" : "no results match your search"}</Mono>}
    </>
  );
}

