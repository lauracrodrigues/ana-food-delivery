// v1.1.0 — Sentry error tracking setup
import * as Sentry from "@sentry/react";

export function initSentry() {
  Sentry.init({
    dsn: "https://19554d1ce19de82226c30cd0bff53110@o4511331975430144.ingest.us.sentry.io/4511331992731648",
    environment: import.meta.env.MODE,
    enabled: import.meta.env.PROD,
    sendDefaultPii: true,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) return null;
      return event;
    },
  });
}

export { Sentry };
