'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PDFUploader from './PDFUploader';
import ChatInterface from './ChatInterface';
import { LogOut, FileText } from 'lucide-react';

export default function Dashboard() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const { user, logout } = useAuth();

  const handleUploadSuccess = (documentId: string) => {
    setCurrentDocumentId(documentId);
  };

  const handleNewUpload = () => {
    setCurrentDocumentId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                PDF Q&A App
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name || user?.email}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!currentDocumentId ? (
          /* Upload Screen */
          <div className="text-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Upload a PDF to get started
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Upload any PDF document and ask questions about its content. 
                Our AI will analyze the document and provide answers based on the information within.
              </p>
            </div>
            
            <PDFUploader onUploadSuccess={handleUploadSuccess} />
            
            <div className="mt-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                How it works:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Upload PDF</h4>
                  <p className="text-gray-600">
                    Upload your PDF document (up to 10MB)
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">AI Processing</h4>
                  <p className="text-gray-600">
                    AI extracts and analyzes the document content
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Ask Questions</h4>
                  <p className="text-gray-600">
                    Ask questions and get intelligent answers
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Screen */
          <div className="h-[calc(100vh-12rem)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Chat with your PDF
              </h2>
              <button
                onClick={handleNewUpload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload New PDF
              </button>
            </div>
            
            <ChatInterface documentId={currentDocumentId} />
          </div>
        )}
      </main>
    </div>
  );
}