'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentId?: string;
  documentName?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  documentId?: string;
  documentName?: string;
}

interface ChatContextType {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  createSession: (documentId?: string, documentName?: string) => ChatSession;
  loadSession: (sessionId: string) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  isLoading: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Generate a chat title based on the first user message
  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.trim().split(/\s+/);
    if (words.length <= 6) {
      return firstMessage;
    }
    return words.slice(0, 6).join(' ') + '...';
  };

  // Load sessions from localStorage
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setCurrentSession(null);
      setIsLoading(false);
      return;
    }

    const loadSessions = () => {
      try {
        const stored = localStorage.getItem(`chat_sessions_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const sessions: ChatSession[] = parsed.map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          }));
          
          // Sort by most recent first
          sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          setSessions(sessions);
          
          // Load the most recent session if available
          if (sessions.length > 0 && !currentSession) {
            setCurrentSession(sessions[0]);
          }
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      }
      setIsLoading(false);
    };

    loadSessions();
  }, [user]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (user && sessions.length > 0) {
      try {
        localStorage.setItem(`chat_sessions_${user.id}`, JSON.stringify(sessions));
      } catch (error) {
        console.error('Error saving chat sessions:', error);
      }
    }
  }, [sessions, user]);

  const createSession = (documentId?: string, documentName?: string): ChatSession => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      documentId,
      documentName
    };

    setSessions(prev => [newSession, ...prev]);
    setCurrentSession(newSession);
    return newSession;
  };

  const loadSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  };

  const addMessage = (messageData: Omit<Message, 'id' | 'timestamp'>) => {
    if (!currentSession) {
      return;
    }

    const newMessage: Message = {
      ...messageData,
      id: crypto.randomUUID(),
      timestamp: new Date()
    };

    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, newMessage],
      updatedAt: new Date(),
      // Update title based on first user message
      title: currentSession.messages.length === 0 && messageData.role === 'user'
        ? generateChatTitle(messageData.content)
        : currentSession.title
    };

    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(session => 
      session.id === updatedSession.id ? updatedSession : session
    ));
  };

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId));
    
    if (currentSession?.id === sessionId) {
      const remainingSessions = sessions.filter(session => session.id !== sessionId);
      setCurrentSession(remainingSessions.length > 0 ? remainingSessions[0] : null);
    }
  };

  const clearAllSessions = () => {
    setSessions([]);
    setCurrentSession(null);
    if (user) {
      localStorage.removeItem(`chat_sessions_${user.id}`);
    }
  };

  return (
    <ChatContext.Provider value={{
      currentSession,
      sessions,
      createSession,
      loadSession,
      addMessage,
      deleteSession,
      clearAllSessions,
      isLoading
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}