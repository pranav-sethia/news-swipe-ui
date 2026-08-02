import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Drawer, Box, Typography, CircularProgress, Button, Modal, IconButton, Tooltip } from "@mui/material";
import { QuestionAnswer, AutoAwesome, LockOutlined } from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { getCommentSummary } from "./api.js";
import { useNavigate } from "react-router-dom";
import { C } from "./theme.js";
import { EASE } from "./motion.js";

export default function CommentsDrawer({ open, onClose, hnId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  const navigate = useNavigate();

  const isGuestUser = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return true;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user && payload.user.isGuest;
    } catch {
      return true;
    }
  };

  const handleSummarize = async () => {
    if (isGuestUser()) {
      setShowAuthModal(true);
      return;
    }

    setSummarizing(true);
    setSummaryError(null);
    try {
      const data = await getCommentSummary(hnId);
      if (data.status === 'insufficient') {
        setSummaryError(data.message);
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      if (err.response && err.response.status === 402 && err.response.data.error === 'guest_restricted') {
        setShowAuthModal(true);
      } else if (err.response && err.response.status === 429) {
        setSummaryError(err.response.data.message || 'The AI is currently resting due to high demand.');
      } else {
        const errorMsg = err.response?.data?.message || "Failed to generate summary. The discussion might be too long or unavailable.";
        setSummaryError(errorMsg);
      }
    } finally {
      setSummarizing(false);
    }
  };

  useEffect(() => {
    if (!open || !hnId) return;
    let isMounted = true;
    setLoading(true);
    setError(false);
    setSummary(null);
    setSummaryError(null);
    
    fetch(`https://hn.algolia.com/api/v1/items/${hnId}`)
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        // Take top 8 top-level comments that actually have text
        const topComments = (data.children || []).filter(c => c.text).slice(0, 8);
        setComments(topComments);
        setLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        console.error("Failed to fetch comments", err);
        setError(true);
        setLoading(false);
      });

    return () => { isMounted = false; };
  }, [open, hnId]);

  return (
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === "c" || e.key === "C") {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }
      }}
      PaperProps={{
        sx: {
          width: { xs: "100%", md: 400 },
          height: { xs: "80vh", md: "100%" },
          background: "rgba(13, 13, 13, 0.95)",
          backdropFilter: "blur(20px)",
          borderLeft: { xs: "none", md: `1px solid ${C.border}` },
          borderTop: { xs: `1px solid ${C.border}`, md: "none" },
          borderTopLeftRadius: { xs: 20, md: 0 },
          borderTopRightRadius: { xs: 20, md: 0 },
          p: 3,
          color: "white",
          overflowY: "auto",
        }
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, borderBottom: `1px solid ${C.border}`, pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QuestionAnswer sx={{ color: C.orange, fontSize: 20 }} />
          <Typography sx={{ fontFamily: C.fontUi, fontWeight: 700, fontSize: "1.1rem" }}>Top Comments</Typography>
        </Box>
        <Button onClick={onClose} sx={{ minWidth: 0, p: 1, color: C.textDim, "&:hover": { color: "white" } }}>✕</Button>
      </Box>

      {/* AI Summary Section */}
      <Box sx={{ mb: 4 }}>
        {!summary && !summarizing && !summaryError && (
          <Tooltip title={!loading && comments.length === 0 ? "No comments to summarize yet" : ""}>
            <span>
              <Button
                fullWidth variant="outlined"
                onClick={handleSummarize}
                disabled={loading || comments.length === 0}
                startIcon={<AutoAwesome sx={{ color: C.teal }} />}
                sx={{
                  borderColor: "rgba(0,255,204,0.3)", color: C.teal, fontFamily: C.fontMono,
                  transition: `all 150ms ${EASE.standard}`,
                  "&:hover": { borderColor: C.teal, background: "rgba(0,255,204,0.1)" },
                  "&:active": { transform: "scale(0.98)" },
                  "&:disabled": { borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.2)" }
                }}
              >
                AI SUMMARIZE DISCUSSION
              </Button>
            </span>
          </Tooltip>
        )}
        
        {summarizing && (
          <Box sx={{ p: 2, border: "1px dashed rgba(0,255,204,0.3)", borderRadius: 2, textAlign: "center" }}>
            <CircularProgress size={20} sx={{ color: C.teal, mb: 1 }} />
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.teal }}>Analyzing community sentiment...</Typography>
          </Box>
        )}
        
        {summaryError && (
          <Box sx={{ p: 2, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 2, background: "rgba(255,255,255,0.02)" }}>
            <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.textDim, textAlign: "center" }}>{summaryError}</Typography>
          </Box>
        )}
        
        {summary && (
          <Box sx={{ p: 3, border: "1px solid rgba(0,255,204,0.3)", borderRadius: "12px", background: "linear-gradient(135deg, rgba(0,255,204,0.05) 0%, rgba(0,0,0,0) 100%)", boxShadow: "0 4px 20px rgba(0,255,204,0.05)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <AutoAwesome sx={{ color: C.teal, fontSize: 16 }} />
              <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.teal, fontWeight: 700, letterSpacing: "1px" }}>AI CONSENSUS</Typography>
            </Box>
            
            <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.9rem", color: "white", mb: 2, fontWeight: 600, lineHeight: 1.5 }}>
              {summary.consensus}
            </Typography>
            
            {summary.takeaways && summary.takeaways.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, mb: 1 }}>KEY TAKEAWAYS</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {summary.takeaways.map((t, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1 }}>
                      <Typography sx={{ color: C.teal, fontSize: "0.8rem" }}>▸</Typography>
                      <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#e8e8e8", lineHeight: 1.4 }}>{t}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            {summary.criticisms && summary.criticisms.length > 0 && (
              <Box>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.7rem", color: C.textDim, mb: 1 }}>DEBATES & CRITICISMS</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {summary.criticisms.map((c, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1 }}>
                      <Typography sx={{ color: C.error, fontSize: "0.8rem" }}>▸</Typography>
                      <Typography sx={{ fontFamily: C.fontUi, fontSize: "0.85rem", color: "#e8e8e8", lineHeight: 1.4 }}>{c}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress size={24} sx={{ color: C.orange, mb: 2 }} />
          <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, fontSize: "0.8rem" }}>Loading discussion...</Typography>
        </Box>
      ) : error ? (
        <Typography sx={{ fontFamily: C.fontMono, color: C.error, fontSize: "0.8rem", textAlign: "center", mt: 4 }}>
          Failed to load comments.
        </Typography>
      ) : comments.length === 0 ? (
        <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, fontSize: "0.8rem", textAlign: "center", mt: 4 }}>
          No comments yet.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {comments.map(c => (
            <Box key={c.id}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.75rem", color: C.orange, fontWeight: 700 }}>{c.author}</Typography>
                <Typography sx={{ fontFamily: C.fontMono, fontSize: "0.65rem", color: C.textDim }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </Typography>
              </Box>
              <Typography 
                sx={{ 
                  fontFamily: C.fontUi, fontSize: "0.85rem", color: "#e8e8e8", lineHeight: 1.6,
                  "& a": { color: C.orange, textDecoration: "none" },
                  "& a:hover": { textDecoration: "underline" },
                  "& p": { mt: 0, mb: 1.5 },
                  "& pre": { background: "rgba(0,0,0,0.5)", p: 1, borderRadius: 1, overflowX: "auto" },
                  "& code": { fontFamily: C.fontMono, fontSize: "0.75rem" }
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.text) }} 
              />
            </Box>
          ))}
          <Button 
            component="a" href={`https://news.ycombinator.com/item?id=${hnId}`} target="_blank" rel="noopener noreferrer"
            sx={{ mt: 2, fontFamily: C.fontMono, color: C.textDim, border: `1px solid ${C.border}`, "&:hover": { borderColor: C.orange, color: C.orange } }}
          >
            Read All Comments on HN
          </Button>
        </Box>
      )}

      {/* Auth Prompt Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <Modal open={true} onClose={() => setShowAuthModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
            <Box component={motion.div}
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: EASE.decisive }}
              sx={{
                background: 'linear-gradient(160deg, rgba(24,24,24,0.98) 0%, rgba(13,13,13,0.98) 100%)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${C.border}`, borderRadius: '20px', p: { xs: 3.5, sm: 4.5 }, maxWidth: 420, width: '90%',
                textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)', outline: 'none', position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top ambient glow, AI-feature accent per the reserved teal convention */}
              <Box sx={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 200, height: 100, background: 'rgba(0,255,204,0.12)', filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none' }} />

              <IconButton onClick={() => setShowAuthModal(false)} sx={{ position: 'absolute', top: 12, right: 12, color: C.textDim, '&:hover': { color: 'white', background: 'rgba(255,255,255,0.1)' } }}>✕</IconButton>

              <Box sx={{ width: 56, height: 56, borderRadius: '14px', background: C.tealDim, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5, border: '1px solid rgba(0,255,204,0.3)' }}>
                <LockOutlined sx={{ color: C.teal, fontSize: 26 }} />
              </Box>

              <Typography sx={{ fontFamily: C.fontUi, fontWeight: 800, fontSize: '1.25rem', color: 'white', mb: 1.25, letterSpacing: '-0.01em' }}>Create an account to summarize this</Typography>
              <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.88rem', color: C.textDim, mb: 3.5, lineHeight: 1.6, px: 1 }}>
                Guest sessions can't run AI summaries. Sign up free and your swipes and taste profile carry over automatically.
              </Typography>

              <Button
                fullWidth variant="contained"
                onClick={() => { navigate('/register'); onClose(); }}
                sx={{
                  background: C.orange, color: '#000', fontFamily: C.fontMono, fontWeight: 700, py: 1.5, borderRadius: '10px',
                  fontSize: '0.8rem', letterSpacing: '0.05em', mb: 1.5,
                  '&:hover': { background: '#e65c00' },
                  transition: `all 200ms ${EASE.standard}`,
                }}
              >
                CREATE ACCOUNT
              </Button>
              <Typography
                onClick={() => { navigate('/login'); onClose(); }}
                sx={{ fontFamily: C.fontMono, fontSize: '0.7rem', color: C.textDim, cursor: 'pointer', '&:hover': { color: 'white' } }}
              >
                Already have an account? Sign in
              </Typography>
            </Box>
          </Modal>
        )}
      </AnimatePresence>
    </Drawer>
  );
}
