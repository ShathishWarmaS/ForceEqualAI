'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <div 
            className={`animate-spin rounded-full border-2 border-transparent bg-gradient-to-r from-cyan-400 to-blue-500 ${sizeClasses[size]}`}
            style={{
              background: 'conic-gradient(from 0deg, #00d4ff, #667eea, #764ba2, #f093fb, #00d4ff)',
              borderRadius: '50%'
            }}
            role="status"
            aria-label="Loading"
          />
          <div 
            className={`absolute inset-0.5 rounded-full bg-gray-900 ${sizeClasses[size]}`}
          />
        </div>
        {text && (
          <p className="text-sm text-slate-300 font-medium">
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({ 
  progress, 
  text, 
  className = '' 
}: { 
  progress: number; 
  text?: string; 
  className?: string; 
}) {
  return (
    <div className={`w-full ${className}`}>
      {text && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-white">{text}</span>
          <span className="text-sm text-cyan-400 font-mono">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full bg-white/10 rounded-full h-3 border border-cyan-500/30 overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out relative"
          style={{ 
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: 'linear-gradient(90deg, #00d4ff, #667eea, #764ba2)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
          }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}