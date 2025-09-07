'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import PDFUploader from './PDFUploader';
import ChatInterface from './ChatInterface';
import ChatHistory from './ChatHistory';
import DocumentList from './DocumentList';
import SearchInterface from './SearchInterface';
import { FileText, MessageSquare, Upload, Zap, Brain, Cpu, X, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import FuturisticBackground from './FuturisticBackground';
import UserMenu from './UserMenu';
import NotificationSystem from './NotificationSystem';
import { getUserDocuments, migrateGlobalDocumentsToUser, removeUserDocument, Document } from '@/lib/documentStorage';

export default function Dashboard() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentDocumentName, setCurrentDocumentName] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'documents' | 'upload'>('chat');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const { user } = useAuth();
  const { currentSession, createSession } = useChat();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load user-specific documents from localStorage
  useEffect(() => {
    if (user) {
      // Migrate any existing global documents to user-specific storage
      migrateGlobalDocumentsToUser(user.id);
      
      // Load user-specific documents
      const userDocs = getUserDocuments(user.id);
      setDocuments(userDocs);
      
      // Always default to chat view
      setActiveView('chat');
    }
  }, [user]);

  // Handle sidebar dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 280 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleUploadSuccess = (documentId: string) => {
    // Reload user-specific documents after upload
    if (user) {
      const userDocs = getUserDocuments(user.id);
      const uploadedDoc = userDocs.find((doc: Document) => doc.id === documentId);
      if (uploadedDoc) {
        setCurrentDocumentId(documentId);
        setCurrentDocumentName(uploadedDoc.filename);
        setDocuments(userDocs);
        setActiveView('chat');
        // Create new chat session for this document
        createSession(documentId, uploadedDoc.filename);
      }
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    const selectedDoc = documents.find(doc => doc.id === documentId);
    if (selectedDoc) {
      setCurrentDocumentId(documentId);
      setCurrentDocumentName(selectedDoc.filename);
      setActiveView('chat');
      // Create new session or continue existing one
      if (!currentSession || currentSession.documentId !== documentId) {
        createSession(documentId, selectedDoc.filename);
      }
    }
  };

  const handleNewChat = () => {
    const session = createSession(currentDocumentId || undefined, currentDocumentName || undefined);
    setActiveView('chat');
  };


  const handleGlobalSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(true);
    setActiveView('documents'); // Switch to documents view to show search
  };

  const handleSearchResultSelect = (result: any) => {
    // Select the document and switch to chat
    setCurrentDocumentId(result.documentId);
    setCurrentDocumentName(result.documentName);
    setIsSearchMode(false);
    setActiveView('chat');
    
    // Create new session for this document if needed
    if (!currentSession || currentSession.documentId !== result.documentId) {
      createSession(result.documentId, result.documentName);
    }
  };

  const handleCloseSearch = () => {
    setIsSearchMode(false);
    setSearchQuery('');
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!user) return;
    
    try {
      // Call API to delete from vector store
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove from user-specific storage
        removeUserDocument(documentId, user.id);
        
        // Update local state
        const updatedDocs = getUserDocuments(user.id);
        setDocuments(updatedDocs);
        
        // If this was the current document, reset it
        if (currentDocumentId === documentId) {
          setCurrentDocumentId(null);
          setCurrentDocumentName(null);
          setActiveView('documents');
        }

        // Show success notification
        window.dispatchEvent(new CustomEvent('notification', {
          detail: {
            type: 'success',
            title: 'Document Deleted',
            message: 'Document and all associated data have been removed',
            autoHide: true
          }
        }));
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      // Show error notification
      window.dispatchEvent(new CustomEvent('notification', {
        detail: {
          type: 'error',
          title: 'Delete Failed',
          message: 'Could not delete document. Please try again.',
          autoHide: true
        }
      }));
    }
  };

  return (
    <div className="min-h-screen flex relative neural-bg container-constrained">
      <FuturisticBackground />
      
      {/* Collapse Toggle Button */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="fixed top-4 left-4 z-50 p-2 btn-futuristic rounded-lg shadow-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
      
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`relative card-futuristic border-r border-cyan-500/20 flex flex-col h-screen backdrop-blur-xl z-10 overflow-hidden transition-all duration-300 ${
          isSidebarCollapsed ? '-translate-x-full opacity-0 w-0' : 'opacity-100'
        }`}
        style={{ 
          width: isSidebarCollapsed ? 0 : `${sidebarWidth}px`,
          minWidth: isSidebarCollapsed ? 0 : '280px'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Brain className="h-6 w-6 text-cyan-400 mr-2 pulse-glow" />
              <h1 className="text-lg font-semibold text-holographic glitch" data-text="AI Q&A">
                AI Q&A
              </h1>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setActiveView('chat')}
              className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeView === 'chat'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </button>
            <button
              onClick={() => setActiveView('documents')}
              className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeView === 'documents'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-purple-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <FileText className="h-4 w-4 mr-1" />
              Docs
            </button>
            <button
              onClick={() => setActiveView('upload')}
              className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeView === 'upload'
                  ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/20'
                  : 'text-slate-400 hover:text-green-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            {activeView === 'chat' && <ChatHistory onNewChat={handleNewChat} />}
            {activeView === 'documents' && (
              <DocumentList
                currentDocumentId={currentDocumentId || undefined}
                onDocumentSelect={handleDocumentSelect}
                onDocumentDelete={handleDocumentDelete}
                onGlobalSearch={handleGlobalSearch}
              />
            )}
            {activeView === 'upload' && (
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="relative mb-4">
                    <Upload className="h-12 w-12 mx-auto text-green-400 float" />
                    <div className="absolute inset-0 h-12 w-12 mx-auto rounded-full bg-green-400/20 blur-xl"></div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2 text-holographic">
                    Upload Document
                  </h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Upload a PDF to start asking questions about its content
                  </p>
                </div>
                
                <PDFUploader onUploadSuccess={handleUploadSuccess} />
                
                <div className="mt-6 text-center">
                  <div className="card-futuristic p-3 border-green-500/20 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                    <p className="text-xs text-slate-300">
                      Supported: PDF files up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu at Bottom */}
          <div className="border-t border-cyan-500/20 p-4">
            <UserMenu />
          </div>
        </div>
        
        {/* Drag Handle */}
        <div 
          ref={dragRef}
          onMouseDown={handleDragStart}
          className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-cyan-500/50 to-purple-500/50 hover:w-2 transition-all duration-200 cursor-col-resize opacity-30 hover:opacity-100"
        />
      </div>

      {/* Main Content */}
      <div className="main-content flex flex-col h-screen z-10 overflow-hidden relative">
        {isSearchMode ? (
          /* Search Interface */
          <SearchInterface
            initialQuery={searchQuery}
            onResultSelect={handleSearchResultSelect}
            onClose={handleCloseSearch}
          />
        ) : currentDocumentId ? (
          /* Chat Screen with Document */
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="card-futuristic border-b border-cyan-500/20 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        <span className="text-holographic">
                          Chatting with {currentDocumentName}
                        </span>
                      </h2>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm text-slate-400">
                          Ask questions about your document content
                        </p>
                        {/* Context Switcher */}
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700/50">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Personal Workspace</span>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700/50">
                            <span>Doc: {currentDocumentName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* User Account Dropdown */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setActiveView('upload')}
                        className="btn-futuristic text-sm px-3 py-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload New PDF
                      </button>
                      <UserMenu />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1 flex flex-col min-h-0">
              <ChatInterface 
                documentId={currentDocumentId} 
                documentName={currentDocumentName || undefined} 
              />
            </div>
          </div>
        ) : (
          /* Welcome Chat Screen - No Document */
          <div className="flex-1 flex flex-col">
            {/* Welcome Header */}
            <div className="card-futuristic border-b border-cyan-500/20 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    <span className="text-holographic">
                      AI Q&A Assistant
                    </span>
                  </h2>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-400">
                      Upload documents to get started with AI-powered Q&A
                    </p>
                    {/* Context Switcher */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700/50">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Personal Workspace</span>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700/50">
                        <span>General Chat Mode</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* User Account Dropdown */}
                <UserMenu />
              </div>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1 flex flex-col min-h-0">
              <ChatInterface />
            </div>
          </div>
        )}
      </div>
      
      {/* Notification System */}
      <NotificationSystem />
    </div>
  );
}