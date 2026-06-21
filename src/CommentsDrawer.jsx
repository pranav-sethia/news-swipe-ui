import React, { useState, useEffect } from "react";
import { Drawer, Box, Typography, CircularProgress, Button } from "@mui/material";
import { QuestionAnswer } from "@mui/icons-material";

const C = {
  orange: "#ff6600",
  orangeDim: "rgba(255,102,0,0.12)",
  bg: "#080808",
  card: "#0d0d0d",
  panel: "rgba(10,10,10,0.88)",
  border: "rgba(255,102,0,0.14)",
  textDim: "rgba(232,232,232,0.5)",
  fontPixel: "'Press Start 2P', monospace",
  fontMono: "'Share Tech Mono', monospace",
  fontUi: "'Inter', sans-serif",
};

export default function CommentsDrawer({ open, onClose, hnId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;

  useEffect(() => {
    if (!open || !hnId) return;
    let isMounted = true;
    setLoading(true);
    setError(false);
    
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

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 10 }}>
          <CircularProgress size={24} sx={{ color: C.orange, mb: 2 }} />
          <Typography sx={{ fontFamily: C.fontMono, color: C.textDim, fontSize: "0.8rem" }}>Loading discussion...</Typography>
        </Box>
      ) : error ? (
        <Typography sx={{ fontFamily: C.fontMono, color: "#f87171", fontSize: "0.8rem", textAlign: "center", mt: 4 }}>
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
                dangerouslySetInnerHTML={{ __html: c.text }} 
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
    </Drawer>
  );
}
