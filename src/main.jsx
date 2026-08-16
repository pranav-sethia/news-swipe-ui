import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

import App from './App.jsx';
import Auth from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Privacy from './pages/Privacy.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import AuthRoute from './components/AuthRoute.jsx';
import MobileGate from './components/MobileGate.jsx';
import './index.css';
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
    element: <Auth />,
  },
  {
    path: '/register',
    element: <Auth />,
  },
  {
    path: '/privacy',
    element: <Privacy />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/',
    // Only the actual swipe app (and its onboarding step) is gated on
    // mobile - the landing/auth pages, privacy policy, etc. render on any
    // viewport, since those are pure content with no drag/swipe interaction.
    element: <MobileGate><AuthRoute /></MobileGate>,
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);