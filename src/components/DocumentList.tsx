'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Trash2, MessageSquare, Clock, Shield } from 'lucide-react';

interface Document {
  id: string;
  filename: string;
  uploadDate: Date;
  chunks: number;
}

interface DocumentListProps {
  currentDocumentId?: string;
  onDocumentSelect: (documentId: string) => void;
  onDocumentDelete?: (documentId: string) => void;
}

export default function DocumentList({ 
  currentDocumentId, 
  onDocumentSelect, 
  onDocumentDelete 
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load documents and listen for changes
  useEffect(() => {
    const loadDocuments = () => {
      const storedDocs = localStorage.getItem('uploadedDocuments');
      if (storedDocs) {
        try {
          const docs = JSON.parse(storedDocs);
          setDocuments(docs.map((doc: any) => ({
            ...doc,
            uploadDate: new Date(doc.uploadDate)
          })));
        } catch (error) {
          console.error('Error loading documents:', error);
        }
      }
      setIsLoading(false);
    };

    loadDocuments();

    // Listen for storage changes (when new documents are uploaded)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'uploadedDocuments') {
        loadDocuments();
      }
    };

    // Also listen for custom events
    const handleDocumentUpdate = () => {
      loadDocuments();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('documentsUpdated', handleDocumentUpdate);
    
    // Poll for updates every 2 seconds to catch localStorage changes
    const interval = setInterval(loadDocuments, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('documentsUpdated', handleDocumentUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleDelete = (documentId: string) => {
    if (window.confirm('Are you sure you want to delete this document? This will remove all associated data.')) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Update localStorage
      const updatedDocs = documents.filter(doc => doc.id !== documentId);
      localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));
      
      // Call parent handler
      onDocumentDelete?.(documentId);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-cyan-500/20">
          <h3 className="text-lg font-medium text-white mb-4">Your Documents</h3>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center p-3 card-futuristic border-cyan-500/20">
              <div className="h-4 w-4 bg-cyan-400/20 rounded mr-3"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-cyan-400/20 rounded w-3/4"></div>
                <div className="h-3 bg-slate-400/20 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-cyan-500/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Your Documents</h3>
          <div className="flex items-center text-sm text-slate-400">
            <Shield className="h-4 w-4 mr-1 text-green-400" />
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="relative mb-4">
              <FileText className="h-12 w-12 mx-auto text-purple-400 float" />
              <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-purple-400/20 blur-xl"></div>
            </div>
            <p className="text-sm text-white">No documents uploaded yet</p>
            <p className="text-xs mt-1 text-slate-400">Upload a PDF to get started with AI Q&A</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 card-futuristic cursor-pointer transition-all duration-300 group hover:scale-105 ${
                  currentDocumentId === doc.id 
                    ? 'border-purple-500/50 bg-gradient-to-r from-purple-500/20 to-pink-500/20 shadow-lg shadow-purple-500/25' 
                    : 'hover:border-purple-500/30 hover:bg-white/5'
                }`}
                onClick={() => onDocumentSelect(doc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-full ${
                      currentDocumentId === doc.id 
                        ? 'bg-purple-500/20 border border-purple-500/50' 
                        : 'bg-slate-500/20 border border-slate-500/50'
                    }`}>
                      <FileText className={`h-4 w-4 ${
                        currentDocumentId === doc.id ? 'text-purple-400' : 'text-slate-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-purple-400 transition-colors">
                        {doc.filename}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-slate-400">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(doc.uploadDate)}
                        </div>
                        
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {doc.chunks} chunks
                        </div>
                      </div>
                      
                      {currentDocumentId === doc.id && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Active Document
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {onDocumentDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                      title="Delete document"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}