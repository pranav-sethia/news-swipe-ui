import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as api from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await api.login(email, password);

      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error || 'Login failed. Please try again.'
      );
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 30% 50%, #050505, #000)',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(20, 20, 20, 0.85)',
          color: 'white',
          borderRadius: '20px',
          boxShadow: '0px 0px 30px rgba(0,255,250,0.12)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          textAlign="center"
          sx={{ fontWeight: '600', color: 'white' }}
        >
          Login
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            InputLabelProps={{
              style: { color: 'rgba(255, 255, 255, 0.7)' },
            }}
            InputProps={{
              style: { color: 'white', borderColor: 'rgba(255, 255, 255, 0.3)' },
              classes: {
                notchedOutline: 'rgba(255, 255, 255, 0.3)',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0,255,250,0.7)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(0,255,250,1)',
                },
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputLabelProps={{
              style: { color: 'rgba(255, 255, 255, 0.7)' },
            }}
            InputProps={{
              style: { color: 'white' },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(0,255,250,0.7)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(0,255,250,1)',
                },
              },
            }}
          />
          {error && (
            <Typography
              color="error"
              variant="body2"
              textAlign="center"
              sx={{ mt: 2 }}
            >
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              mt: 3,
              mb: 2,
              padding: '12px',
              fontWeight: '600',
              background: 'rgba(0,255,250,0.15)',
              color: 'white',
              '&:hover': {
                background: 'rgba(0,255,250,0.25)',
              },
            }}
          >
            Login
          </Button>
          <Typography variant="body2" textAlign="center" color="rgba(255, 255, 255, 0.7)">
            Don't have an account?{' '}
            <Link
              onClick={() => navigate('/register')}
              sx={{
                color: 'rgba(0,255,250,1)',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Register
            </Link>
          </Typography>
        </form>
      </Paper>
    </Box>
  );
}