'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileText, AlertCircle, CheckCircle, Shield, Clock, Zap } from 'lucide-react';
import { ErrorMessage, SuccessMessage } from './ErrorMessage';
import { LoadingSpinner, ProgressBar } from './LoadingSpinner';
import { addUserDocument, Document } from '@/lib/documentStorage';

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
  const { token, user } = useAuth();

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
        
        // Store document metadata in user-specific localStorage
        if (data.document && user) {
          const documentToStore: Document = {
            id: data.document.id,
            filename: data.document.filename,
            uploadedAt: new Date(data.document.uploadedAt || data.document.uploadDate || Date.now()),
            size: data.document.size || fileInfo?.size || 0,
            type: 'application/pdf',
            chunks: data.document.chunks
          };
          addUserDocument(documentToStore, user.id);
        }
        
        setTimeout(() => {
          setUploadStatus({
            type: 'success',
            message: data.message,
          });
          onUploadSuccess(data.documentId);
          // Dispatch event to refresh document list
          window.dispatchEvent(new CustomEvent('documentsUpdated'));
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

  // Don't show uploader if user is not authenticated
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto text-center p-8">
        <div className="card-futuristic p-6 border-red-500/20">
          <Shield className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <p className="text-white font-medium mb-2">Authentication Required</p>
          <p className="text-sm text-slate-400">Please sign in to upload documents</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition-all duration-500 group ${
          dragActive
            ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-2xl shadow-cyan-500/25 scale-105'
            : 'border-cyan-500/30 card-futuristic hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/20 hover:scale-102'
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
        
        <div className="text-center relative">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse">
                  {uploadPhase === 'uploading' && <Upload className="h-8 w-8 text-white" />}
                  {uploadPhase === 'processing' && <Zap className="h-8 w-8 text-white" />}
                  {uploadPhase === 'complete' && <CheckCircle className="h-8 w-8 text-white" />}
                </div>
                <div className="absolute inset-0 rounded-full bg-cyan-400/30 blur-xl animate-pulse"></div>
              </div>
              
              {fileInfo && (
                <div className="card-futuristic p-3 border-cyan-500/30">
                  <p className="text-sm font-medium text-white">{fileInfo.name}</p>
                  <p className="text-xs text-cyan-400">{(fileInfo.size / 1024 / 1024).toFixed(2)} MB</p>
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
                <div className="flex items-center text-xs text-slate-300">
                  <Clock className="h-3 w-3 mr-1 text-cyan-400" />
                  <span>Extracting text and generating embeddings...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative mb-6">
                <Upload className="mx-auto h-16 w-16 text-cyan-400 float group-hover:scale-[1.05] transition-transform duration-200" />
                <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-cyan-400/20 blur-xl group-hover:bg-cyan-400/30"></div>
              </div>
              <p className="text-xl font-bold text-white mb-2 text-holographic">
                Upload your PDF
              </p>
              <p className="text-sm text-slate-300 mb-6">
                Drag and drop a PDF file here, or click to browse
              </p>
              <button
                type="button"
                className="btn-futuristic disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText className="mr-2 h-4 w-4" />
                Choose File
              </button>
              
              <div className="mt-6 flex items-center justify-center text-xs text-slate-400">
                <Shield className="h-3 w-3 mr-1 text-green-400" />
                <span>Your files are secure and private to your account</span>
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

      <div className="mt-6 text-xs text-slate-400 text-center space-y-2">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-1">
            <FileText className="h-3 w-3 text-blue-400" />
            <span>PDF only</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3 text-green-400" />
            <span>10MB max</span>
          </div>
        </div>
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3 text-purple-400" />
            <span>Security validated</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span>~10-30s per MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}