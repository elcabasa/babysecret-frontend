import type { NextConfig } from "next";

// Host of the Base44 preview origin (e.g. "3000-<suffix>.imported.base44-preview.app").
// Used for dev-asset/HMR origin checks and to allow the preview origin through the
// Server Actions CSRF check (the proxy's forwarded host differs from the origin).
const previewHost = process.env.BASE44_PUBLIC_HOST_SUFFIX
  ? `3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`
  : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: previewHost ? [previewHost] : [],
  experimental: {
    serverActions: {
      allowedOrigins: previewHost ? [previewHost] : [],
    },
  },
};

export default nextConfig;
