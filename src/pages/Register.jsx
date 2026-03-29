import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
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

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await api.register(email, password);
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to register. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        component="form"
        onSubmit={handleSubmit}
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
            Create a new account
          </Typography>
        </Box>

        <TextField label="Email" type="email" variant="outlined" fullWidth margin="normal"
          value={email} onChange={(e) => setEmail(e.target.value)} required sx={inputSx} />
        <TextField label="Password" type="password" variant="outlined" fullWidth margin="normal"
          value={password} onChange={(e) => setPassword(e.target.value)} required sx={inputSx} />

        {error && (
          <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.8rem', color: '#f87171', mt: 1.5, textAlign: 'center', fontWeight: 600 }}>
            {error}
          </Typography>
        )}
        {success && (
          <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.8rem', color: '#4ade80', mt: 1.5, textAlign: 'center', fontWeight: 600 }}>
            {success}
          </Typography>
        )}

        <Button type="submit" variant="outlined" fullWidth disabled={isLoading}
          sx={{
            mt: 3, mb: 2, py: 1.4,
            fontFamily: C.fontMono, fontSize: '0.8rem',
            color: C.orange, borderColor: C.border, borderRadius: '10px',
            '&:hover': { borderColor: C.orange, background: C.orangeDim },
            '&:disabled': { color: 'rgba(255,102,0,0.4)', borderColor: 'rgba(255,102,0,0.2)' }
          }}>
          {isLoading ? <CircularProgress size={20} sx={{ color: C.orange }} /> : 'CREATE ACCOUNT'}
        </Button>

        <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.8rem', textAlign: 'center', color: C.textDim }}>
          Already have an account?{' '}
          <Link onClick={() => navigate('/login')}
            sx={{ color: C.orange, cursor: 'pointer', fontFamily: C.fontMono, '&:hover': { color: '#ff8533' }, textDecoration: "none" }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
