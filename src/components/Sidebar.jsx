import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, IconButton, Link, Tooltip } from "@mui/material";
import {
  ArrowBack, Search, Visibility, Settings as SettingsIcon, Bookmark, Psychology,
  Delete, PersonOutline, Person, LocalFireDepartment, Lock,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import * as api from "../api.js";
import { C, CATEGORY_COLORS, FALLBACK_HUE_SHIFTS } from "../theme.js";
import { EASE } from "../motion.js";
import { MagneticBox, SectionHeader, ShortcutRow, Label, Mono } from "./SharedComponents.jsx";

const ARCHETYPES = {
  "Software Engineering": { title: "The Builder", body: "You read for the how, not just the what. Always chasing the cleaner implementation." },
  "Hardware & Systems": { title: "The Systems Thinker", body: "You care what's actually happening under the hood, all the way down to the silicon." },
  "Artificial Intelligence": { title: "The AI Native", body: "You're tracking the frontier in real time, and you probably saw this coming." },
  "Startups & VC": { title: "The Founder's Mind", body: "You read the news like a market. Every story is a signal." },
  "Cybersecurity": { title: "The Skeptic", body: "You assume it's broken until proven otherwise. Usually you're right." },
  "Business & Finance": { title: "The Operator", body: "You want to know who's really making money and how the deal actually works." },
  "Science & Space": { title: "The Explorer", body: "Rockets, biotech, physics. If it pushes a frontier, you're reading it." },
  "Design & UI/UX": { title: "The Craftsperson", body: "You notice the details everyone else scrolls past." },
  "Other": { title: "The Wanderer", body: "Your taste doesn't fit a box yet, and that's fine." },
};
const CATEGORY_ORDER = Object.keys(ARCHETYPES);
const STREAK_TIERS = [
  { days: 3, name: "Warming Up" },
  { days: 7, name: "Week One" },
  { days: 14, name: "Two Week Club" },
  { days: 30, name: "Monthly Regular" },
  { days: 60, name: "Two Month Streak" },
  { days: 100, name: "Centurion" },
  { days: 365, name: "Year Round" },
];
const MILESTONES = [10, 25, 50, 100, 250, 500];
const ARCHETYPE_UNLOCK_THRESHOLD = 5;

function nextTier(streak) {
  return STREAK_TIERS.find((t) => t.days > streak) || null;
}

function formatCountdown(ms) {
  if (ms == null) return null;
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

export function ExpandableSidebar({ swipeCount, onUnliked, onRequestReset, onRequestDeleteAccount, setShowOnboarding, onLogout, onActiveTabChange }) {
  const [activeTab, setActiveTab] = useState(null);
  const [renderedTab, setRenderedTab] = useState(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const closeTimeoutRef = useRef(null);
  const sidebarRef = useRef(null);
  const iconColRef = useRef(null);
  const navigate = useNavigate();

  // Measure the icon column's real content height instead of hand-calculating
  // a pixel guess, so the collapsed dock can't drift out of proportion as nav
  // items or badges change. Kept as a number (not "auto") so it stays
  // transitionable when the dock expands/collapses.
  const [collapsedHeight, setCollapsedHeight] = useState(280);
  useEffect(() => {
    if (!iconColRef.current) return;
    const el = iconColRef.current;
    const measure = () => setCollapsedHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeTab) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      setRenderedTab(activeTab);
      setPanelMounted(true);
    } else if (panelMounted) {
      closeTimeoutRef.current = setTimeout(() => setPanelMounted(false), 220);
    }
    return () => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Lets the parent know whether any panel is open, so it can suppress the
  // global swipe-card keyboard shortcuts while the sidebar has focus - those
  // shortcuts used to fire straight through an open panel with no visual
  // feedback (e.g. arrow keys silently swiping the card hidden behind it).
  useEffect(() => {
    onActiveTabChange?.(!!activeTab);
  }, [activeTab, onActiveTabChange]);

  const token = localStorage.getItem("token");
  const decoded = token ? decodeToken(token) : null;
  const user = decoded?.user;
  const isGuest = !!user?.isGuest;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeTab && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeTab]);

  const toggleTab = (tab) => setActiveTab((prev) => (prev === tab ? null : tab));

  const [streak, setStreak] = useState(0);
  useEffect(() => {
    api.getDetailedStats().then((d) => setStreak(d.streak || 0)).catch(() => {});
  }, [swipeCount]);

  const navItems = [
    { id: "profile", icon: isGuest ? <PersonOutline /> : <Person />, label: isGuest ? "Profile (Guest)" : "Profile", badge: streak },
    { id: "saved", icon: <Bookmark />, label: "Saved" },
    { id: "settings", icon: <SettingsIcon />, label: "Settings" },
  ];

  return (
    <Box sx={{ position: "fixed", top: 0, bottom: 0, left: 32, display: "flex", alignItems: "center", zIndex: 9999, pointerEvents: "none" }}>
      <Box
        ref={sidebarRef}
        sx={{
          pointerEvents: "auto",
          maxHeight: "800px",
          background: "linear-gradient(135deg, rgba(20,20,20,0.7) 0%, rgba(10,10,10,0.8) 100%)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "28px",
          display: "flex",
          overflow: "hidden",
          boxShadow: "0 30px 60px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.08)",
          width: activeTab ? 420 : 72,
          height: activeTab ? "80vh" : `${collapsedHeight}px`,
          transition: `width 420ms ${EASE.decisive}, height 420ms ${EASE.decisive}`,
        }}
      >
        {/* Icon Column */}
        <Box data-tour="sidebar" sx={{ width: 72, minWidth: 72, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          {/* Ref'd on this inner wrapper, not the icon column itself: the
              icon column is a flex item of the row-direction sidebar box and
              stretches to fill its height by default, which would make a
              measurement of it circular (it'd just report whatever height
              the sidebar currently has). This wrapper's height stays purely
              content-driven regardless of that. */}
          <Box ref={iconColRef} sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: "50%", background: C.orange, boxShadow: `0 0 16px ${C.orange}`, mb: 3,
            animation: "brandPulse 2s ease-in-out infinite",
          }} />

          <Box sx={{ display: "flex", flexDirection: "column", width: "100%", alignItems: "center" }}>
            {navItems.map((item, index) => {
              const isActive = activeTab === item.id;
              return (
                <Tooltip key={item.id} title={item.label} placement="right">
                  <Box sx={{ position: "relative", mb: index !== navItems.length - 1 ? 2 : 0 }}>
                    <MagneticBox onClick={() => toggleTab(item.id)}>
                      <IconButton sx={{
                        position: "relative", zIndex: 1,
                        color: isActive ? C.orange : C.textDim,
                        background: isActive ? "rgba(255,102,0,0.15)" : "transparent",
                        border: `1px solid ${isActive ? "rgba(255,102,0,0.3)" : "transparent"}`,
                        boxShadow: isActive ? "0 0 20px rgba(255,102,0,0.1)" : "none",
                        transition: `all 250ms ${EASE.standard}`,
                        "&:hover": { color: isActive ? C.orange : "#fff" },
                      }}>
                        {item.icon}
                      </IconButton>
                    </MagneticBox>
                    {!!item.badge && (
                      <Box sx={{
                        position: "absolute", bottom: -2, right: -2, display: "flex", alignItems: "center", gap: "1px",
                        background: `linear-gradient(135deg, ${C.orange}, #ff8c00)`,
                        borderRadius: "999px", px: "5px", py: "1px",
                        boxShadow: "0 0 8px rgba(255,102,0,0.4)",
                        pointerEvents: "none",
                      }}>
                        <LocalFireDepartment sx={{ fontSize: 9, color: "#000" }} />
                        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.55rem", color: "#000", fontWeight: 700, lineHeight: 1 }}>{item.badge}</Typography>
                      </Box>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
          </Box>
        </Box>

        {/* Divider */}
        <Box sx={{
          width: "1px", height: "100%", flexShrink: 0,
          background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 80%, transparent)",
          opacity: activeTab ? 1 : 0,
          transition: `opacity 200ms ${EASE.standard}`,
        }} />

        {/* Content Area */}
        {panelMounted && (
          <Box sx={{
            width: "347px", height: "100%", overflowY: "auto", overflowX: "hidden", padding: "32px 24px", position: "relative",
            opacity: activeTab ? 1 : 0,
            transform: activeTab ? "translateX(0)" : "translateX(-10px)",
            filter: activeTab ? "blur(0px)" : "blur(4px)",
            transition: activeTab
              ? `opacity 300ms ${EASE.standard} 100ms, transform 300ms ${EASE.standard} 100ms, filter 300ms ${EASE.standard} 100ms`
              : `opacity 200ms ease-in, transform 200ms ease-in, filter 200ms ease-in`,
          }}>
            <IconButton
              onClick={() => setActiveTab(null)}
              sx={{ position: "absolute", top: 20, right: 16, color: C.textDim, "&:hover": { color: "#fff", background: "rgba(255,255,255,0.1)" } }}
            >
              <ArrowBack sx={{ fontSize: 18 }} />
            </IconButton>

            {renderedTab === "profile" && <ProfilePanel swipeCount={swipeCount} user={user} isGuest={isGuest} token={token} navigate={navigate} onLogout={onLogout} />}
            {renderedTab === "saved" && <SavedPanel swipeCount={swipeCount} onUnliked={onUnliked} />}
            {renderedTab === "settings" && (
              <Box>
                <SectionHeader icon={<SettingsIcon sx={{ fontSize: 16 }} />} label="SETTINGS" />

                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.8rem", color: C.textDim, mt: 3, mb: 1 }}>Interface</Typography>
                <Button fullWidth variant="outlined" onClick={() => setShowOnboarding(true)} sx={{ color: C.orange, borderColor: C.border, "&:hover": { borderColor: C.orange, background: C.orangeDim }, mb: 3 }}>
                  Replay Tutorial
                </Button>

                <Box sx={{ mt: 1, pt: 2.5, borderTop: `1px solid rgba(248,113,113,0.15)` }}>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: "rgba(248,113,113,0.7)", letterSpacing: "0.1em", mb: 1.5 }}>DANGER ZONE</Typography>
                  <Button fullWidth variant="outlined" onClick={() => onRequestReset()} sx={{ color: C.error, borderColor: "rgba(248,113,113,0.3)", "&:hover": { borderColor: C.error, background: "rgba(248,113,113,0.1)" } }}>
                    Reset Taste Profile
                  </Button>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim, mt: 1, mb: 2 }}>
                    Deletes your swipe history and starts your feed over. This can't be undone.
                  </Typography>
                  <Button fullWidth variant="outlined" onClick={() => onRequestDeleteAccount()} sx={{ color: C.error, borderColor: "rgba(248,113,113,0.3)", "&:hover": { borderColor: C.error, background: "rgba(248,113,113,0.1)" } }}>
                    Delete Account
                  </Button>
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim, mt: 1 }}>
                    Permanently deletes your account, swipe history, and taste profile. This can't be undone.
                  </Typography>
                </Box>

                <Box sx={{ mt: 3, pt: 3, borderTop: `1px solid rgba(255,255,255,0.05)` }}>
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

                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "rgba(255,255,255,0.15)", mt: 4, textAlign: "center" }}>
                  HackerSwipe reads Hacker News and remembers what you like.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const CATEGORY_SHORT_LABEL = {
  "Software Engineering": "SWE",
  "Hardware & Systems": "HW",
  "Artificial Intelligence": "AI",
  "Startups & VC": "VC",
  "Cybersecurity": "SEC",
  "Business & Finance": "BIZ",
  "Science & Space": "SCI",
  "Design & UI/UX": "UX",
  "Other": "OTH",
};

function TasteRadar({ profile }) {
  const size = 236, cx = size / 2, cy = size / 2, R = 82;
  const maxPct = Math.max(1, ...profile.map((p) => p.percentage));
  const valueFor = (cat) => {
    const entry = profile.find((p) => p.category === cat);
    return entry ? entry.percentage / maxPct : 0;
  };
  const axisPoint = (i, frac) => {
    const angle = (i / CATEGORY_ORDER.length) * 2 * Math.PI - Math.PI / 2;
    return [cx + R * frac * Math.cos(angle), cy + R * frac * Math.sin(angle)];
  };
  const dataVertices = CATEGORY_ORDER.map((cat, i) => axisPoint(i, valueFor(cat)));
  const dataPoints = dataVertices.map((p) => p.join(",")).join(" ");
  const ring = (frac) => CATEGORY_ORDER.map((_, i) => axisPoint(i, frac).join(",")).join(" ");
  const topCategory = profile.length > 0
    ? profile.reduce((max, p) => (p.percentage > max.percentage ? p : max), profile[0]).category
    : null;
  const strokeColor = topCategory ? CATEGORY_COLORS[topCategory] : C.orange;
  const gradientId = "radarFill";
  const glowId = "radarGlow";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", my: 1 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.38" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.06" />
          </radialGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ring(f)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        ))}
        {CATEGORY_ORDER.map((cat, i) => {
          const [x2, y2] = axisPoint(i, 1);
          return <line key={cat} x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
        })}
        <polygon
          points={dataPoints}
          fill={`url(#${gradientId})`}
          stroke={strokeColor}
          strokeWidth="2.25"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          style={{
            transformOrigin: `${cx}px ${cy}px`, transformBox: "fill-box",
            animation: "radarGrow 700ms cubic-bezier(0.16,1,0.3,1), radarBreathe 3.5s ease-in-out 700ms infinite",
          }}
        />
        {dataVertices.map(([vx, vy], i) => (
          <circle key={i} cx={vx} cy={vy} r="3" fill={strokeColor} style={{ filter: `url(#${glowId})` }} />
        ))}
        {CATEGORY_ORDER.map((cat, i) => {
          const [lx, ly] = axisPoint(i, 1.26);
          const isTop = cat === topCategory;
          return (
            <text
              key={cat} x={lx} y={ly}
              fill={isTop ? strokeColor : "rgba(255,255,255,0.5)"}
              fontSize={isTop ? "11" : "9.5"}
              fontWeight={isTop ? "700" : "500"}
              fontFamily={C.fontMono}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {CATEGORY_SHORT_LABEL[cat] || cat.slice(0, 3).toUpperCase()}
            </text>
          );
        })}
      </svg>
      {topCategory && (
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: strokeColor, letterSpacing: "0.06em", mt: 0.5 }}>
          STRONGEST: {topCategory.toUpperCase()}
        </Typography>
      )}
    </Box>
  );
}

