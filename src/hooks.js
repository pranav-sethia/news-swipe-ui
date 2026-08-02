import { useState, useEffect, useRef } from 'react';
import { MOBILE_BREAKPOINT } from './theme.js';

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
