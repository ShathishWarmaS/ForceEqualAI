'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import PDFUploader from './PDFUploader';
import ChatInterface from './ChatInterface';
import ChatHistory from './ChatHistory';
import DocumentList from './DocumentList';
import { LogOut, FileText, MessageSquare, Upload, Zap, Brain, Cpu } from 'lucide-react';
import FuturisticBackground from './FuturisticBackground';

export default function Dashboard() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [currentDocumentName, setCurrentDocumentName] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'documents'>('documents');
  const [documents, setDocuments] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const { currentSession, createSession } = useChat();

  // Load documents from localStorage
  useEffect(() => {
    const storedDocs = localStorage.getItem('uploadedDocuments');
    if (storedDocs) {
      try {
        const docs = JSON.parse(storedDocs);
        setDocuments(docs);
        // Default to documents view if we have documents, otherwise show chat
        if (docs.length > 0) {
          setActiveView('documents');
        } else {
          setActiveView('chat');
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      }
    }
  }, []);

  const handleUploadSuccess = (documentId: string) => {
    // Reload documents after upload
    const storedDocs = localStorage.getItem('uploadedDocuments');
    if (storedDocs) {
      const docs = JSON.parse(storedDocs);
      const uploadedDoc = docs.find((doc: any) => doc.id === documentId);
      if (uploadedDoc) {
        setCurrentDocumentId(documentId);
        setCurrentDocumentName(uploadedDoc.filename);
        setDocuments(docs);
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

  const handleNewUpload = () => {
    setCurrentDocumentId(null);
    setCurrentDocumentName(null);
    // Stay on current view, upload is always available in main area
  };

  return (
    <div className="min-h-screen flex relative neural-bg container-constrained">
      <FuturisticBackground />
      {/* Sidebar */}
      <div className="sidebar-content card-futuristic border-r border-cyan-500/20 flex flex-col h-screen backdrop-blur-xl z-10 overflow-hidden">
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
              onClick={logout}
              className="p-2 rounded-md text-gray-400 hover:text-cyan-400 hover:bg-white/10 transition-all duration-300"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            {user?.name || user?.email}
          </p>
        </div>

        {/* Navigation */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('chat')}
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeView === 'chat'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </button>
            <button
              onClick={() => setActiveView('documents')}
              className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeView === 'documents'
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-purple-400 hover:bg-white/5 border border-transparent'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </button>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'chat' && <ChatHistory onNewChat={handleNewChat} />}
          {activeView === 'documents' && (
            <DocumentList
              currentDocumentId={currentDocumentId}
              onDocumentSelect={handleDocumentSelect}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content flex flex-col h-screen z-10 overflow-hidden relative">
        {!currentDocumentId ? (
          /* Upload Screen */
          <div className="flex-1 flex items-center justify-center p-8 relative">
            <div className="text-center max-w-2xl relative z-10">
              <div className="mb-8">
                <div className="relative mb-6">
                  <Zap className="h-16 w-16 mx-auto text-cyan-400 float" />
                  <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-cyan-400/20 blur-xl"></div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 text-holographic">
                  Upload a PDF to get started
                </h2>
                <p className="text-slate-300 text-lg">
                  Upload any PDF document and ask questions about its content. 
                  Our AI will analyze the document and provide answers based on the information within.
                </p>
              </div>
              
              <PDFUploader onUploadSuccess={handleUploadSuccess} />
              
              <div className="mt-12">
                <h3 className="text-xl font-medium text-white mb-6">
                  How it works:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="card-futuristic p-6 border-animated">
                    <div className="relative mb-4">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto pulse-glow">
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h4 className="font-medium text-white mb-3">Upload PDF</h4>
                    <p className="text-slate-400">
                      Upload your PDF document (up to 10MB)
                    </p>
                  </div>
                  
                  <div className="card-futuristic p-6 border-animated">
                    <div className="relative mb-4">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto pulse-glow">
                        <Cpu className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h4 className="font-medium text-white mb-3">AI Processing</h4>
                    <p className="text-slate-400">
                      AI extracts and analyzes the document content
                    </p>
                  </div>
                  
                  <div className="card-futuristic p-6 border-animated">
                    <div className="relative mb-4">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto pulse-glow">
                        <Brain className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <h4 className="font-medium text-white mb-3">Ask Questions</h4>
                    <p className="text-slate-400">
                      Ask questions and get intelligent answers
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 hexagon-pattern opacity-30"></div>
          </div>
        ) : (
          /* Chat Screen */
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="card-futuristic border-b border-cyan-500/20 px-6 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    <span className="text-holographic">
                      Chatting with {currentDocumentName}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Ask questions about your document content
                  </p>
                </div>
                <button
                  onClick={handleNewUpload}
                  className="btn-futuristic"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New PDF
                </button>
              </div>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1">
              <ChatInterface 
                documentId={currentDocumentId || undefined} 
                documentName={currentDocumentName || undefined} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}