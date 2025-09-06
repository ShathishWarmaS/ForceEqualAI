'use client';

import React, { useState } from 'react';
import { QAResponse } from '@/types';
import { 
  ChevronDown, 
  ChevronUp, 
  Brain, 
  Target, 
  BookOpen, 
  Lightbulb,
  TrendingUp,
  MessageSquare,
  Info,
  Copy,
  Check
} from 'lucide-react';

interface EnhancedChatResponseProps {
  response: QAResponse;
  onQuestionClick?: (question: string) => void;
}

export default function EnhancedChatResponse({ 
  response, 
  onQuestionClick 
}: EnhancedChatResponseProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400';
    if (confidence >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div className="space-y-4">
      {/* Main Answer */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-medium">AI Response</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCopy(response.answer)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              title="Copy answer"
            >
              {copiedText === response.answer ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
          {response.answer}
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Confidence:</span>
            <span className={`font-medium ${getConfidenceColor(response.confidence)}`}>
              {(response.confidence * 100).toFixed(0)}% ({getConfidenceLabel(response.confidence)})
            </span>
          </div>
          
          {(response.sources.length > 0 || response.queryAnalysis || response.reasoning) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              <Info className="h-4 w-4" />
              <span>Details</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Advanced Details */}
      {showDetails && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          
          {/* Query Analysis */}
          {response.queryAnalysis && (
            <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-purple-400 font-medium">Query Analysis</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Intent:</span>
                  <span className="ml-2 text-purple-300 capitalize">{response.queryAnalysis.intent}</span>
                </div>
                {response.queryAnalysis.entities.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-gray-400">Key Entities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {response.queryAnalysis.entities.slice(0, 5).map((entity, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-500/20 rounded text-purple-300 text-xs">
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {response.reasoning && (
            <div className="bg-cyan-500/10 p-4 rounded-lg border border-cyan-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-400 font-medium">AI Reasoning</span>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {response.reasoning}
              </p>
            </div>
          )}

          {/* Sources */}
          {response.sources.length > 0 && (
            <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium">
                    Sources ({response.sources.length})
                  </span>
                </div>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="text-green-400 hover:text-green-300 transition-colors"
                >
                  {showSources ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              
              {showSources && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {response.sources.map((source, idx) => (
                    <div key={idx} className="bg-black/20 p-3 rounded border border-green-500/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-300 text-sm font-medium">
                          Source {idx + 1}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            Relevance: {(source.relevanceScore * 100).toFixed(0)}%
                          </span>
                          <button
                            onClick={() => handleCopy(source.content)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy source"
                          >
                            {copiedText === source.content ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        {source.content.substring(0, 200)}
                        {source.content.length > 200 && '...'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Related Questions */}
      {response.relatedQuestions && response.relatedQuestions.length > 0 && (
        <div className="bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
          <div className="flex items-center space-x-2 mb-3">
            <Lightbulb className="h-4 w-4 text-orange-400" />
            <span className="text-orange-400 font-medium">Related Questions</span>
          </div>
          <div className="space-y-2">
            {response.relatedQuestions.slice(0, 3).map((question, idx) => (
              <button
                key={idx}
                onClick={() => onQuestionClick?.(question)}
                className="w-full text-left p-3 bg-orange-500/5 hover:bg-orange-500/10 
                         border border-orange-500/20 rounded-lg transition-colors
                         text-orange-200 hover:text-orange-100 text-sm"
              >
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span>{question}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}