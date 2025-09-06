'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Trash2, MessageSquare, Clock, Shield, Search, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserDocuments, saveUserDocuments, Document as DocumentType } from '@/lib/documentStorage';

// Using Document interface from documentStorage
type Document = DocumentType;

interface DocumentListProps {
  currentDocumentId?: string;
  onDocumentSelect: (documentId: string) => void;
  onDocumentDelete?: (documentId: string) => void;
  onGlobalSearch?: (query: string) => void;
}

export default function DocumentList({ 
  currentDocumentId, 
  onDocumentSelect, 
  onDocumentDelete,
  onGlobalSearch
}: DocumentListProps) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  // Load user-specific documents and listen for changes
  useEffect(() => {
    const loadDocuments = () => {
      if (user) {
        try {
          const userDocs = getUserDocuments(user.id);
          setDocuments(userDocs);
          setFilteredDocuments(userDocs);
        } catch (error) {
          console.error('Error loading user documents:', error);
        }
      } else {
        setDocuments([]);
        setFilteredDocuments([]);
      }
      setIsLoading(false);
    };

    loadDocuments();

    // Listen for storage changes (when new documents are uploaded)
    const handleStorageChange = (e: StorageEvent) => {
      if (user && e.key === `uploadedDocuments_${user.id}`) {
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
  }, [user]);

  // Filter documents based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDocuments(filtered);
    }
  }, [documents, searchQuery]);

  const handleGlobalSearch = () => {
    if (searchQuery.trim() && onGlobalSearch) {
      onGlobalSearch(searchQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGlobalSearch();
    }
  };

  const handleDelete = (documentId: string) => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to delete this document? This will remove all associated data.')) {
      const updatedDocs = documents.filter(doc => doc.id !== documentId);
      setDocuments(updatedDocs);
      
      // Update user-specific localStorage
      saveUserDocuments(updatedDocs, user.id);
      
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

  // Don't show anything if user is not authenticated
  if (!user) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <Shield className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <p className="text-sm text-white mb-2">Please sign in to view your documents</p>
          <p className="text-xs text-slate-400">Your documents are private and secure</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-white">Your Documents</h3>
          <div className="flex items-center text-sm text-slate-400">
            <Shield className="h-4 w-4 mr-1 text-green-400" />
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search documents..."
              className="w-full pl-7 pr-3 py-2 text-xs rounded border border-slate-600 bg-slate-800/50 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
          </div>
          {onGlobalSearch && (
            <button
              onClick={handleGlobalSearch}
              disabled={!searchQuery.trim()}
              className="px-3 py-2 text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Search content across all documents"
            >
              <Search className="h-3 w-3" />
            </button>
          )}
        </div>
        
        {searchQuery && (
          <div className="mt-2 text-xs text-slate-400">
            {filteredDocuments.length === documents.length 
              ? `Showing all ${documents.length} documents`
              : `Found ${filteredDocuments.length} of ${documents.length} documents`
            }
            {onGlobalSearch && (
              <span className="ml-2 text-cyan-400">
                • Press Enter or click 🔍 to search content
              </span>
            )}
          </div>
        )}
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
        ) : filteredDocuments.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="relative mb-4">
              <Search className="h-12 w-12 mx-auto text-slate-500 float" />
              <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-slate-500/20 blur-xl"></div>
            </div>
            <p className="text-sm text-white">No documents match your search</p>
            <p className="text-xs mt-1 text-slate-400">Try a different search term or clear the search</p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 card-futuristic cursor-pointer transition-all duration-200 group hover:scale-[1.01] ${
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
                          {formatDate(doc.uploadedAt)}
                        </div>
                        
                        {doc.chunks && (
                          <div className="flex items-center">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {doc.chunks} chunks
                          </div>
                        )}
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