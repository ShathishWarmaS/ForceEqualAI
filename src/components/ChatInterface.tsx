'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Send, Bot, User, Copy, ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ChatInterfaceProps {
  documentId?: string;
  documentName?: string;
}

export default function ChatInterface({ documentId, documentName }: ChatInterfaceProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentSession, addMessage, createSession } = useChat();
  const { token } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const trimmedQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    try {
      // Create new session if none exists
      let session = currentSession;
      if (!session) {
        session = createSession(documentId, documentName);
      }

      // Add user message
      addMessage({
        role: 'user',
        content: trimmedQuestion,
        documentId,
        documentName
      });

      // Get conversation history for context
      const conversationHistory = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Add current question to history
      conversationHistory.push({
        role: 'user',
        content: trimmedQuestion
      });

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

      if (data.success) {
        // Add AI response
        addMessage({
          role: 'assistant',
          content: data.answer,
          documentId,
          documentName
        });
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

      if (data.success) {
        // Update the message in place
        const updatedSession = {
          ...currentSession,
          messages: currentSession.messages.map((msg, idx) => 
            idx === messageIndex 
              ? { ...msg, content: data.answer, timestamp: new Date() }
              : msg
          ),
          updatedAt: new Date()
        };
        // Note: This would need to be handled by the ChatContext
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!currentSession || currentSession.messages.length === 0 ? (
          <div className="text-center mt-12">
            <div className="relative mb-6">
              <Bot className="h-20 w-20 mx-auto text-cyan-400 float" />
              <div className="absolute inset-0 h-20 w-20 mx-auto rounded-full bg-cyan-400/20 blur-xl"></div>
              <Sparkles className="h-6 w-6 absolute -top-2 -right-2 text-purple-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4 text-holographic">
              {documentName ? `Ask questions about ${documentName}` : 'Start a conversation'}
            </h3>
            <p className="text-slate-400">
              {documentName 
                ? 'I can help you understand and analyze the content of your document.' 
                : 'Upload a document or ask me anything!'}
            </p>
          </div>
        ) : (
          currentSession.messages.map((message, index) => (
            <div key={message.id} className="flex space-x-4 group">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                message.role === 'user' 
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 border-cyan-400/50 shadow-lg shadow-cyan-500/25' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400/50 shadow-lg shadow-purple-500/25'
              } transition-all duration-300 group-hover:scale-110`}>
                {message.role === 'user' ? (
                  <User className="h-5 w-5 text-white" />
                ) : (
                  <Bot className="h-5 w-5 text-white" />
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-white">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                <div className={`card-futuristic p-4 ${
                  message.role === 'user' 
                    ? 'border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10' 
                    : 'border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10'
                }`}>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                
                {/* Message actions */}
                <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => copyMessage(message.content)}
                    className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1 transition-colors duration-200"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </button>
                  
                  {message.role === 'assistant' && (
                    <>
                      <button
                        onClick={() => regenerateResponse(index)}
                        disabled={isLoading}
                        className="text-xs text-slate-400 hover:text-purple-400 flex items-center space-x-1 disabled:opacity-50 transition-colors duration-200"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Regenerate</span>
                      </button>
                      
                      <button className="text-xs text-slate-400 hover:text-green-400 flex items-center space-x-1 transition-colors duration-200">
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      
                      <button className="text-xs text-slate-400 hover:text-red-400 flex items-center space-x-1 transition-colors duration-200">
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex space-x-4 group">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 border-2 border-purple-400/50 shadow-lg shadow-purple-500/25 flex items-center justify-center pulse-glow">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-white">AI Assistant</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="card-futuristic border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
                <div className="flex items-center space-x-3">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-slate-300">Processing your question...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-cyan-500/20 p-6 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={documentName ? `Ask a question about ${documentName}...` : "Ask me anything..."}
              disabled={isLoading}
              className="w-full px-4 py-3 card-futuristic border border-cyan-500/30 rounded-lg resize-none focus:outline-none focus:border-cyan-400 focus:shadow-lg focus:shadow-cyan-400/25 disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-slate-400 transition-all duration-300"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 pointer-events-none opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          </div>
          
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="btn-futuristic disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]"
          >
            {isLoading ? (
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
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
  );
}