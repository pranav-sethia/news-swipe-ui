import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link, Divider, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import * as api from '../api.js';
import { C } from '../theme.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const res = await api.login(email, password);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      const res = await api.loginAsGuest();
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch {
      setError('Failed to start guest session. Please try again.');
      setGuestLoading(false);
    }
  };

  // Using official GoogleLogin to bypass popup blockers

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

        {/* Sleek wrapper to blend the official Google button into the dark theme */}
        <Box sx={{
          display: 'flex', justifyContent: 'center', width: '100%', mb: 3,
          borderRadius: '10px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.02)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          transition: 'all 0.2s ease',
          '& > div': { width: '100%' },
          '&:hover': { borderColor: 'rgba(255,255,255,0.4)', transform: 'translateY(-1px)' }
        }}>
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              setError('');
              try {
                const res = await api.loginWithGoogle(credentialResponse.credential);
                localStorage.setItem('token', res.data.token);
                navigate('/');
              } catch {
                setError('Google Sign-In failed on the server. Please try again.');
              }
            }}
            onError={() => setError('Google Sign-In was cancelled or failed.')}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="continue_with"
            width="350"
          />
        </Box>

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

          <Button type="submit" variant="outlined" fullWidth disabled={loginLoading}
            sx={{
              mt: 2.5, mb: 2, py: 1.4,
              fontFamily: C.fontMono, fontSize: '0.8rem',
              color: C.orange, borderColor: C.border, borderRadius: '10px',
              '&:hover': { borderColor: C.orange, background: C.orangeDim },
              '&:disabled': { color: 'rgba(255,102,0,0.4)', borderColor: 'rgba(255,102,0,0.2)' }
            }}>
            {loginLoading ? <CircularProgress size={20} sx={{ color: C.orange }} /> : 'SIGN IN'}
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