# HackerSwipe

A swipe-based Hacker News reader that learns what you like. Each card is a story with a short AI summary; swipe right on ones you'd read and left on ones you wouldn't, and the feed gets more personal as you go. Try it at [hackerswipe.com](https://hackerswipe.com).

This repo is the web app. The recommender, the ingestion pipeline and the API are in [news-swipe-api](https://github.com/pranav-sethia/news-swipe-api).

## What's in it

- Swipe by dragging a card or with the arrow keys. It's built for desktop browsers.
- Personal picks show a match score; hover it to see the story you liked that led to the pick.
- Comments on each story, opened from the card.
- Onboarding where you pick topics to start with, plus a short guided tour.
- Email and Google sign-in, or a guest account to start swiping right away.
- A sidebar with your saved stories, swipe stats and streak.

## Stack

React with Vite, Material UI, Framer Motion, React Router, PostHog for product analytics, and Vercel for hosting.

## Running it locally

```bash
npm install
npm run dev
```

Set `VITE_API_URL` to the API's address and `VITE_GOOGLE_CLIENT_ID` for Google sign-in. `VITE_POSTHOG_KEY` and `VITE_POSTHOG_HOST` are optional.
