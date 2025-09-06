'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ValidationError {
  field: string;
  message: string;
}

interface ErrorMessageProps {
  message?: string;
  validationErrors?: ValidationError[];
  onClose?: () => void;
  className?: string;
}

export function ErrorMessage({ 
  message, 
  validationErrors, 
  onClose, 
  className = '' 
}: ErrorMessageProps) {
  if (!message && (!validationErrors || validationErrors.length === 0)) {
    return null;
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
        <div className="ml-3 flex-1">
          {message && (
            <p className="text-sm text-red-800 font-medium">
              {message}
            </p>
          )}
          
          {validationErrors && validationErrors.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-red-800 font-medium mb-2">
                Please fix the following errors:
              </p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>
                    <span className="font-medium capitalize">{error.field}:</span> {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function SuccessMessage({ 
  message, 
  onClose, 
  className = '' 
}: { 
  message: string; 
  onClose?: () => void; 
  className?: string; 
}) {
  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="h-5 w-5 bg-green-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-green-800 font-medium">
            {message}
          </p>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto flex-shrink-0 rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
            aria-label="Dismiss success message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}