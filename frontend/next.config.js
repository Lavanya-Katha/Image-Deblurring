/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    domains: ['localhost'],
  },
  webpack: (config) => {
    // Add support for importing .keras files
    config.module.rules.push({
      test: /\.keras$/,
      type: 'asset/resource',
    });
    return config;
  },
};

module.exports = nextConfig; 