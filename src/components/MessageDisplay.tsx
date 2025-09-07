'use client';

import React, { useState } from 'react';
import { Message, Source } from '@/contexts/ChatContext';
import { 
  Copy, 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronDown, 
  ChevronUp,
  FileText,
  ExternalLink,
  Info,
  BookOpen,
  AlertTriangle
} from 'lucide-react';

interface MessageDisplayProps {
  message: Message;
  index: number;
  onCopy: (content: string) => void;
  onRegenerate: (index: number) => void;
  isLoading?: boolean;
}

export default function MessageDisplay({ 
  message, 
  index, 
  onCopy, 
  onRegenerate, 
  isLoading = false 
}: MessageDisplayProps) {
  const [expandedSources, setExpandedSources] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);

  // Parse content for inline citations [1], [2], etc.
  const parseContentWithCitations = (content: string, sources: Source[] = []) => {
    if (!sources || sources.length === 0) return content;
    
    // Replace [1], [2] etc. with clickable citation links
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const sourceIndex = parseInt(num) - 1;
      if (sourceIndex >= 0 && sourceIndex < sources.length) {
        return `<span class="inline-citation" data-source-index="${sourceIndex}">${match}</span>`;
      }
      return match;
    });
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-slate-500';
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getSourceIcon = (type?: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc': return <BookOpen className="h-4 w-4 text-blue-500" />;
      default: return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  if (message.role === 'user') {
    return (
      <div className="text-sm font-medium leading-relaxed">
        {message.content}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Answer */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div 
          className="text-slate-800 dark:text-slate-200 leading-relaxed"
          dangerouslySetInnerHTML={{ 
            __html: parseContentWithCitations(message.content, message.sources) 
          }}
        />
      </div>

      {/* Confidence Indicator */}
      {message.confidence !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              message.confidence >= 0.8 ? 'bg-green-500' : 
              message.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
            }`} />
            <span className={`font-medium ${getConfidenceColor(message.confidence)}`}>
              {getConfidenceLabel(message.confidence)} confidence
            </span>
            <span className="text-slate-500">({Math.round(message.confidence * 100)}%)</span>
          </div>
        </div>
      )}

      {/* Warning for low confidence */}
      {message.confidence !== undefined && message.confidence < 0.6 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-yellow-800 dark:text-yellow-200">
              Low confidence answer
            </div>
            <div className="text-yellow-700 dark:text-yellow-300 mt-1">
              This answer may be inferred or uncertain. Please verify with the original sources.
            </div>
          </div>
        </div>
      )}

      {/* Expandable Sources */}
      {message.sources && message.sources.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setExpandedSources(!expandedSources)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
          >
            {expandedSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Sources ({message.sources.length})
          </button>
          
          {expandedSources && (
            <div className="space-y-2">
              {message.sources.map((source, idx) => (
                <div 
                  key={source.id || idx} 
                  className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {getSourceIcon(source.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                            {idx + 1}
                          </span>
                          {source.title && (
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {source.title}
                            </span>
                          )}
                          {source.page && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Page {source.page}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3">
                          {source.content}
                        </p>
                      </div>
                    </div>
                    <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                  {source.score && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Relevance: {Math.round(source.score * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expandable Details */}
      {message.reasoning && (
        <div className="space-y-2">
          <button
            onClick={() => setExpandedDetails(!expandedDetails)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
          >
            {expandedDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <Info className="h-3 w-3" />
            Details
          </button>
          
          {expandedDetails && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {message.reasoning}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related Questions */}
      {message.relatedQuestions && message.relatedQuestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Related Questions:
          </div>
          <div className="space-y-1">
            {message.relatedQuestions.map((question, idx) => (
              <button
                key={idx}
                className="block text-left text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
              >
                • {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
          📝 Summarize further
        </button>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
          🔍 Step by step
        </button>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
          💻 Show example
        </button>
      </div>
      
      {/* Utility Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCopy(message.content)}
            className="text-slate-400 hover:text-cyan-500 transition-colors p-1 rounded"
            title="Copy message"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onRegenerate(index)}
            className="text-slate-400 hover:text-cyan-500 transition-colors p-1 rounded"
            title="Regenerate response"
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className="text-slate-400 hover:text-green-500 transition-colors p-1 rounded" title="Good response">
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded" title="Poor response">
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}