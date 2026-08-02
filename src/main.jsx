import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Onboarding from './pages/Onboarding.jsx';
import AuthRoute from './components/AuthRoute.jsx';
import MobileGate from './components/MobileGate.jsx';
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GOOGLE_CLIENT_ID } from './config.js';
import { C } from './theme.js';
import { initAnalytics } from './analytics.js';

initAnalytics();

// Create a simple dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#050505',
      paper: 'rgba(20, 20, 20, 0.85)',
    },
    primary: {
      main: C.teal,
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
  },
});

// Define our app's routes
const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <AuthRoute />,
    children: [
      {
        path: '/',
        element: <App />,
      },
      {
        path: '/onboarding',
        element: <Onboarding />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <MobileGate>
          <RouterProvider router={router} />
        </MobileGate>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);