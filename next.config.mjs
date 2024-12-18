/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        aws4: false
      };
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['puppeteer']
  }
};

export default nextConfig;
