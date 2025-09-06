/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for Advanced RAG 2025
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'sqlite3', 'bcryptjs'],
    optimizeCss: true,
  },
  
  // Webpack configuration for PDF processing and AI libraries
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Disable canvas for PDF parsing compatibility
    config.resolve.alias.canvas = false;
    
    // Handle SQLite3 for server-side database operations
    if (isServer) {
      config.externals.push({
        'sqlite3': 'commonjs sqlite3',
        'bcryptjs': 'commonjs bcryptjs'
      });
    }
    
    // Optimize for AI/ML libraries
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
  
  // API configuration for large PDF files and AI responses
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Support up to 10MB PDF uploads
    },
    responseLimit: '8mb', // Allow large AI responses
  },
  
  // Optimize for production deployment
  compress: true,
  poweredByHeader: false,
  
  // Environment variables configuration
  env: {
    APP_NAME: 'Advanced RAG 2025 PDF Q&A',
    APP_VERSION: '2.0.0',
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : process.env.NEXTAUTH_URL || 'http://localhost:3000'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  
  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/docs',
        destination: '/api/docs',
        permanent: false
      }
    ];
  }
}

module.exports = nextConfig