'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Bot, User } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import MessageDisplay from './MessageDisplay';

interface ChatInterfaceProps {
  documentId?: string;
  documentName?: string;
}

export default function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const { currentSession, addMessage, createSession } = useChat();
  const { token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (shouldAutoScroll && !isUserScrolling && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, shouldAutoScroll, isUserScrolling]);

  // Check if user is scrolled near bottom to enable/disable auto-scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 50;
    
    // User is manually scrolling
    setIsUserScrolling(true);
    setShouldAutoScroll(isNearBottom);
    
    // Clear previous timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // After user stops scrolling for 500ms, allow auto-scroll again if at bottom
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current!;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setShouldAutoScroll(isNearBottom);
    }, 500);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 150) + 'px';
    }
  }, [question]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const trimmedQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    try {
      // Ensure we have a session before adding messages
      if (!currentSession) {
        console.log('🔧 Creating new session...');
        const newSession = createSession(documentId, documentName);
        // Wait for the session to be set before continuing
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Add user message to UI FIRST
      console.log('🔥 ADDING USER MESSAGE:', {
        role: 'user',
        content: trimmedQuestion,
        documentId,
        documentName,
        currentSessionId: currentSession?.id,
        currentMessageCount: currentSession?.messages?.length || 0
      });
      
      addMessage({
        role: 'user',
        content: trimmedQuestion,
        documentId,
        documentName
      });
      
      console.log('✅ USER MESSAGE ADDED, checking session state...');
      
      // Enable auto-scroll for new user message
      setShouldAutoScroll(true);

      // Small delay to ensure state has updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Build conversation history from the current session
      const existingHistory = (currentSession?.messages || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current question to history
      const conversationHistory = [
        ...existingHistory,
        {
          role: 'user' as const,
          content: trimmedQuestion
        }
      ];

      // Call API with conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          documentId: documentId || null,
          conversationHistory: conversationHistory.slice(-10) // Keep last 10 messages for context
        }),
      });

      const data = await response.json();

      if (response.ok && data.answer) {
        // Add AI response with sources and metadata
        console.log('🤖 ADDING AI RESPONSE:', {
          answerLength: data.answer.length,
          sourcesCount: data.sources?.length || 0,
          confidence: data.confidence,
          currentSessionId: currentSession?.id,
          messageCountBefore: currentSession?.messages?.length || 0
        });
        
        addMessage({
          role: 'assistant',
          content: data.answer,
          sources: data.sources || [],
          confidence: data.confidence,
          relatedQuestions: data.relatedQuestions || [],
          reasoning: data.reasoning,
          documentId,
          documentName
        });
        
        console.log('✅ AI RESPONSE ADDED');
      } else {
        // Add error message
        addMessage({
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${data.error || 'Unable to process your question'}`,
          documentId,
          documentName
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: "I'm sorry, I encountered a network error. Please check your connection and try again.",
        documentId,
        documentName
      });
    } finally {
      setIsLoading(false);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const regenerateResponse = async (messageIndex: number) => {
    if (!currentSession || messageIndex <= 0) return;
    
    const previousMessage = currentSession.messages[messageIndex - 1];
    if (previousMessage.role !== 'user') return;

    setIsLoading(true);
    
    try {
      // Get conversation history up to the message we're regenerating
      const conversationHistory = currentSession.messages.slice(0, messageIndex).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: previousMessage.content,
          documentId: documentId || null,
          conversationHistory: conversationHistory.slice(-10)
        }),
      });

      const data = await response.json();

      if (response.ok && data.answer) {
        // Update the message in place by replacing it with new content
        addMessage({
          role: 'assistant',
          content: data.answer,
          documentId,
          documentName
        });
      } else {
        // Handle error response
        addMessage({
          role: 'assistant',
          content: `I'm sorry, I encountered an error while regenerating the response: ${data.error || 'Unable to process your question'}`,
          documentId,
          documentName
        });
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent min-h-screen">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6 pb-32"
        style={{
          scrollbarWidth: 'auto',
          scrollbarColor: '#06b6d4 rgba(255, 255, 255, 0.1)'
        }}
      >
        {currentSession?.messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center text-center py-16 max-w-4xl mx-auto">
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Bot className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
              AI Assistant Ready
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-2">
              {documentId 
                ? `Ask questions about "${documentName}" with source citations`
                : "Upload documents and get AI-powered answers with source verification"
              }
            </p>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Secure & Private</span>
              </div>
              <span>•</span>
              <span>Source-grounded responses</span>
              <span>•</span>
              <span>Real-time citations</span>
            </div>
            
            {documentId ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                <button 
                  onClick={() => setQuestion("What is this document about?")}
                  className="group p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all text-left"
                >
                  <div className="text-blue-600 dark:text-blue-400 mb-2">📋</div>
                  <div className="font-medium text-slate-800 dark:text-white mb-1">Document Summary</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">"What is this document about?"</div>
                </button>
                
                <button 
                  onClick={() => setQuestion("What are the key findings and conclusions?")}
                  className="group p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all text-left"
                >
                  <div className="text-green-600 dark:text-green-400 mb-2">🔍</div>
                  <div className="font-medium text-slate-800 dark:text-white mb-1">Key Insights</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">"What are the key findings?"</div>
                </button>
                
                <button 
                  onClick={() => setQuestion("Can you explain the methodology or approach used?")}
                  className="group p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all text-left"
                >
                  <div className="text-purple-600 dark:text-purple-400 mb-2">⚙️</div>
                  <div className="font-medium text-slate-800 dark:text-white mb-1">Methodology</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">"Explain the approach used"</div>
                </button>
              </div>
            ) : (
              <div className="space-y-6 w-full max-w-2xl">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-slate-400 dark:text-slate-500 mb-3">📁</div>
                  <p className="text-slate-600 dark:text-slate-300 mb-2 font-medium">Upload documents to get started</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Support for PDF, Word docs, spreadsheets, and more</p>
                </div>
                
                <div className="text-left">
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-3">Or try these general queries:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button 
                      onClick={() => setQuestion("How does retrieval-augmented generation work?")}
                      className="text-left p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800 dark:text-white">RAG Explanation</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">"How does RAG work?"</div>
                    </button>
                    <button 
                      onClick={() => setQuestion("What are best practices for document indexing?")}
                      className="text-left p-3 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800 dark:text-white">Best Practices</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">"Document indexing tips"</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {currentSession?.messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } mb-4`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
            
            <div
              className={`max-w-2xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-lg'
                  : 'bg-slate-50 dark:bg-slate-800/70 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              <MessageDisplay
                message={message}
                index={index}
                onCopy={copyMessage}
                onRegenerate={regenerateResponse}
                isLoading={isLoading}
              />
            </div>
            
            {message.role === 'user' && (
              <div className="flex-shrink-0 mt-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-4 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="card-futuristic border-cyan-500/20 bg-slate-800/50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <LoadingSpinner />
                <span className="text-slate-400 text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-cyan-500/20 p-6 z-40">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  documentId
                    ? `Ask a question about ${documentName}...`
                    : "Type your message..."
                }
                className="w-full px-4 py-3 bg-slate-800/50 text-white rounded-xl border border-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all duration-200 min-h-[48px] max-h-[150px] scrollbar-custom"
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#06b6d4 rgba(255, 255, 255, 0.1)'
                }}
                disabled={isLoading}
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="btn-futuristic px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          
          {documentName && (
            <div className="mt-3 text-xs text-slate-400 text-center">
              Currently chatting about: <span className="text-cyan-400 font-medium">{documentName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}