import { useState, useEffect, useRef } from 'react';
import { MOBILE_BREAKPOINT } from './theme.js';
import * as api from './api.js';
import { track } from './analytics.js';

function decodeToken(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}

// Shared by AuthModal's own guest button and the landing page hero's "or
// explore as guest" shortcut (Auth.jsx), which bypasses the modal entirely -
// both need the exact same fix, so this lives in one place rather than two.
// Guests get a real backing account with a visible expiry countdown, so a
// still-valid one should be resumed rather than silently replaced - minting
// a new guest here used to unconditionally overwrite the token in
// localStorage, permanently orphaning the previous guest's swipe history
// (the row itself was never deleted, just no longer referenced anywhere).
export function useGuestSession(onAuthenticated) {
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  const handleGuest = async () => {
    setGuestLoading(true);
    setGuestError("");
    try {
      const existingToken = localStorage.getItem("token");
      const decoded = existingToken ? decodeToken(existingToken) : null;
      if (decoded?.user?.isGuest && decoded.exp * 1000 > Date.now()) {
        onAuthenticated?.({ action: "guest", resumedExistingGuest: true });
        return;
      }
      const res = await api.loginAsGuest();
      localStorage.setItem("token", res.data.token);
      localStorage.removeItem("hs_onboarding_done");
      // hs_seen_onboarding gates the separate in-app tutorial overlay (the
      // swipe walkthrough on the feed) and was never cleared anywhere - once
      // any guest on this browser saw it once, every later guest session
      // silently skipped it forever, even though each new guest is a fresh,
      // isolated account. Clear it here too so a new guest session actually
      // gets a fresh tour, same as the category picker already does.
      localStorage.removeItem("hs_seen_onboarding");
      // Same story for the 5-like guest-conversion nudge (App.jsx) - it's
      // meant to fire once per guest session on their 5th like, but the flag
      // lived in localStorage with nothing ever clearing it, so a second
      // guest session on the same browser silently never saw it again even
      // starting from 0 likes. Clear it here too.
      localStorage.removeItem("hs_seen_like_milestone");
      // Same story for the sidebar's one-time archetype-reveal animation
      // (Sidebar.jsx) - missed in the same cleanup above, so a second guest
      // on this browser who reaches the archetype threshold again wouldn't
      // get the reveal animation, even though the archetype itself is still
      // correctly recomputed for their fresh account.
      localStorage.removeItem("hs_archetype_revealed");
      // Same story for the one-time "matches unlocked" celebration toast
      // (App.jsx) - a fresh guest starts back at 0 likes and should see it
      // again once they re-earn it, not have it permanently silenced by a
      // previous guest session on the same browser.
      localStorage.removeItem("hs_seen_matches_unlocked");
      track("guest_started");
      onAuthenticated?.({ action: "guest", resumedExistingGuest: false });
    } catch {
      setGuestError("Failed to start guest session. Please try again.");
    } finally {
      setGuestLoading(false);
    }
  };

  return { handleGuest, guestLoading, guestError };
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}

export function useTypewriter(text, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;
    lastTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // If there's no text (null, undefined, empty string), mark complete immediately
    // so the description block fades in and the card is never stuck blank.
    if (!text) { setDone(true); return; }
    setDone(false);
    if (!active) return;

    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      if (elapsed >= speed) {
        lastTimeRef.current = timestamp;
        indexRef.current += 1;
        setDisplayed(text.slice(0, indexRef.current));
        if (indexRef.current >= text.length) { setDone(true); return; }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, active, speed]);

  return { displayed: active ? displayed : "", done: active ? done : false };
}
