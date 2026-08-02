// Shared CSS transition tokens. Framer Motion is only used for the swipe
// card's drag gesture in NewsCard.jsx; everything else animates with plain
// CSS transitions/keyframes using these curves instead of ad hoc values.

export const EASE = {
  // Back-out: overshoots slightly then settles. Use for snappy UI feedback
  // (hover lifts, active-tab indicators, button presses).
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Ease-out-expo: fast start, decisive settle, no overshoot. Use for
  // panel expand/collapse and anything that should feel weighted, not bouncy.
  decisive: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Standard ease-in-out. Use as the default for simple fades/opacity.
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

export const DURATION = {
  fast: 150,
  base: 250,
  slow: 400,
};

export function transition(properties, { duration = DURATION.base, ease = EASE.standard, delay = 0 } = {}) {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map((p) => `${p} ${duration}ms ${ease}${delay ? ` ${delay}ms` : ''}`)
    .join(', ');
}
