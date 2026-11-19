import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext checks multipart POSTs against this limit before API routing.
  // Allow the uploader's 8 MiB image limit plus multipart overhead.
  experimental: {
    serverActions: {
      bodySizeLimit: "9mb",
    },
  },
};

export default nextConfig;