export function ProfilePanel({ swipeCount, user, isGuest, token, navigate, onLogout }) {
  const [profile, setProfile] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, likes: 0, dislikes: 0, skips: 0, streak: 0 });
  const [statsReady, setStatsReady] = useState(false);
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    api.getTasteProfile().then((d) => { setProfile(d.profile || []); setTotal(d.totalLiked || 0); }).catch(() => {});
    api.getDetailedStats().then((d) => { setStats(d); setStatsReady(true); }).catch(() => setStatsReady(true));
  }, [swipeCount]);

  useEffect(() => {
    if (!isGuest || !token) return;
    const update = () => {
      const decoded = decodeToken(token);
      if (decoded?.exp) setRemaining(Math.max(0, decoded.exp * 1000 - Date.now()));
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [isGuest, token]);

  const tier = nextTier(stats.streak);
  const prevTierDays = [0, ...STREAK_TIERS.map((t) => t.days)].reduce((prev, d) => (d <= stats.streak ? d : prev), 0);
  const tierProgress = tier ? Math.min(1, (stats.streak - prevTierDays) / (tier.days - prevTierDays)) : 1;

  const archetypeReady = total >= ARCHETYPE_UNLOCK_THRESHOLD;
  const topCategory = profile.length > 0
    ? profile.reduce((max, p) => (p.percentage > max.percentage ? p : max), profile[0]).category
    : null;
  const archetype = topCategory ? ARCHETYPES[topCategory] : null;
  // "Other" is a catch-all bucket, not a real interest, so "you've also been
  // deep in Other" reads as nonsense. Skip it when picking the runner-up.
  const secondCategory = profile.length > 1
    ? profile.filter((p) => p.category !== topCategory && p.category !== "Other").sort((a, b) => b.percentage - a.percentage)[0]?.category
    : null;

  const archetypeSeenKey = "hs_archetype_revealed";
  const [justRevealed, setJustRevealed] = useState(false);
  useEffect(() => {
    if (archetypeReady && !localStorage.getItem(archetypeSeenKey)) {
      setJustRevealed(true);
      localStorage.setItem(archetypeSeenKey, "true");
    }
  }, [archetypeReady]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader icon={<Psychology sx={{ fontSize: 16 }} />} label="YOUR PROFILE" />

      {/* Archetype card */}
      <Box sx={{
        mt: 2.5, mb: 3, p: 2.5, borderRadius: "16px",
        background: "linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.2) 100%)",
        border: `1px solid ${archetype ? `${CATEGORY_COLORS[topCategory]}55` : "rgba(255,255,255,0.1)"}`,
        animation: justRevealed ? "archetypeReveal 400ms cubic-bezier(0.34,1.56,0.64,1)" : "none",
      }}>
        <Typography sx={{ fontFamily: C.fontPixel, fontSize: "0.5rem", color: C.textDim, letterSpacing: "0.1em", mb: 1 }}>
          YOUR ARCHETYPE
        </Typography>
        {archetypeReady && archetype ? (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.3rem", fontWeight: 800, color: "#fff", mb: 1 }}>
              {archetype.title}
            </Typography>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: C.textDim, lineHeight: 1.5 }}>
              {archetype.body}
            </Typography>
            {secondCategory && (
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, lineHeight: 1.5, mt: 1 }}>
                Lately you've also been deep in {secondCategory}.
              </Typography>
            )}
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", mt: 1.5 }}>
              Based on {total} stories you've liked
            </Typography>
          </>
        ) : total > 0 ? (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "1.1rem", fontWeight: 700, color: "#fff", mb: 1 }}>
              Still Forming
            </Typography>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: C.textDim, mb: 1.5 }}>
              You've liked {total} {total === 1 ? "story" : "stories"} so far. A few more and your archetype locks in.
            </Typography>
            <Box sx={{ display: "flex", gap: 0.6 }}>
              {Array.from({ length: ARCHETYPE_UNLOCK_THRESHOLD }).map((_, i) => (
                <Box key={i} sx={{ width: 8, height: 8, borderRadius: "50%", background: i < total ? C.orange : "rgba(255,255,255,0.1)" }} />
              ))}
            </Box>
          </>
        ) : (
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: C.textDim }}>
            Swipe right on a few stories and we'll figure out who you are as a reader.
          </Typography>
        )}
      </Box>

      {/* Streak */}
      <Box sx={{ mb: 3, p: 2, borderRadius: "12px", background: "rgba(255,102,0,0.04)", border: "1px solid rgba(255,102,0,0.15)" }}>
        {!statsReady ? (
          <>
            <Box sx={{ width: 72, height: 22, borderRadius: "5px", background: "rgba(255,255,255,0.06)", animation: "skeletonPulse 1.2s ease-in-out infinite", mb: 1 }} />
            <Box sx={{ width: 140, height: 14, borderRadius: "4px", background: "rgba(255,255,255,0.04)", animation: "skeletonPulse 1.2s ease-in-out infinite" }} />
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <LocalFireDepartment sx={{ fontSize: 18, color: stats.streak > 0 ? C.orange : "rgba(255,255,255,0.2)" }} />
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "1.1rem", color: "#fff", fontWeight: 700 }}>
                {stats.streak} day{stats.streak === 1 ? "" : "s"}
              </Typography>
            </Box>
            {stats.streak === 0 ? (
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.72rem", color: C.textDim }}>Swipe on a story today to start one.</Typography>
            ) : tier ? (
              <>
                <Box sx={{ height: 4, borderRadius: "2px", background: "rgba(255,255,255,0.06)", overflow: "hidden", mb: 1 }}>
                  <Box sx={{ height: "100%", width: `${tierProgress * 100}%`, background: C.orange, borderRadius: "2px", transition: `width 900ms ${EASE.decisive}` }} />
                </Box>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.textDim }}>
                  {tier.days - stats.streak} day{tier.days - stats.streak === 1 ? "" : "s"} to {tier.name}
                </Typography>
              </>
            ) : (
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.textDim }}>You've hit every milestone. Respect.</Typography>
            )}
          </>
        )}
      </Box>

      {/* Reading DNA radar */}
      {total > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.textDim, letterSpacing: "0.08em", mb: 0.5, textAlign: "center" }}>
            READING DNA
          </Typography>
          <TasteRadar profile={profile} />
        </Box>
      )}

      {/* Milestones */}
      {total > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.68rem", color: C.textDim, letterSpacing: "0.08em", mb: 1 }}>MILESTONES</Typography>
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
            {MILESTONES.map((m) => {
              const achieved = total >= m;
              return (
                <Box key={m} sx={{
                  flexShrink: 0, width: 58, textAlign: "center", p: 1, borderRadius: "8px",
                  border: `1px solid ${achieved ? "rgba(255,102,0,0.3)" : "rgba(255,255,255,0.06)"}`,
                  background: achieved ? "rgba(255,102,0,0.06)" : "transparent",
                  opacity: achieved ? 1 : 0.35,
                }}>
                  {!achieved && <Lock sx={{ fontSize: 11, color: C.textDim, mb: 0.3 }} />}
                  <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: achieved ? C.orange : C.textDim, fontWeight: 700 }}>{m}</Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Account footer */}
      <Box sx={{ mt: "auto", pt: 2 }}>
        {isGuest ? (
          <Box sx={{ p: 2, borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.82rem", color: "#e8e8e8", mb: 1.5, lineHeight: 1.5 }}>
              {remaining != null
                ? `You're browsing as a guest. Session ends in ${formatCountdown(remaining)}.`
                : "You're browsing as a guest."}
              {" "}Your streak, saved stories, and taste profile are lost when it ends.
            </Typography>
            {stats.streak > 0 && (
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.warning, mb: 1.5 }}>
                You have a {stats.streak} day streak. Don't lose it.
              </Typography>
            )}
            <Button
              fullWidth variant="contained"
              onClick={() => navigate("/register")}
              sx={{
                background: `linear-gradient(45deg, ${C.orange} 0%, #ff8c00 100%)`,
                color: "#000", fontFamily: C.fontMono, fontWeight: 700,
                boxShadow: "0 4px 15px rgba(255,102,0,0.15)",
                "&:hover": { filter: "brightness(1.1)", boxShadow: "0 6px 20px rgba(255,102,0,0.4)" },
              }}>
              CREATE ACCOUNT
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "1rem", color: "#fff", fontWeight: 700 }}>{user?.email}</Typography>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.orange, mt: 0.5, mb: 2 }}>SYNCED</Typography>
            <Button
              fullWidth variant="outlined"
              onClick={onLogout}
              sx={{ borderColor: "rgba(255,255,255,0.1)", color: C.textDim, fontFamily: C.fontMono, "&:hover": { borderColor: C.error, color: C.error, background: "rgba(248,113,113,0.1)" } }}>
              SIGN OUT
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function formatRelativeTime(dateString) {
  if (!dateString) return null;
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function SavedPanel({ swipeCount, onUnliked }) {
  const [liked, setLiked] = useState([]);
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
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

  const handleUnlike = (articleId) => {
    api.unlikeArticle(articleId).catch(() => {});
    setRemovingIds((prev) => new Set(prev).add(articleId));
    setTimeout(() => {
      setLiked((prev) => prev.filter((a) => a.id !== articleId));
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(articleId); return next; });
      onUnliked();
    }, 380);
  };

  // Only categories actually present among what this user saved, not all 9
  // always, so the filter row doesn't turn into a wall of mostly-empty chips.
  const categoriesPresent = [...new Set(liked.map((a) => a.category).filter(Boolean))];

  let filtered = liked.filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));
  if (categoryFilter !== "All") filtered = filtered.filter((a) => a.category === categoryFilter);
  filtered = [...filtered].sort((a, b) => (
    sortBy === "popular"
      ? (b.score || 0) - (a.score || 0)
      : new Date(b.swipe_time) - new Date(a.swipe_time)
  ));

  return (
    <>
      <SectionHeader icon={<Bookmark sx={{ fontSize: 16 }} />} label={`SAVED STORIES (${liked.length})`} color={C.error} />
      <Box sx={{ mt: 1.5, mb: 1.5 }}>
        <Box sx={{
          display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", px: 1, py: 0.5,
          transition: `border-color 150ms ${EASE.standard}`,
          "&:focus-within": { borderColor: C.orange },
        }}>
          <Search sx={{ fontSize: 16, color: C.textDim, mr: 1 }} />
          <input
            type="text"
            placeholder="Search saved..."
            aria-label="Search saved stories"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontFamily: C.fontUi, fontSize: "0.8rem", width: "100%" }}
          />
        </Box>
      </Box>

      {categoriesPresent.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {["All", ...categoriesPresent].map((cat) => {
            const isActive = categoryFilter === cat;
            const color = cat === "All" ? C.orange : (CATEGORY_COLORS[cat] || C.textDim);
            return (
              <Box
                key={cat}
                component="button"
                onClick={() => setCategoryFilter(cat)}
                sx={{
                  fontFamily: C.fontMono, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.02em",
                  color: isActive ? color : C.textDim,
                  background: isActive ? `${color}1a` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isActive ? `${color}66` : "rgba(255,255,255,0.1)"}`,
                  borderRadius: "5px", px: 1, py: 0.4, cursor: "pointer",
                  transition: `all 150ms ${EASE.standard}`,
                  "&:hover": { borderColor: `${color}66`, color },
                }}
              >
                {cat === "All" ? "ALL" : cat.toUpperCase()}
              </Box>
            );
          })}
        </Box>
      )}

      {liked.length > 0 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.textDim }}>SORT</Typography>
          {[["newest", "Newest"], ["popular", "Popular"]].map(([value, label]) => (
            <Box
              key={value}
              component="button"
              onClick={() => setSortBy(value)}
              sx={{
                fontFamily: C.fontMono, fontSize: "0.65rem", fontWeight: 700,
                color: sortBy === value ? C.orange : C.textDim,
                background: sortBy === value ? "rgba(255,102,0,0.1)" : "transparent",
                border: `1px solid ${sortBy === value ? "rgba(255,102,0,0.4)" : "transparent"}`,
                borderRadius: "5px", px: 1, py: 0.3, cursor: "pointer",
                transition: `all 150ms ${EASE.standard}`,
              }}
            >
              {label}
            </Box>
          ))}
        </Box>
      )}

      {loading ? (
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim }}>
          loading<span className="cursor-blink" />
        </Typography>
      ) : filtered.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {filtered.map((a) => {
            const isViewed = viewed.has(String(a.id));
            const isRemoving = removingIds.has(a.id);
            const categoryColor = a.category ? (CATEGORY_COLORS[a.category] || C.textDim) : null;
            const isFallbackThumb = !a.image_url;
            const thumbUrl = isFallbackThumb ? `/hacker_bgs/bg_${a.id % 5}.png` : a.image_url;
            const hueShift = FALLBACK_HUE_SHIFTS[a.id % FALLBACK_HUE_SHIFTS.length];
            return (
              <Box key={a.id} sx={{
                p: 1.5, borderRadius: "8px", position: "relative", overflow: "hidden",
                background: isViewed ? "rgba(255,255,255,0.01)" : "rgba(255,102,0,0.04)",
                border: `1px solid ${isViewed ? "rgba(255,255,255,0.05)" : "rgba(255,102,0,0.2)"}`,
                borderLeft: `3px solid ${isRemoving ? C.error : (isViewed ? "rgba(255,255,255,0.05)" : C.orange)}`,
                maxHeight: isRemoving ? 0 : 200,
                marginBottom: isRemoving ? 0 : undefined,
                paddingTop: isRemoving ? 0 : undefined,
                paddingBottom: isRemoving ? 0 : undefined,
                opacity: isRemoving ? 0 : 1,
                transform: isRemoving ? "scale(0.94) translateX(16px)" : "none",
                transition: `opacity 350ms ${EASE.standard}, transform 350ms ${EASE.standard}, max-height 380ms ${EASE.standard} 50ms, border-left-color 150ms ease`,
                "&:hover": isRemoving ? {} : { background: "rgba(255,102,0,0.08)", transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" },
              }}>
                <Box sx={{ display: "flex", gap: 1.25 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: "6px", overflow: "hidden",
                    flexShrink: 0, background: C.bg,
                  }}>
                    <Box component="img" src={thumbUrl} alt=""
                      sx={{
                        width: "100%", height: "100%", objectFit: "cover",
                        opacity: isViewed ? 0.5 : 1,
                        ...(isFallbackThumb && {
                          filter: `hue-rotate(${hueShift}deg) saturate(1.2) brightness(1.3)`,
                        }),
                      }} />
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
                      <Link
                        href={a.article_url} target="_blank" rel="noopener noreferrer"
                        underline="none"
                        onClick={() => markViewed(a.id)}
                        sx={{
                          color: isViewed ? C.textDim : "#ffffff",
                          fontFamily: C.fontUi, fontSize: "0.78rem", fontWeight: isViewed ? 500 : 700, lineHeight: 1.4,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          transition: "color 0.2s", flexGrow: 1, pr: 1,
                          "&:hover": { color: C.orange },
                        }}
                      >
                        {a.title}
                      </Link>
                      <Tooltip title="Remove">
                        <IconButton onClick={() => handleUnlike(a.id)} size="small" aria-label="Remove from saved"
                          sx={{ color: C.textDim, flexShrink: 0, mt: "-2px", mr: "-4px", "&:hover": { color: C.error, background: "rgba(248,113,113,0.1)" } }}>
                          <Delete sx={{ fontSize: 13 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75, mt: 0.75 }}>
                      {a.category && (
                        <Typography sx={{
                          fontFamily: C.fontMono, fontSize: "0.58rem", fontWeight: 700, color: categoryColor,
                          background: `${categoryColor}1a`, border: `1px solid ${categoryColor}4d`,
                          px: 0.75, py: 0.2, borderRadius: "4px",
                        }}>
                          {a.category.toUpperCase()}
                        </Typography>
                      )}
                      {a.source_name && (
                        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.textDim }}>
                          {a.source_name}
                        </Typography>
                      )}
                      {a.swipe_time && (
                        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.textDim }}>
                          · {formatRelativeTime(a.swipe_time)}
                        </Typography>
                      )}
                      {a.score != null && (
                        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.62rem", color: C.orange }}>
                          · {a.score} pts
                        </Typography>
                      )}
                    </Box>

                    {isViewed && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                        <Visibility sx={{ fontSize: 10, color: C.textDim }} />
                        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.6rem", color: C.textDim }}>VIEWED</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.78rem", color: C.textDim }}>
          {liked.length === 0 ? "Nothing saved yet. Swipe right to keep a story here." : "No saved stories match your filters."}
        </Typography>
      )}
    </>
  );
}
