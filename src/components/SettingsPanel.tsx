'use client';

import React, { useState } from 'react';
import { X, Save, RefreshCw, Shield, Bell, Moon, Sun, Zap, Database } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    darkMode: true,
    notifications: true,
    autoSave: true,
    contextLength: 10,
    responseLength: 'medium',
    confidenceThreshold: 0.7,
    enableAnalytics: false
  });

  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'privacy'>('general');

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // Save settings to localStorage
    localStorage.setItem('userSettings', JSON.stringify(settings));
    
    // Dispatch event for settings update
    window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: settings }));
    
    // Show notification
    window.dispatchEvent(new CustomEvent('notification', {
      detail: {
        type: 'success',
        title: 'Settings Saved',
        message: 'Your preferences have been updated successfully',
        autoHide: true
      }
    }));
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[80vh] card-futuristic border-cyan-500/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <h2 className="text-xl font-semibold text-white">Settings & Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-64 border-r border-cyan-500/20 p-4">
            <nav className="space-y-2">
              {[
                { id: 'general', label: 'General', icon: Moon },
                { id: 'ai', label: 'AI & Chat', icon: Zap },
                { id: 'privacy', label: 'Privacy & Data', icon: Shield }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">General Preferences</h3>
                
                {/* Dark Mode */}
                <div className="flex items-center justify-between p-4 card-futuristic border-cyan-500/20">
                  <div className="flex items-center space-x-3">
                    {settings.darkMode ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-yellow-400" />}
                    <div>
                      <p className="text-sm font-medium text-white">Dark Mode</p>
                      <p className="text-xs text-slate-400">Toggle between light and dark themes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingChange('darkMode', !settings.darkMode)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      settings.darkMode ? 'bg-cyan-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                      settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between p-4 card-futuristic border-purple-500/20">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Notifications</p>
                      <p className="text-xs text-slate-400">Receive app notifications and updates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingChange('notifications', !settings.notifications)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      settings.notifications ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between p-4 card-futuristic border-green-500/20">
                  <div className="flex items-center space-x-3">
                    <Save className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Auto Save</p>
                      <p className="text-xs text-slate-400">Automatically save chat history and documents</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingChange('autoSave', !settings.autoSave)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      settings.autoSave ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">AI & Chat Settings</h3>
                
                {/* Context Length */}
                <div className="p-4 card-futuristic border-cyan-500/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <RefreshCw className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Context Length</p>
                      <p className="text-xs text-slate-400">Number of previous messages to include in context</p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={settings.contextLength}
                    onChange={(e) => handleSettingChange('contextLength', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5</span>
                    <span className="text-cyan-400">{settings.contextLength}</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Response Length */}
                <div className="p-4 card-futuristic border-purple-500/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <Zap className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Response Length</p>
                      <p className="text-xs text-slate-400">Preferred length of AI responses</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {['short', 'medium', 'long'].map((length) => (
                      <button
                        key={length}
                        onClick={() => handleSettingChange('responseLength', length)}
                        className={`p-2 rounded-lg text-sm font-medium transition-all ${
                          settings.responseLength === length
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-700 text-slate-400 hover:bg-gray-600'
                        }`}
                      >
                        {length.charAt(0).toUpperCase() + length.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence Threshold */}
                <div className="p-4 card-futuristic border-yellow-500/20">
                  <div className="flex items-center space-x-3 mb-3">
                    <Shield className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Confidence Threshold</p>
                      <p className="text-xs text-slate-400">Minimum confidence for AI responses</p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="0.9"
                    step="0.1"
                    value={settings.confidenceThreshold}
                    onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0.3</span>
                    <span className="text-yellow-400">{settings.confidenceThreshold}</span>
                    <span>0.9</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-white">Privacy & Data</h3>
                
                {/* Analytics */}
                <div className="flex items-center justify-between p-4 card-futuristic border-blue-500/20">
                  <div className="flex items-center space-x-3">
                    <Database className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Usage Analytics</p>
                      <p className="text-xs text-slate-400">Help improve the app by sharing anonymous usage data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSettingChange('enableAnalytics', !settings.enableAnalytics)}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
                      settings.enableAnalytics ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform mt-1 ${
                      settings.enableAnalytics ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="p-4 card-futuristic border-red-500/20">
                  <h4 className="text-sm font-medium text-white mb-3">Data Management</h4>
                  <div className="space-y-3">
                    <button className="w-full p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm">
                      Clear All Chat History
                    </button>
                    <button className="w-full p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm">
                      Delete All Uploaded Documents
                    </button>
                    <button className="w-full p-3 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm">
                      Reset All Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-futuristic"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}