import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { C } from '../theme.js';
import * as api from '../api.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      color: 'white', fontFamily: C.fontMono,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: C.border },
      '&.Mui-focused fieldset': { borderColor: C.orange },
    },
    '& .MuiInputLabel-root': { color: C.textDim, fontFamily: C.fontMono },
    '& .MuiInputLabel-root.Mui-focused': { color: C.orange },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(email);
    } catch {
      // Deliberately silent: the backend always returns a generic success
      // response regardless of whether the email exists, so there's nothing
      // meaningfully different to show on failure either.
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <Box sx={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg, px: 3,
      backgroundImage: `linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
    }}>
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Typography sx={{ fontFamily: C.fontPixel, fontSize: '0.6rem', color: C.orange, letterSpacing: '0.1em', mb: 3, textAlign: 'center' }}>
          HACKERSWIPE
        </Typography>

        {sent ? (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.3rem', fontWeight: 800, color: '#fff', mb: 1.5, textAlign: 'center' }}>
              Check your email
            </Typography>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.85rem', color: C.textDim, mb: 4, textAlign: 'center', lineHeight: 1.6 }}>
              If an account exists for {email}, a reset link is on its way. It expires in 1 hour.
            </Typography>
          </>
        ) : (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.3rem', fontWeight: 800, color: '#fff', mb: 1.5, textAlign: 'center' }}>
              Reset your password
            </Typography>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.85rem', color: C.textDim, mb: 4, textAlign: 'center', lineHeight: 1.6 }}>
              Enter the email on your account and we'll send you a reset link.
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField label="Email" type="email" variant="outlined" fullWidth margin="normal"
                value={email} onChange={(e) => setEmail(e.target.value)} required sx={inputSx} />
              <Button type="submit" variant="contained" fullWidth disabled={loading}
                sx={{
                  mt: 2.5, mb: 2, py: 1.5,
                  fontFamily: C.fontMono, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
                  background: C.orange, color: '#000', borderRadius: '10px',
                  '&:hover': { background: '#e65c00' },
                  '&:disabled': { background: 'rgba(255,102,0,0.4)' },
                }}>
                {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'SEND RESET LINK'}
              </Button>
            </form>
          </>
        )}

        <Typography
          onClick={() => navigate('/login')}
          sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.textDim, textAlign: 'center', cursor: 'pointer', '&:hover': { color: '#fff' } }}
        >
          Back to sign in
        </Typography>
      </Box>
    </Box>
  );
}
