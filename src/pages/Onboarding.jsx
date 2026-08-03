import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { C } from '../theme.js';
import { EASE } from '../motion.js';
import * as api from '../api.js';
import { track } from '../analytics.js';

const CATEGORIES = [
  'Software Engineering', 'Hardware & Systems', 'Artificial Intelligence',
  'Startups & VC', 'Cybersecurity', 'Business & Finance', 'Science & Space',
  'Design & UI/UX', 'Other',
];

export default function Onboarding() {
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // A stale browser-history entry (back button after finishing onboarding
  // earlier in this session) can land here even with replace:true nav calls,
  // since existing history from before those calls isn't retroactively fixed.
  useEffect(() => {
    if (localStorage.getItem('hs_onboarding_done') === '1') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const toggle = (cat) => {
    setSelected((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const finish = async (categories) => {
    setSaving(true);
    try {
      await api.saveOnboardingCategories(categories);
    } catch {
      // Not worth blocking the user over. They just get an unbiased cold-start feed.
    }
    localStorage.setItem('hs_onboarding_done', '1');
    track('onboarding_completed', { category_count: categories.length });
    navigate('/', { replace: true });
  };

  return (
    <Box sx={{
      height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: C.bg, px: 3,
      backgroundImage: `linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
    }}>
      <Box sx={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <Typography sx={{ fontFamily: C.fontPixel, fontSize: '0.6rem', color: C.orange, letterSpacing: '0.1em', mb: 2 }}>
          HACKERSWIPE
        </Typography>
        <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.6rem', fontWeight: 800, color: '#fff', mb: 1.5 }}>
          What are you into?
        </Typography>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.85rem', color: C.textDim, mb: 4 }}>
          Pick a few topics to start with a feed that already knows something about you. You can always fine-tune it by swiping.
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: 5 }}>
          {CATEGORIES.map((cat) => {
            const isActive = selected.includes(cat);
            return (
              <Box
                key={cat}
                onClick={() => toggle(cat)}
                sx={{
                  cursor: 'pointer',
                  px: 2, py: 1.2,
                  borderRadius: '10px',
                  fontFamily: C.fontMono,
                  fontSize: '0.8rem',
                  border: `1px solid ${isActive ? C.orange : C.border}`,
                  color: isActive ? '#fff' : C.textDim,
                  background: isActive ? C.orangeDim : 'rgba(255,255,255,0.02)',
                  transition: `all 200ms ${EASE.standard}`,
                  '&:hover': { borderColor: C.orange, color: '#fff' },
                  '&:active': { transform: 'scale(0.97)' },
                }}
              >
                {cat}
              </Box>
            );
          })}
        </Box>

        <Button
          fullWidth
          variant="contained"
          disabled={saving || selected.length === 0}
          onClick={() => finish(selected)}
          sx={{
            py: 1.6, background: C.orange, fontFamily: C.fontMono, fontSize: '0.85rem',
            fontWeight: 700, letterSpacing: '0.05em', borderRadius: '10px', mb: 2,
            '&:hover': { background: '#e65c00' },
            '&:disabled': { background: 'rgba(255,102,0,0.4)' },
          }}
        >
          {selected.length > 0 ? `CONTINUE WITH ${selected.length} PICKED` : 'PICK A FEW TO CONTINUE'}
        </Button>

        <Typography
          onClick={() => !saving && finish([])}
          sx={{
            fontFamily: C.fontMono, fontSize: '0.75rem', color: C.textDim,
            cursor: 'pointer', '&:hover': { color: '#fff' },
          }}
        >
          Skip for now
        </Typography>
      </Box>
    </Box>
  );
}
