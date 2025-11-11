import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Paper, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.register( email, password );
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000); // Redirect after 2s
    } catch (err) {
      setError(err.message || 'Failed to register.');
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at 30% 50%, #050505, #000)',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          padding: 4,
          borderRadius: 4,
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0px 0px 30px rgba(0,255,255,0.12)',
          color: 'white',
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 600 }}>
          Register
        </Typography>
        
        <TextField
          label="Email"
          type="email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          InputLabelProps={{ sx: { color: 'grey' } }}
          InputProps={{ sx: { color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } } }}
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
          InputLabelProps={{ sx: { color: 'grey' } }}
          InputProps={{ sx: { color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } } }}
        />
        
        {error && (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
        {success && (
          <Typography color="success.main" align="center" sx={{ mt: 2 }}>
            {success}
          </Typography>
        )}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{
            mt: 3,
            background: "rgba(0,255,255,0.15)",
            "&:hover": { background: "rgba(0,255,255,0.25)" },
          }}
        >
          Create Account
        </Button>
        <Typography align="center" sx={{ mt: 2 }}>
          Already have an account?{' '}
          <Link href="/login" sx={{ color: '#00e5ff' }}>
            Login here
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}