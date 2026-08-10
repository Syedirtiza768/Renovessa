import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdfkit must be required from node_modules at runtime: when webpack-bundled
  // into .next/server/chunks, its __dirname-relative AFM font data
  // (node_modules/pdfkit/js/data/*.afm) is unreachable and every PDF
  // generation (brief, proposal) fails with ENOENT in the standalone image.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
