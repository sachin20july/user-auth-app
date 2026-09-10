import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Security: prevent authentication tokens in URLs from being
  // leaked to other websites through the HTTP Referer header.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "no-referrer",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
