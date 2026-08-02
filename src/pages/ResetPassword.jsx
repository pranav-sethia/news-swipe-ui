import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { C } from '../theme.js';
import * as api from '../api.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
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

        {!token ? (
          <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.9rem', color: C.textDim, textAlign: 'center', mb: 3 }}>
            This reset link is missing its token. Request a new one from the sign-in page.
          </Typography>
        ) : done ? (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.3rem', fontWeight: 800, color: '#fff', mb: 1.5, textAlign: 'center' }}>
              Password updated
            </Typography>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.85rem', color: C.textDim, mb: 4, textAlign: 'center' }}>
              You can sign in with your new password now.
            </Typography>
            <Button fullWidth variant="contained" onClick={() => navigate('/login')}
              sx={{
                py: 1.5, fontFamily: C.fontMono, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
                background: C.orange, color: '#000', borderRadius: '10px', mb: 2,
                '&:hover': { background: '#e65c00' },
              }}>
              GO TO SIGN IN
            </Button>
          </>
        ) : (
          <>
            <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.3rem', fontWeight: 800, color: '#fff', mb: 1.5, textAlign: 'center' }}>
              Set a new password
            </Typography>
            <form onSubmit={handleSubmit}>
              <TextField label="New password" type="password" variant="outlined" fullWidth margin="normal"
                value={password} onChange={(e) => setPassword(e.target.value)} required sx={inputSx} />
              <TextField label="Confirm password" type="password" variant="outlined" fullWidth margin="normal"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required sx={inputSx} />

              {error && (
                <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.error, mt: 1.5, textAlign: 'center' }}>
                  {error}
                </Typography>
              )}

              <Button type="submit" variant="contained" fullWidth disabled={loading}
                sx={{
                  mt: 2.5, mb: 2, py: 1.5,
                  fontFamily: C.fontMono, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em',
                  background: C.orange, color: '#000', borderRadius: '10px',
                  '&:hover': { background: '#e65c00' },
                  '&:disabled': { background: 'rgba(255,102,0,0.4)' },
                }}>
                {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'UPDATE PASSWORD'}
              </Button>
            </form>
          </>
        )}

        {!done && (
          <Typography
            onClick={() => navigate('/login')}
            sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.textDim, textAlign: 'center', cursor: 'pointer', '&:hover': { color: '#fff' } }}
          >
            Back to sign in
          </Typography>
        )}
      </Box>
    </Box>
  );
}
