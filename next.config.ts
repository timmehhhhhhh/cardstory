import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @prisma/client is already in Next's built-in serverExternalPackages
  // default list, which is what keeps its dynamic engine-binary-path
  // resolution code (`path.join(process.cwd(), ...)`) from making Next's
  // file tracer sweep up the whole project (public/, etc.) into the server
  // output. The second, Workers-only client generated to src/generated/
  // prisma-edge (see prisma/schema.prisma, src/lib/db.ts) isn't a known
  // package, so it doesn't get that treatment automatically — without this,
  // the resulting Worker bundle blew past Cloudflare's 3 MiB size limit.
  serverExternalPackages: [".prisma/client-edge"],
  // Lets the dev server accept requests from a Cloudflare quick tunnel
  // (used for testing on a phone away from the local network — see README).
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    // Every card <Image> passes `unoptimized` (see components/cards/card-image.tsx),
    // so this list is currently never consulted — it's kept accurate so that
    // dropping `unoptimized` later doesn't silently blank the catalog.
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      // Non-English Pokémon scans, backfilled from the official publisher
      // sites — see scripts/crawl-pokemon-ja-images.ts / -tw-images.ts.
      { protocol: "https", hostname: "www.pokemon-card.com" },
      { protocol: "https", hostname: "asia.pokemon-card.com" },
      // Flesh and Blood (api.goagain.dev serves art from all four).
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "d2wlb52bya4y8z.cloudfront.net" },
      { protocol: "https", hostname: "dhhim4ltzu1pj.cloudfront.net" },
      { protocol: "https", hostname: "legendstory-production-s3-public.s3.amazonaws.com" },
    ],
  },
  // /portfolio was renamed to /pc; keep old bookmarks/links working.
  redirects() {
    return [
      { source: "/portfolio", destination: "/pc", permanent: true },
      { source: "/portfolio/:path*", destination: "/pc/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
