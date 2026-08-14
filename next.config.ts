import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests from a Cloudflare quick tunnel
  // (used for testing on a phone away from the local network — see README).
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.scrydex.com" },
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "svgs.scryfall.io" },
    ],
  },
};

export default nextConfig;
