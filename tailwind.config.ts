import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable dark mode support
  theme: {
    extend: {
      // Custom colors for Advanced RAG 2025 theme
      colors: {
        'rag-primary': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        'rag-secondary': {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          900: '#0f172a',
        },
        'rag-accent': {
          50: '#fefce8',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          900: '#78350f',
        },
        'rag-success': {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        'rag-error': {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          900: '#7f1d1d',
        },
      },
      
      // Custom background gradients for AI interface
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'rag-gradient': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'ai-mesh': 'radial-gradient(circle at 20% 50%, #3b82f620 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1d4ed820 0%, transparent 50%), radial-gradient(circle at 40% 80%, #f59e0b20 0%, transparent 50%)',
      },
      
      // Custom animations for interactive elements
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-soft': 'bounceSort 2s ease-in-out infinite',
        'thinking': 'thinking 1.5s ease-in-out infinite',
      },
      
      // Custom keyframes
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        bounceSort: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        thinking: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
      },
      
      // Custom spacing for AI interface elements
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Custom typography for AI responses
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      },
      
      // Custom border radius for modern design
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      
      // Custom shadows for depth
      boxShadow: {
        'rag': '0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
        'rag-lg': '0 20px 40px -12px rgba(59, 130, 246, 0.15), 0 8px 16px -4px rgba(59, 130, 246, 0.1)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      
      // Custom font sizes for AI interface
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
    },
  },
  plugins: [
    // Add typography plugin for better text rendering
    // require('@tailwindcss/typography'),
  ],
}
export default config