'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, FileText, Zap, Brain, X, Filter, ArrowRight, History, TrendingUp, Lightbulb } from 'lucide-react';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';

interface SearchResult {
  documentId: string;
  documentName: string;
  chunk: {
    id: string;
    content: string;
    chunkIndex: number;
  };
  similarity: number;
  preview: string;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  query: string;
  totalResults: number;
  searchTime: number;
  documentsSearched: number;
}

interface SearchInterfaceProps {
  onResultSelect?: (result: SearchResult) => void;
  onClose?: () => void;
  initialQuery?: string;
}

export default function SearchInterface({ onResultSelect, onClose, initialQuery }: SearchInterfaceProps) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState<{
    totalResults: number;
    searchTime: number;
    documentsSearched: number;
  } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'recent' | 'relevant'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    searchSuggestions,
    analytics,
    addSearchToHistory,
    generateSuggestions,
    getRecentSearches,
    getPopularSearches
  } = useAdvancedSearch();

  // Auto-search when initialQuery is provided
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSearch();
    }
  }, [initialQuery]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          maxResults: 20
        }),
      });

      const data: SearchResponse = await response.json();

      if (data.success) {
        setResults(data.results);
        setSearchStats({
          totalResults: data.totalResults,
          searchTime: data.searchTime,
          documentsSearched: data.documentsSearched
        });
        
        // Add to search history
        addSearchToHistory(query.trim(), data.totalResults);
        setShowSuggestions(false);
        setShowSearchHistory(false);
      } else {
        setError(data.message || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'ArrowDown' && searchSuggestions.length > 0) {
      e.preventDefault();
      setShowSuggestions(true);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowSearchHistory(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length > 1) {
      generateSuggestions(value);
      setShowSuggestions(true);
      setShowSearchHistory(false);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (query.trim().length === 0) {
      setShowSearchHistory(true);
    } else if (searchSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow click on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
      setShowSearchHistory(false);
    }, 200);
  };

  const getFilteredResults = () => {
    let filtered = [...results];
    
    switch (selectedFilter) {
      case 'relevant':
        filtered = filtered.filter(r => r.similarity > 0.7);
        break;
      case 'recent':
        // For now, just return as-is since we don't have timestamps on chunks
        break;
      default:
        break;
    }
    
    return filtered;
  };

  const highlightQuery = (text: string, query: string): string => {
    if (!query.trim()) return text;
    
    const queryWords = query.toLowerCase().split(/\s+/);
    let highlighted = text;
    
    queryWords.forEach(word => {
      if (word.length > 2) {
        const regex = new RegExp(`(${word})`, 'gi');
        highlighted = highlighted.replace(regex, '<mark class="bg-cyan-400/30 text-cyan-200">$1</mark>');
      }
    });
    
    return highlighted;
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity > 0.8) return 'text-green-400';
    if (similarity > 0.6) return 'text-cyan-400';
    if (similarity > 0.4) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getSimilarityLabel = (similarity: number): string => {
    if (similarity > 0.8) return 'Excellent match';
    if (similarity > 0.6) return 'Good match';
    if (similarity > 0.4) return 'Fair match';
    return 'Partial match';
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Search Header */}
      <div className="card-futuristic border-b border-cyan-500/20 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Search className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold text-holographic">
              Document Search
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Search across all your documents..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-cyan-500/20 bg-slate-900/50 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-cyan-500/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="flex items-center text-xs text-slate-400 mb-2">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Suggestions
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-cyan-500/20 rounded transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search History Dropdown */}
            {showSearchHistory && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-cyan-500/20 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  {getRecentSearches().length > 0 && (
                    <>
                      <div className="flex items-center text-xs text-slate-400 mb-2">
                        <History className="h-3 w-3 mr-1" />
                        Recent Searches
                      </div>
                      {getRecentSearches().map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(search.query)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-cyan-500/20 rounded transition-colors flex items-center justify-between"
                        >
                          <span>{search.query}</span>
                          <span className="text-xs text-slate-500">{search.resultCount} results</span>
                        </button>
                      ))}
                    </>
                  )}

                  {getPopularSearches().length > 0 && (
                    <>
                      <div className="flex items-center text-xs text-slate-400 mb-2 mt-3">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Popular Searches
                      </div>
                      {getPopularSearches().map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionSelect(search)}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-cyan-500/20 rounded transition-colors"
                        >
                          {search}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className="btn-futuristic px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Searching...</span>
              </div>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>

        {/* Search Stats & Filters */}
        {(searchStats || results.length > 0) && (
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              {searchStats && (
                <>
                  <div className="flex items-center space-x-1">
                    <Brain className="h-4 w-4" />
                    <span>{searchStats.totalResults} results</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>{searchStats.searchTime}ms</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{searchStats.documentsSearched} documents</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-sm text-white focus:border-cyan-400"
              >
                <option value="all">All Results</option>
                <option value="relevant">Most Relevant</option>
                <option value="recent">Recent</option>
              </select>
            </div>
          </div>
        )}

        {/* Search Analytics */}
        {analytics.totalSearches > 0 && !isLoading && !query && (
          <div className="mt-4 p-3 card-futuristic border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-purple-400">
                  <TrendingUp className="h-4 w-4" />
                  <span>{analytics.totalSearches} total searches</span>
                </div>
                <div className="text-slate-400">
                  Avg. {analytics.averageResultCount.toFixed(1)} results per search
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Search history available
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="card-futuristic p-4 border-red-500/30 bg-gradient-to-r from-red-500/10 to-pink-500/10 mb-4">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          </div>
        )}

        {!isLoading && !error && results.length === 0 && query && (
          <div className="text-center py-16">
            <div className="relative mb-6">
              <Search className="h-16 w-16 mx-auto text-slate-500 float" />
              <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-slate-500/20 blur-xl"></div>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No results found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Try adjusting your search terms or make sure you have uploaded documents to search through.
            </p>
          </div>
        )}

        {!query && !isLoading && (
          <div className="text-center py-16">
            <div className="relative mb-6">
              <Zap className="h-16 w-16 mx-auto text-cyan-400 float" />
              <div className="absolute inset-0 h-16 w-16 mx-auto rounded-full bg-cyan-400/20 blur-xl"></div>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Search Your Documents</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Enter keywords or questions to find relevant content across all your uploaded PDF documents.
            </p>
          </div>
        )}

        {filteredResults.length > 0 && (
          <div className="space-y-4">
            {filteredResults.map((result, index) => (
              <div
                key={`${result.documentId}-${result.chunk.id}-${index}`}
                className="card-futuristic p-5 border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 group cursor-pointer hover:scale-[1.02]"
                onClick={() => onResultSelect?.(result)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/50">
                      <FileText className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                        {result.documentName}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Chunk {result.chunk.chunkIndex}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-medium ${getSimilarityColor(result.similarity)}`}>
                      {Math.round(result.similarity * 100)}% match
                    </div>
                    <div className="text-xs text-slate-500">
                      {getSimilarityLabel(result.similarity)}
                    </div>
                  </div>
                </div>

                <div 
                  className="text-sm text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightQuery(result.preview, query) 
                  }}
                />

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                  <div className="text-xs text-slate-400">
                    Click to open document and continue conversation
                  </div>
                  <div className="flex items-center text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}