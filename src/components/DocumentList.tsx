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

  // Mock data - in real app this would come from an API
  useEffect(() => {
    // Simulate loading documents from localStorage or API
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
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Documents</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center p-3 border rounded-lg">
              <div className="h-4 w-4 bg-gray-200 rounded mr-3"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Your Documents</h3>
          <div className="flex items-center text-sm text-gray-500">
            <Shield className="h-4 w-4 mr-1" />
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No documents uploaded yet</p>
            <p className="text-xs mt-1">Upload a PDF to get started with AI Q&A</p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  currentDocumentId === doc.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => onDocumentSelect(doc.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <FileText className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      currentDocumentId === doc.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.filename}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
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
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                      className="ml-2 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
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