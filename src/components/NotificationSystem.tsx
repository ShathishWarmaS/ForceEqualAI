'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, Upload, MessageSquare } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
}

export default function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Listen for custom notification events
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const notification: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        type: event.detail.type || 'info',
        title: event.detail.title,
        message: event.detail.message,
        timestamp: new Date(),
        autoHide: event.detail.autoHide !== false
      };

      setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications

      // Auto-hide after 5 seconds if enabled
      if (notification.autoHide) {
        setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);
      }
    };

    // Listen for various app events
    const handleDocumentUpload = () => {
      const event = new CustomEvent('notification', {
        detail: {
          type: 'success',
          title: 'Document Uploaded',
          message: 'PDF processed successfully and ready for Q&A',
          autoHide: true
        }
      });
      handleNotification(event);
    };

    const handleChatMessage = () => {
      const event = new CustomEvent('notification', {
        detail: {
          type: 'info',
          title: 'AI Response',
          message: 'Answer generated based on document content',
          autoHide: true
        }
      });
      handleNotification(event);
    };

    const handleDataClear = () => {
      const event = new CustomEvent('notification', {
        detail: {
          type: 'warning',
          title: 'Data Cleared',
          message: 'All documents and chat history have been removed',
          autoHide: true
        }
      });
      handleNotification(event);
    };

    window.addEventListener('notification', handleNotification as EventListener);
    window.addEventListener('documentsUpdated', handleDocumentUpload);
    window.addEventListener('chatMessage', handleChatMessage);
    window.addEventListener('dataCleared', handleDataClear);

    return () => {
      window.removeEventListener('notification', handleNotification as EventListener);
      window.removeEventListener('documentsUpdated', handleDocumentUpload);
      window.removeEventListener('chatMessage', handleChatMessage);
      window.removeEventListener('dataCleared', handleDataClear);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10';
      case 'error':
        return 'border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10';
      case 'warning':
        return 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10';
      default:
        return 'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`card-futuristic p-4 ${getColorClasses(notification.type)} shadow-2xl transform transition-all duration-300 hover:scale-[1.02]`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white">
                  {notification.title}
                </h4>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to trigger notifications from anywhere in the app
export const showNotification = (
  type: 'success' | 'error' | 'info' | 'warning',
  title: string,
  message: string,
  autoHide = true
) => {
  const event = new CustomEvent('notification', {
    detail: { type, title, message, autoHide }
  });
  window.dispatchEvent(event);
};