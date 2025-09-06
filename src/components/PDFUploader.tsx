'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle, Shield, Clock } from 'lucide-react';
import { ErrorMessage, SuccessMessage } from './ErrorMessage';
import { LoadingSpinner, ProgressBar } from './LoadingSpinner';

interface PDFUploaderProps {
  onUploadSuccess: (documentId: string) => void;
}

interface UploadError {
  message?: string;
  validationErrors?: Array<{ field: string; message: string }>;
  rateLimitInfo?: { resetTime: number };
}

export default function PDFUploader({ onUploadSuccess }: PDFUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    validationErrors?: Array<{ field: string; message: string }>;
    rateLimitInfo?: { resetTime: number };
  }>({ type: null, message: '' });
  const [dragActive, setDragActive] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { token } = useAuth();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'Please select a PDF file.' };
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: 'File size must be less than 10MB.' };
    }

    // Check filename length
    if (file.name.length > 255) {
      return { valid: false, error: 'Filename is too long.' };
    }

    // Basic security checks
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.com', '.pif'];
    const fileName = file.name.toLowerCase();
    
    for (const ext of dangerousExtensions) {
      if (fileName.includes(ext)) {
        return { valid: false, error: 'File contains potentially dangerous content.' };
      }
    }

    return { valid: true };
  };

  const handleFile = async (file: File) => {
    // Reset states
    setUploadStatus({ type: null, message: '' });
    setUploadProgress(0);
    setUploadPhase('idle');

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadStatus({
        type: 'error',
        message: validation.error!,
      });
      return;
    }

    // Set file info
    setFileInfo({ name: file.name, size: file.size });
    setIsUploading(true);
    setUploadPhase('uploading');
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 30) return prev + 2;
          return prev;
        });
      }, 100);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(40);
      setUploadPhase('processing');

      const data = await response.json();

      // Handle different response statuses
      if (response.status === 429) {
        // Rate limited
        setUploadStatus({
          type: 'error',
          message: data.message || 'Too many requests. Please wait before uploading again.',
          rateLimitInfo: data.rateLimitInfo
        });
      } else if (response.status === 400) {
        // Validation errors
        setUploadStatus({
          type: 'error',
          message: data.message || 'Invalid file or request.',
          validationErrors: data.validationErrors
        });
      } else if (data.success) {
        // Success
        setUploadProgress(100);
        setUploadPhase('complete');
        
        setTimeout(() => {
          setUploadStatus({
            type: 'success',
            message: data.message,
          });
          onUploadSuccess(data.documentId);
        }, 500);
      } else {
        // Other errors
        setUploadStatus({
          type: 'error',
          message: data.message || 'Upload failed.',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadPhase('idle');
        setUploadProgress(0);
        setFileInfo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-2">
                {uploadPhase === 'uploading' && <Upload className="h-5 w-5 text-blue-600" />}
                {uploadPhase === 'processing' && <Shield className="h-5 w-5 text-blue-600" />}
                {uploadPhase === 'complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                <LoadingSpinner size="sm" />
              </div>
              
              {fileInfo && (
                <div className="text-xs text-gray-500">
                  <p className="font-medium">{fileInfo.name}</p>
                  <p>{(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              <ProgressBar 
                progress={uploadProgress}
                text={
                  uploadPhase === 'uploading' ? 'Uploading...' :
                  uploadPhase === 'processing' ? 'Processing PDF...' :
                  uploadPhase === 'complete' ? 'Complete!' : 'Processing...'
                }
                className="w-full"
              />
              
              {uploadPhase === 'processing' && (
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Extracting text and generating embeddings...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Upload your PDF
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop a PDF file here, or click to browse
              </p>
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Choose File
              </button>
              
              <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                <Shield className="h-3 w-3 mr-1" />
                <span>Files are processed securely and not stored permanently</span>
              </div>
            </>
          )}
        </div>
      </div>

      {uploadStatus.type === 'error' && (
        <ErrorMessage
          message={uploadStatus.message}
          validationErrors={uploadStatus.validationErrors}
          onClose={() => setUploadStatus({ type: null, message: '' })}
          className="mt-4"
        />
      )}

      {uploadStatus.type === 'success' && (
        <SuccessMessage
          message={uploadStatus.message}
          onClose={() => setUploadStatus({ type: null, message: '' })}
          className="mt-4"
        />
      )}

      {uploadStatus.rateLimitInfo && (
        <div className="mt-2 text-xs text-orange-600 text-center">
          Rate limit reset: {new Date(uploadStatus.rateLimitInfo.resetTime).toLocaleTimeString()}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 text-center space-y-1">
        <p>• Supported format: PDF only</p>
        <p>• Maximum file size: 10MB</p>
        <p>• Files are validated for security</p>
        <p>• Processing time: ~10-30 seconds per MB</p>
      </div>
    </div>
  );
}