// Resolves where the Convex backend lives for the running bundle.
//
// - Dev/preview: the browser talks to the Vite origin, which proxies /api to
//   the local Convex backend (see vite.config.ts). This keeps the preview a
//   single exposed port.
// - Production: VITE_CONVEX_URL (set via the hosting env) points at a cloud
//   Convex deployment.
const envUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;

export const BACKEND_URL: string | undefined = import.meta.env.DEV
  ? window.location.origin
  : envUrl && /^https?:\/\//.test(envUrl)
    ? envUrl
    : undefined;

export const backendReady = Boolean(BACKEND_URL);
