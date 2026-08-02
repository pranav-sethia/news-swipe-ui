import posthog from 'posthog-js';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let ready = false;

export function initAnalytics() {
  if (!KEY) {
    console.info('Analytics disabled: set VITE_POSTHOG_KEY to enable.');
    return;
  }
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: true,
    autocapture: false,
  });
  ready = true;
}

export function track(event, properties) {
  if (!ready) return;
  posthog.capture(event, properties);
}

export function identify(userId, properties) {
  if (!ready) return;
  posthog.identify(userId, properties);
}

export function resetAnalyticsIdentity() {
  if (!ready) return;
  posthog.reset();
}
