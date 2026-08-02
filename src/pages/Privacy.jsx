import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { C } from '../theme.js';

const SUPPORT_EMAIL = 'YOUR_EMAIL_HERE@example.com';

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.orange, letterSpacing: '0.08em', mb: 1.5 }}>
        {title}
      </Typography>
      <Typography sx={{ fontFamily: C.fontUi, fontSize: '0.9rem', color: 'rgba(232,232,232,0.75)', lineHeight: 1.7 }}>
        {children}
      </Typography>
    </Box>
  );
}

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <Box sx={{
      minHeight: '100vh', background: C.bg, py: 8, px: 3,
      backgroundImage: `linear-gradient(rgba(255,102,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,102,0,0.03) 1px, transparent 1px)`,
      backgroundSize: '32px 32px',
    }}>
      <Box sx={{ maxWidth: 640, mx: 'auto' }}>
        <Typography
          onClick={() => navigate(-1)}
          sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.textDim, cursor: 'pointer', mb: 4, '&:hover': { color: '#fff' } }}
        >
          {'< Back'}
        </Typography>

        <Typography sx={{ fontFamily: C.fontPixel, fontSize: '0.6rem', color: C.orange, letterSpacing: '0.1em', mb: 2 }}>
          HACKERSWIPE
        </Typography>
        <Typography sx={{ fontFamily: C.fontUi, fontSize: '1.8rem', fontWeight: 800, color: '#fff', mb: 1 }}>
          Privacy Policy
        </Typography>
        <Typography sx={{ fontFamily: C.fontMono, fontSize: '0.75rem', color: C.textDim, mb: 5 }}>
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>

        <Section title="WHAT WE COLLECT">
          If you create an account: your email and a hashed password (we never store your actual password).
          If you sign in with Google: your Google account email.
          If you use a guest session: nothing beyond what's needed to run that session, no email or password at all.
          As you use the app: which stories you like, dislike, or skip. That's what builds your taste profile.
        </Section>

        <Section title="HOW WE USE IT">
          Your likes and dislikes train a taste vector that ranks your feed. Nothing else. We don't sell your data,
          and we don't use it for advertising.
        </Section>

        <Section title="AI SUMMARIES">
          When you ask the AI to summarize a comment thread, the comment text (which is already public on Hacker News)
          is sent to Groq, our AI provider, to generate that summary. Your account details are not included in that request.
        </Section>

        <Section title="GUEST SESSIONS">
          Guest accounts expire after 24 hours. Once expired, that session can't be recovered, and an automated job
          periodically deletes inactive guest accounts and their data entirely.
        </Section>

        <Section title="WHAT'S STORED IN YOUR BROWSER">
          Just one thing: a login token, so you stay signed in. No tracking cookies of our own.
        </Section>

        <Section title="THIRD PARTIES WE USE">
          Google, for optional sign-in. Groq, for AI comment summaries. PostHog, for basic product analytics
          (which pages get used, not what you personally read or liked). Sentry, for catching backend errors.
          Each only receives what's needed to do its job.
        </Section>

        <Section title="DELETING YOUR DATA">
          There's no self-serve delete button yet. Email {SUPPORT_EMAIL} and we'll remove your account and all
          associated data.
        </Section>

        <Section title="CHANGES">
          If this policy changes in any meaningful way, the date at the top of this page will be updated.
        </Section>

        <Section title="CONTACT">
          Questions about any of this: {SUPPORT_EMAIL}.
        </Section>
      </Box>
    </Box>
  );
}
