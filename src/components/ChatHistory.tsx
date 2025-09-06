'use client';

import React, { useState } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { MessageSquare, Plus, Trash2, Clock, FileText, Search, Sparkles } from 'lucide-react';

interface ChatHistoryProps {
  onNewChat: () => void;
}

export default function ChatHistory({ onNewChat }: ChatHistoryProps) {
  const { sessions, currentSession, loadSession, deleteSession, clearAllSessions } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.documentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteSession(sessionId);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      clearAllSessions();
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMessagePreview = (session: any) => {
    const lastUserMessage = session.messages
      .filter((msg: any) => msg.role === 'user')
      .pop();
    
    if (lastUserMessage) {
      return lastUserMessage.content.length > 50
        ? lastUserMessage.content.substring(0, 50) + '...'
        : lastUserMessage.content;
    }
    
    return 'No messages yet';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
          <button
            onClick={onNewChat}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              {sessions.length === 0 ? 'No conversations yet' : 'No conversations match your search'}
            </p>
            <p className="text-xs mt-1">
              {sessions.length === 0 ? 'Start asking questions about your documents' : 'Try a different search term'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 card-futuristic cursor-pointer transition-all duration-300 group hover:scale-105 ${
                  currentSession?.id === session.id 
                    ? 'border-cyan-500/50 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 shadow-lg shadow-cyan-500/25' 
                    : 'hover:border-cyan-500/30 hover:bg-white/5'
                }`}
                onClick={() => loadSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`p-1.5 rounded-full ${
                        currentSession?.id === session.id 
                          ? 'bg-cyan-500/20 border border-cyan-500/50' 
                          : 'bg-purple-500/20 border border-purple-500/50'
                      }`}>
                        <MessageSquare className={`h-3 w-3 ${
                          currentSession?.id === session.id ? 'text-cyan-400' : 'text-purple-400'
                        }`} />
                      </div>
                      <h3 className="text-sm font-medium text-white truncate group-hover:text-cyan-400 transition-colors">
                        {session.title}
                      </h3>
                      {currentSession?.id === session.id && (
                        <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
                      )}
                    </div>
                    
                    {session.documentName && (
                      <div className="flex items-center space-x-1 mb-2">
                        <FileText className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400 truncate">
                          {session.documentName}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-300 mb-2 line-clamp-2">
                      {getMessagePreview(session)}
                    </p>
                    
                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatDate(session.updatedAt)}
                      </div>
                      <span>{session.messages.length} msgs</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="ml-2 p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div className="p-4 border-t border-cyan-500/20">
          <button
            onClick={handleClearAll}
            className="w-full text-sm text-red-400 hover:text-red-300 font-medium hover:bg-red-500/10 py-2 px-4 rounded-lg transition-all duration-200"
          >
            Clear All Conversations
          </button>
        </div>
      )}
    </div>
  );
}