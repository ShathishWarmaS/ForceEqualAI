'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getUserDocuments, clearUserDocuments, getUserDocumentCount } from '@/lib/documentStorage';
import { 
  User, 
  LogOut, 
  Settings, 
  FileText, 
  Download, 
  Trash2, 
  Shield, 
  HelpCircle,
  Moon,
  Sun,
  Bell,
  ChevronDown,
  Activity,
  Database,
  Key
} from 'lucide-react';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout failed:', error);
        // Force refresh even if logout API fails
        window.location.href = '/';
      }
    }
    setIsOpen(false);
  };

  const handleClearChatHistory = () => {
    if (window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
      // Clear chat sessions for current user
      if (user?.id) {
        localStorage.removeItem(`chat_sessions_${user.id}`);
      }
      
      // Dispatch event to refresh components
      window.dispatchEvent(new CustomEvent('chatCleared'));
      
      alert('Chat history cleared successfully');
    }
    setIsOpen(false);
  };

  const handleClearData = () => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to clear all your data? This will delete all uploaded documents and chat history. This cannot be undone.')) {
      // Clear user-specific data
      clearUserDocuments(user.id);
      localStorage.removeItem(`chat_sessions_${user.id}`);
      
      // Dispatch event to refresh components
      window.dispatchEvent(new CustomEvent('documentsUpdated'));
      window.dispatchEvent(new CustomEvent('chatCleared'));
      
      alert('All data cleared successfully');
    }
    setIsOpen(false);
  };

  const handleExportData = () => {
    if (!user) return;
    
    try {
      // Collect user-specific data
      const userDocs = getUserDocuments(user.id);
      const chatSessions = localStorage.getItem(`chat_sessions_${user.id}`);
      
      const userData = {
        user: {
          name: user?.name,
          email: user?.email,
        },
        exportDate: new Date().toISOString(),
        documents: userDocs,
        chatSessions: chatSessions ? JSON.parse(chatSessions) : []
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-qa-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data');
    }
    setIsOpen(false);
  };

  const getStorageUsage = () => {
    if (!user) return '0';
    
    try {
      let totalSize = 0;
      // Calculate user-specific storage usage
      const userDocsKey = `uploadedDocuments_${user.id}`;
      const chatSessionsKey = `chat_sessions_${user.id}`;
      
      const userDocs = localStorage.getItem(userDocsKey);
      const chatSessions = localStorage.getItem(chatSessionsKey);
      
      if (userDocs) totalSize += userDocs.length;
      if (chatSessions) totalSize += chatSessions.length;
      
      return (totalSize / 1024).toFixed(2); // KB
    } catch {
      return '0';
    }
  };

  const getDocumentCount = () => {
    if (!user) return 0;
    return getUserDocumentCount(user.id);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar/Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 hover:bg-white/10 ${
          isOpen ? 'bg-white/10 shadow-lg shadow-cyan-500/20' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center pulse-glow">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-white truncate max-w-32">
              {user.name || user.email}
            </p>
            <p className="text-xs text-slate-400">
              {getDocumentCount()} docs
            </p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 card-futuristic border-cyan-500/30 shadow-2xl shadow-cyan-500/20 z-50 overflow-hidden">
          {/* User Info Header */}
          <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center pulse-glow">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div className="card-futuristic p-2 border-cyan-500/20">
                <div className="text-lg font-bold text-cyan-400">{getDocumentCount()}</div>
                <div className="text-xs text-slate-400">Documents</div>
              </div>
              <div className="card-futuristic p-2 border-purple-500/20">
                <div className="text-lg font-bold text-purple-400">{getStorageUsage()}</div>
                <div className="text-xs text-slate-400">KB Used</div>
              </div>
              <div className="card-futuristic p-2 border-green-500/20">
                <div className="text-lg font-bold text-green-400">∞</div>
                <div className="text-xs text-slate-400">Questions</div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile & Settings */}
            <div className="px-2 mb-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">
                Account
              </div>
              
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Settings className="h-4 w-4 text-slate-400 group-hover:text-cyan-400" />
                <span className="group-hover:text-cyan-400">Settings & Preferences</span>
              </button>
              
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Shield className="h-4 w-4 text-slate-400 group-hover:text-green-400" />
                <span className="group-hover:text-green-400">Privacy & Security</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Key className="h-4 w-4 text-slate-400 group-hover:text-yellow-400" />
                <span className="group-hover:text-yellow-400">API Keys & Tokens</span>
              </button>
            </div>

            {/* Data Management */}
            <div className="px-2 mb-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">
                Data Management
              </div>
              
              <button 
                onClick={handleExportData}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group"
              >
                <Download className="h-4 w-4 text-slate-400 group-hover:text-blue-400" />
                <span className="group-hover:text-blue-400">Export My Data</span>
              </button>
              
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Activity className="h-4 w-4 text-slate-400 group-hover:text-purple-400" />
                <span className="group-hover:text-purple-400">Usage Analytics</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <Database className="h-4 w-4 text-slate-400 group-hover:text-cyan-400" />
                <span className="group-hover:text-cyan-400">Storage Management</span>
              </button>
              
              <button 
                onClick={handleClearData}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
              >
                <Trash2 className="h-4 w-4 text-slate-400 group-hover:text-red-400" />
                <span className="group-hover:text-red-400">Clear All Data</span>
              </button>
            </div>

            {/* App Settings */}
            <div className="px-2 mb-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">
                Preferences
              </div>
              
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-3">
                  {isDarkMode ? (
                    <Moon className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Sun className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm text-white">Dark Mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    isDarkMode ? 'bg-cyan-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 rounded-full bg-white transform transition-transform mt-1 ${
                    isDarkMode ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-white">Notifications</span>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    notifications ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-3 w-3 rounded-full bg-white transform transition-transform mt-1 ${
                    notifications ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Help & Support */}
            <div className="px-2 mb-2">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-2">
                Support
              </div>
              
              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <HelpCircle className="h-4 w-4 text-slate-400 group-hover:text-yellow-400" />
                <span className="group-hover:text-yellow-400">Help & Documentation</span>
              </button>

              <button className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-all duration-200 group">
                <FileText className="h-4 w-4 text-slate-400 group-hover:text-blue-400" />
                <span className="group-hover:text-blue-400">Terms & Privacy</span>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-cyan-500/20 pt-2 px-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-white hover:bg-red-500/20 rounded-lg transition-all duration-200 group"
              >
                <LogOut className="h-4 w-4 text-slate-400 group-hover:text-red-400" />
                <span className="group-hover:text-red-400">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}