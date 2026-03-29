import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link, Divider, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import * as api from '../api.js';

const C = {
  orange: '#ff6600',
  orangeDim: 'rgba(255,102,0,0.12)',
  card: 'rgba(13,13,13,0.97)',
  border: 'rgba(255,102,0,0.18)',
  textDim: 'rgba(232,232,232,0.5)',
  fontPixel: "'Press Start 2P', monospace",
  fontMono: "'JetBrains Mono', monospace",
  fontUi: "Inter, sans-serif",
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.login(email, password);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      const res = await api.loginAsGuest();
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError('Failed to start guest session. Please try again.');
      setGuestLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      try {
        const res = await api.loginWithGoogle(tokenResponse.access_token);
        localStorage.setItem('token', res.data.token);
        navigate('/');
      } catch (err) {
        setError('Google Sign-In failed on the server. Please try again.');
      }
    },
    onError: () => setError('Google Sign-In was cancelled or failed.')
  });

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      fontFamily: C.fontMono,
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: C.border },
      '&.Mui-focused fieldset': { borderColor: C.orange },
    },
    '& .MuiInputLabel-root': { color: C.textDim, fontFamily: C.fontMono },
    '& .MuiInputLabel-root.Mui-focused': { color: C.orange },
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#080808',
        backgroundImage: `
          linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: '420px',
          background: C.card,
          borderRadius: '20px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontFamily: C.fontPixel, fontSize: '0.65rem', color: C.orange, letterSpacing: '0.1em', mb: 1 }}>
            HACKERSWIPE
          </Typography>
          <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.85rem', color: C.textDim, fontWeight: 500 }}>
            AI-powered Hacker News reader
          </Typography>
        </Box>

        {/* Guest CTA */}
        <Button
          fullWidth
          variant="contained"
          onClick={handleGuest}
          disabled={guestLoading}
          sx={{
            mb: 3,
            py: 1.6,
            background: C.orange,
            fontFamily: C.fontMono,
            fontSize: '0.85rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            borderRadius: '10px',
            '&:hover': { background: '#e65c00' },
            '&:disabled': { background: 'rgba(255,102,0,0.4)' },
          }}
        >
          {guestLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : '▶ EXPLORE AS GUEST'}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          onClick={() => handleGoogleLogin()}
          sx={{
            mb: 3, py: 1.4,
            color: '#fff', borderColor: 'rgba(255,255,255,0.2)',
            fontFamily: C.fontUi, fontSize: '0.85rem', fontWeight: 600,
            borderRadius: '10px', textTransform: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
            background: 'rgba(255,255,255,0.02)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            '&:hover': { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.4)', transform: 'translateY(-1px)' },
            transition: 'all 0.2s ease',
          }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google Logo" style={{ width: 18, height: 18 }} />
          Continue with Google
        </Button>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', mb: 3 }}>
          <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.7rem', color: C.textDim, px: 1 }}>
            or sign in
          </Typography>
        </Divider>

        <form onSubmit={handleSubmit}>
          <TextField label="Email" variant="outlined" fullWidth margin="normal"
            value={email} onChange={(e) => setEmail(e.target.value)} required sx={inputSx} />
          <TextField label="Password" type="password" variant="outlined" fullWidth margin="normal"
            value={password} onChange={(e) => setPassword(e.target.value)} required sx={inputSx} />

          {error && (
            <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: '#f87171', mt: 1.5, textAlign: 'center' }}>
              {error}
            </Typography>
          )}

          <Button type="submit" variant="outlined" fullWidth
            sx={{
              mt: 2.5, mb: 2, py: 1.4,
              fontFamily: C.fontMono, fontSize: '0.8rem',
              color: C.orange, borderColor: C.border, borderRadius: '10px',
              '&:hover': { borderColor: C.orange, background: C.orangeDim },
            }}>
            SIGN IN
          </Button>

          <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', textAlign: 'center', color: C.textDim }}>
            No account?{' '}
            <Link onClick={() => navigate('/register')}
              sx={{ color: C.orange, cursor: 'pointer', '&:hover': { color: '#ff8533' } }}>
              Register
            </Link>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}