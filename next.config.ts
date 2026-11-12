import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/api/pages/index.html',
      },
      {
        source: '/sitemap_index.xml',
        destination: '/sitemap.xml',
      },
      {
        source:
          '/:page(index\\.html|about\\.html|safari-parks\\.html|yala-safari\\.html|udawalawe-safari\\.html|bundala-birding-safari\\.html|wilpattu-safari\\.html|minneriya-safari\\.html|kumana-birding-safari\\.html|gallery\\.html|reviews\\.html|contact\\.html)',
        destination: '/api/pages/:page',
      },
      {
        source:
          '/:slug(index|about|safari-parks|yala-safari|udawalawe-safari|bundala-birding-safari|wilpattu-safari|minneriya-safari|kumana-birding-safari|gallery|reviews|contact)',
        destination: '/api/pages/:slug.html',
      },
      {
        source: '/assets/media/:path*',
        destination: '/api/media/:path*',
      },
      {
        source: '/admin.html',
        destination: '/admin',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/admin.html',
        destination: '/admin',
        permanent: false,
      },
    ];
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
